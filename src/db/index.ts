import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Supabase's transaction pooler (port 6543) does not support prepared statements.
const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

const sql =
  globalForDb.sql ??
  postgres(process.env.POSTGRES_URL!, { prepare: false, max: 5, idle_timeout: 20 });
if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export const db = drizzle(sql, { schema, logger: process.env.LOG_QUERIES === "1" ? { logQuery: (q) => console.log("[sql]", q.slice(0, 90).replace(/\s+/g, " ")) } : false });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { schema };
