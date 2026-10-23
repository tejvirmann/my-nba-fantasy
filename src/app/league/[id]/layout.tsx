import Link from "next/link";
import { LeagueNav } from "@/components/LeagueNav";
import { currentWeek } from "@/server/engine";
import { leagueContext } from "@/server/page";

export default async function LeagueLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { league, team, user } = await leagueContext(id);
  const week = currentWeek(league);
  const inSeason = league.status === "active" || league.status === "playoffs";
  const drafting = league.status === "setup" || league.status === "drafting";
  const subtitle =
    league.status === "setup" ? "Waiting to draft"
    : league.status === "drafting" ? "Draft in progress"
    : league.status === "complete" ? "Season complete"
    : week >= 1 ? `Week ${week}${league.status === "playoffs" ? " · Playoffs" : ""}`
    : "Season starts soon";

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col bg-brand p-5 text-white lg:flex">
        <Link href="/" className="text-xs text-white/60 hover:text-white">← All leagues</Link>
        <h1 className="mt-3 text-lg font-extrabold leading-tight">{league.name}</h1>
        <p className="text-xs text-white/60">{subtitle}</p>
        <LeagueNav leagueId={id} drafting={drafting} variant="side" />
        <div className="mt-auto space-y-1 border-t border-white/10 pt-4 text-xs text-white/60">
          <div className="font-semibold text-white/80">{team?.name ?? "Commissioner"}</div>
          <div>{user.displayName}</div>
          <div className="flex gap-3 pt-1">
            <Link href="/account" className="hover:text-white">Account</Link>
            {user.isAdmin ? <Link href="/admin" className="hover:text-white">Admin</Link> : null}
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Mobile header */}
        <header className="sticky top-0 z-10 bg-brand px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)] text-white lg:hidden">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-sm text-white/70">← Leagues</Link>
            <span className="text-xs text-white/70">{team?.name ?? "Commissioner"}</span>
          </div>
          <h1 className="mt-1 text-lg font-extrabold leading-tight">{league.name}</h1>
          <p className="text-xs text-white/70">{inSeason || league.status === "complete" || drafting ? subtitle : ""}</p>
        </header>
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-4 lg:px-8 lg:pb-12 lg:pt-8">{children}</div>
        <LeagueNav leagueId={id} drafting={drafting} variant="bottom" />
      </div>
    </div>
  );
}
