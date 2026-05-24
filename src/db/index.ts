import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  // 우리가 아까 .env.local에 설정해둔 그 주소를 그대로 가져다 쓰는 거야!
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);
