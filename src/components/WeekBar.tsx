import Link from "next/link";

/** "‹ Week 3 ›" selector. Navigates with ?week=N so every week is a shareable, server-rendered page. */
export function WeekBar({ basePath, week, current, max }: { basePath: string; week: number; current: number; max: number }) {
  const href = (w: number) => (w === current ? basePath : `${basePath}?week=${w}`);
  const tag = week === current ? "This week" : week < current ? "Final" : "Upcoming";
  return (
    <div className="weekbar">
      {week > 1 ? <Link href={href(week - 1)} className="chev" aria-label="Previous week">‹</Link> : <span className="chev" style={{ opacity: 0.25 }}>‹</span>}
      <span className="wk" style={{ textAlign: "center" }}>
        Week {week}
        <small style={{ display: "block", fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>{tag}</small>
      </span>
      {week < max ? <Link href={href(week + 1)} className="chev" aria-label="Next week">›</Link> : <span className="chev" style={{ opacity: 0.25 }}>›</span>}
    </div>
  );
}

export function parseWeek(raw: string | undefined, current: number, max: number): number {
  const n = Number(raw);
  if (!Number.isInteger(n)) return Math.min(Math.max(current, 1), max);
  return Math.min(Math.max(n, 1), max);
}
