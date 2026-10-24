import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { LeagueSettings } from "@/core/types";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = auth.users.id
  displayName: text("display_name").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  accentColor: text("accent_color"), // personal theme color; null = default green
  createdAt: createdAt(),
});

// ---- NBA data (provider-normalized) ----

export const players = pgTable("players", {
  id: id(),
  espnId: text("espn_id").notNull().unique(),
  name: text("name").notNull(),
  teamAbbr: text("team_abbr"),
  position: text("position"),
  jersey: text("jersey"),
  imageUrl: text("image_url"),
  injuryStatus: text("injury_status"), // e.g. "Out", "Day-To-Day"
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const nbaGames = pgTable(
  "nba_games",
  {
    id: id(),
    espnId: text("espn_id").notNull().unique(),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    status: text("status").notNull(), // scheduled | live | final
    homeAbbr: text("home_abbr").notNull(),
    awayAbbr: text("away_abbr").notNull(),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("nba_games_start_idx").on(t.startTime)],
);

export const playerGameStats = pgTable(
  "player_game_stats",
  {
    id: id(),
    gameEspnId: text("game_espn_id").notNull(),
    playerEspnId: text("player_espn_id").notNull(),
    teamAbbr: text("team_abbr").notNull(),
    minutes: integer("minutes").notNull().default(0),
    pts: integer("pts").notNull().default(0),
    reb: integer("reb").notNull().default(0),
    ast: integer("ast").notNull().default(0),
    stl: integer("stl").notNull().default(0),
    blk: integer("blk").notNull().default(0),
    tov: integer("tov").notNull().default(0),
    tpm: integer("tpm").notNull().default(0),
    tpa: integer("tpa").notNull().default(0),
    fgm: integer("fgm").notNull().default(0),
    fga: integer("fga").notNull().default(0),
    ftm: integer("ftm").notNull().default(0),
    fta: integer("fta").notNull().default(0),
    oreb: integer("oreb").notNull().default(0),
    dreb: integer("dreb").notNull().default(0),
    pf: integer("pf").notNull().default(0),
    plusMinus: integer("plus_minus").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("player_game_stats_uq").on(t.gameEspnId, t.playerEspnId),
    index("pgs_player_idx").on(t.playerEspnId),
  ],
);

// ---- Leagues ----

export const leagues = pgTable("leagues", {
  id: id(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  commissionerId: uuid("commissioner_id").notNull(),
  timezone: text("timezone").notNull().default("America/New_York"),
  status: text("status").notNull().default("setup"), // setup | drafting | active | playoffs | complete
  week1Start: date("week1_start").notNull(), // a Monday, in league timezone
  regularWeeks: integer("regular_weeks").notNull().default(18),
  playoffTeams: integer("playoff_teams").notNull().default(4),
  settings: jsonb("settings").$type<LeagueSettings>().notNull(),
  createdAt: createdAt(),
});

export const teams = pgTable(
  "teams",
  {
    id: id(),
    leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id"), // null = unclaimed slot
    name: text("name").notNull(),
    waiverPriority: integer("waiver_priority").notNull().default(1),
    autoLock: boolean("auto_lock").notNull().default(false),
    autoLockThreshold: real("auto_lock_threshold").notNull().default(40),
    /** Set when the manager uploads a team picture; doubles as the cache-busting version in the image URL. */
    logoUpdatedAt: timestamp("logo_updated_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("teams_league_idx").on(t.leagueId), index("teams_owner_idx").on(t.ownerId)],
);

/** Team pictures live apart from `teams` so listing teams never drags image bytes along. A small JPEG (resized in the browser). */
export const teamLogos = pgTable("team_logos", {
  teamId: uuid("team_id").primaryKey().references(() => teams.id, { onDelete: "cascade" }),
  data: text("data").notNull(), // base64 JPEG, no data: prefix
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rosterEntries = pgTable(
  "roster_entries",
  {
    id: id(),
    leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
    playerId: uuid("player_id").notNull().references(() => players.id),
    slot: text("slot").notNull().default("BN"),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("roster_league_player_uq").on(t.leagueId, t.playerId), index("roster_team_idx").on(t.teamId)],
);

export const weeklyLocks = pgTable(
  "weekly_locks",
  {
    id: id(),
    leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
    playerId: uuid("player_id").notNull().references(() => players.id),
    week: integer("week").notNull(),
    gameEspnId: text("game_espn_id").notNull(),
    source: text("source").notNull(), // manual | auto
    slot: text("slot").notNull(), // slot at lock time; BN does not score
    lockedAt: timestamp("locked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("weekly_locks_uq").on(t.leagueId, t.teamId, t.playerId, t.week)],
);

export const matchups = pgTable(
  "matchups",
  {
    id: id(),
    leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
    week: integer("week").notNull(),
    teamAId: uuid("team_a_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
    teamBId: uuid("team_b_id").references(() => teams.id, { onDelete: "cascade" }), // null = bye
    isPlayoff: boolean("is_playoff").notNull().default(false),
    round: integer("round"),
    winnerId: uuid("winner_id"),
    scoreA: real("score_a"),
    scoreB: real("score_b"),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
  },
  (t) => [index("matchups_league_week_idx").on(t.leagueId, t.week)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: id(),
    leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
    teamId: uuid("team_id"),
    userId: uuid("user_id"),
    type: text("type").notNull(), // add | drop | waiver | trade | draft | lineup | lock | commissioner
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("tx_league_idx").on(t.leagueId, t.createdAt)],
);

// ---- Draft ----

export const drafts = pgTable("drafts", {
  id: id(),
  leagueId: uuid("league_id").notNull().unique().references(() => leagues.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // pending | live | paused | done
  order: jsonb("order").$type<string[]>().notNull(), // team ids, round 1 order
  rounds: integer("rounds").notNull(),
  pickSeconds: integer("pick_seconds").notNull().default(90),
  currentPick: integer("current_pick").notNull().default(1),
  deadline: timestamp("deadline", { withTimezone: true }),
  createdAt: createdAt(),
});

export const draftPicks = pgTable(
  "draft_picks",
  {
    id: id(),
    draftId: uuid("draft_id").notNull().references(() => drafts.id, { onDelete: "cascade" }),
    overall: integer("overall").notNull(),
    round: integer("round").notNull(),
    teamId: uuid("team_id").notNull().references(() => teams.id),
    playerId: uuid("player_id").notNull().references(() => players.id),
    isAuto: boolean("is_auto").notNull().default(false),
    pickedAt: timestamp("picked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("draft_pick_overall_uq").on(t.draftId, t.overall), unique("draft_pick_player_uq").on(t.draftId, t.playerId)],
);

// ---- Waivers & trades ----

export const waiverClaims = pgTable(
  "waiver_claims",
  {
    id: id(),
    leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
    addPlayerId: uuid("add_player_id").notNull().references(() => players.id),
    dropPlayerId: uuid("drop_player_id").references(() => players.id),
    status: text("status").notNull().default("pending"), // pending | won | lost | invalid | cancelled
    reason: text("reason"),
    createdAt: createdAt(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [index("claims_league_status_idx").on(t.leagueId, t.status)],
);

export const waiverHolds = pgTable(
  "waiver_holds",
  {
    leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
    playerId: uuid("player_id").notNull().references(() => players.id),
    until: timestamp("until", { withTimezone: true }).notNull(),
  },
  (t) => [unique("waiver_holds_uq").on(t.leagueId, t.playerId)],
);

export const trades = pgTable("trades", {
  id: id(),
  leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  proposerTeamId: uuid("proposer_team_id").notNull().references(() => teams.id),
  targetTeamId: uuid("target_team_id").notNull().references(() => teams.id),
  status: text("status").notNull().default("pending"), // pending | review | accepted | rejected | cancelled | expired | vetoed | invalid
  note: text("note"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const tradeItems = pgTable("trade_items", {
  id: id(),
  tradeId: uuid("trade_id").notNull().references(() => trades.id, { onDelete: "cascade" }),
  playerId: uuid("player_id").notNull().references(() => players.id),
  fromTeamId: uuid("from_team_id").notNull().references(() => teams.id),
  toTeamId: uuid("to_team_id").notNull().references(() => teams.id),
});

// ---- Ops ----

export const syncRuns = pgTable("sync_runs", {
  id: id(),
  kind: text("kind").notNull(), // cron | manual | players
  triggeredBy: uuid("triggered_by"), // null = cron
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  ok: boolean("ok"),
  games: integer("games").notNull().default(0),
  lines: integer("lines").notNull().default(0),
  error: text("error"),
});
