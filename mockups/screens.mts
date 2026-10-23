import { av, esc, f1, initials, lockIcon, MINE, POOL, STANDINGS, teamAv, THEIRS, type Row } from "./lib.mts";

export type Screen = {
  id: string;
  title: string;
  description: string;
  /** Which main tab is highlighted; "none" = no tab bar (auth, admin, draft room...). */
  tab: "roster" | "matchup" | "players" | "league" | "none";
  sub?: "standings" | "trades" | "activity" | "draft" | "bets" | "settings";
  /** Whole-page override (draft room has its own chrome). */
  full?: boolean;
  render: () => string;
  overlay?: () => string;
};

const starters = MINE.filter((p) => p.slot !== "BN");
const bench = MINE.filter((p) => p.slot === "BN");
const mine = starters.reduce((s, p) => s + p.pts, 0);
const theirs = THEIRS.reduce((s, p) => s + p.pts, 0);

const weekbar = (label = "Week 3") => `<div class="weekbar"><button class="chev" aria-label="Previous week">‹</button><a class="wk">${label}</a><button class="chev" aria-label="Next week">›</button></div>`;

// ----------------------------------------------------------------- roster row (the core ESPN pattern)
function rrow(p: Row, i = 0) {
  const locked = p.state === "locked";
  const manual = locked && i === 3;
  const right =
    p.state === "bench"
      ? `<div class="rpts"><b class="dim">0.0</b><small>benched</small></div>`
      : `<div class="rpts"><b>${f1(p.pts)}</b>${locked ? `<small>${manual ? "locked by you" : "auto-locked"}</small><span class="tag good">${lockIcon}Locked</span>` : `<small>best so far</small><span class="tag acc">Auto</span>`}</div>`;
  return `<div class="rrow"><span class="slot ${locked ? "on" : ""}">${p.slot}</span>${av(p.name, p.team)}
  <div class="who"><div class="nm"><a>${esc(p.name)}</a><span class="tm">${p.team}</span><span class="ps">${p.pos}</span>${p.inj ? `<span class="inj">${p.inj}</span>` : ""}</div>
  <div class="l2">Wk ${f1(p.pts)} | Avg ${f1(p.avg)}</div><div class="l3">${p.game.includes("Final") ? `<b>${esc(p.game)}</b>` : esc(p.game)}</div></div>
  <div class="rstats"><span>${p.line[0]}</span><span>${p.line[1]}</span><span>${p.line[2]}</span></div>${right}</div>`;
}
const statCols = `<div class="cols"><span>PTS</span><span>REB</span><span>AST</span><span style="width:68px">FPTS</span></div>`;

function rosterMobile() {
  return `<div class="page only-m">${weekbar()}
  <div class="toolbar"><button class="pill auto"><span class="toggle on"></span>Auto Lock-In<small>Highest game</small></button><button class="pill blue">Week stats ⌄</button></div>
  <div class="pad" style="padding-bottom:0"><div class="banner note"><div style="font-size:13px"><b>Auto Lock-In is on</b><div class="sub">We lock each starter's highest-scoring game before their next tip-off. Next: Giddey and Harden, Sat 7:30 PM. You can still lock a game yourself before then.</div></div></div></div>
  <div class="sec" style="margin-top:12px"><span>Starters</span>${statCols}</div>${starters.map((p, i) => rrow(p, i)).join("")}
  <div class="sec"><span>Bench</span>${statCols}</div>${bench.map((p) => rrow(p)).join("")}
  <div class="pad stack"><div class="row between" style="font-size:13px"><div><b>Stats updated 13 min ago</b><div class="sub">by Tejvir</div></div><button class="pill sm">Refresh stats</button></div></div></div>`;
}
/** Desktop-only extras per player: next opponent, status, projection, opponent rank vs position, %start, %rostered, change, season rank. */
const DESK: Record<string, { opp: string; status: string; proj: number; oprk: number; st: number; ro: number; d: number; prk: number }> = {
  "J. Brown": { opp: "vs NY", status: "Sat 7:30 PM", proj: 41.8, oprk: 22, st: 96.1, ro: 99.2, d: 0.4, prk: 12 },
  "T. Maxey": { opp: "@BOS", status: "Sun 6:00 PM", proj: 38.6, oprk: 9, st: 94.8, ro: 99.0, d: 0, prk: 18 },
  "C. Flagg": { opp: "vs UTAH", status: "Sat 8:00 PM", proj: 36.2, oprk: 27, st: 88.4, ro: 97.6, d: 1.2, prk: 31 },
  "V. Wembanyama": { opp: "@LAL", status: "Sun 9:30 PM", proj: 48.9, oprk: 14, st: 99.1, ro: 99.9, d: 0, prk: 3 },
  "B. Adebayo": { opp: "vs ORL", status: "Sat 7:00 PM", proj: 33.5, oprk: 5, st: 85.2, ro: 98.4, d: -0.6, prk: 40 },
  "J. Giddey": { opp: "vs DET", status: "Sat 7:30 PM", proj: 30.4, oprk: 18, st: 72.9, ro: 93.3, d: 0.3, prk: 52 },
  "J. Harden": { opp: "@TOR", status: "Sat 7:30 PM", proj: 29.1, oprk: 28, st: 68.0, ro: 95.1, d: 0, prk: 60 },
  "J. Randle": { opp: "vs CHA", status: "Sun 5:00 PM", proj: 34.0, oprk: 24, st: 61.2, ro: 91.0, d: 0, prk: 47 },
  "E. Mobley": { opp: "vs MIL", status: "Sat 7:30 PM", proj: 31.7, oprk: 11, st: 55.4, ro: 90.2, d: -0.2, prk: 44 },
  "C. Holmgren": { opp: "vs HOU", status: "Sun 3:00 PM", proj: 32.9, oprk: 3, st: 58.8, ro: 94.7, d: 0, prk: 38 },
};
const ord = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
const oprk = (n: number) => `<span class="oprk ${n <= 10 ? "tough" : n >= 21 ? "easy" : ""}">${ord(n)}</span>`;
function drow(p: Row, i: number) {
  const d = DESK[p.name];
  const bn = p.state === "bench";
  const locked = p.state === "locked";
  const lock = bn ? `<span class="mut">—</span>` : locked ? `<span class="tag good">${lockIcon}${i === 3 ? "Locked" : "Auto-locked"}</span>` : `<span class="tag acc">Auto</span>`;
  return `<tr><td class="slotc">${p.slot}</td><td><div class="row">${av(p.name, p.team, "md")}<div><a class="pnm">${esc(p.name)}</a>${p.inj ? ` <span class="inj">${p.inj}</span>` : ""}<div class="sub" style="font-size:12px">${p.team} · ${p.pos}</div></div></div></td>
   <td class="c"><button class="pill sm">Move</button></td><td class="c">${lock}</td>
   <td class="c">${d.opp}</td><td class="c st">${d.status}</td><td class="c tnum">${f1(d.proj)}</td><td class="c tnum"><b>${bn ? "—" : f1(p.pts)}</b></td><td class="c">${oprk(d.oprk)}</td>
   <td class="c tnum">${f1(d.st)}</td><td class="c tnum">${f1(d.ro)}</td><td class="c tnum ${d.d > 0 ? "up" : d.d < 0 ? "dn" : ""}">${d.d > 0 ? "+" : ""}${d.d}</td>
   <td class="c tnum">${d.prk}</td><td class="c tnum">${f1(p.pts + 3.8 * (i % 3) + 60)}</td><td class="c tnum">${f1(p.avg)}</td><td class="c tnum">${f1(p.pts)}</td></tr>`;
}
function rosterDesktop() {
  const head = (label: string) => `<tr class="grp"><th colspan="4">${label}</th><th colspan="9">Week 3</th><th colspan="4">2025-26 season</th></tr>
   <tr><th>Slot</th><th>Player</th><th class="c">Action</th><th class="c">Lock-In</th><th class="c">Opp</th><th class="c">Status</th><th class="c">Proj</th><th class="c">Score</th><th class="c" title="Opponent defense rank vs this position. 30th = easiest matchup">OPRK</th><th class="c">%ST</th><th class="c">%ROST</th><th class="c">+/-</th><th class="c">PRK</th><th class="c">FPTS</th><th class="c">AVG</th><th class="c">LAST</th></tr>`;
  const totalProj = starters.reduce((t, p) => t + DESK[p.name].proj, 0);
  return `<div class="deskpage only-d"><div class="dwrap">
  <div class="dcard"><div class="tmhead"><span class="tmlogo">${initials("Tejvir's Squad")}</span><div class="grow"><div class="tmname">Tejvir's Squad <small>2-1-0 <span class="mut">(2nd of 4)</span></small></div>
    <div class="tmlinks"><a>Demo League</a><i></i><span>Tejvir</span><i></i><a>Waiver order (3 of 4)</a><i></i><a>Watch list</a></div></div><a class="tmset">⚙ Team settings</a></div>
   <div class="mpair"><div><div class="cap">Last matchup · Week 2</div><div class="mbox"><div class="mt">${teamAv("Sam's Splash Bros", "#0e5fb5", "sm")}<span>Sam's Splash Bros</span><b class="mut">301.2</b></div><div class="mt">${teamAv("Tejvir's Squad", "#0c8312", "sm")}<span>Tejvir's Squad</span><b>312.4 <i class="win"></i></b></div></div></div>
    <div><div class="cap">Current matchup · Week 3 <a class="lnk">Full schedule</a></div><div class="mbox"><div class="mt">${teamAv("Jo's Jumpers", "#c9302c", "sm")}<span>Jo's Jumpers</span><b>${f1(theirs)}</b></div><div class="mt">${teamAv("Tejvir's Squad", "#0c8312", "sm")}<span>Tejvir's Squad</span><b>${f1(mine)}</b></div></div></div></div></div>
  <div class="dcard"><div class="setbar"><span class="lbl">Set lineup:</span><button class="sq">‹</button><a class="wkon">This week</a><a>Week 4</a><a>Week 5</a><button class="sq">›</button><span class="grow"></span>
    <button class="pill auto"><span class="toggle on"></span>Auto Lock-In<small>Highest game</small></button><button class="pill blue">+ Add</button><button class="pill blue">− Drop</button><button class="pill blue">Optimize lineup</button></div>
   <div class="subtabs"><a class="on">Overview</a><a>Stats</a><a>Schedule</a><a>News</a><a>Projections</a><a>Ranks</a><span class="grow"></span><span class="row" style="font-size:13px;gap:10px">Show stats <button class="pill">2025-26 season ⌄</button></span></div>
   <div style="overflow-x:auto"><table class="tbl rt"><thead>${head("Starters")}</thead><tbody>${starters.map((p, i) => drow(p, i)).join("")}
    <tr class="tot"><td colspan="6">Starters total</td><td class="c tnum">${f1(totalProj)}</td><td class="c tnum"><b>${f1(mine)}</b></td><td colspan="9"></td></tr></tbody>
    <thead>${head("Bench").replace(/<tr class="grp">.*?<\/tr>/, '<tr class="grp"><th colspan="4">Bench</th><th colspan="9"></th><th colspan="4"></th></tr>')}</thead><tbody>${bench.map((p, i) => drow(p, i + 7)).join("")}</tbody></table></div>
   <div class="legend"><b>OPRK</b> is how the opponent's defense ranks against that position this season. <span class="oprk easy">30th</span> is the easiest matchup, <span class="oprk tough">1st</span> the toughest. <b>%ST</b> started, <b>%ROST</b> rostered across all leagues, <b>PRK</b> season rank by FPTS.</div></div>
  </div></div>`;
}
function roster() {
  return rosterMobile() + rosterDesktop();
}
const lockOverlay = () => `<div class="sheet-wrap"><div class="sheet"><div class="grab"></div>
  <div class="row" style="margin-bottom:14px">${av("J. Brown", "PHI", "lg")}<div><div style="font-size:18px;font-weight:700">Jaylen Brown</div><div class="sub" style="font-size:13px">One game counts this week</div></div></div>
  <div class="stack">
    <div class="opt"><div><b>@ NY · Mon</b><div class="sub" style="font-size:13px">19 pts · 8 reb · 6 ast</div></div><b class="big">42.6</b></div>
    <div class="opt sel"><div><b>vs CLE · Wed</b><div class="sub" style="font-size:13px">32 pts · 3 reb · 6 ast</div></div><div class="row"><span class="tag acc">Highest</span><b class="big">49.6</b></div></div>
    <div class="banner note"><div style="font-size:13px"><b>Auto Lock-In picks vs CLE</b><div class="sub">Locks automatically before his next game, Sat 7:30 PM, unless a higher game comes first.</div></div></div>
    <button class="pill solid block">Lock in 49.6 now</button><button class="pill block">Leave it to Auto</button></div></div></div>`;

const R = (name: string, pos: "G" | "F" | "C", team: string, slot: string, pts: number, line: [number, number, number], inj?: string): Row =>
  ({ name, full: name, pos, team, slot, pts, avg: pts - 3, line, game: "", state: "locked", inj });
const SAM: Row[] = [R("S. Gilgeous-Alexander", "G", "OKC", "G", 58.2, [41, 6, 7]), R("A. Edwards", "G", "MIN", "G", 47.9, [34, 5, 5]), R("J. Tatum", "F", "BOS", "F", 52.3, [33, 9, 5]), R("G. Antetokounmpo", "F", "MIL", "F", 55.0, [34, 12, 6]), R("N. Jokic", "C", "DEN", "C", 61.4, [30, 14, 11]), R("S. Castle", "G", "SA", "UTIL", 36.1, [20, 5, 6]), R("D. Mitchell", "G", "CLE", "UTIL", 41.0, [29, 4, 4])];
const ADMIN: Row[] = [R("D. Booker", "G", "PHX", "G", 38.4, [28, 3, 6]), R("J. Harden", "G", "CLE", "G", 33.9, [21, 5, 8]), R("K. Durant", "F", "HOU", "F", 41.2, [29, 6, 4]), R("P. George", "F", "PHI", "F", 30.6, [21, 5, 3]), R("A. Davis", "C", "DAL", "C", 44.9, [24, 12, 3]), R("D. Fox", "G", "SA", "UTIL", 35.0, [24, 3, 5]), R("C. Johnson", "F", "SA", "UTIL", 28.1, [16, 6, 3], "DTD")];
const sum = (r: Row[]) => r.reduce((t, p) => t + p.pts, 0);
const MATCHUPS = [
  { href: "matchup", a: { n: "Tejvir's Squad", c: "#0c8312", pts: mine, rec: "2-1" }, b: { n: "Jo's Jumpers", c: "#c9302c", pts: theirs, rec: "1-2" }, rows: [starters, THEIRS], you: true },
  { href: "matchup2", a: { n: "Sam's Splash Bros", c: "#0e5fb5", pts: sum(SAM), rec: "3-0" }, b: { n: "Admin FC", c: "#333", pts: sum(ADMIN), rec: "0-3" }, rows: [SAM, ADMIN], you: false },
];

/** Horizontal swipe strip of every matchup this week; the open one is highlighted. */
function matchupStrip(sel: number) {
  return `<div class="sec"><span>All matchups · Week 3</span><span class="swipe">Swipe →</span></div>
  <div class="mstrip">${MATCHUPS.map((m, i) => `<a class="mcard ${i === sel ? "on" : ""}" href="${m.href}-clean.html"><div class="mc-top"><span class="tag ${i === sel ? "acc" : ""}">${m.you ? "Your matchup" : "Live"}</span><small>Sat 7:30 PM</small></div>
    ${[m.a, m.b].map((t, k) => `<div class="mc-t ${(k === 0 ? m.a.pts >= m.b.pts : m.b.pts > m.a.pts) ? "lead" : ""}">${teamAv(t.n, t.c, "sm")}<span class="n">${t.n}<small>${t.rec}</small></span><b class="tnum">${f1(t.pts)}</b></div>`).join("")}</a>`).join("")}</div>`;
}

function matchupView(sel: number) {
  const m = MATCHUPS[sel];
  const [L, Rr] = m.rows;
  const rows = L.map((p, i) => {
    const o = Rr[i];
    return `<div class="mrow"><div class="mcell">${av(p.name, p.team, "sm")}<div><div class="nm"><a>${esc(p.name)}</a></div><div class="s">${p.team} ${p.pos} · ${p.line[0]}/${p.line[1]}/${p.line[2]}</div></div><span class="p tnum">${f1(p.pts)}</span></div>
      <div class="mslot">${p.slot}</div>
      <div class="mcell r">${av(o.name, o.team, "sm")}<div><div class="nm"><a>${esc(o.name)}</a></div><div class="s">${o.team} ${o.pos}${o.inj ? " · " + o.inj : ""}</div></div><span class="p tnum">${f1(o.pts)}</span></div></div>`;
  }).join("");
  const pct = (m.a.pts / (m.a.pts + m.b.pts)) * 100;
  const lead = m.a.pts >= m.b.pts;
  return `<div class="page">${weekbar()}${matchupStrip(sel)}
  <div class="mhead"><div class="mteam">${teamAv(m.a.n, m.a.c, "lg")}<div><div class="t">${m.a.n}</div><div class="rec">${m.a.rec}${m.you ? " · You" : ""}</div><div class="mscore ${lead ? "lead" : ""} tnum">${f1(m.a.pts)}</div></div></div><div class="mvs">VS</div>
    <div class="mteam r">${teamAv(m.b.n, m.b.c, "lg")}<div><div class="t">${m.b.n}</div><div class="rec">${m.b.rec}</div><div class="mscore ${lead ? "" : "lead"} tnum">${f1(m.b.pts)}</div></div></div></div>
  <div class="mbar"><i style="width:${pct}%"></i></div>
  <div class="grid2 side"><div><div class="sec"><span>Starters</span><span class="tag">Auto Lock-In</span></div>${rows}
  <div class="sec"><span>Bench</span><span style="font-weight:400;text-transform:none;letter-spacing:0">${m.you ? bench.map((x) => x.name).join(" · ") : "Hidden until tip-off"}</span></div></div>
  <div class="pad stack"><div class="card"><div class="sec"><span>Refresh</span></div><div class="pad row between"><div style="font-size:13px"><b>Stats updated 13 min ago</b><div class="sub">by Tejvir</div></div><button class="pill sm">Refresh stats</button></div></div></div></div></div>`;
}
const matchup = () => matchupView(0);
const matchup2 = () => matchupView(1);

function players() {
  const rowsHtml = POOL.map((p) => `<div class="rrow"><span class="slot" style="width:56px">${p.pos}</span>${av(p.name, p.team)}
    <div class="who"><div class="nm"><a>${esc(p.name)}</a><span class="tm">${p.team}</span>${p.inj ? `<span class="inj">${p.inj}</span>` : ""}${p.waiver ? `<span class="tag warn">Waivers</span>` : ""}</div><div class="l2">Avg ${f1(p.avg)} FPTS | ${p.gp} GP</div><div class="l3">Last game <b>${f1(p.last)}</b></div></div>
    <div class="rstats"><span>${p.gp}</span><span>${f1(p.avg)}</span><span>${f1(p.last)}</span></div>
    <div class="rpts" style="min-width:76px">${p.waiver ? `<button class="pill sm">Claim</button>` : `<button class="pill solid sm">Add</button>`}</div></div>`).join("");
  return `<div class="page"><div class="toolbar"><button class="pill blue">All Pos. ⌄</button><button class="pill blue">All Teams ⌄</button><div class="search grow">🔍 Player name</div></div>
  <div class="sec"><span>Available players</span><div class="cols"><span>GP</span><span>AVG</span><span>LAST</span><span style="width:76px"></span></div></div>${rowsHtml}</div>`;
}

type DP = { name: string; full: string; pos: string; team: string; rk: number; gp: number; fp: number; high: number; pts: number; reb: number; ast: number; stl: number; blk: number; tov: number; inj?: string; last: [string, number, number, number, number][] };
const DRAFT_POOL: DP[] = [
  { name: "J. Johnson", full: "Jalen Johnson", pos: "F", team: "ATL", rk: 14, gp: 62, fp: 52.4, high: 71.8, pts: 22.8, reb: 9.4, ast: 7.9, stl: 1.4, blk: 0.7, tov: 3.2, last: [["vs BOS", 24, 11, 8, 56.1], ["@MIA", 19, 8, 9, 48.0], ["vs CHI", 28, 10, 6, 58.7], ["@ORL", 17, 9, 7, 44.2], ["vs NY", 25, 8, 10, 57.3]] },
  { name: "A. Simons", full: "Anfernee Simons", pos: "G", team: "CHI", rk: 61, gp: 58, fp: 36.3, high: 54.9, pts: 21.4, reb: 3.1, ast: 5.0, stl: 0.9, blk: 0.2, tov: 2.6, last: [["@TOR", 26, 3, 6, 42.0], ["vs DET", 18, 4, 4, 31.5], ["@MIL", 29, 2, 7, 47.1], ["vs LAL", 15, 3, 5, 28.9], ["vs BKN", 24, 4, 5, 38.8]] },
  { name: "W. Kessler", full: "Walker Kessler", pos: "C", team: "UTAH", rk: 74, gp: 66, fp: 33.8, high: 51.2, pts: 11.2, reb: 11.9, ast: 1.6, stl: 0.6, blk: 2.8, tov: 1.5, last: [["vs PHX", 12, 13, 2, 38.4], ["@LAC", 9, 10, 1, 29.0], ["vs GS", 14, 14, 3, 42.1], ["@DEN", 8, 9, 1, 25.7], ["vs SA", 13, 12, 2, 36.6]] },
  { name: "D. Daniels", full: "Dyson Daniels", pos: "G", team: "ATL", rk: 52, gp: 60, fp: 38.1, high: 56.0, pts: 12.1, reb: 6.2, ast: 4.6, stl: 3.0, blk: 0.6, tov: 2.1, inj: "OUT", last: [["vs BOS", 11, 6, 5, 36.0], ["@MIA", 13, 7, 4, 38.5], ["vs CHI", 10, 5, 6, 34.2], ["@ORL", 14, 6, 3, 37.9], ["vs NY", 12, 7, 5, 39.0]] },
  { name: "J. Smith Jr.", full: "Jabari Smith Jr.", pos: "F", team: "HOU", rk: 88, gp: 64, fp: 31.0, high: 47.3, pts: 15.9, reb: 7.8, ast: 1.9, stl: 0.8, blk: 0.9, tov: 1.3, last: [["@DAL", 17, 8, 2, 33.9], ["vs OKC", 14, 7, 1, 28.0], ["vs MIN", 20, 9, 3, 39.6], ["@SA", 12, 6, 2, 25.1], ["vs MEM", 16, 8, 1, 31.2]] },
  { name: "A. Dosunmu", full: "Ayo Dosunmu", pos: "G", team: "MIN", rk: 102, gp: 63, fp: 28.7, high: 44.0, pts: 12.8, reb: 3.4, ast: 4.2, stl: 1.1, blk: 0.3, tov: 1.4, last: [["@PHX", 13, 3, 5, 29.4], ["vs LAL", 10, 4, 3, 23.0], ["@GS", 16, 3, 6, 33.8], ["vs UTAH", 9, 2, 4, 21.1], ["vs DEN", 14, 4, 4, 28.9]] },
];

/** Photo (real app: NBA headshot), name, season averages, last five games. */
function playerCard(p: DP) {
  const max = Math.max(...p.last.map((g) => g[4]));
  const stats: [string, string | number][] = [["FPTS", f1(p.fp)], ["HIGH", f1(p.high)], ["GP", p.gp], ["PTS", p.pts], ["REB", p.reb], ["AST", p.ast], ["STL", p.stl], ["BLK", p.blk], ["TOV", p.tov]];
  return `<div class="pcard"><div class="ph">${av(p.name, p.team, "xl")}<div class="who"><div class="pn">${esc(p.full)}</div><div class="ps2">${p.team} · ${p.pos} · Rank ${p.rk}</div></div></div>
  <div class="pbtn"><button class="pill solid grow">Draft ${esc(p.name)}</button><button class="pill">+ Queue</button></div>
  <div class="statgrid">${stats.map(([k, v], i) => `<div class="${i < 2 ? "hl" : ""}"><b class="tnum">${v}</b><span>${k}</span></div>`).join("")}</div>
  <div class="ptip">High game matters: only one game per week counts under Lock-In.</div>
  <div class="sec" style="margin:14px -16px 0"><span>Last 5 games</span><div class="cols" style="display:flex"><span>PTS</span><span>REB</span><span>AST</span><span style="width:48px">FPTS</span></div></div>
  ${p.last.map((g) => `<div class="glog"><span class="opp">${g[0]}</span><i class="bar"><u style="width:${(g[4] / max) * 100}%"></u></i><span>${g[1]}</span><span>${g[2]}</span><span>${g[3]}</span><b class="tnum" style="width:48px">${f1(g[4])}</b></div>`).join("")}</div>`;
}

const draftTiles = [["Pick 14", "Admin FC"], ["Pick 15", "Jo's Jumpers"], ["Pick 16", "Sam's Splash Bros"], ["Round 4", ""], ["Pick 17", "Sam's Splash Bros"], ["Pick 18", "Jo's Jumpers"], ["Pick 19", "Admin FC"], ["Pick 20", "Tejvir's Squad"]];
const draftTable = (sel: number) => `<div style="overflow-x:auto"><table class="tbl dtbl"><thead><tr><th>RK</th><th>Player</th><th class="c">FPTS</th><th class="c">HIGH</th><th class="c">PTS</th><th class="c">REB</th><th class="c">AST</th><th class="c hm">STL</th><th class="c hm">BLK</th><th></th></tr></thead><tbody>
  ${DRAFT_POOL.map((p, i) => `<tr class="${i === sel ? "sel" : ""}"><td class="mut">${p.rk}</td><td><div class="row">${av(p.name, p.team, "md")}<div><b class="pnm">${esc(p.full)}</b><div class="sub" style="font-size:12px">${p.team} · ${p.pos}${p.inj ? ` <span class="inj">${p.inj}</span>` : ""}</div></div></div></td><td class="c tnum"><b>${f1(p.fp)}</b></td><td class="c tnum">${f1(p.high)}</td><td class="c tnum">${p.pts}</td><td class="c tnum">${p.reb}</td><td class="c tnum">${p.ast}</td><td class="c tnum hm">${p.stl}</td><td class="c tnum hm">${p.blk}</td><td><button class="pill sm ${i === sel ? "solid" : ""}">${i === sel ? "Draft" : "Queue"}</button></td></tr>`).join("")}</tbody></table></div>`;

function draft() {
  const queue = [["1", "J. Johnson", "ATL F"], ["2", "A. Simons", "CHI G"], ["3", "W. Kessler", "UTAH C"]];
  const picks = [["Anthony Edwards", "MIN", "R3, P12 · Sam's Splash Bros"], ["Jaylen Brown", "PHI", "R3, P11 · Admin FC"], ["Joel Embiid", "PHI", "R3, P10 · Jo's Jumpers"], ["Kawhi Leonard", "TOR", "R3, P9 · Tejvir's Squad"]];
  return `<div class="dr-hdr"><div class="row"><span class="logo">HL</span><div><b>Demo League · Snake Draft</b><small>Round 3 of 11</small></div></div><div class="r"><span>Sound on</span><span>Help</span></div></div>
  <div class="dr-strip"><div class="dr-clock"><small>On the clock</small><b class="tnum">0:42</b></div><div class="dr-otc"><small>Pick 13</small><b>Tejvir's Squad</b></div>
    ${draftTiles.map(([a, b]) => (b ? `<div class="dr-tile ${b === "Tejvir's Squad" ? "me" : ""}"><b>${a}</b><i>${b}</i></div>` : `<div class="dr-tile gap"><b>${a}</b></div>`)).join("")}</div>
  <div class="dr-body">
   <aside class="dr-col left"><h3>Queue <span class="row" style="font-size:13px;gap:8px;font-weight:500">Autopick <span class="toggle"></span></span></h3>
     ${queue.map(([r, n, t]) => `<div class="dr-q"><span class="rk">${r}</span>${av(n, t.split(" ")[0], "sm")}<div class="grow"><b>${n}</b><div class="sub" style="font-size:12px">${t}</div></div><button class="pill sm">Remove</button></div>`).join("")}
     <h3>Your roster</h3>
     ${[["G", "K. Leonard"], ["F", "A. Sengun"], ["UTIL", "—"], ["C", "—"]].map(([sl, n]) => `<div class="dr-q"><span class="slot">${sl}</span><span class="${n === "—" ? "mut" : ""}">${n}</span></div>`).join("")}</aside>
   <section class="dr-col"><div class="dr-tabs"><a class="on">Players</a><a>Pick history</a><a>Rules</a><span class="grow"></span><span class="row" style="font-size:13px;padding:10px 0">Show drafted <span class="toggle"></span></span></div>
     <div class="dr-filters"><button class="pill">2025-26 avg ⌄</button><button class="pill">All pos. ⌄</button><button class="pill">All teams ⌄</button><div class="search grow">Search player</div></div>
     ${draftTable(0)}</section>
   <aside class="dr-col right">${playerCard(DRAFT_POOL[0])}<h3 style="margin-top:8px">Recent picks</h3>${picks.map(([n, t, w]) => `<div class="dr-q">${av(n, t, "sm")}<div><b>${n}</b><div class="sub" style="font-size:12px">${w}</div></div></div>`).join("")}</aside></div>`;
}
const draftPlayerOverlay = () => `<div class="sheet-wrap"><div class="sheet tall"><div class="grab"></div>${playerCard(DRAFT_POOL[0])}</div></div>`;

function standings() {
  return `<div class="page"><div class="grid2 side"><div><div class="sec"><span>Standings</span></div>
   <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>#</th><th>Team</th><th class="c">W-L</th><th class="r">PF</th><th class="r">PA</th></tr></thead><tbody>
   ${STANDINGS.map((s, i) => `<tr class="${s.me ? "hl" : ""}"><td><b>${i + 1}</b></td><td><div class="row">${teamAv(s.name, s.c, "sm")}<b style="font-weight:600">${s.name}</b>${s.me ? `<span class="tag acc">You</span>` : ""}</div></td><td class="c tnum">${s.w}-${s.l}</td><td class="r tnum">${f1(s.pf)}</td><td class="r tnum">${f1(s.pa)}</td></tr>`).join("")}</tbody></table></div>
   <div class="pad" style="font-size:13px;color:var(--mut)">Top 4 make the playoffs. Tiebreakers: win %, head-to-head, points for.</div>
   <div class="sec"><span>Schedule</span></div>${[["Week 4", "vs Sam's Splash Bros"], ["Week 5", "vs Admin FC"], ["Week 6", "vs Jo's Jumpers"]].map(([w, o]) => `<div class="rrow" style="padding:12px 16px"><b style="width:70px">${w}</b><span>${o}</span></div>`).join("")}</div>
   <div class="pad"><div class="card"><div class="sec"><span>Playoff bracket</span></div><div class="pad"><div class="bracket"><div class="stack"><div class="match"><div class="t w"><span>1 Sam's Splash Bros</span><span>—</span></div><div class="t"><span>4 Admin FC</span><span>—</span></div></div><div class="match"><div class="t"><span>2 Tejvir's Squad</span><span>—</span></div><div class="t"><span>3 Jo's Jumpers</span><span>—</span></div></div></div><div class="match"><div class="t"><span>Winner</span><span>—</span></div><div class="t"><span>Winner</span><span>—</span></div></div></div><div style="font-size:12px;color:var(--mut);margin-top:12px">Playoffs start Week 7 · one round per week</div></div></div></div></div></div>`;
}

function trades() {
  const side = (t: string, list: Row[]) => `<div class="grow"><div style="font-size:11px;font-weight:700;letter-spacing:.05em;color:var(--mut);margin-bottom:6px;text-transform:uppercase">${t}</div>${list.map((p) => `<div class="row" style="margin-bottom:8px">${av(p.name, p.team, "sm")}<div><a style="color:var(--link);font-size:14px">${esc(p.full)}</a><div class="sub" style="font-size:12px">${p.team} ${p.pos}</div></div></div>`).join("")}</div>`;
  return `<div class="page"><div class="grid2 even"><div><div class="sec"><span>Offer for you</span><span class="tag warn">Expires in 38h</span></div><div class="pad stack"><div class="row between"><b>Admin FC → you</b></div><div class="row" style="align-items:flex-start;gap:24px">${side("You give", [MINE[6]])}${side("You get", [THEIRS[4]])}</div><div style="font-size:13px;color:var(--mut)">"Need a guard, you need size."</div><div class="row"><button class="pill solid grow">Accept</button><button class="pill danger grow">Decline</button></div></div>
   <div class="sec"><span>Sent by you</span><span class="tag warn">Pending</span></div><div class="pad stack"><b>You → Jo's Jumpers</b><div class="row" style="align-items:flex-start;gap:24px">${side("You give", [MINE[8]])}${side("You get", [THEIRS[5]])}</div><button class="pill sm">Withdraw</button></div></div>
  <div><div class="sec"><span>Build an offer</span></div><div class="pad stack"><label class="field"><span>Trade with</span><select class="input"><option>Sam's Splash Bros</option></select></label><div class="row" style="align-items:flex-start;gap:24px">${side("You give", [MINE[7], MINE[9]])}${side("You get", [THEIRS[2]])}</div><label class="field"><span>Note</span><input class="input" placeholder="Optional"></label><button class="pill solid block">Send offer</button></div>
  <div class="sec"><span>History</span></div>${[["Jo's Jumpers ↔ Sam's Splash Bros", "Completed Tuesday", "good", "Accepted"], ["Admin FC → Sam's Splash Bros", "Vetoed by commissioner", "bad", "Vetoed"]].map(([a, b, k, t]) => `<div class="rrow" style="padding:12px 16px"><div class="grow"><b>${a}</b><div class="sub" style="font-size:12px">${b}</div></div><span class="tag ${k}">${t}</span></div>`).join("")}</div></div></div>`;
}

function activity() {
  const ev = [["Sam's Splash Bros", "locked in Stephon Castle", "4 min"], ["Jo's Jumpers", "added Jalen Johnson", "1 hr"], ["Admin FC", "proposed a trade to Tejvir's Squad", "3 hr"], ["Tejvir's Squad", "won Ayo Dosunmu on waivers", "9 hr"], ["Sam's Splash Bros", "dropped Kel'el Ware", "1 d"]];
  return `<div class="page"><div class="grid2 side"><div><div class="sec"><span>Recent activity</span></div>${ev.map(([t, a, w]) => `<div class="rrow" style="padding:13px 16px"><div class="grow"><b>${t}</b> <span style="color:var(--mut)">${a}</span></div><span style="font-size:12px;color:var(--mut)">${w}</span></div>`).join("")}</div>
  <div class="pad stack"><div class="card"><div class="sec"><span>Pending waiver claims</span></div>
   <div class="rrow">${av("A. Simons", "CHI")}<div class="who"><div class="nm"><a>A. Simons</a><span class="tm">CHI</span><span class="ps">G</span></div><div class="l2">Drop: E. Mobley</div><div class="l3">Processes tomorrow 9 AM</div></div><button class="pill sm">Cancel</button></div></div>
   <div class="card"><div class="sec"><span>Waiver order</span></div>${["Admin FC", "Jo's Jumpers", "Tejvir's Squad", "Sam's Splash Bros"].map((t, i) => `<div class="rrow" style="padding:10px 16px"><b style="width:22px">${i + 1}</b><span class="grow">${t}</span>${i === 2 ? `<span class="tag acc">You</span>` : ""}</div>`).join("")}<div class="pad" style="font-size:12px;color:var(--mut)">Dropped players sit on waivers for 24 hours. Win a claim and you go to the back of the line.</div></div></div></div></div>`;
}

function bets() {
  return `<div class="page"><div class="pad row between"><div><b style="font-size:18px">Bets</b><div style="font-size:13px;color:var(--mut)">Play money only · lose a bet, lend a player</div></div><span class="tag warn">Coming soon</span></div>
  <div class="grid2 side"><div><div class="sec"><span>Matchup lines · Week 3</span></div>${[["Tejvir's Squad to win", "vs Jo's Jumpers", "-130"], ["Jo's Jumpers to win", "vs Tejvir's Squad", "+110"], ["Wembanyama over 50.5 FP", "Player prop", "-115"], ["Doncic over 55 FP", "Player prop", "+120"]].map(([t, o, odds]) => `<div class="rrow" style="padding:12px 16px"><div class="grow"><b>${t}</b><div class="sub" style="font-size:12px">${o}</div></div><button class="pill sm">${odds}</button></div>`).join("")}
   <div class="sec"><span>Active bets</span></div><div class="rrow" style="padding:12px 16px"><div class="grow"><b>Parlay · 3 legs</b><div class="sub" style="font-size:12px">Stake 50 → 212 if all hit</div></div><span class="tag warn">2 of 3 hit</span></div><div class="rrow" style="padding:12px 16px"><div class="grow"><b>Sam owes Jo: Jaylen Brown</b><div class="sub" style="font-size:12px">Returns Sunday 11:59 PM</div></div><span class="tag acc">Loan</span></div></div>
  <div class="pad"><div class="card"><div class="sec"><span>Bet slip · Parlay</span></div>${[["Tejvir's Squad to win", "-130"], ["Wembanyama over 50.5 FP", "-115"], ["Randle over 45 FP", "+105"]].map(([t, o]) => `<div class="rrow" style="padding:10px 16px"><span class="grow" style="font-size:14px">${t}</span><b>${o}</b><button class="pill sm danger">✕</button></div>`).join("")}<div class="pad stack"><div class="row between"><span style="color:var(--mut)">Combined odds</span><b>+394</b></div><label class="field"><span>Stake (play points)</span><input class="input" value="50"></label><div class="row between"><span style="color:var(--mut)">To win</span><b>197</b></div><label class="field"><span>If I lose, I lend</span><select class="input"><option>Josh Giddey · 3 days</option><option>No loan</option></select></label><button class="pill solid block">Place parlay</button></div></div></div></div></div>`;
}

function settings() {
  return `<div class="page"><div class="grid2 even"><div><div class="sec"><span>Invite friends</span></div><div class="pad stack"><div style="font-size:11px;font-weight:700;letter-spacing:.06em;color:var(--mut)">INVITE CODE</div><div style="font-size:34px;letter-spacing:.3em;font-weight:300">JNKX25</div><button class="pill block">Copy invite link</button></div>
   <div class="sec"><span>Teams</span></div>${STANDINGS.map((s) => `<div class="rrow" style="padding:12px 16px">${teamAv(s.name, s.c, "sm")}<span class="grow">${s.name}</span>${s.me ? `<span class="tag">Commissioner</span>` : ""}</div>`).join("")}</div>
  <div><div class="sec"><span>Commissioner settings</span></div><div class="pad stack">
   <label class="field"><span>Lock-In mode</span><select class="input"><option>Strict (Sleeper): lock before the next game</option><option>Open: every game selectable all week</option></select></label>
   <label class="field"><span>Trade approval</span><select class="input"><option>Instant when accepted</option><option>Commissioner approves</option></select></label>
   <div class="row"><label class="field grow"><span>Weeks</span><input class="input" value="6"></label><label class="field grow"><span>Playoff teams</span><input class="input" value="4"></label></div>
   <div style="font-size:11px;font-weight:700;letter-spacing:.06em;color:var(--mut)">SCORING</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${[["Point", "1"], ["Rebound", "1.2"], ["Assist", "1.5"], ["Steal", "3"], ["Block", "3"], ["Turnover", "-1"]].map(([k, v]) => `<div class="row between"><span style="color:var(--mut)">${k}</span><input class="input" style="width:72px;padding:6px 8px" value="${v}"></div>`).join("")}</div>
   <button class="pill solid block">Save settings</button></div></div></div></div>`;
}

const SW = ["#0c8312", "#166534", "#059669", "#0f766e", "#1d4ed8", "#6d28d9", "#c2410c", "#c8102e", "#334155"];
function account() {
  return `<div class="page" style="max-width:640px"><div class="pad stack"><div><b style="font-size:20px">Account</b><div style="font-size:13px;color:var(--mut)">Tejvir · Admin</div></div>
   <div class="card"><div class="sec"><span>Appearance</span></div><div class="pad stack"><div style="font-size:14px;color:var(--mut)">Pick the accent color used for the header, tabs, and buttons. It's saved to your account.</div>
     <div class="swatches">${SW.map((h) => `<button class="sw" data-hex="${h}" style="background:${h}" aria-label="${h}"></button>`).join("")}</div>
     <label class="row" style="gap:12px"><span style="font-size:13px;font-weight:700">Custom</span><input type="color" value="#0c8312" style="width:56px;height:36px;border:1px solid #c9cdd3;border-radius:6px;background:#fff"></label>
     <div class="row"><button class="pill solid">Save color</button><button class="pill" data-hex="#0c8312">Reset to default green</button></div>
     <div class="banner" style="font-size:13px">Live preview: this whole page, and every other mockup, already uses your pick.</div></div></div>
   <div class="card"><div class="sec"><span>Change password</span></div><div class="pad stack"><input class="input" type="password" placeholder="New password (8+ characters)"><input class="input" type="password" placeholder="Confirm new password"><button class="pill solid block">Update password</button></div></div>
   <div class="row"><button class="pill grow">Install on your phone</button><button class="pill grow">Log out</button></div></div></div>`;
}

function auth() {
  return `<div class="pad stack" style="max-width:420px;margin:5vh auto 0"><div style="text-align:center"><div class="av lg" style="background:var(--accent);margin:0 auto 12px;box-shadow:none">HL</div><div style="font-size:26px;font-weight:500">Hoops League</div><div style="font-size:14px;color:var(--mut)">Private fantasy basketball with Lock-In scoring</div></div>
   <div class="card"><div class="pad stack"><label class="field"><span>Email or username</span><input class="input" placeholder="you@email.com"></label><label class="field"><span>Password</span><input class="input" type="password" value="••••••••"></label><button class="pill solid block">Log in</button><div style="text-align:center;font-size:13px;color:var(--mut)">Forgot your password? Reach out to Tejvir.</div><div style="text-align:center;font-size:14px">New here? <a style="color:var(--link)">Create an account</a></div></div></div></div>`;
}

function home() {
  const lg = (n: string, s: string, c: string, rec: string, next: string) => `<div class="card"><div class="rrow" style="padding:14px 16px">${teamAv(n, c, "lg")}<div class="who"><div class="nm" style="font-size:18px;font-weight:600">${n}</div><div class="l2">${rec}</div><div class="l3">${next}</div></div><span class="tag good">${s}</span></div><div class="pad"><button class="pill solid block">Open league</button></div></div>`;
  return `<div class="page"><div class="pad row between"><div><b style="font-size:22px">Your leagues</b><div style="font-size:13px;color:var(--mut)">Signed in as Tejvir</div></div><div class="row"><button class="pill sm">Account</button><button class="pill sm">Admin</button></div></div>
  <div class="pad grid2 even" style="padding-top:0">${lg("Demo League", "Week 3", "#0c8312", "2-1 · 2nd of 4", "Next: Sam's Splash Bros, Sat 7:30 PM")}${lg("Office League", "Drafting Fri", "#c9302c", "Not drafted yet", "Draft starts Friday 8:00 PM")}</div>
  <div class="pad row" style="padding-top:0"><button class="pill solid grow">Create a league</button><button class="pill grow">Join with a code</button></div>
  <div class="pad" style="padding-top:0"><div class="banner"><span style="font-size:22px">📱</span><div class="grow"><b>Install on your phone</b><div style="font-size:13px;color:var(--mut)">Add it to your home screen for an app icon and full-screen mode.</div></div><button class="pill sm">How</button></div></div></div>`;
}

function admin() {
  const fmt = (n: string, d: string, s: "on" | "off" | "planned" | "active") => `<div class="rrow" style="padding:12px 16px"><div class="grow"><b style="font-size:14px">${n}</b> ${s === "planned" ? `<span class="tag">Planned</span>` : ""}<div class="sub" style="font-size:12px">${d}</div></div>${s === "planned" ? `<button class="pill sm dis">Coming soon</button>` : s === "active" ? `<span class="tag good">Active</span>` : `<span class="toggle ${s === "on" ? "on" : ""}"></span>`}</div>`;
  return `<div class="page"><div class="pad"><b style="font-size:22px">Admin</b><div style="font-size:13px;color:var(--mut)">Game formats, users and data health</div></div><div class="grid2 side"><div><div class="sec"><span>Demo League · game formats</span><span class="tag">Switch any time</span></div>
   ${fmt("Lock-In: Strict (Sleeper)", "Lock before the player's next game", "active")}${fmt("Lock-In: Open", "Every finished game selectable until week end", "off")}${fmt("Manager auto-pick", "Highest game / threshold auto-lock", "on")}${fmt("Betting & parlays", "Play-money bets incl. multi-leg parlays", "planned")}${fmt("Loser loans a player", "Loser lends a player for a set period", "planned")}${fmt("FAAB bidding", "Budgeted blind bids", "planned")}${fmt("Double-points week", "Commissioner-picked week counts double", "planned")}</div>
  <div class="pad stack"><div class="card"><div class="sec"><span>Data health</span></div><div class="pad stack"><div style="display:grid;grid-template-columns:repeat(3,1fr)"><div class="kpi"><b>662</b><span>Players</span></div><div class="kpi"><b>1,320</b><span>Games</span></div><div class="kpi"><b>26,998</b><span>Lines</span></div></div><div style="font-size:13px;color:var(--mut)">Last sync 13 min ago (by Tejvir)</div><button class="pill solid block">Force full sync</button></div></div>
   <div class="card"><div class="sec"><span>Users (4)</span></div>${[["Tejvir", true], ["Admin", true], ["Bot Sam", false], ["Bot Jo", false]].map(([n, a]) => `<div class="rrow" style="padding:10px 16px"><span class="grow">${n} ${a ? `<span class="tag acc">Admin</span>` : ""}</span><button class="pill sm">${a ? "Remove admin" : "Make admin"}</button></div>`).join("")}</div></div></div></div>`;
}

function install() {
  const steps: [string, string][] = [["Open in Safari", "On iPhone this must be Safari, not Chrome."], ["Tap the Share button", "The square with an arrow, at the bottom of the screen."], ["Choose “Add to Home Screen”", "Scroll the share sheet if you don't see it."], ["Tap Add", "The Hoops League icon now sits on your home screen."]];
  return `<div class="page" style="max-width:820px"><div class="pad"><b style="font-size:22px">Install Hoops League</b><div style="font-size:14px;color:var(--mut);margin-top:4px">No App Store. It installs like an app: its own icon, full-screen, auto-updates.</div></div>
  <div class="pad grid2 even" style="padding-top:0"><div class="stack">${steps.map(([t, d], i) => `<div class="card"><div class="pad row"><span class="av sm" style="background:var(--accent);box-shadow:none">${i + 1}</span><div><b>${t}</b><div style="font-size:13px;color:var(--mut)">${d}</div></div></div></div>`).join("")}</div>
  <div class="ios stack"><div class="card pad row between"><span style="font-size:13px;color:var(--mut)">hoops-league.vercel.app</span><span>⬆︎</span></div><div class="card"><div class="rrow" style="padding:12px 16px">Copy</div><div class="rrow" style="padding:12px 16px"><b class="grow">Add to Home Screen</b><span>＋</span></div><div class="rrow" style="padding:12px 16px">Add Bookmark</div></div><div style="text-align:center;padding:8px"><span class="av lg" style="background:var(--accent);border-radius:16px;margin:0 auto;box-shadow:none">HL</span><div style="font-size:12px;color:var(--mut);margin-top:4px">Hoops</div></div></div></div></div>`;
}

export const SCREENS: Screen[] = [
  { id: "auth", title: "Log in", description: "First impression. Username or email; no reset flow (contact the commissioner).", tab: "none", render: auth },
  { id: "home", title: "My leagues", description: "Landing page: leagues, create or join, install prompt.", tab: "none", render: home },
  { id: "roster", title: "Roster + Lock-In", description: "Auto Lock-In toggle, slot pills, headshots, three-line rows. Each row says Auto (will lock best game), Locked by you, or Auto-locked.", tab: "roster", render: roster },
  { id: "lockin", title: "Lock-In sheet", description: "Choosing which game counts. Auto Lock-In already picked the highest; you can lock it early or leave it.", tab: "roster", render: roster, overlay: lockOverlay },
  { id: "matchup", title: "Matchup", description: "Swipe strip of every matchup this week, then the full head-to-head lineup for the one you open.", tab: "matchup", render: matchup },
  { id: "matchup2", title: "Matchup: another game", description: "Tap any card in the swipe strip to open that matchup. Benches of other games stay hidden until tip-off.", tab: "matchup", render: matchup2 },
  { id: "players", title: "Players (free agents)", description: "Filter pills, search, Add or Claim.", tab: "players", render: players },
  { id: "standings", title: "League: standings + bracket", description: "League hub with sub-navigation: standings, schedule, playoff bracket.", tab: "league", sub: "standings", render: standings },
  { id: "trades", title: "League: trades", description: "Incoming and outgoing offers, offer builder, history.", tab: "league", sub: "trades", render: trades },
  { id: "activity", title: "League: activity + waivers", description: "Transactions, pending claims, waiver order.", tab: "league", sub: "activity", render: activity },
  { id: "draft", title: "Draft room", description: "Player table with photos and stats (FPTS, HIGH game, PTS/REB/AST/STL/BLK). The top player's full card sits on the right: season averages, last 5 games, Draft or Queue.", tab: "none", full: true, render: draft },
  { id: "draftplayer", title: "Draft room: player card (phone)", description: "On a phone, tapping a player opens their card as a sheet: photo, season stats, last 5 games, Draft button.", tab: "none", full: true, render: draft, overlay: draftPlayerOverlay },
  { id: "bets", title: "League: bets (future)", description: "Play-money betting where the loser lends a player.", tab: "league", sub: "bets", render: bets },
  { id: "settings", title: "League: settings", description: "Invite code, teams, rules, scoring.", tab: "league", sub: "settings", render: settings },
  { id: "account", title: "Account + appearance", description: "Pick your accent color (live preview), change password.", tab: "none", render: account },
  { id: "admin", title: "Admin: game formats", description: "Switch formats on or off any time; data health; users.", tab: "none", render: admin },
  { id: "install", title: "Install on iPhone", description: "Add to Home Screen walkthrough.", tab: "none", render: install },
];
