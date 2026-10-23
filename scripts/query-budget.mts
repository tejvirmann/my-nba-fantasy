// Counts SQL queries per page. Run the app with LOG_QUERIES=1 and pass its log file:
//   LOG_QUERIES=1 npx next start -p 3111 > /tmp/next.log &   then   npx tsx scripts/query-budget.mts /tmp/next.log
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
const BASE = process.env.BASE ?? "http://localhost:3111";
const logFile = process.argv[2];
const { db, schema } = await import("../src/db");
const { eq } = await import("drizzle-orm");
const [lg] = await db.select().from(schema.leagues).where(eq(schema.leagues.name, "Demo League"));
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ref = new URL(URL_).hostname.split(".")[0];
const anon = createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const { data } = await anon.auth.signInWithPassword({ email: "admin@hoops.local", password: process.env.ADMIN_PASSWORD || "password" });
const raw = "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url");
const chunks = raw.match(/.{1,3000}/g)!;
const cookie = chunks.map((c, i) => `sb-${ref}-auth-token${chunks.length > 1 ? `.${i}` : ""}=${c}`).join("; ");
const count = () => (readFileSync(logFile, "utf8").match(/\[sql\]/g) ?? []).length;

const L = `/league/${lg.id}`;
for (const path of ["/", L, `${L}/team`, `${L}/players`, `${L}/draft`, `${L}/trades`, `${L}/standings`, `${L}/settings`, "/admin"]) {
  await fetch(BASE + path, { headers: { cookie }, redirect: "manual" }).then((r) => r.text());
  await new Promise((r) => setTimeout(r, 150));
  const a = count();
  const t0 = Date.now();
  await fetch(BASE + path, { headers: { cookie }, redirect: "manual" }).then((r) => r.text());
  await new Promise((r) => setTimeout(r, 150));
  console.log(`${String(count() - a).padStart(3)} queries  ${String(Date.now() - t0 - 150).padStart(5)} ms  ${path.replace(lg.id, ":id")}`);
}
process.exit(0);
