import { avatar, chip, esc, icon, MINE, POOL, pos, STANDINGS, teamAvatar, THEIRS, TEAM_COLORS, type P, type Variant } from "./lib.mts";

export type Screen = {
  id: string;
  title: string;
  /** Which nav tab is highlighted; null hides the league nav (auth, account-level pages). */
  active: string | null;
  description: string;
  render: (v: Variant) => string;
  /** Raw HTML placed outside .main (modals). */
  overlay?: (v: Variant) => string;
};

const starters = MINE.filter((p) => p.slot !== "BN");
const bench = MINE.filter((p) => p.slot === "BN");
const mineTotal = starters.reduce((s, p) => s + p.pts, 0);
const theirTotal = THEIRS.reduce((s, p) => s + p.pts, 0);
const f1 = (n: number) => n.toFixed(1);

const section = (title: string, body: string, right = "") =>
  `<section class="card"><div class="card-h"><span>${title}</span>${right}</div>${body}</section>`;

function playerRow(p: P, extra = "", right = "") {
  return `<div class="player">${avatar(p.name, p.team)}<div class="grow"><div class="nm">${esc(p.name)}</div><div class="meta">${pos(p.slot || p.pos)} ${p.team} ${p.inj ? chip(p.inj, "bad") : ""}</div>${extra}</div>${right}</div>`;
}

const scoreboardCard = () =>
  section(
    "League scoreboard",
    `<div class="divide">
      <div class="player"><div class="grow nm">Admin FC</div><div class="tnum" style="font-weight:800">261.2 – 280.9</div><div class="grow nm" style="text-align:right">Jo's Jumpers</div></div>
      <div class="player"><div class="grow nm">Sam's Splash Bros</div><div class="tnum" style="font-weight:800">314.6 – 279.9</div><div class="grow nm" style="text-align:right">Tejvir's Squad</div></div>
    </div>`,
  );

const refreshCard = () =>
  `<div class="card"><div class="card-b row between"><div><div class="nm" style="font-weight:800;font-size:13px">Stats updated 13 min ago</div><div class="sub">by Tejvir</div></div><button class="btn sm">Refresh stats</button></div></div>`;

const activityCard = () =>
  section(
    "Recent activity",
    `<div class="divide">${[
      ["Sam's Splash Bros", "locked in Stephon Castle", "4 min"],
      ["Jo's Jumpers", "added Jalen Johnson", "1 hr"],
      ["Admin FC", "proposed a trade to Tejvir's Squad", "3 hr"],
      ["Tejvir's Squad", "won Ayo Dosunmu on waivers", "9 hr"],
    ].map(([t, a, w]) => `<div class="player"><div class="grow"><b>${t}</b> <span class="sub">${a}</span></div><span class="sub">${w}</span></div>`).join("")}</div>`,
  );

// ---------------------------------------------------------------- matchup (variant-specific hero)
function matchup(v: Variant) {
  const sideRows = (list: P[]) => list.map((p) => playerRow(p, "", `<div class="pts tnum">${f1(p.pts)}<small>${p.slot === "UTIL" ? "UTIL" : p.slot}</small></div>`)).join("");

  if (v === "a") {
    const lead = (mineTotal / (mineTotal + theirTotal)) * 100;
    const rows = starters.map((p, i) => {
      const o = THEIRS[i];
      return `<div class="cell">${avatar(p.name, p.team, "sm")}<div class="grow"><div class="nm" style="font-weight:800;font-size:13px">${esc(p.name)}</div><div class="meta" style="font-size:11px;color:var(--muted)">${p.team} · ${p.line}</div></div><span class="pt tnum">${f1(p.pts)}</span></div>
      <div class="slot">${p.slot}</div>
      <div class="cell r">${avatar(o.name, o.team, "sm")}<div class="grow"><div class="nm" style="font-weight:800;font-size:13px">${esc(o.name)}</div><div class="meta" style="font-size:11px;color:var(--muted)">${o.team}${o.inj ? " · " + o.inj : ""}</div></div><span class="pt tnum">${f1(o.pts)}</span></div>`;
    }).join("");
    return `<div class="stack"><h1 class="title">Matchup · Week 3</h1>
      <div class="grid-2"><div class="stack">
        <div class="hero-a"><div class="grid">
          <div class="team">${teamAvatar("Tejvir's Squad", "#c8102e", "lg")}<div><div class="score tnum">${f1(mineTotal)}</div><div class="sub" style="color:#aeb4bf">Tejvir's Squad · 2-1</div></div></div>
          <div class="vs">VS</div>
          <div class="team r">${teamAvatar("Jo's Jumpers", "#2563eb", "lg")}<div><div class="score tnum">${f1(theirTotal)}</div><div class="sub" style="color:#aeb4bf">Jo's Jumpers · 1-2</div></div></div>
        </div><div class="bar"><i style="width:${lead}%;background:#c8102e"></i><i style="flex:1;background:#2563eb"></i></div></div>
        <section class="card"><div class="card-h"><span>Starters</span>${chip("Strict Lock-In", "")}</div><div class="h2h">${rows}</div></section>
      </div><div class="stack">${scoreboardCard()}${refreshCard()}${activityCard()}</div></div></div>`;
  }

  if (v === "b") {
    const team = (name: string, color: string, rec: string, list: P[], total: number) =>
      `<section class="card teamcard"><div class="head"><div class="row">${teamAvatar(name, color)}<div><div class="nm" style="font-weight:800">${name}</div><div class="sub">${rec}</div></div></div><div style="font-size:24px;font-weight:800" class="tnum">${f1(total)}</div></div><div class="divide">${sideRows(list)}</div></section>`;
    return `<div class="stack"><div class="row between"><h1 class="title">Week 3 matchup</h1>${chip("Ends Sun, Nov 8", "info")}</div>
      <div class="hero-b"><div class="teams"><div><span class="pill">You</span><div class="score tnum" style="margin-top:8px">${f1(mineTotal)}</div><div style="font-size:12px;opacity:.85;margin-top:4px">Tejvir's Squad</div></div><div style="font-weight:800;opacity:.7">vs</div><div style="text-align:right"><span class="pill">Opponent</span><div class="score tnum" style="margin-top:8px">${f1(theirTotal)}</div><div style="font-size:12px;opacity:.85;margin-top:4px">Jo's Jumpers</div></div></div></div>
      <div class="grid-2 even">${team("Tejvir's Squad", "#6001d2", "2-1 · 4th in points", starters, mineTotal)}${team("Jo's Jumpers", "#ff4d6d", "1-2", THEIRS, theirTotal)}</div>
      <div class="grid-2 even">${scoreboardCard()}${activityCard()}</div>${refreshCard()}</div>`;
  }

  const pct = Math.round((mineTotal / (mineTotal + theirTotal)) * 100);
  const compact = starters.map((p, i) => {
    const o = THEIRS[i];
    return `<div class="player" style="display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:8px;padding:10px 12px">
      <div class="row">${avatar(p.name, p.team, "sm")}<div><div class="nm" style="font-size:13px">${esc(p.name.split(" ").slice(-1)[0])}</div><div class="meta">${p.team}</div></div><span class="tnum" style="margin-left:auto;font-weight:800">${f1(p.pts)}</span></div>
      <div>${pos(p.slot)}</div>
      <div class="row" style="flex-direction:row-reverse"><span style="width:0"></span>${avatar(o.name, o.team, "sm")}<div style="text-align:right"><div class="nm" style="font-size:13px">${esc(o.name.split(" ").slice(-1)[0])}</div><div class="meta">${o.team}</div></div><span class="tnum" style="margin-right:auto;font-weight:800">${f1(o.pts)}</span></div></div>`;
  }).join("");
  return `<div class="stack"><div class="hero-c"><div class="eyebrow">Week 3 · Live</div><div class="grid" style="margin-top:12px"><div><div class="score lead tnum">${f1(mineTotal)}</div><div class="tname">TEJVIR'S SQUAD</div></div><div class="eyebrow">vs</div><div><div class="score tnum">${f1(theirTotal)}</div><div class="tname">JO'S JUMPERS</div></div></div>
    <div class="winbar"><i style="width:${pct}%"></i></div><div class="sub">${pct}% of combined points</div></div>
    <div class="grid-2"><div class="stack">${section("Starters", `<div class="divide">${compact}</div>`, chip("Strict Lock-In", "info"))}</div><div class="stack">${scoreboardCard()}${refreshCard()}${activityCard()}</div></div></div>`;
}

// ---------------------------------------------------------------- my team / lock-in
function teamRow(p: P, idx: number) {
  const states = idx % 3;
  const games = [
    `<span class="game final">@ NY · ${f1(p.pts - 6)} <span class="sub">(19p 8r 6a)</span></span>`,
    `<span class="game counted">vs CLE · ${f1(p.pts)} · counts</span>`,
    `<span class="game up">vs MIL · Sat 7:30 PM</span>`,
    states === 0 ? `<span class="game up">vs DET · Sun 7:30 PM</span>` : "",
  ].join("");
  const lock = p.slot === "BN" ? `<span class="sub" style="font-size:11px">Bench can't be locked</span>` : `<button class="btn accent sm">Lock ${f1(p.pts)}</button>`;
  return `<div class="player" style="align-items:flex-start">${avatar(p.name, p.team)}<div class="grow"><div class="row between"><div><div class="nm">${esc(p.name)}</div><div class="meta">${pos(p.slot)} ${p.pos} · ${p.team}</div></div><div class="pts tnum">${p.slot === "BN" ? "0.0" : f1(p.pts)}<small>${p.slot === "BN" ? "benched" : "Latest game"}</small></div></div><div class="games">${games}</div><div style="margin-top:8px">${lock}</div></div></div>`;
}

function team() {
  const aside = `<div class="stack">
    ${section("Auto-pick", `<div class="card-b stack"><div class="row between"><div><div class="nm" style="font-weight:800">Auto-pick for me</div><div class="sub">Locks the first game at or above your threshold</div></div><span class="toggle on"></span></div><label class="field"><span>Threshold (pts)</span><input class="input" value="40"></label><button class="btn primary block">Save</button></div>`)}
    ${section("Lineup", `<div class="card-b stack"><div class="sub">Move players between slots, then save.</div><button class="btn primary block">Save lineup</button></div>`)}
    ${refreshCard()}</div>`;
  return `<div class="stack"><div class="row between"><h1 class="title">My Team</h1>${chip("Week 3 · 261.2", "info")}</div>
    <div class="grid-2"><div class="stack">
    ${section("Starters", `<div class="divide">${starters.map(teamRow).join("")}</div>`)}
    ${section("Bench", `<div class="divide">${bench.map((p, i) => teamRow(p, i)).join("")}</div>`)}
    </div>${aside}</div></div>`;
}

const lockOverlay = () => `<div class="sheet-wrap"><div class="sheet"><div class="grab"></div>
  <div class="row" style="margin-bottom:12px">${avatar("Jaylen Brown", "PHI", "lg")}<div><div class="nm" style="font-weight:800;font-size:17px">Lock a game for Jaylen Brown</div><div class="sub">One game counts per week</div></div></div>
  <div class="stack">
    ${[
      ["@ NY", "Mon", "42.6", "19p 8r 6a", false],
      ["vs CLE", "Wed", "49.6", "32p 3r 6a", true],
    ].map(([o, d, pts, l, sel]) => `<div class="card" style="${sel ? "border-color:var(--good);border-width:2px" : ""}"><div class="card-b row between"><div><div class="nm" style="font-weight:800">${o} · ${d}</div><div class="sub">${l}</div></div><div class="row"><b style="font-size:20px" class="tnum">${pts}</b><span class="chip ${sel ? "good" : ""}">${sel ? "Selected" : "Choose"}</span></div></div></div>`).join("")}
    <div class="banner"><span style="font-size:18px">⏱</span><div><div class="nm" style="font-weight:800;font-size:13px">Lock before Sat 7:30 PM</div><div class="sub">Strict mode: once his next game starts, this window closes and his last game counts.</div></div></div>
    <button class="btn accent block">Lock in 49.6</button><button class="btn block">Cancel</button>
  </div></div></div>`;

// ---------------------------------------------------------------- players + waivers
function players(v: Variant) {
  const filters = `<div class="row wrap"><input class="input" style="max-width:340px" placeholder="Search players or team"><div class="seg"><span class="on">All</span><span>G</span><span>F</span><span>C</span></div></div>`;
  const list =
    v === "a"
      ? section("Available players", `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Player</th><th>Pos</th><th>Team</th><th class="r">GP</th><th class="r">Avg FP</th><th></th></tr></thead><tbody>${POOL.map((p) => `<tr><td><div class="row">${avatar(p.name, p.team, "sm")}<b>${esc(p.name)}</b> ${p.inj ? chip(p.inj, "bad") : ""}</div></td><td>${pos(p.pos)}</td><td>${p.team}</td><td class="r tnum">${p.gp}</td><td class="r tnum"><b>${f1(p.avg)}</b></td><td class="r">${p.waiver ? `<button class="btn sm">Claim</button>` : `<button class="btn primary sm">Add</button>`}</td></tr>`).join("")}</tbody></table></div>`)
      : section("Available players", `<div class="divide">${POOL.map((p) => `<div class="player">${avatar(p.name, p.team)}<div class="grow"><div class="nm">${esc(p.name)}</div><div class="meta">${pos(p.pos)} ${p.team} ${p.inj ? chip(p.inj, "bad") : ""} ${p.waiver ? chip("Waivers", "warn") : ""}</div></div><div class="pts tnum">${f1(p.avg)}<small>avg · ${p.gp} gp</small></div>${p.waiver ? `<button class="btn sm">Claim</button>` : `<button class="btn primary sm">Add</button>`}</div>`).join("")}</div>`);
  return `<div class="stack"><div class="row between"><h1 class="title">Players</h1>${chip("Roster 10 / 11", "info")}</div>${filters}${list}</div>`;
}

function waivers() {
  return `<div class="stack"><h1 class="title">Waivers</h1><div class="grid-2"><div class="stack">
    ${section("Pending claims", `<div class="divide">
      <div class="player">${avatar("Anfernee Simons", "CHI")}<div class="grow"><div class="nm">Anfernee Simons</div><div class="meta">Drop: Evan Mobley</div></div>${chip("Processes tomorrow 9 AM", "warn")}<button class="btn sm">Cancel</button></div>
      <div class="player">${avatar("Ayo Dosunmu", "MIN")}<div class="grow"><div class="nm">Ayo Dosunmu</div><div class="meta">No drop · roster has room</div></div>${chip("Won", "good")}</div></div>`)}
    ${section("How waivers work", `<div class="card-b sub">Dropped players sit on waivers for 24 hours. Claims run once a day in priority order; when you win one, you move to the back of the line.</div>`)}
    </div><div class="stack">${section("Priority order", `<div class="divide">${["Admin FC", "Jo's Jumpers", "Tejvir's Squad", "Sam's Splash Bros"].map((t, i) => `<div class="player"><b style="width:18px">${i + 1}</b><div class="grow nm">${t}</div>${i === 2 ? chip("You", "info") : ""}</div>`).join("")}</div>`)}</div></div></div>`;
}

// ---------------------------------------------------------------- draft
function draft() {
  const picks = [
    ["#12", "Anthony Edwards", "MIN", "Sam's Splash Bros"],
    ["#11", "Jaylen Brown", "PHI", "Admin FC"],
    ["#10", "Joel Embiid", "PHI", "Jo's Jumpers"],
    ["#9", "Kawhi Leonard", "TOR", "Tejvir's Squad"],
  ];
  const board = ["Tejvir's Squad", "Jo's Jumpers", "Admin FC", "Sam's Splash Bros"];
  return `<div class="stack"><div class="card" style="border-color:var(--accent);border-width:2px"><div class="card-b row between"><div><div class="eyebrow">Round 3 · Pick 13</div><div class="nm" style="font-weight:800;font-size:19px">Tejvir's Squad is on the clock</div><div class="sub">It's your pick!</div></div><div style="font-size:38px;font-weight:800" class="tnum">0:42</div></div></div>
    <div class="row wrap">${board.map((t, i) => `<span class="chip ${i === 0 ? "info" : ""}" style="padding:5px 10px">${i + 1}. ${t}</span>`).join("")}</div>
    <div class="grid-2 even">${section("Best available", `<div class="divide">${POOL.slice(0, 5).map((p) => `<div class="player">${avatar(p.name, p.team, "sm")}<div class="grow"><div class="nm">${esc(p.name)}</div><div class="meta">${pos(p.pos)} ${p.team} · ${f1(p.avg)} avg</div></div><button class="btn accent sm">Draft</button></div>`).join("")}</div>`)}
    ${section("Picks", `<div class="divide">${picks.map(([n, nm, t, by]) => `<div class="player"><b class="sub" style="width:30px">${n}</b>${avatar(nm, t, "sm")}<div class="grow"><div class="nm">${nm}</div><div class="meta">${by}</div></div></div>`).join("")}</div>`, `<span class="chip">44 total</span>`)}</div>
    ${section("Draft board", `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Rd</th>${board.map((t) => `<th>${t}</th>`).join("")}</tr></thead><tbody>${[1, 2, 3].map((r) => `<tr><td><b>${r}</b></td>${board.map((t, i) => `<td class="sub" style="${r === 3 && i === 0 ? "background:color-mix(in srgb,var(--accent) 14%,transparent);font-weight:800;color:var(--ink)" : ""}">${r === 3 && i === 0 ? "On the clock" : POOL[(r * 3 + i) % POOL.length].name}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`)}
    </div>`;
}

// ---------------------------------------------------------------- trades
function trades() {
  const side = (title: string, list: P[]) => `<div class="grow"><div class="eyebrow" style="margin-bottom:6px">${title}</div>${list.map((p) => `<div class="row" style="margin-bottom:6px">${avatar(p.name, p.team, "sm")}<div><div class="nm" style="font-size:13px">${esc(p.name)}</div><div class="meta">${p.pos} · ${p.team}</div></div></div>`).join("")}</div>`;
  return `<div class="stack"><div class="row between"><h1 class="title">Trades</h1><button class="btn primary">Propose a trade</button></div>
    <div class="grid-2 even"><div class="stack">
    ${section("Offer for you", `<div class="card-b stack"><div class="row between"><b>Admin FC → you</b>${chip("Expires in 38h", "warn")}</div><div class="row" style="align-items:flex-start;gap:20px">${side("You give", [MINE[6]])}${side("You get", [THEIRS[4]])}</div><div class="sub">"Need a guard, you need size."</div><div class="row"><button class="btn primary grow">Accept</button><button class="btn danger grow">Decline</button></div></div>`)}
    ${section("Sent by you", `<div class="card-b stack"><div class="row between"><b>You → Jo's Jumpers</b>${chip("Pending", "warn")}</div><div class="row" style="align-items:flex-start;gap:20px">${side("You give", [MINE[8]])}${side("You get", [THEIRS[5]])}</div><button class="btn sm">Withdraw</button></div>`)}
    </div><div class="stack">${section("Build an offer", `<div class="card-b stack"><label class="field"><span>Trade with</span><select class="input"><option>Sam's Splash Bros</option></select></label><div class="grid-3" style="grid-template-columns:1fr 1fr">${side("You give", [MINE[7], MINE[9]])}${side("You get", [THEIRS[2]])}</div><label class="field"><span>Note</span><input class="input" placeholder="Optional"></label><button class="btn primary block">Send offer</button></div>`)}
    ${section("History", `<div class="divide"><div class="player"><div class="grow"><b>Jo's Jumpers ↔ Sam's Splash Bros</b><div class="sub">Completed Tuesday</div></div>${chip("Accepted", "good")}</div><div class="player"><div class="grow"><b>Admin FC → Sam's Splash Bros</b><div class="sub">Vetoed by commissioner</div></div>${chip("Vetoed", "bad")}</div></div>`)}</div></div></div>`;
}

// ---------------------------------------------------------------- standings + bracket
function standings() {
  return `<div class="stack"><h1 class="title">Standings</h1><div class="grid-2"><div class="stack">
    ${section("Regular season", `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>#</th><th>Team</th><th class="c">W-L</th><th class="r">PF</th><th class="r">PA</th></tr></thead><tbody>${STANDINGS.map((s, i) => `<tr style="${s.me ? "background:color-mix(in srgb,var(--brand) 8%,transparent)" : ""}"><td><b>${i + 1}</b></td><td><div class="row">${teamAvatar(s.name, Object.values(TEAM_COLORS)[i * 3], "sm")}<b>${s.name}</b> ${s.me ? chip("You", "info") : ""}</div></td><td class="c tnum">${s.w}-${s.l}</td><td class="r tnum">${f1(s.pf)}</td><td class="r tnum">${f1(s.pa)}</td></tr>`).join("")}</tbody></table></div><div class="card-b sub">Top 4 make the playoffs. Tiebreakers: win %, head-to-head, points for.</div>`)}
    ${section("Schedule", `<div class="divide">${[["Week 4", "vs Sam's Splash Bros"], ["Week 5", "vs Admin FC"], ["Week 6", "vs Jo's Jumpers"]].map(([w, o]) => `<div class="player"><b style="width:60px">${w}</b><div class="grow">${o}</div></div>`).join("")}</div>`)}
    </div><div class="stack">${section("Playoff bracket", `<div class="card-b"><div class="bracket"><div class="stack"><div class="match"><div class="t w"><span>1 Sam's Splash Bros</span><span class="tnum">—</span></div><div class="t"><span>4 Admin FC</span><span class="tnum">—</span></div></div><div class="match"><div class="t"><span>2 Tejvir's Squad</span><span class="tnum">—</span></div><div class="t"><span>3 Jo's Jumpers</span><span class="tnum">—</span></div></div></div><div class="match"><div class="t"><span>Winner</span><span>—</span></div><div class="t"><span>Winner</span><span>—</span></div></div></div><div class="sub" style="margin-top:12px">Playoffs start Week 7 · one round per week</div></div>`)}</div></div></div>`;
}

// ---------------------------------------------------------------- league settings
function league() {
  return `<div class="stack"><h1 class="title">League</h1><div class="grid-2 even"><div class="stack">
    ${section("Invite friends", `<div class="card-b stack"><div class="eyebrow">Invite code</div><div style="font-size:34px;font-weight:800;letter-spacing:.3em" class="tnum">JNKX25</div><button class="btn block">Copy invite link</button></div>`)}
    ${section("Teams", `<div class="divide">${STANDINGS.map((s) => `<div class="player"><div class="grow nm">${s.name}</div>${s.me ? chip("Commissioner", "") : ""}</div>`).join("")}</div>`)}
    </div><div class="stack">${section("Commissioner settings", `<div class="card-b stack">
      <label class="field"><span>Lock-In mode</span><select class="input"><option>Strict (Sleeper): lock before the next game</option><option>Open: every game selectable all week</option></select></label>
      <label class="field"><span>Trade approval</span><select class="input"><option>Instant when accepted</option><option>Commissioner approves</option></select></label>
      <div class="grid-3" style="grid-template-columns:1fr 1fr"><label class="field"><span>Weeks</span><input class="input" value="6"></label><label class="field"><span>Playoff teams</span><input class="input" value="4"></label></div>
      <div class="eyebrow">Scoring</div><div class="grid-3" style="grid-template-columns:repeat(2,1fr)">${[["Point", "1"], ["Rebound", "1.2"], ["Assist", "1.5"], ["Steal", "3"], ["Block", "3"], ["Turnover", "-1"]].map(([k, v]) => `<div class="row between"><span class="sub">${k}</span><input class="input" style="width:72px;padding:6px 8px" value="${v}"></div>`).join("")}</div>
      <button class="btn primary block">Save settings</button></div>`)}</div></div></div>`;
}

// ---------------------------------------------------------------- admin (platform)
function admin() {
  const fmt = (name: string, desc: string, state: "on" | "off" | "planned" | "active") =>
    `<div class="player"><div class="grow"><div class="nm">${name} ${state === "planned" ? chip("Planned", "") : ""}</div><div class="meta">${desc}</div></div>${state === "planned" ? `<button class="btn sm" disabled>Coming soon</button>` : state === "active" ? chip("Active", "good") : `<span class="toggle ${state === "on" ? "on" : ""}"></span>`}</div>`;
  return `<div class="stack"><div class="row between"><div><h1 class="title">Admin</h1><div class="sub">Game formats, users and data health</div></div></div><div class="grid-2"><div class="stack">
    ${section("Demo League · game formats", `<div class="divide">${fmt("Lock-In: Strict (Sleeper)", "Lock before the player's next game", "active")}${fmt("Lock-In: Open", "Every finished game selectable until week end", "off")}${fmt("Manager auto-pick", "Highest game / threshold auto-lock", "on")}${fmt("Betting & parlays", "Play-money bets incl. multi-leg parlays", "planned")}${fmt("Loser loans a player", "Loser lends a player for a set period", "planned")}${fmt("FAAB bidding", "Budgeted blind bids", "planned")}${fmt("Double-points week", "Commissioner-picked week counts double", "planned")}</div>`, chip("Switch any time", ""))}
    </div><div class="stack">
    ${section("Data health", `<div class="card-b stack"><div class="grid-3" style="grid-template-columns:repeat(3,1fr)"><div class="kpi"><b>662</b><span>Players</span></div><div class="kpi"><b>1,320</b><span>Games</span></div><div class="kpi"><b>26,998</b><span>Lines</span></div></div><div class="sub">Last sync 13 min ago (by Tejvir)</div><button class="btn primary block">Force full sync</button></div>`)}
    ${section("Users (4)", `<div class="divide">${[["Tejvir", true], ["Admin", true], ["Bot Sam", false], ["Bot Jo", false]].map(([n, a]) => `<div class="player"><div class="grow nm">${n} ${a ? chip("Admin", "info") : ""}</div><button class="btn sm">${a ? "Remove admin" : "Make admin"}</button></div>`).join("")}</div>`)}
    </div></div></div>`;
}

// ---------------------------------------------------------------- bets (future)
function bets() {
  const leg = (t: string, o: string, odds: string) => `<div class="player"><div class="grow"><div class="nm" style="font-size:13px">${t}</div><div class="meta">${o}</div></div><b class="tnum">${odds}</b><button class="btn sm danger">✕</button></div>`;
  return `<div class="stack"><div class="row between"><div><h1 class="title">Bets</h1><div class="sub">Play-money only · lose a bet, lend a player</div></div>${chip("Coming soon", "warn")}</div><div class="grid-2"><div class="stack">
    ${section("Matchup lines · Week 3", `<div class="divide">${[["Tejvir's Squad to win", "vs Jo's Jumpers", "-130"], ["Jo's Jumpers to win", "vs Tejvir's Squad", "+110"], ["Wembanyama over 50.5 FP", "This week's locked game", "-115"], ["Doncic over 55 FP", "This week's locked game", "+120"]].map(([t, o, odds]) => `<div class="player"><div class="grow"><div class="nm">${t}</div><div class="meta">${o}</div></div><button class="btn sm">${odds}</button></div>`).join("")}</div>`)}
    ${section("Active bets", `<div class="divide"><div class="player"><div class="grow"><div class="nm">Parlay · 3 legs</div><div class="meta">Stake 50 pts → 212 pts if all hit</div></div>${chip("2 of 3 hit", "warn")}</div><div class="player"><div class="grow"><div class="nm">Sam owes Jo: Jaylen Brown</div><div class="meta">Loan returns Sunday 11:59 PM</div></div>${chip("Loan", "info")}</div></div>`)}
    </div><div class="stack">${section("Bet slip · Parlay", `<div class="divide">${leg("Tejvir's Squad to win", "Moneyline", "-130")}${leg("Wembanyama over 50.5 FP", "Player prop", "-115")}${leg("Randle over 45 FP", "Player prop", "+105")}</div><div class="card-b stack"><div class="row between"><span class="sub">Combined odds</span><b class="tnum">+394</b></div><label class="field"><span>Stake (play points)</span><input class="input" value="50"></label><div class="row between"><span class="sub">To win</span><b class="tnum">197</b></div><label class="field"><span>If I lose, I lend</span><select class="input"><option>Josh Giddey · 3 days</option><option>No loan (points only)</option></select></label><button class="btn accent block">Place parlay</button></div>`)}</div></div></div>`;
}

// ---------------------------------------------------------------- auth, home, install
function auth() {
  return `<div class="stack" style="max-width:420px;margin:6vh auto 0"><div style="text-align:center"><div class="logo" style="width:56px;height:56px;margin:0 auto 12px;font-size:18px">HL</div><h1 class="title" style="font-size:26px">Hoops League</h1><div class="sub">Private fantasy basketball with Lock-In scoring</div></div>
    <div class="card"><div class="card-b stack"><div class="seg" style="align-self:center"><span class="on">Log in</span><span>Sign up</span></div><label class="field"><span>Email or username</span><input class="input" placeholder="you@email.com"></label><label class="field"><span>Password</span><input class="input" type="password" value="••••••••"></label><button class="btn primary block">Log in</button><div class="sub" style="text-align:center">Forgot your password? Reach out to Tejvir.</div></div></div></div>`;
}

function home() {
  const lg = (n: string, s: string, c: string, rec: string, next: string) => `<div class="card"><div class="card-b stack"><div class="row between"><div class="row">${teamAvatar(n, c, "lg")}<div><div class="nm" style="font-size:17px;font-weight:800">${n}</div><div class="sub">${rec}</div></div></div>${chip(s, "good")}</div><div class="sub">${next}</div><button class="btn primary block">Open league</button></div></div>`;
  return `<div class="stack"><div class="row between"><div><h1 class="title">Your leagues</h1><div class="sub">Signed in as Tejvir</div></div><div class="row"><button class="btn sm">Account</button><button class="btn sm">Admin</button></div></div>
    <div class="grid-2 even">${lg("Demo League", "Week 3", "#6001d2", "2-1 · 2nd of 4", "Next: Sam's Splash Bros, Sat 7:30 PM")}${lg("Office League", "Drafting Fri", "#c8102e", "Not drafted yet", "Draft starts Friday 8:00 PM")}</div>
    <div class="row"><button class="btn accent grow">Create a league</button><button class="btn grow">Join with a code</button></div>
    <div class="banner"><span style="font-size:22px">📱</span><div class="grow"><div class="nm" style="font-weight:800">Install on your phone</div><div class="sub">Add it to your home screen for an app icon and full-screen mode.</div></div><button class="btn sm">How</button></div></div>`;
}

function install() {
  const steps: [string, string][] = [
    ["Open in Safari", "On iPhone this must be Safari, not Chrome."],
    ["Tap the Share button", "The square with an arrow, at the bottom of the screen."],
    ["Choose “Add to Home Screen”", "Scroll the share sheet if you don't see it."],
    ["Tap Add", "The Hoops League icon now sits on your home screen."],
  ];
  return `<div class="stack" style="max-width:760px;margin:0 auto"><div><h1 class="title">Install Hoops League</h1><div class="sub">No App Store. It installs like an app: its own icon, full-screen, auto-updates.</div></div>
    <div class="grid-2 even"><div class="stack">${steps.map(([t, d], i) => `<div class="card"><div class="card-b row"><span class="avatar sm" style="background:var(--brand);color:var(--brand-ink)">${i + 1}</span><div><div class="nm" style="font-weight:800">${t}</div><div class="sub">${d}</div></div></div></div>`).join("")}</div>
    <div class="phone-ios stack"><div class="card"><div class="card-b row between"><span class="sub">hoops-league.vercel.app</span><span>⬆︎</span></div></div><div class="card"><div class="divide"><div class="player"><div class="grow">Copy</div></div><div class="player"><div class="grow" style="font-weight:800">Add to Home Screen</div><span>＋</span></div><div class="player"><div class="grow">Add Bookmark</div></div></div></div><div class="row" style="justify-content:center;padding:10px"><div style="text-align:center"><span class="avatar xl" style="background:var(--accent);border-radius:16px">HL</span><div class="sub" style="margin-top:4px">Hoops</div></div></div></div></div></div>`;
}

export const SCREENS: Screen[] = [
  { id: "auth", title: "Log in / Sign up", active: null, description: "First impression. Username or email, no reset flow (contact the commissioner).", render: auth },
  { id: "home", title: "My leagues", active: null, description: "Landing page: leagues, create/join, install prompt.", render: home },
  { id: "matchup", title: "Matchup (home)", active: "matchup", description: "The screen people open most: head-to-head score and lineups.", render: matchup },
  { id: "team", title: "My team + Lock-In", active: "team", description: "Lineup, each player's week of games, and the Lock button.", render: team },
  { id: "lockin", title: "Lock-In sheet", active: "team", description: "Choosing which game counts, with the strict-mode deadline.", render: team, overlay: lockOverlay },
  { id: "players", title: "Players / free agents", active: "players", description: "Search and add. Waiver players show Claim instead of Add.", render: players },
  { id: "waivers", title: "Waivers", active: "players", description: "Pending claims, priority order, how waivers work.", render: waivers },
  { id: "draft", title: "Draft room", active: "players", description: "On the clock, best available, picks, and the board.", render: draft },
  { id: "trades", title: "Trades", active: "trades", description: "Incoming and outgoing offers, offer builder, history.", render: trades },
  { id: "standings", title: "Standings + playoffs", active: "standings", description: "Table, schedule and the bracket.", render: standings },
  { id: "league", title: "League + commissioner", active: "league", description: "Invite code, teams, rules, scoring weights.", render: league },
  { id: "admin", title: "Admin: game formats", active: null, description: "Turn formats on/off any time; data health; users.", render: admin },
  { id: "bets", title: "Bets & parlays (future)", active: "league", description: "Play-money betting with loan-a-player stakes.", render: bets },
  { id: "install", title: "Install on iPhone", active: null, description: "How to put the web app on your home screen.", render: install },
];
void icon;
