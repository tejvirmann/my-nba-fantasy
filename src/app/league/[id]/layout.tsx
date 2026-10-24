import Link from "next/link";
import { LeagueTabs } from "@/components/LeagueTabs";
import { currentWeek } from "@/server/engine";
import { leagueContext } from "@/server/page";

export default async function LeagueLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { league, team, user } = await leagueContext(id);
  const week = currentWeek(league);
  const status =
    league.status === "setup" ? "Waiting to draft"
    : league.status === "drafting" ? "Draft in progress"
    : league.status === "complete" ? "Season complete"
    : week >= 1 ? `Week ${week}${league.status === "playoffs" ? " · Playoffs" : ""}`
    : "Season starts soon";

  return (
    <div className="min-h-dvh">
      <header className="hdr">
        <Link href="/" className="logo" aria-label="All leagues">DS</Link>
        <div className="ttl">
          {league.name}
          <small>{team ? `${team.name} · ` : ""}{status}</small>
        </div>
        <div className="right">
          <Link href="/install">Install</Link>
          <Link href="/account">Account</Link>
          {user.isAdmin ? <Link href="/admin">Admin</Link> : null}
        </div>
      </header>
      <LeagueTabs leagueId={id} />
      <div className="page pb-24">{children}</div>
    </div>
  );
}
