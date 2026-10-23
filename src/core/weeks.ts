/**
 * Matchup weeks run Monday 00:00 to the next Monday 00:00 in the league's timezone.
 * `week1Start` is a YYYY-MM-DD date string (a Monday).
 */

/** UTC instant at which the given local wall-clock time occurs in `timeZone`. */
export function zonedTimeToUtc(y: number, m: number, d: number, timeZone: string): Date {
  const guess = Date.UTC(y, m - 1, d, 0, 0, 0);
  const offset = tzOffsetMs(new Date(guess), timeZone);
  const first = guess - offset;
  // The offset may differ at the corrected instant (DST boundary); re-check once.
  const offset2 = tzOffsetMs(new Date(first), timeZone);
  return new Date(guess - offset2);
}

function tzOffsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - at.getTime();
}

function addDays(y: number, m: number, d: number, days: number): [number, number, number] {
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return [dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()];
}

export function weekBounds(week1Start: string, timeZone: string, week: number): { start: Date; end: Date } {
  const [y, m, d] = week1Start.split("-").map(Number);
  const [sy, sm, sd] = addDays(y, m, d, (week - 1) * 7);
  const [ey, em, ed] = addDays(y, m, d, week * 7);
  return { start: zonedTimeToUtc(sy, sm, sd, timeZone), end: zonedTimeToUtc(ey, em, ed, timeZone) };
}

/** Week number (1-based) containing `at`; <1 means before the season starts. */
export function weekOf(week1Start: string, timeZone: string, at: Date): number {
  const { start } = weekBounds(week1Start, timeZone, 1);
  return Math.floor((at.getTime() - start.getTime()) / (7 * 86_400_000)) + 1;
}

/** Monday on or after the given date (YYYY-MM-DD), as YYYY-MM-DD. */
export function nextMonday(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  const add = (8 - dow) % 7;
  const [ny, nm, nd] = addDays(y, m, d, add);
  return `${ny}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
}
