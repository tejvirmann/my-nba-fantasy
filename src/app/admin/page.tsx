import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { FORMATS, isFormatEnabled } from "@/core/formats";
import { adminOverview } from "@/server/admin";
import { requireAdmin } from "@/server/auth";
import { ago } from "@/server/page";
import { forceSync, toggleAdmin, toggleFormat } from "./actions";

export const metadata = { title: "Admin · Hoops League" };

export default async function AdminPage() {
  const me = await requireAdmin();
  const { leagues, users, counts, sync } = await adminOverview();

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-brand">Admin</h1>
          <p className="text-sm text-muted">Game formats, users and data health</p>
        </div>
        <Link href="/" className="btn btn-ghost btn-sm">← Leagues</Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <section>
            <h2 className="label mb-2">Leagues & game formats</h2>
            <p className="mb-3 text-sm text-muted">Switch formats on or off at any point in the season. Changes apply immediately and are logged.</p>
            <div className="space-y-3">
              {leagues.map((l) => (
                <article key={l.id} className="card p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/league/${l.id}`} className="truncate font-bold text-brand-2 hover:underline">{l.name}</Link>
                      <div className="text-xs text-muted">{l.teamCount} teams · {l.status} · code {l.inviteCode}</div>
                    </div>
                  </div>
                  <ul className="divide-y divide-line">
                    {FORMATS.map((f) => {
                      const on = isFormatEnabled(l.settings, f.id);
                      return (
                        <li key={f.id} className="flex items-center justify-between gap-3 py-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              {f.name}
                              {f.status === "planned" ? <span className="chip bg-slate-100 text-slate-500">Planned</span> : null}
                            </div>
                            <div className="text-xs text-muted">{f.description}</div>
                          </div>
                          {f.status === "planned" ? (
                            <button className="btn btn-ghost btn-sm" disabled>Coming soon</button>
                          ) : f.group && on ? (
                            <span className="chip bg-emerald-100 text-emerald-700">Active</span>
                          ) : (
                            <ActionForm action={toggleFormat.bind(null, l.id, f.id, f.group ? true : !on)} inline>
                              <SubmitButton className={`btn btn-sm ${on ? "btn-danger" : "btn-primary"}`} pendingText="…">
                                {f.group ? "Switch to this" : on ? "Turn off" : "Turn on"}
                              </SubmitButton>
                            </ActionForm>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </article>
              ))}
              {leagues.length === 0 ? <div className="card p-6 text-center text-sm text-muted">No leagues yet.</div> : null}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card p-4">
            <h2 className="mb-2 font-bold">Data health</h2>
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div><dt className="label">Players</dt><dd className="text-lg font-extrabold">{counts.players}</dd></div>
              <div><dt className="label">Games</dt><dd className="text-lg font-extrabold">{counts.games}</dd></div>
              <div><dt className="label">Lines</dt><dd className="text-lg font-extrabold">{counts.lines}</dd></div>
            </dl>
            <p className="mt-2 text-xs text-muted">
              {sync ? `Last sync ${ago(sync.startedAt)} (${sync.ok === false ? "failed" : sync.by ? `by ${sync.by}` : "automatic"})` : "No sync yet."}
              {sync?.error ? <span className="block text-lose">{sync.error}</span> : null}
            </p>
            <ActionForm action={forceSync} className="mt-3">
              <SubmitButton className="btn btn-primary w-full" pendingText="Syncing…">Force full sync</SubmitButton>
            </ActionForm>
          </section>

          <section className="card p-4">
            <h2 className="mb-2 font-bold">Users ({users.length})</h2>
            <ul className="divide-y divide-line">
              {users.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    {u.displayName}
                    {u.isAdmin ? <span className="chip ml-2 bg-brand-2 text-white">Admin</span> : null}
                  </span>
                  {u.id !== me.id ? (
                    <ActionForm action={toggleAdmin.bind(null, u.id, !u.isAdmin)} inline>
                      <SubmitButton className="btn btn-ghost btn-sm" pendingText="…">{u.isAdmin ? "Remove admin" : "Make admin"}</SubmitButton>
                    </ActionForm>
                  ) : (
                    <span className="text-xs text-muted">You</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
