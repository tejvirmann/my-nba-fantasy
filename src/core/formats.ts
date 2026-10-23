import type { LeagueSettings } from "./types";

/**
 * Game formats are switches an admin can flip at any point in a season.
 * "live" formats change behavior today; "planned" ones are registered so the admin screen,
 * the data model and the roadmap all agree on what is coming (betting, loans, ...).
 * Adding a format = add an entry here, then read `isFormatEnabled` where it matters.
 */
export type FormatDef = {
  id: string;
  name: string;
  description: string;
  status: "live" | "planned";
  /** Formats in the same group are mutually exclusive (turning one on turns the others off). */
  group?: "lock_mode";
  defaultEnabled: boolean;
};

export const FORMATS: FormatDef[] = [
  {
    id: "lock_strict",
    group: "lock_mode",
    name: "Lock-In: Strict (Sleeper rules)",
    description: "Lock a finished game before the player's next game starts. Unlocked players count their last game.",
    status: "live",
    defaultEnabled: true,
  },
  {
    id: "lock_open",
    group: "lock_mode",
    name: "Lock-In: Open",
    description: "Every finished game stays selectable until the week ends. Auto-pick counts the highest game.",
    status: "live",
    defaultEnabled: false,
  },
  {
    id: "auto_lock",
    name: "Manager auto-pick",
    description: "Lets each manager turn on auto-pick (highest game in open mode, threshold auto-lock in strict mode).",
    status: "live",
    defaultEnabled: true,
  },
  {
    id: "betting",
    name: "Betting & parlays",
    description: "Play-money bets on player and matchup outcomes, including multi-leg parlays.",
    status: "planned",
    defaultEnabled: false,
  },
  {
    id: "loans",
    name: "Loser loans a player",
    description: "Whoever loses a bet gives a player to the winner for a set period, then they return.",
    status: "planned",
    defaultEnabled: false,
  },
  {
    id: "faab",
    name: "FAAB blind bidding",
    description: "Replace rolling waiver priority with a budget and blind bids.",
    status: "planned",
    defaultEnabled: false,
  },
  {
    id: "double_week",
    name: "Double-points week",
    description: "Commissioner marks a week where all scores count double.",
    status: "planned",
    defaultEnabled: false,
  },
];

export function formatDef(id: string): FormatDef | undefined {
  return FORMATS.find((f) => f.id === id);
}

export function isFormatEnabled(settings: LeagueSettings, id: string): boolean {
  if (id === "lock_strict") return settings.lockMode === "strict";
  if (id === "lock_open") return settings.lockMode === "open";
  return settings.formats?.[id] ?? formatDef(id)?.defaultEnabled ?? false;
}

/** Returns new settings with the format switched. Throws for unknown or not-yet-built formats. */
export function setFormat(settings: LeagueSettings, id: string, enabled: boolean): LeagueSettings {
  const def = formatDef(id);
  if (!def) throw new Error(`Unknown format ${id}`);
  if (def.status !== "live") throw new Error(`${def.name} isn't available yet.`);
  const next: LeagueSettings = { ...settings, formats: { ...settings.formats } };
  if (def.group === "lock_mode") {
    // Exclusive group: switching one on selects it; switching the active one off is not allowed.
    if (!enabled) throw new Error("Pick the other Lock-In mode instead of turning this one off.");
    next.lockMode = id === "lock_open" ? "open" : "strict";
    return next;
  }
  next.formats![id] = enabled;
  return next;
}
