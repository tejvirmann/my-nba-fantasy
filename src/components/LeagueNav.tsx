"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = { leagueId: string; drafting: boolean; variant: "bottom" | "side" };

export function LeagueNav({ leagueId, drafting, variant }: Props) {
  const path = usePathname();
  const base = `/league/${leagueId}`;
  const tabs = [
    { href: base, label: "Matchup" },
    { href: `${base}/team`, label: "My Team" },
    { href: `${base}/players`, label: "Players" },
    drafting ? { href: `${base}/draft`, label: "Draft" } : { href: `${base}/trades`, label: "Trades" },
    { href: `${base}/standings`, label: "Standings" },
    { href: `${base}/settings`, label: "League" },
  ];
  const isActive = (href: string) => (href === base ? path === base : path.startsWith(href));

  if (variant === "side") {
    return (
      <nav aria-label="League" className="mt-6 flex flex-col gap-1">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={isActive(t.href) ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              isActive(t.href) ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur lg:hidden" aria-label="League">
      <ul className="mx-auto grid max-w-2xl grid-cols-6">
        {tabs.map((t) => {
          const active = isActive(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-14 flex-col items-center justify-center text-[11px] font-semibold ${active ? "text-brand-2" : "text-muted"}`}
              >
                <span className={`mb-1 h-1 w-6 rounded-full ${active ? "bg-accent" : "bg-transparent"}`} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
