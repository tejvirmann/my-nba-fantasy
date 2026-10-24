/** A team's picture, or its initials on the viewer's accent color when it has none. */
export function TeamLogo({
  team,
  size = 44,
}: {
  team: { id: string; name: string; logoUpdatedAt: Date | null };
  size?: number;
}) {
  const radius = size >= 64 ? Math.round(size * 0.25) : "50%";
  if (team.logoUpdatedAt) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/team-logo/${team.id}?v=${team.logoUpdatedAt.getTime()}`}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flex: "none" }}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, borderRadius: radius, flex: "none", display: "grid", placeItems: "center", background: "var(--accent)", color: "var(--accent-ink)", fontWeight: 700, fontSize: size * 0.34 }}
    >
      {team.name.slice(0, 2).toUpperCase()}
    </span>
  );
}
