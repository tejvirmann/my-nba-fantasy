import { describe, expect, it } from "vitest";
import { abbrevName } from "./names";

describe("abbrevName", () => {
  it("shortens first names", () => {
    expect(abbrevName("Jaylen Brown")).toBe("J. Brown");
    expect(abbrevName("Victor Wembanyama")).toBe("V. Wembanyama");
  });
  it("keeps suffixes and multi-part surnames", () => {
    expect(abbrevName("Michael Porter Jr.")).toBe("M. Porter Jr.");
    expect(abbrevName("Shai Gilgeous-Alexander")).toBe("S. Gilgeous-Alexander");
    expect(abbrevName("Karl-Anthony Towns")).toBe("K. Towns");
  });
  it("leaves single names alone", () => {
    expect(abbrevName("Nene")).toBe("Nene");
  });
});
