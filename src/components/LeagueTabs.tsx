"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LEAGUE_SECTIONS = ["standings", "trades", "activity", "draft", "settings"];

export function LeagueTabs({ leagueId }: { leagueId: string }) {
  const path = usePathname();
  const base = `/league/${leagueId}`;
  const section = LEAGUE_SECTIONS.find((s) => path.startsWith(`${base}/${s}`)) ?? null;
  const tabs = [
    { href: `${base}/team`, label: "Roster", on: path.startsWith(`${base}/team`) },
    { href: base, label: "Matchup", on: path === base },
    { href: `${base}/players`, label: "Players", on: path.startsWith(`${base}/players`) },
    { href: `${base}/standings`, label: "League", on: section !== null },
  ];
  return (
    <>
      <nav className="tabs" aria-label="League">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className={t.on ? "on" : ""} aria-current={t.on ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>
      {section ? (
        <nav className="subnav" aria-label="League sections">
          {[
            ["standings", "Standings"],
            ["trades", "Trades"],
            ["activity", "Activity"],
            ["draft", "Draft"],
            ["settings", "Settings"],
          ].map(([id, label]) => (
            <Link key={id} href={`${base}/${id}`} className={section === id ? "on" : ""}>
              {label}
            </Link>
          ))}
          <Link href="/install">Install on iPhone</Link>
        </nav>
      ) : null}
    </>
  );
}
