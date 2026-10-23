/** Accent color helpers. Any user-picked color must stay readable, so we derive the text colors from it. */

export const DEFAULT_ACCENT = "#0c8312"; // the default green; users can pick their own in Account

export const SWATCHES: { name: string; hex: string }[] = [
  { name: "Green", hex: "#0c8312" },
  { name: "Forest", hex: "#166534" },
  { name: "Emerald", hex: "#059669" },
  { name: "Teal", hex: "#0f766e" },
  { name: "Blue", hex: "#1d4ed8" },
  { name: "Purple", hex: "#6d28d9" },
  { name: "Orange", hex: "#c2410c" },
  { name: "Red", hex: "#c8102e" },
  { name: "Slate", hex: "#334155" },
];

/** Accepts #rgb or #rrggbb (any case); returns lowercase #rrggbb, or null if invalid. */
export function parseHex(input: string): string | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!m) return null;
  let h = m[1].toLowerCase();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return `#${h}`;
}

type RGB = [number, number, number];
const toRgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const toHex = ([r, g, b]: RGB) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

function luminance([r, g, b]: RGB): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(toRgb(a)), luminance(toRgb(b))];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Text color to put on top of the accent (buttons, active tabs). */
export function inkFor(accent: string): string {
  return contrast(accent, "#ffffff") >= contrast(accent, "#111418") ? "#ffffff" : "#111418";
}

/** A version of the accent that reads as text on white (>= 4.5:1), darkening it only if needed. */
export function textOnWhite(accent: string): string {
  let rgb = toRgb(accent);
  for (let i = 0; i < 40 && contrast(toHex(rgb), "#ffffff") < 4.5; i++) rgb = rgb.map((v) => v * 0.92) as RGB;
  return toHex(rgb);
}

export function accentVars(input: string | null | undefined) {
  const accent = (input && parseHex(input)) || DEFAULT_ACCENT;
  return { "--accent": accent, "--accent-ink": inkFor(accent), "--accent-text": textOnWhite(accent) };
}
