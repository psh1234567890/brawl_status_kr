import { describe, expect, it } from "vitest";
import { isValidPlayerTag, normalizePlayerTag } from "./playerTag";

describe("player tag normalization", () => {
  it("trims whitespace, removes one leading hash, and uppercases", () => {
    expect(normalizePlayerTag("  #2pylq  ")).toBe("2PYLQ");
  });

  it("accepts only the Brawl Stars tag alphabet and expected length", () => {
    expect(isValidPlayerTag("#2PYLQ")).toBe(true);
    expect(isValidPlayerTag("O0O")).toBe(false);
    expect(isValidPlayerTag("12")).toBe(false);
    expect(isValidPlayerTag("2PYLQ-INVALID")).toBe(false);
  });
});
