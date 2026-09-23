import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });

const { Pool } = pg;
const LEGACY_BACKFILL_BATCH_SIZE = 500;
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
  const migrationPaths = [
    fileURLToPath(new URL("../drizzle/0000_harden_battle_logs.sql", import.meta.url)),
    fileURLToPath(new URL("../drizzle/0001_add_meta_participants.sql", import.meta.url)),
  ];
  const migrations = await Promise.all(
    migrationPaths.map((migrationPath) => readFile(migrationPath, "utf8")),
  );
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    for (const migration of migrations) {
      await client.query(migration);
    }

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

    let updated = 0;
    let lastProcessedId = 0;
    while (true) {
      const { rows } = await client.query(
        `
          SELECT id, player_tag, battle_time, battle_detail
          FROM battle_logs
          WHERE id > $1
            AND (
              battle_timestamp IS NULL
              OR battle_fingerprint IS NULL
              OR battle_detail_json IS NULL
            )
          ORDER BY id
          LIMIT $2
        `,
        [lastProcessedId, LEGACY_BACKFILL_BATCH_SIZE],
      );

      if (rows.length === 0) break;

      for (const row of rows) {
        lastProcessedId = row.id;
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
    }

    const teamIndexBackfill = await client.query(`
      UPDATE battle_logs AS bl
      SET player_team_index = (
        SELECT team_entry.team_index::integer
        FROM jsonb_array_elements(bl.battle_detail_json->'battle'->'teams')
          WITH ORDINALITY AS team_entry(team_json, team_index)
        WHERE EXISTS (
          SELECT 1
          FROM jsonb_array_elements(team_entry.team_json) AS player_entry(player_json)
          WHERE regexp_replace(
            upper(trim(player_entry.player_json->>'tag')),
            '^#',
            ''
          ) = bl.player_tag
        )
        LIMIT 1
      )
      WHERE bl.player_team_index IS NULL
        AND jsonb_typeof(bl.battle_detail_json->'battle'->'teams') = 'array'
        AND jsonb_array_length(bl.battle_detail_json->'battle'->'teams') = 2
    `);

    const participantBackfill = await client.query(`
      WITH team_logs AS (
        SELECT DISTINCT ON (battle_fingerprint)
          battle_fingerprint,
          battle_timestamp,
          mode,
          map,
          result,
          player_team_index,
          battle_detail_json
        FROM battle_logs
        WHERE battle_fingerprint IS NOT NULL
          AND player_team_index IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM battle_team_participants existing
            WHERE existing.battle_fingerprint = battle_logs.battle_fingerprint
          )
          AND jsonb_typeof(battle_detail_json->'battle'->'teams') = 'array'
          AND jsonb_array_length(battle_detail_json->'battle'->'teams') = 2
          AND coalesce(battle_detail_json->'battle'->>'type', '') <> 'friendly'
          AND mode NOT IN ('duoShowdown', 'trioShowdown')
        ORDER BY battle_fingerprint, id DESC
      ),
      expanded AS (
        SELECT
          team_logs.battle_fingerprint,
          team_logs.battle_timestamp,
          team_logs.mode,
          team_logs.map,
          team_entry.team_index::integer AS team_index,
          regexp_replace(
            upper(trim(player_entry.player_json->>'tag')),
            '^#',
            ''
          ) AS player_tag,
          nullif(
            coalesce(
              player_entry.player_json->'brawler',
              player_entry.player_json->'brawlers'->0
            )->>'id',
            ''
          )::integer AS brawler_id,
          coalesce(
            coalesce(
              player_entry.player_json->'brawler',
              player_entry.player_json->'brawlers'->0
            )->>'name',
            'Unknown'
          ) AS brawler_name,
          CASE
            WHEN team_logs.result = 'draw' THEN 'draw'
            WHEN team_entry.team_index = team_logs.player_team_index THEN team_logs.result
            WHEN team_logs.result = 'victory' THEN 'defeat'
            WHEN team_logs.result = 'defeat' THEN 'victory'
            ELSE NULL
          END AS result
        FROM team_logs
        CROSS JOIN LATERAL jsonb_array_elements(
          team_logs.battle_detail_json->'battle'->'teams'
        ) WITH ORDINALITY AS team_entry(team_json, team_index)
        CROSS JOIN LATERAL jsonb_array_elements(
          team_entry.team_json
        ) AS player_entry(player_json)
      )
      INSERT INTO battle_team_participants (
        battle_fingerprint,
        battle_timestamp,
        mode,
        map,
        team_index,
        player_tag,
        brawler_id,
        brawler_name,
        result
      )
      SELECT
        battle_fingerprint,
        battle_timestamp,
        mode,
        map,
        team_index,
        player_tag,
        brawler_id,
        brawler_name,
        result
      FROM expanded
      WHERE player_tag <> ''
        AND result IS NOT NULL
      ON CONFLICT (battle_fingerprint, team_index, player_tag) DO NOTHING
    `);

    // Create uniqueness constraints only after legacy tags have been normalized,
    // duplicates removed, and fingerprints backfilled. Creating these indexes
    // before cleanup makes an otherwise recoverable legacy database fail the
    // migration immediately when duplicate rows already exist.
    await client.query(`
      CREATE INDEX IF NOT EXISTS battle_logs_battle_fingerprint_idx
        ON battle_logs (battle_fingerprint)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS battle_logs_battle_timestamp_idx
        ON battle_logs (battle_timestamp)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS battle_logs_battle_detail_json_gin_idx
        ON battle_logs USING gin (battle_detail_json)
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS battle_logs_player_time_unique
        ON battle_logs (player_tag, battle_time)
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS battle_logs_player_fingerprint_unique
        ON battle_logs (player_tag, battle_fingerprint)
    `);
    // An older schema revision used this name for the same (player_tag,
    // battle_time) uniqueness rule. Depending on how that revision was created,
    // PostgreSQL may represent it as a table UNIQUE constraint (which owns its
    // backing index) or as a standalone unique index. Drop the constraint first,
    // then the standalone-index form if it exists.
    await client.query(`
      ALTER TABLE battle_logs
        DROP CONSTRAINT IF EXISTS battle_logs_player_tag_battle_time_unique
    `);
    await client.query(`
      DROP INDEX IF EXISTS battle_logs_player_tag_battle_time_unique
    `);

    // Supabase exposes tables in the public schema through its Data API when
    // privileges permit it. This application talks to PostgreSQL only from the
    // trusted server using the table-owning postgres role, so no browser/anon
    // policy is required. Enabling RLS with zero policies therefore blocks
    // anon/authenticated Data API access while preserving the server connection.
    await client.query(`
      ALTER TABLE battle_logs ENABLE ROW LEVEL SECURITY
    `);

    await client.query("COMMIT");
    console.log("Backfilled meta participant rows:", participantBackfill.rowCount ?? 0);
    console.log(
      `Database migration complete. Removed ${deduplicated.rowCount ?? 0} duplicate logs, updated ${updated} battle logs, and backfilled ${teamIndexBackfill.rowCount ?? 0} team indexes.`,
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
