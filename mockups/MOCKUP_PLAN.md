# Mockup plan: finding the look and feel

**Goal:** land on one design direction for Hoops League that feels like a good fantasy-football app (clear, scannable, not confusing like Sleeper), works equally well on a phone and a laptop, and then apply it to the real app.

Open **[index.html](index.html)** in a browser to review everything. Toggle Mobile / Desktop at the top, mark a preference per screen, add notes, then press **Copy my picks** and paste the result into chat.

## What is in this folder

| Path | What it is |
|---|---|
| `index.html` | Gallery: every screen in 3 directions, phone and desktop, with pick buttons and notes |
| `screens/<screen>-<a\|b\|c>.html` | The individual mockups. Static, responsive, open any one on its own |
| `assets/base.css` | Shared layout and components (cards, rows, chips, tables, sheets) |
| `assets/a.css`, `b.css`, `c.css` | One file per visual direction. Only colors, shape, and a few overrides |
| `lib.mts`, `screens.mts`, `build.mts` | Generator. Edit data or markup once, run `npx tsx mockups/build.mts` |
| `shoot.mts` | Renders every page to `png/` (`npx tsx mockups/shoot.mts`); also fails loudly on mobile horizontal overflow |
| `current/` | Screenshots of the **real app today** (phone and desktop), plus `baseline/` from before the responsive pass |

## The three directions

| | A · Broadcast | B · Clean Cards | C · Arena |
|---|---|---|---|
| Inspired by | ESPN Fantasy | Yahoo Fantasy | Sports-betting and live-score apps |
| Mood | Newsroom: dense, authoritative | Friendly and roomy | Game night: dark, big numbers |
| Colors | Black title bar, red accent | White and purple, pink pop | Near-black, lime accent |
| Desktop nav | Top tabs under a dark bar | Left sidebar | Pill tabs in the top bar |
| Mobile nav | Bottom tabs | Bottom tabs with icons | Floating bottom pill |
| Players | Sortable-looking table | Large rows with chips | Compact dark rows |
| Strength | Most data per screen | Easiest for new players | Most dramatic scoreboard |
| Risk | Can feel heavy on a phone | Less dense for power users | Dark-only; glare in sunlight |

We take interaction patterns from these apps (matchup header, slot labels, roster rows, tabs). We do **not** copy their logos, names, colors, or assets.

## Screen inventory

| # | Screen | In the app today | Notes for the design review |
|---|---|---|---|
| 1 | Log in / sign up | yes | Username or email; no reset flow by design |
| 2 | My leagues | yes | Create / join, install prompt |
| 3 | Matchup (home) | yes | The most-used screen. Hero style differs per direction |
| 4 | My team + Lock-In | yes | The core interaction: lineup plus the Lock button |
| 5 | Lock-In sheet | partly (inline button today) | Bottom sheet with the strict-mode deadline |
| 6 | Players / free agents | yes | Add vs Claim |
| 7 | Waivers | partly | Pending claims and priority order |
| 8 | Draft room | yes | Clock, best available, picks, board grid |
| 9 | Trades | yes | Offer builder and history |
| 10 | Standings + playoffs | yes | Bracket is new visually |
| 11 | League + commissioner | yes | Invite, rules, scoring |
| 12 | Admin: game formats | yes | Switch formats any time |
| 13 | Bets and parlays | future | Play money, loser lends a player |
| 14 | Install on iPhone | yes | Add to Home Screen walkthrough |

## Discovery process (4 rounds)

1. **Gut check (10 min).** In the gallery, pick A, B, C, Mix, or None on each screen. No overthinking; notes are optional.
2. **Mix the parts.** Wherever you answered "Mix", we combine specific elements. The questions below settle most of it.
3. **Real-data pass.** Apply the winner to the actual app using the demo league, compare against `current/` screenshots, and adjust density and spacing on real content (long names, injuries, 0-point games).
4. **States and polish.** Design what mockups usually skip: empty, loading, error, live game, offline, first-run, and the champion screen. Then add the final screenshots to the README.

## Questions to answer

| Topic | Options | Where to look |
|---|---|---|
| Navigation | Bottom tabs everywhere, sidebar on desktop, or top tabs | Matchup in A / B / C, desktop view |
| Density | Dense table, balanced rows, or roomy cards | Players (A is a table, B and C are lists) |
| Scoreboard hero | Dark strip with a split bar, purple card, or giant glowing numbers | Matchup |
| Theme | Light, dark, or a user toggle | A and B vs C |
| Lock-In | Inline Lock button on each game, or a confirmation sheet | My team vs Lock-In sheet |
| Player images | Real headshots, or initials on team color | Mockups use initials; the real app uses headshots with initials as fallback |
| Brand color | Red, purple, lime, or something custom | All screens |
| Phone first or desktop first | Which device do you and your friends actually use? | Toggle in the gallery |

## Decision log (fill in as we go)

| Decision | Choice | Date |
|---|---|---|
| Overall direction | _tbd_ | |
| Navigation | _tbd_ | |
| Theme (light / dark / toggle) | _tbd_ | |
| Brand color | _tbd_ | |
| Lock-In interaction | _tbd_ | |

## Screens still to design after round 1

Empty states (no leagues, no players), loading skeletons, first-run onboarding, player detail drawer (game log), notifications center, commissioner trade review, draft pick queue, season recap and champion screen, bet history, loan tracker, and the phone home-screen icon and splash.

## Design rules we hold regardless of direction

- Touch targets at least 44 px; inputs at 16 px so iOS does not zoom.
- Text contrast of at least 4.5:1 in every theme.
- Safe-area padding for the iPhone notch and home bar.
- Never rely on color alone for status (chips carry a label).
- One primary action per screen.

## From mockup to the real app

1. Move the winning palette and radii into design tokens in `src/app/globals.css`.
2. Rebuild the shell (`src/app/league/[id]/layout.tsx`, `LeagueNav`) to the chosen navigation.
3. Restyle shared pieces once (`.card`, `.btn`, `.chip`, player rows), and the pages inherit it.
4. Re-run `npx tsx scripts/screenshots.mts mockups/current` and compare side by side with the mockups.
