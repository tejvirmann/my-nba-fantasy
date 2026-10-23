export type StatLine = {
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  tpm: number;
  fgm?: number;
  fga?: number;
  ftm?: number;
  fta?: number;
};

export type ScoringWeights = {
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  tpm: number;
  fgm: number;
  fga: number;
  ftm: number;
  fta: number;
  doubleDouble: number;
  tripleDouble: number;
};

/** strict = Sleeper rules; open = every game stays selectable until week end. */
export type LockMode = "strict" | "open";

export type LeagueSettings = {
  scoring: ScoringWeights;
  lockMode: LockMode;
  /** Starter slots in display order, e.g. ["G","G","F","F","C","UTIL","UTIL"]. */
  starterSlots: string[];
  benchSize: number;
  waiverHoldHours: number;
  tradeExpiryHours: number;
  tradeReview: "none" | "commissioner";
  pickSeconds: number;
  /** Game-format switches (see core/formats.ts). Missing keys fall back to each format's default. */
  formats?: Record<string, boolean>;
};

export const SLOT_BENCH = "BN";

export const DEFAULT_SCORING: ScoringWeights = {
  pts: 1,
  reb: 1.2,
  ast: 1.5,
  stl: 3,
  blk: 3,
  tov: -1,
  tpm: 0.5,
  fgm: 0,
  fga: 0,
  ftm: 0,
  fta: 0,
  doubleDouble: 0,
  tripleDouble: 0,
};

export const DEFAULT_SETTINGS: LeagueSettings = {
  scoring: DEFAULT_SCORING,
  lockMode: "strict",
  starterSlots: ["G", "G", "F", "F", "C", "UTIL", "UTIL"],
  benchSize: 4,
  waiverHoldHours: 24,
  tradeExpiryHours: 48,
  tradeReview: "none",
  pickSeconds: 90,
};
