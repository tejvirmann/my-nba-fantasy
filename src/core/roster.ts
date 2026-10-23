import { SLOT_BENCH, type LeagueSettings } from "./types";

const GUARD = new Set(["G", "PG", "SG"]);
const FORWARD = new Set(["F", "SF", "PF"]);

export function canFillSlot(slot: string, position: string | null): boolean {
  if (slot === SLOT_BENCH || slot === "UTIL") return true;
  if (!position) return false;
  const positions = position.split("/");
  if (slot === "G") return positions.some((p) => GUARD.has(p));
  if (slot === "F") return positions.some((p) => FORWARD.has(p));
  if (slot === "C") return positions.includes("C");
  return false;
}

export function rosterLimit(s: LeagueSettings): number {
  return s.starterSlots.length + s.benchSize;
}

export type RosterRow = { playerId: string; slot: string; position: string | null };

/** Returns an error message, or null if the arrangement is legal. */
export function validateLineup(rows: RosterRow[], s: LeagueSettings): string | null {
  if (rows.length > rosterLimit(s)) return `Roster is over the ${rosterLimit(s)}-player limit.`;
  const capacity = new Map<string, number>();
  for (const slot of s.starterSlots) capacity.set(slot, (capacity.get(slot) ?? 0) + 1);
  capacity.set(SLOT_BENCH, s.benchSize + 100); // bench overflow is caught by the roster limit
  const used = new Map<string, number>();
  for (const r of rows) {
    if (!capacity.has(r.slot)) return `Unknown slot ${r.slot}.`;
    if (!canFillSlot(r.slot, r.position)) return `A ${r.position ?? "?"} cannot play ${r.slot}.`;
    used.set(r.slot, (used.get(r.slot) ?? 0) + 1);
    if (used.get(r.slot)! > capacity.get(r.slot)!) return `Too many players in ${r.slot}.`;
  }
  return null;
}

/** Best-effort placement for a newly added player: first open eligible starter slot, else bench. */
export function firstOpenSlot(rows: RosterRow[], position: string | null, s: LeagueSettings): string {
  const taken = new Map<string, number>();
  for (const r of rows) taken.set(r.slot, (taken.get(r.slot) ?? 0) + 1);
  const seen = new Map<string, number>();
  for (const slot of s.starterSlots) {
    seen.set(slot, (seen.get(slot) ?? 0) + 1);
    if ((taken.get(slot) ?? 0) < seen.get(slot)! && canFillSlot(slot, position)) return slot;
  }
  return SLOT_BENCH;
}
