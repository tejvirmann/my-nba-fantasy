# Custom Fantasy Basketball App — Build Plan

**Goal:** Build a private fantasy basketball league for friends with a polished, familiar fantasy-sports UI, weekly head-to-head matchups, and **Option C: Lock-In scoring**. The first version targets one private league of 3–6 teams; no multi-league or advanced features yet.

> **UI note:** I’m treating “the fantasy app” as a Yahoo/ESPN-style fantasy basketball experience: dark or light sports dashboard, matchup scoreboard, roster table, player search, transactions, standings, and draft room. Recreate the *interaction patterns and information hierarchy*, but use your own name, colors, icons, and assets rather than copying another app’s exact branding or proprietary artwork. If you mean a specific app, use screenshots of its screens as a reference when implementing.

---

## 1. Recommended stack

All TypeScript, serverless, deployed on Vercel.

| Layer | Choice | Why |
|---|---|---|
| App | **Next.js + TypeScript**, built as a **mobile-first PWA** | iPhones can "Add to Home Screen" for an app-like icon, full-screen mode, and push (iOS 16.4+); updates ship on deploy |
| UI | **Tailwind CSS + shadcn/ui** | Fast, consistent, responsive |
| Database | **Supabase Postgres** | Managed Postgres with a free tier |
| Auth | **Supabase Auth** (email + password, reset by email) with **Resend** as the email sender | One vendor for DB and auth; replaces Clerk |
| ORM / migrations | **Drizzle ORM** | Typed SQL, versioned migrations |
| Hosting / jobs | **Vercel** + Vercel Cron | Deploys and scheduled sync (secret-protected) |
| Data | **ESPN unofficial API** behind a provider adapter | Free, tested; see section 2 |
| Tests | **Vitest + Playwright** | Scoring/transaction unit tests; browser tests for draft and lineup |

**Shape for a future iOS app:** monorepo with `apps/web`, `packages/scoring` (pure TS), `packages/db`, and later `apps/mobile` (Expo). Expose logic through HTTP route handlers, not only Next server actions, so a mobile client can call them.

**iOS distribution later:** TestFlight ($99/yr Apple Developer account) beats AltStore for friends (public link, auto-updates, no computer needed).

### Environment variables

Secrets live in `.env.local` and Vercel settings, never in committed files or chat.

```env
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
CRON_SECRET=
```

---

## 2. The hardest part: stats, images, and permissions

### Data source decision (researched and tested)

Constraint: **no paid APIs.**

| Source | Result |
|---|---|
| **ESPN unofficial API** (`site.api.espn.com/apis/site/v2/sports/basketball/nba/...`) | **Primary.** Free, no key. Tested: scoreboard by date, and `summary?event=<id>` returns per-player box scores (MIN, PTS, FG, 3PT, FT, REB, AST, TO, STL, BLK, OREB, DREB, PF, +/-) with each athlete's ID and headshot URL. Undocumented, so it can change without notice. |
| Highlightly (free tier, 100 requests/day) | Possible free backup for box scores; unverified for our use. |
| BALLDONTLIE | Free tier has no player stats; stats are paid. Not used. |
| NBA.com CDN / stats.nba.com / `nba_api` (Python) | Blocked or unreliable from cloud IPs (CDN returned 403 in testing); wrong language for the stack. Useful only for one-off local historical backfill. |
| SportsDataIO / Sportradar | Licensed but enterprise-priced. Only if the app is ever commercialized. |

**Risk plan if ESPN breaks:** (1) every stat row is stored in our DB, so history is safe; (2) the adapter makes a second provider a small change; (3) the commissioner gets a manual stat-override screen; (4) the UI shows "stats last updated at ..." instead of silently going stale. Add a daily contract test that fetches one known game and verifies the response shape.

**Terms:** ESPN's endpoints are unofficial and not licensed for redistribution. Acceptable for a private friends league; revisit before opening it to the public or charging money. NBA terms: https://www.nba.com/termsofuse

### Player images

- Store `espn_player_id` and `image_url` on `players`; show the headshot URL directly (hotlink) with a fallback of initials on a team-color circle.
- Do not copy image files into our storage. It is the same licensing gray area with more liability. If images break, the fallback keeps the layout intact.

### Provider adapter

Put provider calls behind a small interface so the rest of the app never touches a vendor's response shape:

```ts
interface BasketballDataProvider {
  getPlayers(cursor?: string): Promise<PlayerPage>;
  getGames(from: string, to: string): Promise<Game[]>;
  getPlayerBoxScores(gameIds: string[]): Promise<PlayerGameStat[]>;
  getPlayerStatus?(): Promise<PlayerStatus[]>;
}
```

Implement `EspnProvider` first. Scoring consumes our own normalized rows.

---

## 3. Lock-In scoring rules (Option C)

Make the rules explicit in the league settings and test them before building the UI.

### Reference: how Sleeper's Lock-In works (verified from RotoWire and Sleeper support)

- One game per player per matchup week counts.
- After a player's game ends, the manager can lock it in. It must be locked **before that player's next game starts**.
- Only starters can be locked; locks are permanent.
- If nothing is locked, the player's **final game of the week** counts, even if it is a zero.

### Our version: a league setting `lock_mode`

| Mode | Behavior |
|---|---|
| `strict` (Sleeper replica) | Lock a finished game before the player's next tip-off, or the chance is gone. Default if unlocked: final game of the week. |
| `open` | Every finished game stays selectable until the week ends. Default if unlocked: the highest-scoring game. |

**Auto-pick (per-manager setting `auto_lock`)**
- In `open` mode: at week end, count the highest eligible game.
- In `strict` mode: lock the best game so far automatically when the player's next game is about to start, or lock any game at or above a manager-chosen threshold.

### Other rules (both modes)

- Matchups run Monday–Sunday in the league timezone; only games in that week count.
- Fixed starter and bench slots; benched players do not score.
- A manager cannot lock a game until it is final. Locks are unchangeable except by commissioner reset.
- Each score shows whether it was manually locked, auto-locked, or defaulted.
- No eligible game (or DNP) scores zero.
- If the provider corrects a box score, recompute affected performances and matchup totals, and keep an audit record.
- Keep rules as settings (`lock_mode`, `auto_lock`, scoring weights) so future custom rules are config, not rewrites.

### Fantasy points formula

Store scoring weights in league settings rather than hard-coding them. Example starter formula:

```text
points
+ rebounds * rebound_weight
+ assists * assist_weight
+ steals * steal_weight
+ blocks * block_weight
+ turnovers * turnover_weight
+ three_pointers_made * three_pointer_weight
```

For example, turnovers can have a negative weight. Decide whether field goals, free throws, double-doubles, and triple-doubles have bonuses before the draft. The formula above is only an example—not a universal scoring standard.

### Scoring data model

Store every provider box score once, then calculate a fantasy performance for the relevant league rules. Keep these concepts separate:

- **Raw stat line:** what the provider reports for a player in a real game.
- **Fantasy performance:** the point value calculated from that stat line under a specific league’s scoring settings.
- **Weekly selection:** which one eligible performance counts for a rostered player in that league and week.
- **Matchup total:** sum of selected performances from eligible starters.

Use decimal-safe numeric values if your scoring weights can produce fractions.

---


### Manual refresh button

Any league member can tap **Refresh stats**. It calls the same sync used by cron, with a shared cooldown (about 5 minutes) so the provider is not hammered. Every run is stored in `sync_runs` with `triggered_by` (user or cron) and shown in the UI: "Last refreshed by Sam, 3 min ago." Start with one daily scheduled sync plus the manual button; add a game-window cron later if wanted.

## 4. How to update stats reliably

Do not ask the browser to fetch stats every time someone opens a page. Use server-side ingestion into your own database.

### Scheduled pipeline

1. **Before the season:** sync teams and players; persist provider IDs and the season schedule.
2. **On a schedule:** fetch games in the relevant date window and upsert game status.
3. **During game windows:** poll in-progress games at a rate allowed by your provider plan. For a friends-only MVP, polling every few minutes is usually enough; do not exceed rate limits.
4. **After games:** fetch final box scores and upsert player-game stat rows.
5. **Reconcile:** re-fetch recent finals periodically (for example, the prior 2–3 days) because official box scores can be corrected.
6. **Recompute:** recalculate affected fantasy performances, Lock-In selections if the selected line changes, and matchup totals.
7. **Record health:** store last successful sync time, request errors, and how many games/box scores were processed.
8. **Alert or show a warning:** if the most recent sync is too old, show “Stats last updated at …” rather than silently presenting stale scores.

### Idempotency is essential

A sync may run more than once. Use a unique key such as `(provider, provider_game_id, provider_player_id)` for each player-game stat row, and perform an **upsert**. A retry must update a row, not create duplicate stats or add the same points twice.

Use a transaction for recalculating a matchup so users don’t briefly see half-updated totals. Store source timestamps and an ingestion timestamp.

### Vercel Cron

Vercel Cron can invoke protected routes such as:

- `GET /api/cron/sync-schedule`
- `GET /api/cron/sync-live-games`
- `GET /api/cron/reconcile-final-boxscores`

Require a `CRON_SECRET` on each endpoint. Use separate jobs if they have different schedules. Keep jobs short enough for your Vercel plan’s execution limits; if the workload grows, move ingestion to a dedicated worker/queue.

Docs: https://vercel.com/docs/cron-jobs

---

## 5. League features and rules

### League creation and membership

- Commissioner creates a league, sets the name, timezone, roster slots, scoring, schedule, waiver rules, draft settings, and playoff settings.
- Generate an invite link or invite code.
- A signed-in user accepts the invite and becomes a league member.
- Enforce membership and commissioner permissions on the server for every mutation.

### Drafting

Start with a **snake draft**:

1. Commissioner chooses the draft date/time, number of rounds, roster size, and draft order.
2. At the scheduled time, the draft room opens and displays the pick timer, available players, search/filter, roster needs, and draft board.
3. The order goes 1 → N in odd rounds, then N → 1 in even rounds.
4. Each pick is written to the database with a unique `(league_id, draft_id, overall_pick)` constraint.
5. The server verifies that the drafter owns the current pick and that the player is still available before committing the pick.
6. If the timer expires, apply the chosen policy: auto-pick best available by a configurable ranking, or pause/skip and alert the commissioner. For a friends’ league, auto-pick is usually simpler.
7. The draft ends when all roster slots/picks are complete; undrafted players become free agents.

Build a commissioner-controlled **pause/resume** function and a test/sandbox draft before the live draft.

### Rosters, adding players, and benching

Each team has roster slots such as PG, SG, SF, PF, C, G, F, UTIL, and bench. Choose your actual slot configuration before coding; NBA eligibility can be multi-position and should be stored separately from the roster slot.

- **Add/drop:** manager requests to drop one player and add an available player. The server validates roster limits, ownership, player availability, and waiver/free-agent rules.
- **Start/bench:** a roster move changes the player’s lineup assignment for the relevant scoring period, with a clear cutoff rule. For a simple weekly lineup, lock the lineup at the first NBA game of the matchup week; alternatively, allow daily lineup changes until each player’s real-life game starts. Pick one policy and display it clearly.
- **Position eligibility:** validate that a player can occupy the requested slot, including UTIL slots.
- **Roster history:** record every change in a transaction log; don’t just overwrite the current roster.

For Lock-In scoring, the app needs to show the selected weekly performance on each player row, plus a button to lock a finalized performance.

### Waivers and waiver priority

Use a standard rolling waiver order for the first version:

- Every team has a waiver priority rank.
- When a claim is processed successfully, the winning team moves to the bottom of the order.
- If a player is dropped, they remain on waivers for a configurable period (for example, 1–2 days) before becoming a free agent.
- Claims include a desired add, a player to drop if required, submission time, priority at processing time, and result.
- Process claims on the server at a scheduled time in a single transaction, so two managers cannot win the same player.
- Let the commissioner inspect and manually adjust the order, with an audit log.

Later you can add FAAB (blind bidding with a budget), but don’t build both systems in the MVP.

### Trades

- Manager proposes a trade by selecting players from both rosters.
- The other manager accepts or rejects before an expiration time.
- Optional league veto period; choose either commissioner approval or league vote, not both by accident.
- On approval, the server revalidates that both teams still own the players, roster limits/positions remain valid, and neither team is blocked by another pending transaction.
- Apply the trade atomically in one database transaction.
- Record proposer, timestamps, status, players exchanged, and veto/commissioner decisions.
- Notify both teams and the league as configured.

Trades should **not** change historical points or the original owner of past game stats. They only change roster ownership going forward.

### Joining halfway through the season

Support this deliberately rather than improvising:

- Commissioner sends an invite; new member signs in and joins an **unclaimed team slot**.
- If there is an abandoned team, the commissioner can transfer that team to the new manager, retaining its roster and record.
- If no team is available, the commissioner can create an expansion team if the league allows it.
- Set a configurable “new team starts now” policy. Recommended: they get a normal roster and can compete from the next scoring period, but **do not receive retroactive points**.
- For a mid-season expansion, use a short supplemental draft or let the new team pick from free agents, depending on how many good players remain.
- Make the commissioner confirm the choice, because changing team count affects schedule balance and playoffs.

For the first version, simplest policy: only fill an existing abandoned team; otherwise the commissioner must explicitly enable an expansion team.

### Playoffs

Recommended default for a small friend league:

- Regular-season standings use weekly head-to-head matchup wins/losses (and ties if enabled).
- Top 4 teams qualify in a 6–8-team league; top 6 can work for larger leagues. Make playoff slots configurable.
- Seed by regular-season record; tiebreakers: head-to-head record, total fantasy points, then commissioner decision.
- Use single-elimination matchups, with each round lasting one scoring week.
- Championship is the final round; remaining teams can play a consolation bracket if desired.
- Set the playoff start week and number of rounds before the season. Account for NBA schedule timing and the fantasy season’s end.
- Do not automatically assume the real NBA playoff schedule is the fantasy playoff schedule; configure your fantasy bracket explicitly.

---

## 6. Database design

Use migrations from the beginning. A practical first schema:

| Table | Purpose / important fields |
|---|---|
| `users` | `id`, `clerk_user_id`, display name, avatar |
| `leagues` | name, timezone, season, status, commissioner ID, settings JSON or normalized settings |
| `league_members` | league, user, team, role, joined timestamp |
| `teams` | league, manager, name, seed, record |
| `players` | provider IDs, name, team, position eligibility, image URL, active status |
| `games` | provider game ID, start time, status, home/away teams, final scores |
| `player_game_stats` | provider game ID + player ID unique key; raw stat line; source update timestamp |
| `roster_slots` | league/team slot definitions and eligible positions |
| `roster_moves` | player, from team/slot, to team/slot, effective time, transaction ID |
| `weekly_performances` | league, player, week, source game, calculated fantasy points |
| `weekly_locks` | team, player, week, selected performance, locked time, manual/automatic |
| `matchups` | league, week, team A, team B, final/current scores, result |
| `drafts` | league, status, configuration, pick timer, draft order |
| `draft_picks` | draft, overall pick, round, team, player, timestamp |
| `waiver_claims` | league, team, add/drop players, priority snapshot, status, timestamps |
| `waiver_priority` | league, team, current priority |
| `trades` / `trade_assets` | proposal, status, participants, exchanged players, audit timestamps |
| `transactions` | immutable log of adds, drops, lineup changes, trades, commissioner actions |
| `sync_runs` | job name, start/end, success, counts, error summary |

Use foreign keys and unique constraints to protect invariants. For every write, verify the user is a member of that league and has permission to perform the action.

### Do not store only a single `fantasy_points` field on `players`

A player can have different points in different games, weeks, and leagues because scoring settings differ. Store raw game stats once; calculate league-specific fantasy performance from the league’s scoring rules.

---

## 7. Pages and UI structure

Build in this order:

1. **Sign in / create league** — join via invite code.
2. **League home** — current matchup, team scores, schedule, standings, recent transactions, and last stat-sync time.
3. **My Team** — starters and bench, player photos/fallbacks, position, next game, Lock-In score, locked/unlocked state, move-to-bench/start controls.
4. **Matchup** — head-to-head roster comparison, player-level stats, Lock-In selections, and matchup scoring.
5. **Players** — searchable/filterable player pool with position/team/status, season averages if available, upcoming games, and add/claim action.
6. **Waivers & Transactions** — claims, priority order, pending claims, completed moves, and trade proposals.
7. **Draft Room** — draft board, pick timer, available player list, team roster panels, and commissioner pause/resume.
8. **Standings & Playoffs** — records, points, seeds, bracket, and playoff weeks.
9. **League Settings / Commissioner Tools** — rules, members, schedule, scoring weights, waivers, playoff configuration, and audit log.

### Visual design principles
- Run the ESPN spike script (`scripts/espn-spike.mts`): schedule, final box scores, player IDs, headshot URLs.
- Check request limits and decide the fallback if ESPN breaks (see section 2; no paid fallback).
- Save sample API responses as fixtures for tests.
- Use clear status chips for **Live / Final / Locked / Auto-selected / Waivers / Injured**.
- Player headshots should be consistent in size, with a fallback that never breaks the layout.
- Use skeleton loading states, empty states, and “last updated” timestamps.
- Make the most important actions obvious: set lineup, lock score, add/claim player, propose trade.
- Keep the data model and business rules authoritative on the server; the UI should reflect the server result.

---

## 8. Build sequence (MVP to complete league)

### Phase 0 — Verify data before building
- Create a provider account and test player lookup, schedule, final box scores, in-progress stats, and image availability.
- Check request limits and whether your intended private fantasy use is allowed.
- Save sample API responses as fixtures for tests.
- Decide roster slots, scoring weights, lineup lock policy, waiver policy, and playoff settings.

**Deliverable:** a small script that fetches a game and writes normalized player stats to Postgres.

### Phase 1 — Foundation
- Create Next.js + TypeScript project.
- Add Tailwind/shadcn, Supabase (DB + Auth), Resend, and Drizzle.
- Add migrations, seed data, basic auth, league creation, invites, and league membership checks.
- Build player/team/game tables and the provider adapter.

**Done when:** a signed-in user can create a league and see a populated player directory.

### Phase 2 — Scoring engine and sync
- Implement stat ingestion and idempotent upserts.
- Implement scoring weights and a pure scoring function.
- Implement weekly performance records and Lock-In selection rules.
- Add sync health and manual commissioner “resync” action.
- Write tests for missing games, DNPs, stat corrections, duplicate syncs, locked scores, and bench eligibility.

**Done when:** re-running the same feed twice does not change the result, and sample matchups score correctly.

### Phase 3 — Teams, matchups, lineup
- Add roster slots, starters/bench, add/drop, weekly matchup generation, and matchup scoring.
- Add player search, profile/detail panel, team and matchup screens.
- Add weekly Lock-In selection UX.

**Done when:** two test teams can manage rosters and see correct weekly totals.

### Phase 4 — Draft
- Implement snake-draft order, draft board, pick timer, pick validation, auto-pick, pause/resume, and commissioner controls.
- Use server-side transactions and a unique constraint to prevent duplicate picks.
- Run a mock draft with test users.

**Done when:** two users cannot pick the same player even if they click at the same time.

### Phase 5 — Waivers and trades
- Implement rolling waiver priority, claims, processing, free agents, trade proposals, acceptance, approval/veto, and transaction history.
- Add server-side concurrency protection for claims and trades.

**Done when:** simultaneous claims cannot award one player to two teams, and a trade is atomic.

### Phase 6 — Standings, playoffs, and polish
- Implement standings, tiebreakers, playoff seeding/bracket, consolation games if desired, notifications, responsive UI, error states, and accessibility.
- Test mid-season replacement/expansion policies and commissioner overrides.
- Add backups, error monitoring, and a data-sync status panel.

**Done when:** the league can run from draft through championship without manual database edits.

---

## 9. Critical tests

Write tests for these before inviting your friends:

- Same provider stats ingested twice → no duplicates.
- Provider corrects a final box score → fantasy performance and matchup update correctly.
- Player plays multiple games in one week → only the chosen Lock-In performance counts.
- Player has no games / is DNP → no phantom score.
- Benched player → does not count.
- Locked score → cannot be changed by normal manager action.
- Waiver claims for the same player → only one winner.
- Draft pick race → only the current team can successfully draft the player.
- Trade accepted while a player is dropped/traded elsewhere → stale trade rejected.
- User from another league tries to edit a roster → forbidden.
- New manager joins mid-season → no retroactive points.
- Cron request without the secret → rejected.
- Data provider is unavailable → show stale-data warning; do not silently reset scores.

---

## 10. What to build first—and what not to build yet

**Build first:** auth, league creation, player directory, stats sync, scoring engine, Lock-In selection, roster/lineup, matchup scoreboard.

**Build after that:** live draft, waiver processing, trades, playoffs, notifications.

**Later (planned):** betting (play-money parlays) where the loser loans a player to the winner for a set period. Add a `loan` transaction type with an expiry to the roster-move log so this needs no rewrite.

**Defer:** chat, keeper/dynasty leagues, auction drafts, FAAB, custom scoring editor UI, mobile app, real-time websockets, and multiple sports.

The scoring engine and data pipeline are the foundation. If those are reliable and testable, the UI and league-management features become much easier to add.

---

## 11. Official documentation to keep open

- ESPN API (unofficial, community-documented): test with `scripts/espn-spike.mts`
- NBA.com terms of use: https://www.nba.com/termsofuse
- SportsDataIO data rights/licensing: https://sportsdata.io/help/data-rights-and-licensing-questions
- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs
- Supabase docs: https://supabase.com/docs
- Resend docs: https://resend.com/docs
- Drizzle ORM: https://orm.drizzle.team/docs/get-started-postgresql
- Next.js documentation: https://nextjs.org/docs

## 12. Final recommendation

Build a **mobile-first PWA** in TypeScript: Next.js + Tailwind/shadcn on Vercel, Supabase (Postgres + Auth), Drizzle, and a provider adapter with **ESPN's unofficial API** as the free primary source. Keep the database as the canonical source for league state and normalized stats, use scheduled idempotent ingestion plus a member-triggered refresh button, and keep the scoring engine a pure, tested TypeScript package that a future React Native app can reuse.

Target: a private 3–6 team league with snake draft, fixed roster slots, Sleeper-style Lock-In scoring (strict and open modes), rolling waivers, trades, and a playoff bracket. Betting/loan-a-player comes after the core is trustworthy.


---

## 13. Admin, game formats, and betting

**Admin accounts.** A platform admin can open `/admin`. Admins are the built-in `admin` account (login username `admin`, created by `scripts/seed-admin.mts`) and every email listed in the `ADMIN_EMAILS` environment variable. Admins can promote or demote other users, force a full data sync, and switch game formats per league at any time during the season.

> **Change the default admin password before sharing the site.** The seeded password is intentionally simple for local use. Use `/account` to change it.

**Game formats** live in one registry (`src/core/formats.ts`), stored per league in `leagues.settings.formats`, and are toggled from the admin screen. Each change is written to the league's transaction log.

| Format | Status | Notes |
|---|---|---|
| Lock-In: Strict (Sleeper rules) | live | Exclusive with Open |
| Lock-In: Open | live | Every finished game selectable until the week ends |
| Manager auto-pick | live | Highest game (open) or threshold auto-lock (strict) |
| Betting and parlays | planned | See below |
| Loser loans a player | planned | Needs the betting settlement step |
| FAAB blind bidding | planned | Replaces rolling priority |
| Double-points week | planned | Commissioner marks a week |

**Adding a format:** add an entry to `FORMATS`, read `isFormatEnabled(settings, id)` where behavior changes, add a test. Admin UI and toggles appear automatically.

**Betting (captured, not built).** Play-money only. Design so far:

- Tables: `bets` (user, league, stake, status), `bet_legs` (target: matchup winner or player-week fantasy points over/under, line, odds, result), `balances` (play-point ledger per user per league).
- Parlays: a bet with several legs; pays only if all legs hit; odds multiply.
- Lines come from our own data: matchup lines from current scores plus season averages, player props from a player's average fantasy points. No external odds feed.
- Settlement runs inside the existing finalize step once a week is final, so every leg resolves from the same stat rows the scoring engine uses.
- Loans: when a bet is lost and "loan a player" is on, a `loans` row moves a player to the winner for N days and a scheduled step returns them. A loaned player scores for the borrower and cannot be dropped or traded.
- We intentionally keep this to play points. Real-money wagering between friends has legal complications.

## 14. iPhone and mobile app plan

**How installing works.** The site is a PWA (progressive web app). On iPhone, open it in Safari, tap Share, then **Add to Home Screen**. It gets its own icon and opens full-screen with no browser bars. There is no App Store step, and updates arrive automatically the next time the app opens after we deploy. `/install` explains this in the app, step by step, for iPhone, Android, and desktop.

| Phase | What | Status |
|---|---|---|
| 1. Installable | Web manifest, icons (192/512/180), standalone display, theme color, safe-area padding, `/install` help page | done |
| 2. Polish | Splash screens for common iPhone sizes, 16 px inputs so iOS does not zoom, overscroll and pull-to-refresh behavior, an in-app "Add to Home Screen" prompt for iOS Safari users | next |
| 3. Push notifications | Web Push (works on iOS 16.4+ only for the installed home-screen app): service worker, VAPID keys, a `push_subscriptions` table, opt-in prompt. Triggers: your draft pick is up, lock deadline in 1 hour, trade offer received, waiver result, matchup final | planned |
| 4. Offline and speed | Service worker caches the app shell; scoreboard and roster use stale-while-revalidate so the app opens instantly | planned |
| 5. Native app (optional) | Expo / React Native client reusing `src/core` (extract it to `packages/core`) and the same API. Distribute with **TestFlight** ($99/year Apple Developer account): friends tap a link, install, and get automatic updates, with no computer needed (this replaces AltStore) | later, only if the PWA is not enough |

Why not AltStore: every friend needs a computer running AltServer, and apps expire every 7 days on a free Apple ID.

## 15. Performance and cost plan

Principles: serve everything from our database, keep requests per page small, never recompute what has not changed.

- **Provider calls are the only external cost, and they are capped.** One daily cron plus a manual refresh with a shared 5-minute cooldown. Only finals that have no stat rows, or finished in the last 36 hours, are re-fetched. A sync is about 50 requests.
- **One identity check per request.** The middleware verifies the session once (locally when Supabase uses asymmetric keys) and forwards it as trusted headers; pages and layouts read it with no extra Auth call. Membership and the current user are memoized per request.
- **Query budget.** Pages aim for a handful of round-trips, all independent queries run in parallel, and ranking aggregates are cached in memory for 5 minutes. Set `LOG_QUERIES=1` to print every query during development.
- **Region.** Vercel functions are pinned to `iad1`, next to the Supabase database, which turns about 150 ms per query from a laptop into a few milliseconds.
- **Draft room polling** runs every 4 seconds and pauses while the tab is hidden. Auto-picks happen lazily when someone loads the room, with no always-on worker.
- **Idempotent writes.** Stats are upserted on `(game, player)`; waivers, trades, and picks run in transactions with row locks.
- **Cost today:** Supabase free tier (about 25k stat lines per season), Vercel hobby, ESPN free. Expected spend: $0.

## 16. Design and mockup phase

See [mockups/MOCKUP_PLAN.md](mockups/MOCKUP_PLAN.md). Three directions (Broadcast, Clean Cards, Arena) are mocked for 14 screens on phone and desktop in [mockups/index.html](mockups/index.html). The real app already has a responsive shell (sidebar and two-column pages on desktop, bottom tabs on phones); the chosen direction will be applied as design tokens.

## 17. Status

| Area | State |
|---|---|
| Scoring, Lock-In (both modes), weeks, draft, schedule, standings, playoffs, waivers, trades | done and tested (51 unit tests plus a full-season simulation) |
| Data sync from ESPN, history backfill, refresh button with attribution | done |
| Accounts, admin, game-format switches, demo league | done |
| Responsive layout (phone and desktop) | done, pending design direction |
| Mockups and discovery plan | done, awaiting picks |
| PWA install | basic (phase 1) |
| Push notifications, offline, native app | planned |
| Betting, loans, FAAB, double-points week | planned (formats registered) |
| Commissioner stat-override screen | planned |
