import { notFound } from "next/navigation";
import { requireUser } from "./auth";
import { getMembership } from "./leagues";

/** Page-level guard: signed in and a member of this league, or 404. */
export async function leagueContext(leagueId: string) {
  const user = await requireUser();
  const m = await getMembership(user.id, leagueId).catch(() => null);
  if (!m) notFound();
  return { user, ...m };
}

export function fmt1(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1);
}

export function gameTime(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "numeric", minute: "2-digit" }).format(d);
}

export function dayTime(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(d);
}

export function ago(d: Date, now = new Date()): string {
  const s = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
