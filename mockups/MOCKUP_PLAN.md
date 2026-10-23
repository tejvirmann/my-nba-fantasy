# Mockup plan: Clean (decided)

**Decision (Oct 2026):** the **Clean** look is the app's look: ESPN Fantasy's structure (4 tabs, week bar, slot, headshot, 3-line rows, wide desktop roster table) in a quieter skin: white surfaces, hairline dividers, Inter, dark player names, and the user's accent color only on the logo mark, active tab and main buttons. Variants A (faithful), B (minimal), C (compact) and the A1/A2/A3 refinements were explored and dropped.

Review in the browser at **http://127.0.0.1:4100/index.html** (`cd mockups && python3 -m http.server 4100 --bind 127.0.0.1`, regenerate with `npx tsx mockups/build.mts`). The real app implements these screens (`mockups/current/` has its screenshots).

## Decisions

| Topic | Decision |
|---|---|
| Look | Clean (`mockups/assets/refined.css`, ported into `src/app/globals.css`) |
| Auto Lock-In | Toggle on the roster. Open mode: highest game counts. Strict mode: locks the first game at or above a threshold (a true "highest" is impossible when games lock before the next tip-off) |
| Matchup | Swipe strip of every matchup this week; tap one to open that lineup (other benches hidden) |
| Draft room | Headshot + FPTS, HIGH game, PTS/REB/AST/STL/BLK in the table; click a player for a card with season averages and last 5 games |
| Desktop roster | ESPN team page: team card with last/current matchup, Set lineup bar, table with OPP, STATUS, SCORE, OPRK (opponent defense rank vs position), PRK, FPTS, AVG, LAST |
| Install | A tab in the League sub-nav, a header link and a tappable banner on the home screen |
| Color | Every user picks their own in Account; default green; only they see it |
| Dark mode | Not planned |

## Earlier exploration (for reference)

## What we took from the ESPN baseline

| Pattern | Where it shows up |
|---|---|
| Green title bar | Header on every screen. Color is the user's accent (default `#0c8312`, sampled from the screenshot) |
| 4 text tabs with a thick underline on the active one | ROSTER · MATCHUP · PLAYERS · LEAGUE. Trades, Activity, Draft, Settings and Standings live under LEAGUE as a pill sub-nav, so nothing is crowded |
| Week selector with chevrons | Roster and Matchup (`‹ Week 3 ›`) |
| Gray toolbar with outlined pill buttons | Auto-pick, Matchup, Find players |
| Roster row | Outlined **slot pill** (lock icon once locked), large round headshot, short name (`J. Brown`) with team and position, `Wk 49.6 \| Avg 41.2`, and `vs CLE, W 118-104` |
| Light striping, hairline dividers, section headers in caps | Every list |
| Draft room | Green header, dark-green **pick strip** with the clock and upcoming picks, then three columns: queue and roster, players table, picks list |

## The three variations (all ESPN-based)

| | A · Faithful | B · Minimal | C · Compact |
|---|---|---|---|
| Idea | The baseline exactly | Same structure, far less chrome | Table-first for power users |
| Header | Green bar | White bar, accent only on the logo | Slim green bar |
| Rows | Striped, outlined slot pills, blue links | No striping, plain slot labels, black names | Tight rows, stat columns always visible, accent links |
| Best for | Familiarity | Calm, modern, lots of whitespace | Heavy users who scan many numbers |

## Screens (15)

Log in · My leagues · Roster + Lock-In · Lock-In sheet · Matchup · Players · League: standings and bracket · League: trades · League: activity and waivers · Draft room · League: bets (future) · League: settings · Account and appearance · Admin: game formats · Install on iPhone.

## The color setting

- **Where:** Account → Appearance. Nine swatches (ESPN green first) plus a custom color picker, **Save color** and **Reset to ESPN green**.
- **Behavior:** previews instantly across the whole app, saved on your account, applied on every device you log in from.
- **Readability is automatic:** the text color on the accent (white or near-black) and the version of the accent used for links on white are derived from the chosen color, so even yellow stays legible. This is unit-tested.
- **In the gallery:** the Accent swatches at the top restyle every mockup at once.

## Discovery process

1. **Gut check (10 min).** Pick A, B, C, Mix or None per screen in the gallery.
2. **Mix.** Combine specific elements where you answered "Mix" (see questions below).
3. **Real-data pass.** The real app already follows variation A (see `mockups/current/`). We compare it with your picks and adjust density and spacing on real content.
4. **States and polish.** Empty, loading, error, live game, offline, first run, champion screen. Then final screenshots go in the README.

## Questions to answer

| Topic | Options |
|---|---|
| Header | Green bar (A, C) or white bar (B) |
| Links and names | ESPN blue (A), black (B), accent (C) |
| Row density | Roomy (B), baseline (A), tight with stat columns (C) |
| Slot pills | Outlined pills (A), plain text (B) |
| Lock-In | Lock pill that opens a sheet (current), or an inline game picker on the row |
| Draft queue | Add the ESPN-style pick queue with auto-draft from the queue |
| Dark mode | Not planned. Do you want it? |

## Decision log

| Decision | Choice | Date |
|---|---|---|
| Overall variation (A / B / C / mix) | _tbd_ | |
| Header style | _tbd_ | |
| Link color | _tbd_ | |
| Density | _tbd_ | |
| Dark mode | _tbd_ | |

## Not built yet (design first)

Pick queue and auto-draft from queue, player detail drawer with game log, notifications center, commissioner trade review screen, empty and loading states, season recap and champion screen, bets and loans (formats are registered; screen is mocked).

## Folder map

| Path | What |
|---|---|
| `index.html` | Gallery with accent control, phone/desktop toggle, picks and notes |
| `screens/<screen>-<a\|b\|c>.html` | Individual responsive mockups; the tabs link between screens |
| `assets/base.css` | The ESPN-style kit (header, tabs, rows, pills, tables, draft room) |
| `assets/a.css` `b.css` `c.css` | Variation overrides only |
| `assets/accent.js` | Applies the saved accent to a mockup |
| `lib.mts` `screens.mts` `build.mts` | Generator: edit once, run `npx tsx mockups/build.mts` |
| `shoot.mts` | Renders every page to `png/` and fails on mobile overflow |
| `current/` | Screenshots of the real app (`npx tsx scripts/screenshots.mts mockups/current`) |

## Design rules

Touch targets at least 44 px, inputs 16 px (no iOS zoom), 4.5:1 text contrast on any accent, safe-area padding on iPhone, status never shown by color alone, one primary action per screen.
