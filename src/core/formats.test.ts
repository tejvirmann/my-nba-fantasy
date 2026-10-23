import { describe, expect, it } from "vitest";
import { isFormatEnabled, setFormat } from "./formats";
import { DEFAULT_SETTINGS } from "./types";

describe("game formats", () => {
  it("defaults come from the registry and lock mode", () => {
    expect(isFormatEnabled(DEFAULT_SETTINGS, "lock_strict")).toBe(true);
    expect(isFormatEnabled(DEFAULT_SETTINGS, "lock_open")).toBe(false);
    expect(isFormatEnabled(DEFAULT_SETTINGS, "auto_lock")).toBe(true);
    expect(isFormatEnabled(DEFAULT_SETTINGS, "betting")).toBe(false);
  });
  it("switching lock mode is exclusive and mirrors settings.lockMode", () => {
    const s = setFormat(DEFAULT_SETTINGS, "lock_open", true);
    expect(s.lockMode).toBe("open");
    expect(isFormatEnabled(s, "lock_strict")).toBe(false);
    expect(() => setFormat(s, "lock_open", false)).toThrow();
  });
  it("toggles add-on formats without mutating the input", () => {
    const s = setFormat(DEFAULT_SETTINGS, "auto_lock", false);
    expect(isFormatEnabled(s, "auto_lock")).toBe(false);
    expect(isFormatEnabled(DEFAULT_SETTINGS, "auto_lock")).toBe(true);
  });
  it("refuses planned formats until they are built", () => {
    expect(() => setFormat(DEFAULT_SETTINGS, "betting", true)).toThrow(/isn't available/);
  });
});
