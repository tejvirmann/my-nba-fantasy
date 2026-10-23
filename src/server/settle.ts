import { inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { autoPickExpired } from "./draft";
import { applyAutoLocks, finalizeWeeks } from "./engine";
import { expireTrades } from "./trades";
import { processLeagueWaivers } from "./waivers";

/** Everything time-driven for one league. Safe to run repeatedly. */
export async function settleLeague(league: typeof schema.leagues.$inferSelect, now = new Date()) {
  if (league.status === "drafting") await autoPickExpired(league, now);
  if (league.status === "active" || league.status === "playoffs") {
    await expireTrades(league.id, now);
    await processLeagueWaivers(league, now);
    await applyAutoLocks(league.id, now);
    await finalizeWeeks(league.id, now);
  }
}

export async function settleAll(now = new Date()) {
  const rows = await db
    .select()
    .from(schema.leagues)
    .where(inArray(schema.leagues.status, ["drafting", "active", "playoffs"]));
  for (const league of rows) {
    try {
      await settleLeague(league, now);
    } catch (err) {
      console.error(`settle failed for league ${league.id}`, err);
    }
  }
}
