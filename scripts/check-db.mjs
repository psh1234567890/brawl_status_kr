import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const { rows } = await pool.query(`
  SELECT
    count(*)::int AS total,
    count(*) FILTER (WHERE battle_fingerprint IS NULL)::int AS missing_fingerprint,
    count(*) FILTER (WHERE battle_timestamp IS NULL)::int AS missing_timestamp,
    count(*) FILTER (WHERE battle_detail_json IS NULL)::int AS missing_json,
    count(*) FILTER (WHERE brawler_id IS NULL)::int AS missing_brawler_id,
    count(*) FILTER (
      WHERE mode IN ('soloShowdown', 'duoShowdown', 'trioShowdown')
        AND result = 'draw'
        AND rank IS NULL
    )::int AS unresolved_showdown_without_rank
  FROM battle_logs
`);

console.log(JSON.stringify(rows[0], null, 2));

const missingBrawlers = await pool.query(`
  SELECT brawler_name, count(*)::int AS count
  FROM battle_logs
  WHERE brawler_id IS NULL
  GROUP BY brawler_name
  ORDER BY count(*) DESC
`);
const showdownDraws = await pool.query(`
  SELECT mode, rank, count(*)::int AS count
  FROM battle_logs
  WHERE mode IN ('soloShowdown', 'duoShowdown', 'trioShowdown')
    AND result = 'draw'
    AND rank IS NULL
  GROUP BY mode, rank
  ORDER BY mode, rank
`);

console.log("Missing brawler IDs:", JSON.stringify(missingBrawlers.rows, null, 2));
console.log("Showdown draws:", JSON.stringify(showdownDraws.rows, null, 2));

const playerCounts = await pool.query(`
  SELECT player_tag, count(*)::int AS count
  FROM battle_logs
  GROUP BY player_tag
  ORDER BY count(*) DESC, player_tag
`);
const metaCoverage = await pool.query(`
  SELECT
    count(*)::int AS total_map_brawler_groups,
    count(*) FILTER (WHERE plays >= 5)::int AS qualified_map_brawler_groups,
    count(*) FILTER (WHERE plays < 5)::int AS hidden_low_sample_groups
  FROM (
    SELECT map, brawler_name, count(*)::int AS plays
    FROM battle_logs
    WHERE brawler_name <> 'Unknown'
    GROUP BY map, brawler_name
  ) groups
`);

console.log("Player counts:", JSON.stringify(playerCounts.rows, null, 2));
console.log("Meta coverage:", JSON.stringify(metaCoverage.rows[0], null, 2));
await pool.end();
