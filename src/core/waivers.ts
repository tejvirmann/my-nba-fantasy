/** Rolling waivers. Pure simulation; the server applies the returned results in one transaction. */

export type Claim = {
  id: string;
  teamId: string;
  addPlayerId: string;
  dropPlayerId: string | null;
  createdAt: number;
};

export type ClaimResult = { id: string; status: "won" | "lost" | "invalid"; reason?: string };

export function processWaivers(input: {
  claims: Claim[];
  /** Team ids, best priority first. */
  priority: string[];
  /** playerId -> teamId for everyone currently rostered in the league. */
  owned: Map<string, string>;
  rosterCounts: Map<string, number>;
  rosterLimit: number;
}): { results: ClaimResult[]; priority: string[] } {
  const priority = [...input.priority];
  const owned = new Map(input.owned);
  const counts = new Map(input.rosterCounts);
  const results = new Map<string, ClaimResult>();
  let pending = [...input.claims];

  const validity = (c: Claim): string | null => {
    if (owned.has(c.addPlayerId)) return "Player is no longer available.";
    if (c.dropPlayerId && owned.get(c.dropPlayerId) !== c.teamId) return "Drop player is not on your roster.";
    const after = (counts.get(c.teamId) ?? 0) + 1 - (c.dropPlayerId ? 1 : 0);
    if (after > input.rosterLimit) return "Roster would be over the limit; add a drop.";
    return null;
  };

  for (;;) {
    pending.sort((a, b) => priority.indexOf(a.teamId) - priority.indexOf(b.teamId) || a.createdAt - b.createdAt);
    const winner = pending.find((c) => validity(c) === null);
    if (!winner) break;
    results.set(winner.id, { id: winner.id, status: "won" });
    owned.set(winner.addPlayerId, winner.teamId);
    if (winner.dropPlayerId) owned.delete(winner.dropPlayerId);
    counts.set(winner.teamId, (counts.get(winner.teamId) ?? 0) + 1 - (winner.dropPlayerId ? 1 : 0));
    priority.splice(priority.indexOf(winner.teamId), 1);
    priority.push(winner.teamId);
    pending = pending.filter((c) => c.id !== winner.id);
  }
  for (const c of pending) {
    const reason = validity(c);
    results.set(c.id, reason ? { id: c.id, status: owned.has(c.addPlayerId) ? "lost" : "invalid", reason } : { id: c.id, status: "lost" });
  }
  return { results: input.claims.map((c) => results.get(c.id)!), priority };
}

export type TradeCheck = { ok: true } | { ok: false; reason: string };

/** Revalidate a trade at accept time: ownership and roster size after the swap. */
export function validateTrade(input: {
  owned: Map<string, string>;
  items: { playerId: string; fromTeamId: string; toTeamId: string }[];
  rosterCounts: Map<string, number>;
  rosterLimit: number;
}): TradeCheck {
  const counts = new Map(input.rosterCounts);
  for (const it of input.items) {
    if (input.owned.get(it.playerId) !== it.fromTeamId) return { ok: false, reason: "A player in this trade has moved teams." };
    counts.set(it.fromTeamId, (counts.get(it.fromTeamId) ?? 0) - 1);
    counts.set(it.toTeamId, (counts.get(it.toTeamId) ?? 0) + 1);
  }
  for (const [team, n] of counts) {
    if (n > input.rosterLimit) return { ok: false, reason: `Team ${team} would be over the roster limit.` };
  }
  return { ok: true };
}
