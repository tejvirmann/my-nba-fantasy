const SUFFIX = new Set(["Jr.", "Sr.", "II", "III", "IV", "V"]);

/** "Jaylen Brown" -> "J. Brown", "Michael Porter Jr." -> "M. Porter Jr." (ESPN-style short names). */
export function abbrevName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return full;
  const [first, ...rest] = parts;
  const tail = rest.length > 1 && SUFFIX.has(rest[rest.length - 1]) ? rest : rest;
  return `${first[0]}. ${tail.join(" ")}`;
}
