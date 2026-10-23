// Seeds a "Demo League" so you can use the app alone:
//   npx tsx scripts/seed-demo.mts            create (idempotent)
//   npx tsx scripts/seed-demo.mts --remove   delete the league and the bot accounts
// Teams: your account (ADMIN_EMAILS[0]) as commissioner, "admin", and two bot managers. Drafted with auto-picks.
import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
const { db, schema } = await import("../src/db");
const { eq, inArray } = await import("drizzle-orm");
const leaguesSvc = await import("../src/server/leagues");
const draft = await import("../src/server/draft");
const engine = await import("../src/server/engine");
const { nextMonday } = await import("../src/core/weeks");

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const NAME = "Demo League";
const BOTS = [
  { email: "bot-sam@hoops.local", name: "Bot Sam", team: "Sam's Splash Bros" },
  { email: "bot-jo@hoops.local", name: "Bot Jo", team: "Jo's Jumpers" },
];

const { data: list } = await sb.auth.admin.listUsers({ perPage: 200 });
const byEmail = (e: string) => list?.users.find((u) => u.email?.toLowerCase() === e.toLowerCase());

if (process.argv.includes("--remove")) {
  await db.delete(schema.leagues).where(eq(schema.leagues.name, NAME));
  const bots = BOTS.map((b) => byEmail(b.email)).filter(Boolean);
  if (bots.length) await db.delete(schema.profiles).where(inArray(schema.profiles.id, bots.map((b) => b!.id)));
  for (const b of bots) await sb.auth.admin.deleteUser(b!.id);
  console.log("demo league and bots removed");
  process.exit(0);
}

const [existing] = await db.select().from(schema.leagues).where(eq(schema.leagues.name, NAME));
if (existing) {
  console.log("Demo League already exists:", existing.id);
  process.exit(0);
}

const owner = byEmail((process.env.ADMIN_EMAILS ?? "").split(",")[0] ?? "") ?? byEmail("admin@hoops.local");
const adminUser = byEmail("admin@hoops.local");
if (!owner || !adminUser) throw new Error("Run scripts/seed-admin.mts first, and sign up with your ADMIN_EMAILS address.");

const botIds: string[] = [];
for (const b of BOTS) {
  let u = byEmail(b.email);
  if (!u) {
    const { data, error } = await sb.auth.admin.createUser({ email: b.email, password: randomBytes(18).toString("hex"), email_confirm: true, user_metadata: { display_name: b.name } });
    if (error) throw error;
    u = data.user;
  }
  await db.insert(schema.profiles).values({ id: u.id, displayName: b.name }).onConflictDoNothing();
  botIds.push(u.id);
}

const today = new Date();
const monday = nextMonday(new Date(today.getTime() - 6 * 86_400_000).toISOString().slice(0, 10)); // Monday of this week
const leagueId = await leaguesSvc.createLeague(owner.id, { name: NAME, teamName: "Tejvir's Squad" });
const [lg] = await db.select().from(schema.leagues).where(eq(schema.leagues.id, leagueId));
await leaguesSvc.joinLeague(adminUser.id, lg.inviteCode, "Admin FC");
await leaguesSvc.joinLeague(botIds[0], lg.inviteCode, BOTS[0].team);
await leaguesSvc.joinLeague(botIds[1], lg.inviteCode, BOTS[1].team);
await db.update(schema.leagues).set({ week1Start: monday, regularWeeks: 6, playoffTeams: 4 }).where(eq(schema.leagues.id, leagueId));

let league = (await db.select().from(schema.leagues).where(eq(schema.leagues.id, leagueId)))[0];
await draft.createDraft(league);
await draft.startDraft(league);
for (let i = 0; i < 80; i++) {
  const d = await draft.getDraft(leagueId);
  if (!d || d.status !== "live") break;
  await draft.autoPickExpired(league, new Date(Date.now() + 365 * 86_400_000));
}
league = (await db.select().from(schema.leagues).where(eq(schema.leagues.id, leagueId)))[0];
// Rosters count from the start of week 1 so this week's real games score.
await db.update(schema.rosterEntries).set({ acquiredAt: new Date(`${monday}T00:00:00Z`) }).where(eq(schema.rosterEntries.leagueId, leagueId));
await engine.generateSchedule(leagueId, new Date(`${monday}T00:00:00Z`).getTime() - 86_400_000 > 0 ? new Date(new Date(`${monday}T00:00:00Z`).getTime() - 86_400_000) : new Date());
console.log(`Demo League ready (${league.status}), invite code ${lg.inviteCode}, week 1 = ${monday}`);
process.exit(0);
