import Link from "next/link";
import { requireUser } from "@/server/auth";
import { myLeagues } from "@/server/leagues";

const STATUS: Record<string, string> = {
  setup: "Setting up",
  drafting: "Drafting",
  active: "In season",
  playoffs: "Playoffs",
  complete: "Complete",
};

export default async function Home() {
  const user = await requireUser();
  const leagues = await myLeagues(user.id);
  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 lg:pt-12">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-brand">Hoops League</h1>
          <p className="text-sm text-muted">Signed in as {user.displayName}</p>
        </div>
        <nav className="flex gap-2">
          {user.isAdmin ? <Link href="/admin" className="btn btn-ghost btn-sm">Admin</Link> : null}
          <Link href="/account" className="btn btn-ghost btn-sm">Account</Link>
        </nav>
      </header>

      <h2 className="label mb-2">Your leagues</h2>
      {leagues.length === 0 ? (
        <div className="card p-6 text-center text-muted">You're not in a league yet. Create one or join with an invite code.</div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {leagues.map((l) => (
            <li key={l.id}>
              <Link href={`/league/${l.id}`} className="card flex items-center justify-between p-4 hover:border-brand-2">
                <span className="font-semibold">{l.name}</span>
                <span className="chip bg-slate-100 text-slate-600">{STATUS[l.status] ?? l.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link href="/leagues/new" className="btn btn-primary">Create a league</Link>
        <Link href="/join" className="btn btn-ghost">Join with a code</Link>
      </div>
    </main>
  );
}
