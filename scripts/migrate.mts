// Applies drizzle migrations, then makes sure every public table has row level security on.
// The app talks to Postgres only from the server; with RLS on and no policies, the public
// Supabase anon key cannot read or write any table directly.
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({ path: ".env.local" });

const sql = postgres(process.env.POSTGRES_URL_NON_POOLING!, { max: 1 });
await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });

const tables = await sql<{ tablename: string }[]>`select tablename from pg_tables where schemaname = 'public'`;
for (const { tablename } of tables) {
  await sql.unsafe(`alter table public."${tablename}" enable row level security`);
}
console.log(`migrated; RLS enabled on ${tables.length} tables`);
await sql.end();
