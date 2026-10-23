import { randomInt } from "node:crypto";
import { cache } from "react";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { DEFAULT_SETTINGS, type LeagueSettings } from "@/core/types";
import { nextMonday } from "@/core/weeks";

const { leagues, teams } = schema;

export const MAX_TEAMS = 12;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export class UserError extends Error {}

export type League = typeof leagues.$inferSelect;
export type Team = typeof teams.$inferSelect;

export type Membership = { league: League; team: Team | null; isCommissioner: boolean };

function newInviteCode(): string {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
}

export async function createLeague(
  userId: string,
  input: { name: string; teamName: string; timezone?: string },
): Promise<string> {
  const name = input.name.trim();
  const teamName = input.teamName.trim();
  if (!name || !teamName) throw new UserError("Give your league and your team a name.");
  const today = new Date().toISOString().slice(0, 10);
  const settings: LeagueSettings = structuredClone(DEFAULT_SETTINGS);
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await db.transaction(async (tx) => {
        const [league] = await tx
          .insert(leagues)
          .values({
            name,
            inviteCode: newInviteCode(),
            commissionerId: userId,
            timezone: input.timezone || "America/New_York",
            week1Start: nextMonday(today),
            settings,
          })
          .returning({ id: leagues.id });
        await tx.insert(teams).values({ leagueId: league.id, ownerId: userId, name: teamName, waiverPriority: 1 });
        return league.id;
      });
    } catch (e) {
      if (attempt === 4 || !String((e as { cause?: Error }).cause?.message ?? e).includes("invite_code")) throw e;
    }
  }
  throw new UserError("Could not create the league. Try again.");
}

export async function joinLeague(userId: string, code: string, teamName: string): Promise<string> {
  const [league] = await db.select().from(leagues).where(eq(leagues.inviteCode, code.trim().toUpperCase()));
  if (!league) throw new UserError("That invite code doesn't match a league.");
  const existing = await db.select().from(teams).where(eq(teams.leagueId, league.id));
  if (existing.some((t) => t.ownerId === userId)) return league.id;
  const name = teamName.trim();
  if (!name) throw new UserError("Give your team a name.");

  const unclaimed = existing.find((t) => t.ownerId === null);
  if (unclaimed) {
    await db.update(teams).set({ ownerId: userId, name }).where(and(eq(teams.id, unclaimed.id), isNull(teams.ownerId)));
    return league.id;
  }
  if (league.status !== "setup") throw new UserError("This league has already drafted. Ask the commissioner to free up a team.");
  if (existing.length >= MAX_TEAMS) throw new UserError("This league is full.");
  await db.insert(teams).values({ leagueId: league.id, ownerId: userId, name, waiverPriority: existing.length + 1 });
  return league.id;
}

export const getMembership = cache(async (userId: string, leagueId: string): Promise<Membership | null> => {
  const [[league], [team]] = await Promise.all([
    db.select().from(leagues).where(eq(leagues.id, leagueId)),
    db.select().from(teams).where(and(eq(teams.leagueId, leagueId), eq(teams.ownerId, userId))),
  ]);
  if (!league) return null;
  const isCommissioner = league.commissionerId === userId;
  if (!team && !isCommissioner) return null;
  return { league, team: team ?? null, isCommissioner };
});

/** Throws unless the user belongs to the league. Every server mutation starts here. */
export async function requireMember(userId: string, leagueId: string): Promise<Membership> {
  const m = await getMembership(userId, leagueId);
  if (!m) throw new UserError("You are not in this league.");
  return m;
}

export async function requireTeam(userId: string, leagueId: string): Promise<Membership & { team: Team }> {
  const m = await requireMember(userId, leagueId);
  if (!m.team) throw new UserError("You don't have a team in this league.");
  return m as Membership & { team: Team };
}

export async function requireCommissioner(userId: string, leagueId: string): Promise<Membership> {
  const m = await requireMember(userId, leagueId);
  if (!m.isCommissioner) throw new UserError("Only the commissioner can do that.");
  return m;
}

export async function myLeagues(userId: string) {
  const mine = await db
    .select({ leagueId: teams.leagueId })
    .from(teams)
    .where(eq(teams.ownerId, userId));
  const ids = mine.map((m) => m.leagueId);
  const rows = await db
    .select()
    .from(leagues)
    .where(ids.length ? or(inArray(leagues.id, ids), eq(leagues.commissionerId, userId)) : eq(leagues.commissionerId, userId));
  return rows;
}

export async function logTransaction(
  tx: Pick<typeof db, "insert">,
  leagueId: string,
  type: string,
  payload: Record<string, unknown>,
  who: { teamId?: string | null; userId?: string | null } = {},
) {
  await tx.insert(schema.transactions).values({ leagueId, type, payload, teamId: who.teamId ?? null, userId: who.userId ?? null });
}
