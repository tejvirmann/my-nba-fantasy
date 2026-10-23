// Fake data + tiny HTML helpers for the mockup generator. Initials on team colors keep mockups offline and license-free.
export type Variant = "clean";

export const TEAM_COLORS: Record<string, string> = {
  PHI: "#006bb6", LAL: "#552583", DAL: "#00538c", DET: "#c8102e", SA: "#555b64", UTAH: "#002b5c", MIA: "#98002e", ORL: "#0077c0",
  CHI: "#ce1141", BKN: "#222222", CLE: "#860038", DEN: "#0e2240", OKC: "#007ac1", PHX: "#5b3c9a", HOU: "#ce1141", MIN: "#0c2340",
  ATL: "#c8102e", NY: "#006bb6", GS: "#1d428a", BOS: "#007a33",
};

export type Row = {
  name: string; full: string; pos: "G" | "F" | "C"; team: string; slot: string;
  pts: number; avg: number; line: [number, number, number];
  game: string; state: "locked" | "lockable" | "upcoming" | "bench"; inj?: string;
};

export const MINE: Row[] = [
  { name: "J. Brown", full: "Jaylen Brown", pos: "G", team: "PHI", slot: "G", pts: 49.6, avg: 41.2, line: [32, 3, 6], game: "vs CLE, 118-104 Final", state: "lockable" },
  { name: "T. Maxey", full: "Tyrese Maxey", pos: "G", team: "PHI", slot: "G", pts: 44.2, avg: 39.8, line: [28, 4, 5], game: "vs CLE, 118-104 Final", state: "locked" },
  { name: "C. Flagg", full: "Cooper Flagg", pos: "F", team: "DAL", slot: "F", pts: 49.5, avg: 36.4, line: [32, 5, 2], game: "@HOU, 101-97 Final", state: "lockable" },
  { name: "V. Wembanyama", full: "Victor Wembanyama", pos: "F", team: "SA", slot: "F", pts: 51.1, avg: 47.0, line: [24, 13, 3], game: "vs OKC, 112-109 Final", state: "locked" },
  { name: "B. Adebayo", full: "Bam Adebayo", pos: "C", team: "MIA", slot: "C", pts: 36.9, avg: 34.5, line: [15, 7, 4], game: "vs MIN, 99-104 Final", state: "lockable" },
  { name: "J. Giddey", full: "Josh Giddey", pos: "G", team: "CHI", slot: "UTIL", pts: 31.4, avg: 30.1, line: [12, 7, 6], game: "@TOR, 108-99 Final", state: "lockable" },
  { name: "J. Harden", full: "James Harden", pos: "G", team: "CLE", slot: "UTIL", pts: 25.6, avg: 33.0, line: [16, 3, 5], game: "vs MIL, 110-102 Final", state: "lockable" },
  { name: "J. Randle", full: "Julius Randle", pos: "F", team: "BKN", slot: "BN", pts: 53.6, avg: 35.2, line: [33, 8, 7], game: "vs CHA, 121-110 Final", state: "bench" },
  { name: "E. Mobley", full: "Evan Mobley", pos: "C", team: "CLE", slot: "BN", pts: 30.1, avg: 31.0, line: [18, 8, 2], game: "@PHI, 104-118 Final", state: "bench" },
  { name: "C. Holmgren", full: "Chet Holmgren", pos: "C", team: "OKC", slot: "BN", pts: 47.4, avg: 33.9, line: [12, 17, 2], game: "@SA, 109-112 Final", state: "bench", inj: "DTD" },
];
export const THEIRS: Row[] = [
  { name: "L. Doncic", full: "Luka Doncic", pos: "G", team: "LAL", slot: "G", pts: 53.6, avg: 52.0, line: [38, 7, 9], game: "", state: "locked" },
  { name: "C. Cunningham", full: "Cade Cunningham", pos: "G", team: "DET", slot: "G", pts: 40.3, avg: 41.0, line: [27, 4, 8], game: "", state: "locked" },
  { name: "P. Banchero", full: "Paolo Banchero", pos: "F", team: "ORL", slot: "F", pts: 56.9, avg: 44.1, line: [35, 9, 4], game: "", state: "locked" },
  { name: "L. Markkanen", full: "Lauri Markkanen", pos: "F", team: "UTAH", slot: "F", pts: 33.8, avg: 38.2, line: [24, 6, 1], game: "", state: "locked" },
  { name: "J. Embiid", full: "Joel Embiid", pos: "C", team: "PHI", slot: "C", pts: 33.4, avg: 45.9, line: [26, 7, 2], game: "", state: "locked", inj: "DTD" },
  { name: "M. Porter Jr.", full: "Michael Porter Jr.", pos: "F", team: "BKN", slot: "UTIL", pts: 43.4, avg: 32.0, line: [26, 9, 2], game: "", state: "locked" },
  { name: "J. Murray", full: "Jamal Murray", pos: "G", team: "DEN", slot: "UTIL", pts: 19.5, avg: 34.8, line: [14, 2, 5], game: "", state: "upcoming" },
];
export const POOL = [
  { name: "J. Johnson", full: "Jalen Johnson", pos: "F", team: "ATL", avg: 38.2, gp: 4, last: 41.0 },
  { name: "A. Simons", full: "Anfernee Simons", pos: "G", team: "CHI", avg: 29.8, gp: 4, last: 33.5, waiver: true },
  { name: "W. Kessler", full: "Walker Kessler", pos: "C", team: "UTAH", avg: 27.6, gp: 4, last: 22.0 },
  { name: "D. Daniels", full: "Dyson Daniels", pos: "G", team: "ATL", avg: 31.1, gp: 4, last: 36.2, inj: "OUT" },
  { name: "J. Smith Jr.", full: "Jabari Smith Jr.", pos: "F", team: "HOU", avg: 26.4, gp: 4, last: 28.9 },
  { name: "A. Dosunmu", full: "Ayo Dosunmu", pos: "G", team: "MIN", avg: 24.9, gp: 4, last: 19.4 },
];
export const STANDINGS = [
  { name: "Sam's Splash Bros", w: 3, l: 0, pf: 912.4, pa: 804.1, me: false, c: "#0e5fb5" },
  { name: "Tejvir's Squad", w: 2, l: 1, pf: 861.0, pa: 842.7, me: true, c: "#0c8312" },
  { name: "Jo's Jumpers", w: 1, l: 2, pf: 798.3, pa: 850.9, me: false, c: "#c9302c" },
  { name: "Admin FC", w: 0, l: 3, pf: 740.2, pa: 814.2, me: false, c: "#333" },
];

export const TABS = [
  { id: "roster", label: "Roster" },
  { id: "matchup", label: "Matchup" },
  { id: "players", label: "Players" },
  { id: "league", label: "League" },
];
export const SUBNAV = [
  { id: "standings", label: "Standings" },
  { id: "trades", label: "Trades" },
  { id: "activity", label: "Activity" },
  { id: "draft", label: "Draft" },
  { id: "bets", label: "Bets" },
  { id: "settings", label: "Settings" },
];

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
export const initials = (n: string) => n.replace(/\./g, "").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
export const av = (name: string, team: string, size = "") => `<span class="av ${size}" style="background:${TEAM_COLORS[team] ?? "#555b64"}">${initials(name)}</span>`;
export const teamAv = (name: string, color: string, size = "") => `<span class="av ${size}" style="background:${color}">${initials(name)}</span>`;
export const lockIcon = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17 9V7a5 5 0 0 0-10 0v2H5v12h14V9zm-8-2a3 3 0 0 1 6 0v2H9z"/></svg>`;
export const f1 = (n: number) => n.toFixed(1);
