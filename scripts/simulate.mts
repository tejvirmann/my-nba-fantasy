// End-to-end season simulation on real (backfilled) March 2026 data. Cleans up after itself.
import { config } from "dotenv";
import { randomUUID } from "node:crypto";

config({ path: ".env.local" });
const { db, schema } = await import("../src/db");
const { eq } = await import("drizzle-orm");
const leaguesSvc = await import("../src/server/leagues");
const draft = await import("../src/server/draft");
const engine = await import("../src/server/engine");
const settle = await import("../src/server/settle");
const rosterSvc = await import("../src/server/roster");

const assert = (cond: unknown, msg: string) => {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
  console.log("  ok -", msg);
};

const users = Array.from({ length: 4 }, () => randomUUID());
let leagueId = "";
try {
  console.log("create + join");
  leagueId = await leaguesSvc.createLeague(users[0], { name: "SIM", teamName: "Team 0" });
  const [lg] = await db.select().from(schema.leagues).where(eq(schema.leagues.id, leagueId));
  for (let i = 1; i < 4; i++) await leaguesSvc.joinLeague(users[i], lg.inviteCode, `Team ${i}`);
  await db
    .update(schema.leagues)
    .set({ week1Start: "2026-03-02", regularWeeks: 3, playoffTeams: 2, timezone: "America/New_York" })
    .where(eq(schema.leagues.id, leagueId));
  assert((await db.select().from(schema.teams).where(eq(schema.teams.leagueId, leagueId))).length === 4, "4 teams joined");
  assert((await leaguesSvc.getMembership(randomUUID(), leagueId)) === null, "outsider is not a member");

  console.log("draft");
  let league = (await db.select().from(schema.leagues).where(eq(schema.leagues.id, leagueId)))[0];
  await draft.createDraft(league);
  await draft.startDraft(league);
  let d = (await draft.getDraft(leagueId))!;
  // First pick by the right owner via explicit player; everything else expires and auto-picks.
  const teamsRows = await db.select().from(schema.teams).where(eq(schema.teams.leagueId, leagueId));
  const first = teamsRows.find((t) => t.id === d.order[0])!;
  const second = teamsRows.find((t) => t.id === d.order[1])!;
  const pool = await rosterSvc.playerPool(league, { limit: 5 });
  let rejected = false;
  try { await draft.makePick(league, second.ownerId!, pool[0].id, 1); } catch { rejected = true; }
  assert(rejected, "a manager can't pick out of turn");
  await draft.makePick(league, first.ownerId!, pool[0].id, 1);
  let doubled = false;
  try { await draft.makePick(league, second.ownerId!, pool[0].id, 2); } catch { doubled = true; }
  assert(doubled, "the same player can't be drafted twice");
  // Expire the clock; lazily auto-pick the rest.
  await db.update(schema.drafts).set({ deadline: new Date(Date.now() - 1000) }).where(eq(schema.drafts.leagueId, leagueId));
  const autoMade = await draft.autoPickExpired(league, new Date(Date.now() + 1000));
  d = (await draft.getDraft(leagueId))!;
  console.log("  auto picks made:", autoMade, "draft status:", d.status);
  // Each auto pick resets the deadline, so loop with a far-future clock until done.
  for (let i = 0; i < 60 && d.status === "live"; i++) {
    await draft.autoPickExpired(league, new Date(Date.now() + 365 * 86_400_000));
    d = (await draft.getDraft(leagueId))!;
  }
  assert(d.status === "done", "draft completes");
  league = (await db.select().from(schema.leagues).where(eq(schema.leagues.id, leagueId)))[0];
  assert(league.status === "active", "league becomes active");
  const entries = await db.select().from(schema.rosterEntries).where(eq(schema.rosterEntries.leagueId, leagueId));
  assert(entries.length === 4 * 11, `44 players rostered (got ${entries.length})`);
  assert(new Set(entries.map((e) => e.playerId)).size === entries.length, "no player on two rosters");

  // The real draft happened "now" (October); backdate so March games count for these rosters.
  await db.update(schema.rosterEntries).set({ acquiredAt: new Date("2026-02-15T00:00:00Z") }).where(eq(schema.rosterEntries.leagueId, leagueId));

  console.log("schedule (as of mid-February)");
  await engine.generateSchedule(leagueId, new Date("2026-02-20T12:00:00Z"));
  const ms = await db.select().from(schema.matchups).where(eq(schema.matchups.leagueId, leagueId));
  assert(ms.length === 6, `3 weeks x 2 matchups (got ${ms.length})`);

  console.log("lock-in during week 1 (Wed Mar 4)");
  const now = new Date("2026-03-04T17:00:00Z");
  const view = await engine.computeWeek(leagueId, 1, now);
  assert(view.teams.length === 4, "week view has 4 teams");
  const tv = view.teams[0];
  const lockable = tv.players.find((p) => p.isStarter && p.resolution.lockableGameIds.length > 0);
  if (lockable) {
    await engine.lockGame({ leagueId, teamId: tv.team.id, playerId: lockable.playerId, gameEspnId: lockable.resolution.lockableGameIds[0], now });
    let twice = false;
    try { await engine.lockGame({ leagueId, teamId: tv.team.id, playerId: lockable.playerId, gameEspnId: lockable.resolution.lockableGameIds[0], now }); } catch { twice = true; }
    assert(twice, "a lock can't be changed");
  } else console.log("  (no lockable starter this day; skipped)");

  console.log("finalize weeks + playoffs (as of April 2)");
  const end = new Date("2026-04-02T12:00:00Z");
  await settle.settleLeague(league, end);
  const after = await db.select().from(schema.matchups).where(eq(schema.matchups.leagueId, leagueId));
  const reg = after.filter((m) => !m.isPlayoff);
  console.log("  regular scores:", reg.map((m) => `${m.week}: ${m.scoreA?.toFixed(1)}-${m.scoreB?.toFixed(1)}`).join(" | "));
  assert(reg.every((m) => m.finalizedAt), "regular season weeks finalized");
  assert(reg.some((m) => (m.scoreA ?? 0) > 100), "teams scored real points from real box scores");
  const po = after.filter((m) => m.isPlayoff);
  assert(po.length === 1, `one playoff final created (got ${po.length})`);
  league = (await db.select().from(schema.leagues).where(eq(schema.leagues.id, leagueId)))[0];
  console.log("  league status:", league.status);
  await settle.settleLeague(league, new Date("2026-04-10T12:00:00Z"));
  league = (await db.select().from(schema.leagues).where(eq(schema.leagues.id, leagueId)))[0];
  assert(league.status === "complete", "league completes after the final");
  const { standings } = await engine.standingsFor(leagueId);
  console.log("  standings:", standings.map((s) => `${s.wins}-${s.losses}`).join(", "));

  // Idempotency: settling again changes nothing.
  const before = JSON.stringify(await db.select().from(schema.matchups).where(eq(schema.matchups.leagueId, leagueId)));
  await settle.settleLeague(league, new Date("2026-04-11T12:00:00Z"));
  const again = JSON.stringify(await db.select().from(schema.matchups).where(eq(schema.matchups.leagueId, leagueId)));
  assert(before === again, "settling twice changes nothing");
  console.log("SIMULATION PASSED");
} finally {
  if (leagueId) await db.delete(schema.leagues).where(eq(schema.leagues.id, leagueId));
  process.exit(0);
}
