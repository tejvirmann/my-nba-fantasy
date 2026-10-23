import { describe, expect, it } from "vitest";
import { accentVars, contrast, DEFAULT_ACCENT, inkFor, parseHex, SWATCHES, textOnWhite } from "./color";

describe("accent colors", () => {
  it("parses and normalizes hex", () => {
    expect(parseHex("#0B7A3E")).toBe("#0b7a3e");
    expect(parseHex("0f0")).toBe("#00ff00");
    expect(parseHex("nope")).toBeNull();
    expect(parseHex("#12345")).toBeNull();
    expect(parseHex("url(javascript:alert(1))")).toBeNull();
  });
  it("picks readable ink for every swatch and for extreme colors", () => {
    for (const s of SWATCHES) expect(contrast(s.hex, inkFor(s.hex))).toBeGreaterThanOrEqual(4.5);
    expect(inkFor("#ffff00")).toBe("#111418");
    expect(inkFor("#000000")).toBe("#ffffff");
  });
  it("darkens light accents until they read as text on white", () => {
    expect(contrast(textOnWhite("#ffff00"), "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(textOnWhite(DEFAULT_ACCENT)).toBe(DEFAULT_ACCENT); // already readable, unchanged
  });
  it("falls back to the default for bad input", () => {
    expect(accentVars("garbage")["--accent"]).toBe(DEFAULT_ACCENT);
    expect(accentVars(null)["--accent"]).toBe(DEFAULT_ACCENT);
    expect(accentVars("#1d4ed8")["--accent"]).toBe("#1d4ed8");
  });
});
