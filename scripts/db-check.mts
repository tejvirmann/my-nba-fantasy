// Verifies DB connectivity. Prints hosts only, never credentials.
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

for (const key of ["POSTGRES_URL", "POSTGRES_URL_NON_POOLING"]) {
  const url = new URL(process.env[key]!);
  console.log(key, url.hostname, url.port);
  const sql = postgres(process.env[key]!, { max: 1, prepare: false, connect_timeout: 15 });
  try {
    const [r] = await sql`select current_database() as d`;
    console.log("  ok", r.d);
  } catch (e) {
    console.log("  FAIL", (e as Error).message);
  }
  await sql.end();
}
