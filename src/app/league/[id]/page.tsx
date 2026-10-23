import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { RefreshBar } from "@/components/RefreshBar";
import { computeWeek, currentWeek, type PlayerWeekView, type TeamWeekView } from "@/server/engine";
import { orderLineup, sourceLabel } from "@/server/lineup";
import { ago, fmt1, leagueContext } from "@/server/page";

function Chip({ p }: { p: PlayerWeekView }) {
  const label = sourceLabel(p);
  const tone = p.lock ? "bg-emerald-100 text-emerald-700" : p.resolution.provisional ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600";
  return <span className={`chip ${tone}`}>{label}</span>;
}

function Side({ tv, align }: { tv: TeamWeekView | null; align: "left" | "right" }) {
  return (
    <div className={`min-w-0 ${align === "right" ? "text-right" : ""}`}>
      <div className="truncate text-xs font-semibold text-white/80">{tv?.team.name ?? "Bye week"}</div>
      <div className="text-4xl font-extrabold tabular-nums">{tv ? fmt1(tv.total) : "—"}</div>
    </div>
  );
}

export default async function MatchupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { league, team, user } = await leagueContext(id);
  const week = currentWeek(league);
  const inSeason = (league.status === "active" || league.status === "playoffs") && week >= 1;

  if (!inSeason) {
    const teamRows = await db.select().from(schema.teams).where(eq(schema.teams.leagueId, id));
    return (
      <div className="space-y-4">
        <div className="card p-5">
          <div className="label">Invite code</div>
          <div className="mt-1 text-3xl font-extrabold tracking-[0.3em] text-brand">{league.inviteCode}</div>
          <p className="mt-2 text-sm text-muted">Friends can join at <span className="font-semibold">/join</span> with this code.</p>
        </div>
        <div className="card p-4">
          <div className="label mb-2">Teams ({teamRows.length})</div>
          <ul className="divide-y divide-line">
            {teamRows.map((t) => (
              <li key={t.id} className="py-2 text-sm font-semibold">{t.name}</li>
            ))}
          </ul>
        </div>
        {league.status === "setup" || league.status === "drafting" ? (
          <Link href={`/league/${id}/draft`} className="btn btn-accent w-full">Go to the draft room</Link>
        ) : (
          <div className="card p-4 text-sm text-muted">Week 1 starts {league.week1Start}.</div>
        )}
        <RefreshBar leagueId={id} />
      </div>
    );
  }

  const [view, matchRows] = await Promise.all([
    computeWeek(id, week, new Date(), league),
    db.select().from(schema.matchups).where(and(eq(schema.matchups.leagueId, id), eq(schema.matchups.week, week))),
  ]);
  const myMatch = team ? matchRows.find((m) => m.teamAId === team.id || m.teamBId === team.id) : undefined;
  const allMatches = matchRows;
  const byTeam = new Map(view.teams.map((t) => [t.team.id, t]));
  const mine = team ? byTeam.get(team.id)! : null;
  const oppId = myMatch ? (myMatch.teamAId === team!.id ? myMatch.teamBId : myMatch.teamAId) : null;
  const opp = oppId ? (byTeam.get(oppId) ?? null) : null;

  const mineLineup = mine ? orderLineup(mine.players, league.settings.starterSlots) : null;
  const oppLineup = opp ? orderLineup(opp.players, league.settings.starterSlots) : null;

  const activity = await db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.leagueId, id))
    .orderBy(desc(schema.transactions.createdAt))
    .limit(8);
  const teamName = new Map(view.teams.map((t) => [t.team.id, t.team.name]));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-6">
      <div className="min-w-0 space-y-4">
      {mine ? (
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-2 p-4 text-white shadow-sm">
          <div className="mb-2 flex items-center justify-between text-xs text-white/70">
            <span>Week {week}{myMatch?.isPlayoff ? " · Playoffs" : ""}</span>
            <span>{view.settled ? "Final" : `Ends ${new Intl.DateTimeFormat("en-US", { timeZone: league.timezone, weekday: "short", month: "short", day: "numeric" }).format(new Date(view.end.getTime() - 1))}`}</span>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
            <Side tv={mine} align="left" />
            <span className="pb-2 text-xs font-bold text-white/60">VS</span>
            <Side tv={opp} align="right" />
          </div>
        </section>
      ) : null}

      {mineLineup ? (
        <section className="card overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr] border-b border-line bg-slate-50 px-3 py-2 text-xs font-semibold text-muted">
            <span>{mine!.team.name}</span>
            <span className="text-right">{opp?.team.name ?? "—"}</span>
          </div>
          <ul className="divide-y divide-line">
            {mineLineup.starters.map((row, i) => {
              const a = row.player;
              const b = oppLineup?.starters[i]?.player ?? null;
              return (
                <li key={i} className="grid grid-cols-[1fr_1fr] gap-2 px-3 py-2">
                  <Cell p={a} slot={row.slot} align="left" />
                  <Cell p={b} slot={row.slot} align="right" />
                </li>
              );
            })}
          </ul>
          <div className="border-t border-line px-3 py-2 text-right text-xs text-muted">
            <Link href={`/league/${id}/team`} className="font-semibold text-brand-2">Set lineup & lock in games →</Link>
          </div>
        </section>
      ) : null}

      </div>
      <div className="min-w-0 space-y-4">
      <section>
        <h2 className="label mb-2">League scoreboard</h2>
        <div className="grid gap-2">
          {allMatches.map((m) => {
            const a = byTeam.get(m.teamAId);
            const b = m.teamBId ? byTeam.get(m.teamBId) : null;
            return (
              <div key={m.id} className="card grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 py-2 text-sm">
                <span className="truncate font-semibold">{a?.team.name}</span>
                <span className="tabular-nums font-bold">{fmt1(a?.total ?? 0)} – {b ? fmt1(b.total) : "bye"}</span>
                <span className="truncate text-right font-semibold">{b?.team.name ?? ""}</span>
              </div>
            );
          })}
        </div>
      </section>

      <RefreshBar leagueId={id} />

      {activity.length ? (
        <section>
          <h2 className="label mb-2">Recent activity</h2>
          <ul className="card divide-y divide-line">
            {activity.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-semibold">{a.teamId ? teamName.get(a.teamId) : "League"}</span>{" "}
                  <span className="text-muted">{describe(a.type, a.payload)}</span>
                </span>
                <span className="shrink-0 text-xs text-muted">{ago(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="sr-only">{user.displayName}</p>
      </div>
    </div>
  );
}

function describe(type: string, p: Record<string, unknown>): string {
  const name = typeof p.name === "string" ? p.name : "a player";
  if (type === "draft") return `drafted ${name}`;
  if (type === "add") return `added ${name}`;
  if (type === "drop") return "dropped a player";
  if (type === "waiver") return `won ${name} on waivers`;
  if (type === "lock") return "locked in a game";
  if (type === "lineup") return "updated their lineup";
  if (type === "trade") return `trade ${String(p.action ?? "")}`;
  return type;
}

function Cell({ p, slot, align }: { p: PlayerWeekView | null; slot: string; align: "left" | "right" }) {
  const right = align === "right";
  if (!p) {
    return <div className={`text-xs text-muted ${right ? "text-right" : ""}`}>{slot} · empty</div>;
  }
  return (
    <div className={`flex min-w-0 items-center gap-2 ${right ? "flex-row-reverse text-right" : ""}`}>
      <PlayerAvatar name={p.name} src={p.imageUrl} team={p.teamAbbr} size={32} />
      <div className="min-w-0 flex-1">
        <div className="break-words text-[12px] font-semibold leading-tight sm:text-sm">{p.name}</div>
        <div className="truncate text-[11px] text-muted">{slot} · {p.teamAbbr}{p.injuryStatus ? ` · ${p.injuryStatus}` : ""}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[15px] font-extrabold tabular-nums sm:text-base">{fmt1(p.counted)}</div>
        <span className="hidden sm:inline-flex"><Chip p={p} /></span>
      </div>
    </div>
  );
}
