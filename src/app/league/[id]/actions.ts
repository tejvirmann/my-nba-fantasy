"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { LeagueSettings, ScoringWeights } from "@/core/types";
import { requireUser } from "@/server/auth";
import { requireCommissioner, requireMember, requireTeam, UserError } from "@/server/leagues";
import { lockGame, resetLock, currentWeek } from "@/server/engine";
import { manualRefreshBlocked, runSync } from "@/server/sync";
import { settleAll } from "@/server/settle";
import { addFreeAgent, dropPlayer, setLineup } from "@/server/roster";
import { cancelClaim, processLeagueWaivers, submitClaim } from "@/server/waivers";
import { autoPickExpired, commissionerAutoPick, createDraft, makePick, setDraftPaused, startDraft } from "@/server/draft";
import { cancelTrade, commissionerReview, proposeTrade, respondToTrade } from "@/server/trades";

type State = { error?: string; message?: string };

async function run(leagueId: string, fn: () => Promise<string | void>): Promise<State> {
  try {
    const message = await fn();
    revalidatePath(`/league/${leagueId}`, "layout");
    return message ? { message } : {};
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    console.error(e);
    return { error: "Something went wrong. Try again." };
  }
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "");

export async function refreshStats(leagueId: string, _: State, __: FormData): Promise<State> {
  return run(leagueId, async () => {
    const user = await requireUser();
    await requireMember(user.id, leagueId);
    const blocked = await manualRefreshBlocked();
    if (blocked) throw new UserError(blocked);
    const r = await runSync({ kind: "manual", triggeredBy: user.id, afterSync: () => settleAll() });
    return `Updated ${r.lines} stat lines from ${r.games} games.`;
  });
}

export async function lockAction(leagueId: string, playerId: string, gameId: string, _: State, __: FormData): Promise<State> {
  return run(leagueId, async () => {
    const user = await requireUser();
    const m = await requireTeam(user.id, leagueId);
    await lockGame({ leagueId, teamId: m.team.id, playerId, gameEspnId: gameId });
    return "Locked in.";
  });
}

export async function saveLineup(leagueId: string, _: State, form: FormData): Promise<State> {
  return run(leagueId, async () => {
    const user = await requireUser();
    const m = await requireTeam(user.id, leagueId);
    const assignments = [...form.entries()]
      .filter(([k]) => k.startsWith("slot_"))
      .map(([k, v]) => ({ playerId: k.slice(5), slot: String(v) }));
    await setLineup({ league: m.league, teamId: m.team.id, userId: user.id, assignments });
    return "Lineup saved.";
  });
}

export async function saveAutoLock(leagueId: string, _: State, form: FormData): Promise<State> {
  return run(leagueId, async () => {
    const user = await requireUser();
    const m = await requireTeam(user.id, leagueId);
    const threshold = Number(form.get("threshold"));
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 300) throw new UserError("Threshold must be between 0 and 300.");
    await db
      .update(schema.teams)
      .set({ autoLock: form.get("enabled") === "on", autoLockThreshold: threshold })
      .where(eq(schema.teams.id, m.team.id));
    return "Auto-lock saved.";
  });
}

export async function addPlayerAction(leagueId: string, playerId: string, _: State, form: FormData): Promise<State> {
  return run(leagueId, async () => {
    const user = await requireUser();
    const m = await requireTeam(user.id, leagueId);
    await addFreeAgent({ league: m.league, teamId: m.team.id, userId: user.id, playerId, dropPlayerId: str(form, "drop") || null });
    return "Added.";
  });
}

export async function dropPlayerAction(leagueId: string, playerId: string, _: State, __: FormData): Promise<State> {
  return run(leagueId, async () => {
    const user = await requireUser();
    const m = await requireTeam(user.id, leagueId);
    await dropPlayer({ league: m.league, teamId: m.team.id, userId: user.id, playerId });
    return "Dropped. They're on waivers for a day.";
  });
}

export async function claimAction(leagueId: string, playerId: string, _: State, form: FormData): Promise<State> {
  return run(leagueId, async () => {
    const user = await requireUser();
    const m = await requireTeam(user.id, leagueId);
    await submitClaim({ league: m.league, teamId: m.team.id, addPlayerId: playerId, dropPlayerId: str(form, "drop") || null });
    return "Claim submitted.";
  });
}

export async function cancelClaimAction(leagueId: string, claimId: string, _: State, __: FormData): Promise<State> {
  return run(leagueId, async () => {
    const user = await requireUser();
    const m = await requireTeam(user.id, leagueId);
    await cancelClaim(m.team.id, claimId);
  });
}

// ---- Draft ----

export async function draftAdmin(leagueId: string, op: "create" | "start" | "pause" | "resume" | "autopick", _: State, __: FormData): Promise<State> {
  return run(leagueId, async () => {
    const user = await requireUser();
    const m = await requireCommissioner(user.id, leagueId);
    if (op === "create") await createDraft(m.league);
    if (op === "start") await startDraft(m.league);
    if (op === "pause") await setDraftPaused(m.league, true);
    if (op === "resume") await setDraftPaused(m.league, false);
    if (op === "autopick") await commissionerAutoPick(m.league);
  });
}

export async function pickAction(leagueId: string, playerId: string, overall: number, _: State, __: FormData): Promise<State> {
  return run(leagueId, async () => {
    const user = await requireUser();
    const m = await requireTeam(user.id, leagueId);
    await makePick(m.league, user.id, playerId, overall);
  });
}

export async function tickDraft(leagueId: string) {
  const user = await requireUser();
  const m = await requireMember(user.id, leagueId);
  await autoPickExpired(m.league);
}

// ---- Trades ----

export async function proposeTradeAction(leagueId: string, _: State, form: FormData): Promise<State> {
  return run(leagueId, async () => {
    const user = await requireUser();
    const m = await requireTeam(user.id, leagueId);
    await proposeTrade({
      league: m.league,
      fromTeamId: m.team.id,
      toTeamId: str(form, "to"),
      give: form.getAll("give").map(String),
      get: form.getAll("get").map(String),
      note: str(form, "note"),
    });
    return "Offer sent.";
  });
}

export async function tradeResponse(leagueId: string, tradeId: string, op: "accept" | "reject" | "cancel" | "approve" | "veto", _: State, __: FormData): Promise<State> {
  return run(leagueId, async () => {
    const user = await requireUser();
    if (op === "approve" || op === "veto") {
      const m = await requireCommissioner(user.id, leagueId);
      await commissionerReview({ league: m.league, tradeId, approve: op === "approve" });
      return;
    }
    const m = await requireTeam(user.id, leagueId);
    if (op === "cancel") await cancelTrade({ league: m.league, teamId: m.team.id, tradeId });
    else await respondToTrade({ league: m.league, teamId: m.team.id, tradeId, accept: op === "accept" });
  });
}

// ---- Commissioner ----

export async function updateSettings(leagueId: string, _: State, form: FormData): Promise<State> {
  return run(leagueId, async () => {
    const user = await requireUser();
    const m = await requireCommissioner(user.id, leagueId);
    const league = m.league;
    const inSetup = league.status === "setup";
    const next: LeagueSettings = structuredClone(league.settings);

    const lockMode = str(form, "lockMode");
    if (lockMode === "strict" || lockMode === "open") next.lockMode = lockMode;
    const review = str(form, "tradeReview");
    if (review === "none" || review === "commissioner") next.tradeReview = review;

    const patch: Partial<typeof schema.leagues.$inferInsert> = {};
    const name = str(form, "name").trim();
    if (name) patch.name = name;

    if (inSetup) {
      const num = (k: string, min: number, max: number) => {
        const v = Number(form.get(k));
        if (!Number.isInteger(v) || v < min || v > max) throw new UserError(`${k} must be a whole number from ${min} to ${max}.`);
        return v;
      };
      const week1 = str(form, "week1Start");
      if (week1) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(week1) || new Date(week1 + "T00:00:00Z").getUTCDay() !== 1) throw new UserError("Week 1 must start on a Monday.");
        patch.week1Start = week1;
      }
      patch.regularWeeks = num("regularWeeks", 1, 30);
      patch.playoffTeams = num("playoffTeams", 2, 8);
      next.benchSize = num("benchSize", 0, 8);
      next.pickSeconds = num("pickSeconds", 15, 600);
      const w = { ...next.scoring };
      for (const key of Object.keys(w) as (keyof ScoringWeights)[]) {
        const raw = form.get(`w_${key}`);
        if (raw === null || raw === "") continue;
        const v = Number(raw);
        if (!Number.isFinite(v) || Math.abs(v) > 100) throw new UserError(`Scoring weight for ${key} is not valid.`);
        w[key] = v;
      }
      next.scoring = w;
    }
    patch.settings = next;
    await db.update(schema.leagues).set(patch).where(eq(schema.leagues.id, leagueId));
    return "Settings saved.";
  });
}

export async function resetLockAction(leagueId: string, teamId: string, playerId: string, _: State, __: FormData): Promise<State> {
  return run(leagueId, async () => {
    const user = await requireUser();
    const m = await requireCommissioner(user.id, leagueId);
    await resetLock({ leagueId, teamId, playerId, week: currentWeek(m.league), userId: user.id });
    return "Lock reset.";
  });
}

export async function processWaiversAction(leagueId: string, _: State, __: FormData): Promise<State> {
  return run(leagueId, async () => {
    const user = await requireUser();
    const m = await requireCommissioner(user.id, leagueId);
    const n = await processLeagueWaivers(m.league);
    return `${n} claim${n === 1 ? "" : "s"} awarded.`;
  });
}

export async function renameTeam(leagueId: string, _: State, form: FormData): Promise<State> {
  return run(leagueId, async () => {
    const user = await requireUser();
    const m = await requireTeam(user.id, leagueId);
    const name = str(form, "name").trim().slice(0, 40);
    if (!name) throw new UserError("Team name can't be empty.");
    await db.update(schema.teams).set({ name }).where(eq(schema.teams.id, m.team.id));
    return "Renamed.";
  });
}
