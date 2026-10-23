import type { PlayerWeekView } from "./engine";
import { SLOT_BENCH } from "@/core/types";

/** Starters arranged to match the league's slot order; bench after. */
export function orderLineup(players: PlayerWeekView[], starterSlots: string[]) {
  const pool = players.filter((p) => p.onRoster || p.lock);
  const used = new Set<string>();
  const starters = starterSlots.map((slot) => {
    const p = pool.find((x) => x.slot === slot && !used.has(x.playerId)) ?? null;
    if (p) used.add(p.playerId);
    return { slot, player: p };
  });
  const bench = pool.filter((p) => !used.has(p.playerId) && p.slot === SLOT_BENCH);
  const departed = pool.filter((p) => !used.has(p.playerId) && p.slot !== SLOT_BENCH);
  return { starters, bench, departed };
}

export function sourceLabel(p: PlayerWeekView): string {
  if (p.lock) return p.lock.source === "auto" ? "Auto-locked" : "Locked";
  const c = p.resolution.counted;
  if (!c) return p.games.length ? "No score yet" : "No game";
  if (c.source === "auto") return "Best game";
  return p.resolution.provisional ? "Latest game" : "Final game";
}
