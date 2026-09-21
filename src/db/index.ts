import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5_000,
  query_timeout: 15_000,
  statement_timeout: 10_000,
});

pool.on("error", (error) => {
  console.error(
    JSON.stringify({
      event: "db_pool_error",
      errorName: error.name,
      region: process.env.VERCEL_REGION || undefined,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
    }),
  );
});

export const db = drizzle(pool);

export async function checkDatabaseHealth() {
  const startedAt = performance.now();
  await pool.query("SELECT 1");
  return Math.round((performance.now() - startedAt) * 10) / 10;
}
