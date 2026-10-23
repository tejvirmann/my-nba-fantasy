// Signed-in smoke test against a running server (BASE, default http://localhost:3111).
// Creates throwaway auth users + a league, requests every page with real session cookies, cleans up.
import { config } from "dotenv";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
const BASE = process.env.BASE ?? "http://localhost:3111";
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ref = new URL(URL_).hostname.split(".")[0];
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const { db, schema } = await import("../src/db");
const { eq, inArray } = await import("drizzle-orm");
const leaguesSvc = await import("../src/server/leagues");
const draft = await import("../src/server/draft");
const engine = await import("../src/server/engine");

const password = randomBytes(12).toString("hex");
const created: string[] = [];
let leagueId = "";

async function makeUser(tag: string) {
  const email = `smoke-${tag}-${randomBytes(4).toString("hex")}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: `Smoke ${tag}` } });
  if (error) throw error;
  created.push(data.user.id);
  const anon = createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data: s, error: e2 } = await anon.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  const raw = "base64-" + Buffer.from(JSON.stringify(s.session)).toString("base64url");
  const chunks = raw.match(/.{1,3000}/g)!;
  const cookie = chunks.map((c, i) => `sb-${ref}-auth-token${chunks.length > 1 ? `.${i}` : ""}=${c}`).join("; ");
  return { id: data.user.id, cookie };
}

let failures = 0;
async function get(path: string, cookie: string | null, expect: number, mustContain?: string[]) {
  console.log("  ..", path.replace(leagueId, ":id"));
  const res = await fetch(BASE + path, { headers: cookie ? { cookie } : {}, redirect: "manual", signal: AbortSignal.timeout(40_000) });
  const body = await res.text();
  const missing = (mustContain ?? []).filter((s) => !body.includes(s));
  const ok = res.status === expect && missing.length === 0;
  if (!ok) failures++;
  console.log(`${ok ? "  ok " : "  FAIL"} ${path.replace(leagueId, ":id")} -> ${res.status}${missing.length ? ` missing ${JSON.stringify(missing)}` : ""}`);
  return body;
}

try {
  const [a, b, outsider] = [await makeUser("a"), await makeUser("b"), await makeUser("out")];
  leagueId = await leaguesSvc.createLeague(a.id, { name: "Smoke League", teamName: "Alpha" });
  const [lg] = await db.select().from(schema.leagues).where(eq(schema.leagues.id, leagueId));
  await leaguesSvc.joinLeague(b.id, lg.inviteCode, "Bravo");
  await db.update(schema.leagues).set({ week1Start: "2026-10-19", regularWeeks: 4, playoffTeams: 2 }).where(eq(schema.leagues.id, leagueId));

  console.log("pre-draft pages");
  await get("/", a.cookie, 200, ["Smoke League"]);
  await get(`/league/${leagueId}`, a.cookie, 200, [lg.inviteCode]);
  await get(`/league/${leagueId}/draft`, a.cookie, 200, ["Randomize draft order"]);
  await get(`/league/${leagueId}/settings`, a.cookie, 200, ["Commissioner settings"]);
  await get(`/league/${leagueId}/settings`, b.cookie, 200, ["League rules"]);
  await get(`/league/${leagueId}`, outsider.cookie, 404);
  await get(`/league/${leagueId}`, null, 307);

  let [league] = await db.select().from(schema.leagues).where(eq(schema.leagues.id, leagueId));
  await draft.createDraft(league);
  await draft.startDraft(league);
  console.log("live draft room");
  const room = await get(`/league/${leagueId}/draft`, a.cookie, 200, ["on the clock", "Best available"]);
  void room;
  for (let i = 0; i < 60; i++) {
    const d = await draft.getDraft(leagueId);
    if (!d || d.status !== "live") break;
    const t0 = Date.now();
    const made = await draft.autoPickExpired(league, new Date(Date.now() + 365 * 86_400_000));
    console.log(`  draft loop ${i}: made ${made} in ${Date.now() - t0}ms`);
  }
  [league] = await db.select().from(schema.leagues).where(eq(schema.leagues.id, leagueId));
  console.log("league status after draft:", league.status);
  await db.update(schema.rosterEntries).set({ acquiredAt: new Date("2026-10-01T00:00:00Z") }).where(eq(schema.rosterEntries.leagueId, leagueId));
  await engine.generateSchedule(leagueId, new Date("2026-10-01T00:00:00Z"));

  console.log("admin + account pages");
  const adminSess = await (async () => {
    const anon = createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const { data, error } = await anon.auth.signInWithPassword({ email: "admin@hoops.local", password: process.env.ADMIN_PASSWORD || "password" });
    if (error) throw error;
    const raw = "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url");
    const chunks = raw.match(/.{1,3000}/g)!;
    return chunks.map((c, i) => `sb-${ref}-auth-token${chunks.length > 1 ? `.${i}` : ""}=${c}`).join("; ");
  })();
  await get("/admin", adminSess, 200, ["Game formats", "Force full sync"]);
  await get("/admin", a.cookie, 404);
  await get("/account", a.cookie, 200, ["Change password"]);
  await get("/install", null, 200, ["Add to Home Screen"]);
  await get("/forgot-password", null, 200, ["Reach out to Tejvir"]);

  console.log("in-season pages");
  const home = await get(`/league/${leagueId}`, a.cookie, 200, ["Week ", "League scoreboard", "Refresh stats"]);
  await get(`/league/${leagueId}/team`, a.cookie, 200, ["Starters", "Save lineup", "Auto-pick for me"]);
  await get(`/league/${leagueId}/team`, b.cookie, 200, ["Starters"]);
  await get(`/league/${leagueId}/players`, a.cookie, 200, ["Available players"]);
  await get(`/league/${leagueId}/players?q=lebron`, a.cookie, 200);
  await get(`/league/${leagueId}/trades`, a.cookie, 200, ["Propose a trade"]);
  await get(`/league/${leagueId}/standings`, a.cookie, 200, ["Schedule", "make the playoffs"]);
  await get(`/league/${leagueId}/draft`, a.cookie, 200, ["Draft complete"]);
  console.log("  home page mentions a week score:", /text-4xl/.test(home));
} finally {
  if (leagueId) await db.delete(schema.leagues).where(eq(schema.leagues.id, leagueId));
  if (created.length) await db.delete(schema.profiles).where(inArray(schema.profiles.id, created));
  for (const id of created) await admin.auth.admin.deleteUser(id);
  console.log(failures ? `FAILURES: ${failures}` : "SMOKE PASSED");
  process.exit(failures ? 1 : 0);
}
void randomUUID;
