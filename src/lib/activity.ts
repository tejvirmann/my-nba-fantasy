export function describeTransaction(type: string, p: Record<string, unknown>): string {
  const name = typeof p.name === "string" ? p.name : "a player";
  if (type === "draft") return `drafted ${name}`;
  if (type === "add") return `added ${name}`;
  if (type === "drop") return "dropped a player";
  if (type === "waiver") return `won ${name} on waivers`;
  if (type === "lock") return "locked in a game";
  if (type === "lineup") return "updated their lineup";
  if (type === "trade") return `trade ${String(p.action ?? "")}`.trim();
  if (type === "commissioner" && p.action === "format") return `${p.enabled ? "enabled" : "disabled"} format ${String(p.formatId)}`;
  if (type === "commissioner" && p.action === "champion") return "won the championship";
  return type;
}
