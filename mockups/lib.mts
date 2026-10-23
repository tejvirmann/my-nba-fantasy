// Shared fake data + tiny HTML helpers for the mockup generator. No images: initials avatars keep mockups offline and license-free.

export type Variant = "a" | "b" | "c";

export const TEAM_COLORS: Record<string, string> = {
  PHI: "#006bb6", LAL: "#552583", DAL: "#00538c", DET: "#c8102e", SA: "#6b7280", UTAH: "#002b5c", MIA: "#98002e",
  ORL: "#0077c0", CHI: "#ce1141", BKN: "#222222", CLE: "#860038", DEN: "#0e2240", OKC: "#007ac1", PHX: "#5b3c9a",
  HOU: "#ce1141", MIL: "#00471b", NY: "#006bb6", BOS: "#007a33", GS: "#1d428a", MIN: "#0c2340",
};

export type P = { name: string; pos: "G" | "F" | "C"; team: string; slot: string; pts: number; line: string; inj?: string };

export const MINE: P[] = [
  { name: "Jaylen Brown", pos: "G", team: "PHI", slot: "G", pts: 49.6, line: "32p 3r 6a" },
  { name: "Tyrese Maxey", pos: "G", team: "PHI", slot: "G", pts: 44.2, line: "28p 4r 5a" },
  { name: "Cooper Flagg", pos: "F", team: "DAL", slot: "F", pts: 49.5, line: "32p 5r 2a" },
  { name: "Victor Wembanyama", pos: "F", team: "SA", slot: "F", pts: 51.1, line: "24p 13r 3a" },
  { name: "Bam Adebayo", pos: "C", team: "MIA", slot: "C", pts: 36.9, line: "15p 7r 4a" },
  { name: "Josh Giddey", pos: "G", team: "CHI", slot: "UTIL", pts: 31.4, line: "12p 7r 6a" },
  { name: "James Harden", pos: "G", team: "CLE", slot: "UTIL", pts: 25.6, line: "16p 3r 5a" },
  { name: "Julius Randle", pos: "F", team: "BKN", slot: "BN", pts: 53.6, line: "33p 8r 7a" },
  { name: "Evan Mobley", pos: "C", team: "CLE", slot: "BN", pts: 30.1, line: "18p 8r 2a" },
  { name: "Chet Holmgren", pos: "C", team: "OKC", slot: "BN", pts: 47.4, line: "12p 17r 2a" },
];

export const THEIRS: P[] = [
  { name: "Luka Doncic", pos: "G", team: "LAL", slot: "G", pts: 53.6, line: "38p 7r 9a" },
  { name: "Cade Cunningham", pos: "G", team: "DET", slot: "G", pts: 40.3, line: "27p 4r 8a" },
  { name: "Paolo Banchero", pos: "F", team: "ORL", slot: "F", pts: 56.9, line: "35p 9r 4a" },
  { name: "Lauri Markkanen", pos: "F", team: "UTAH", slot: "F", pts: 33.8, line: "24p 6r 1a" },
  { name: "Joel Embiid", pos: "C", team: "PHI", slot: "C", pts: 33.4, line: "26p 7r 2a", inj: "DTD" },
  { name: "Michael Porter Jr.", pos: "F", team: "BKN", slot: "UTIL", pts: 43.4, line: "26p 9r 2a" },
  { name: "Jamal Murray", pos: "G", team: "DEN", slot: "UTIL", pts: 19.5, line: "14p 2r 5a" },
];

export const POOL: (P & { avg: number; gp: number; waiver?: boolean })[] = [
  { name: "Jalen Johnson", pos: "F", team: "ATL", slot: "", pts: 0, line: "", avg: 38.2, gp: 4 },
  { name: "Anfernee Simons", pos: "G", team: "CHI", slot: "", pts: 0, line: "", avg: 29.8, gp: 4, waiver: true },
  { name: "Walker Kessler", pos: "C", team: "UTAH", slot: "", pts: 0, line: "", avg: 27.6, gp: 4 },
  { name: "Dyson Daniels", pos: "G", team: "ATL", slot: "", pts: 0, line: "", avg: 31.1, gp: 4, inj: "Out" },
  { name: "Jabari Smith Jr.", pos: "F", team: "HOU", slot: "", pts: 0, line: "", avg: 26.4, gp: 4 },
  { name: "Ayo Dosunmu", pos: "G", team: "MIN", slot: "", pts: 0, line: "", avg: 24.9, gp: 4 },
];

export const STANDINGS = [
  { name: "Sam's Splash Bros", w: 3, l: 0, pf: 912.4, pa: 804.1, me: false },
  { name: "Tejvir's Squad", w: 2, l: 1, pf: 861.0, pa: 842.7, me: true },
  { name: "Jo's Jumpers", w: 1, l: 2, pf: 798.3, pa: 850.9, me: false },
  { name: "Admin FC", w: 0, l: 3, pf: 740.2, pa: 814.2, me: false },
];

export const NAV = [
  { id: "matchup", label: "Matchup", icon: "bolt" },
  { id: "team", label: "My Team", icon: "user" },
  { id: "players", label: "Players", icon: "search" },
  { id: "trades", label: "Trades", icon: "swap" },
  { id: "standings", label: "Standings", icon: "trophy" },
  { id: "league", label: "League", icon: "gear" },
];

const ICONS: Record<string, string> = {
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  swap: '<path d="M7 7h13l-3-3M17 17H4l3 3"/>',
  trophy: '<path d="M8 4h8v6a4 4 0 0 1-8 0zM8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 14v4M8 21h8"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
};
export const icon = (n: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
export const initials = (n: string) => n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
export const avatar = (name: string, team: string, size = "") =>
  `<span class="avatar ${size}" style="background:${TEAM_COLORS[team] ?? "#475569"}">${initials(name)}</span>`;
export const teamAvatar = (name: string, color: string, size = "") =>
  `<span class="avatar ${size}" style="background:${color}">${initials(name)}</span>`;
export const chip = (t: string, kind = "") => `<span class="chip ${kind}">${t}</span>`;
export const pos = (p: string) => `<span class="pos ${p === "UTIL" ? "U" : p}">${p}</span>`;

export function nav(active: string): { side: string; top: string; bottom: string } {
  const link = (n: (typeof NAV)[number], inner: string) => `<a href="#" class="${n.id === active ? "on" : ""}">${inner}</a>`;
  return {
    side: NAV.map((n) => link(n, `${icon(n.icon)}${n.label}`)).join(""),
    top: NAV.map((n) => link(n, n.label)).join(""),
    bottom: NAV.map((n) => link(n, `${icon(n.icon)}<span>${n.label}</span>`)).join(""),
  };
}
