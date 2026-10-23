"use client";

import { useState } from "react";

const TEAM_COLORS: Record<string, string> = {
  ATL: "#e03a3e", BOS: "#007a33", BKN: "#111111", CHA: "#1d1160", CHI: "#ce1141", CLE: "#860038", DAL: "#00538c", DEN: "#0e2240",
  DET: "#c8102e", GS: "#1d428a", HOU: "#ce1141", IND: "#002d62", LAC: "#c8102e", LAL: "#552583", MEM: "#5d76a9", MIA: "#98002e",
  MIL: "#00471b", MIN: "#0c2340", NO: "#0c2340", NY: "#006bb6", OKC: "#007ac1", ORL: "#0077c0", PHI: "#006bb6", PHX: "#1d1160",
  POR: "#e03a3e", SAC: "#5a2d81", SA: "#808080", TOR: "#ce1141", UTAH: "#002b5c", WSH: "#002b5c",
};

export function PlayerAvatar({ name, src, team, size = 44 }: { name: string; src: string | null; team?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const color = (team && TEAM_COLORS[team]) || "#334155";
  if (!src || failed) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
        style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}
        aria-hidden
      >
        {initials}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-full bg-slate-200 object-cover object-top"
      style={{ width: size, height: size, boxShadow: `inset 0 -3px 0 ${color}` }}
    />
  );
}
