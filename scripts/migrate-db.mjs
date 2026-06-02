import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

function normalizeTag(tag = "") {
  return tag.trim().replace(/^#/, "").toUpperCase();
}

function getPlayers(match) {
  return [
    ...(match.battle?.players ?? []),
    ...(match.battle?.teams ?? []).flat(),
  ];
}

function getOutcome(match) {
  const winRank = { soloShowdown: 4, duoShowdown: 2, trioShowdown: 2 }[
    match.event?.mode
  ];
  if (winRank !== undefined && match.battle?.rank !== undefined) {
    return match.battle.rank <= winRank ? "victory" : "defeat";
  }
  return ["victory", "defeat"].includes(match.battle?.result)
    ? match.battle.result
    : "draw";
}

function getFingerprint(match) {
  const tags = getPlayers(match)
    .map((player) => normalizeTag(player.tag))
    .filter(Boolean)
    .sort()
    .join(",");
  return [
    match.battleTime,
    match.event?.mode,
    match.event?.map,
    tags || "unknown-participants",
  ].join("|");
}

function getBattleTimestamp(value) {
  const match = value.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(?:\.(\d+))?Z$/,
  );
  if (!match) return null;
  const [, year, month, day, hour, minute, second, fraction = "0"] = match;
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      Number(fraction.padEnd(3, "0").slice(0, 3)),
    ),
  );
}

async function migrate() {
  const migrationPath = fileURLToPath(
    new URL("../drizzle/0000_harden_battle_logs.sql", import.meta.url),
  );
  const migration = await readFile(migrationPath, "utf8");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(migration);

    const deduplicated = await client.query(`
      DELETE FROM battle_logs
      WHERE id IN (
        SELECT id
        FROM (
          SELECT
            id,
            row_number() OVER (
              PARTITION BY
                regexp_replace(upper(trim(player_tag)), '^#', ''),
                battle_time
              ORDER BY id DESC
            ) AS duplicate_order
          FROM battle_logs
        ) ranked
        WHERE duplicate_order > 1
      )
    `);
    await client.query(`
      UPDATE battle_logs
      SET player_tag = regexp_replace(upper(trim(player_tag)), '^#', '')
      WHERE player_tag <> regexp_replace(upper(trim(player_tag)), '^#', '')
    `);

    const { rows } = await client.query(`
      SELECT id, player_tag, battle_time, battle_detail
      FROM battle_logs
    `);

    let updated = 0;
    for (const row of rows) {
      try {
        const detail = JSON.parse(row.battle_detail);
        const player = getPlayers(detail).find(
          (candidate) => normalizeTag(candidate.tag) === normalizeTag(row.player_tag),
        );
        const brawler = player?.brawler ?? player?.brawlers?.[0];

        await client.query(
          `
            UPDATE battle_logs
            SET result = $2,
                battle_timestamp = $3,
                battle_fingerprint = $4,
                brawler_id = $5,
                battle_detail_json = $6::jsonb,
                rank = $7,
                trophy_change = $8
            WHERE id = $1
          `,
          [
            row.id,
            getOutcome(detail),
            getBattleTimestamp(row.battle_time),
            getFingerprint(detail),
            brawler?.id ?? null,
            JSON.stringify(detail),
            detail.battle?.rank ?? null,
            detail.battle?.trophyChange ?? null,
          ],
        );
        updated += 1;
      } catch (error) {
        console.warn(`Skipped malformed legacy battle log ${row.id}:`, error);
      }
    }

    await client.query("COMMIT");
    console.log(
      `Database migration complete. Removed ${deduplicated.rowCount ?? 0} duplicate logs and updated ${updated} battle logs.`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

await migrate();
