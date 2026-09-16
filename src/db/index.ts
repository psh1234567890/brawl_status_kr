import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5_000,
  query_timeout: 12_000,
  statement_timeout: 10_000,
});

export const db = drizzle(pool);
