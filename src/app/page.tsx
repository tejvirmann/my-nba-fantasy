import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/server/auth";
import { myLeagues } from "@/server/leagues";

const STATUS: Record<string, string> = { setup: "Setting up", drafting: "Drafting", active: "In season", playoffs: "Playoffs", complete: "Complete" };

export default async function Home() {
  const user = await requireUser();
  const leagues = await myLeagues(user.id);
  return (
    <>
      <AppHeader
        title="DS Hoops League"
        subtitle={`Signed in as ${user.displayName}`}
        right={<><Link href="/install">Install</Link><Link href="/account">Account</Link>{user.isAdmin ? <Link href="/admin">Admin</Link> : null}</>}
      />
      <main className="page pad stack">
        <h1 className="text-xl font-medium">Your leagues</h1>
        {leagues.length === 0 ? (
          <div className="card pad text-center text-muted">You&apos;re not in a league yet. Create one or join with an invite code.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {leagues.map((l) => (
              <Link key={l.id} href={`/league/${l.id}`} className="card rrow hover:border-accent" style={{ background: "#fff" }}>
                <span className="av" style={{ background: "var(--accent)", color: "var(--accent-ink)", boxShadow: "none" }}>{l.name.slice(0, 2).toUpperCase()}</span>
                <div className="who">
                  <div className="nm" style={{ fontWeight: 600 }}>{l.name}</div>
                  <div className="l2">{STATUS[l.status] ?? l.status}</div>
                </div>
                <span className="text-xl text-muted">›</span>
              </Link>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <Link href="/leagues/new" className="btn btn-primary grow">Create a league</Link>
          <Link href="/join" className="btn grow">Join with a code</Link>
        </div>
        <Link href="/install" className="banner text-sm" style={{ textDecoration: "none" }}>
          <span aria-hidden>📱</span>
          <div className="flex-1"><b>Install on iPhone</b><div className="text-[13px] text-muted">Add it to your home screen for an app icon and full-screen mode.</div></div>
          <span className="text-xl text-muted">›</span>
        </Link>
      </main>
    </>
  );
}
