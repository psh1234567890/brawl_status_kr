import { describe, expect, it } from "vitest";
import { updateRelativeUrl } from "./urlState";

describe("updateRelativeUrl", () => {
  it("adds, replaces, and removes query parameters without touching the hash", () => {
    expect(
      updateRelativeUrl("/skins", "?q=shelly&sort=NAME", "#catalog", {
        q: "colt",
        sort: null,
        sale: "PAID",
      }),
    ).toBe("/skins?q=colt&sale=PAID#catalog");
  });

  it("returns a clean path when all parameters are removed", () => {
    expect(updateRelativeUrl("/counters", "?brawler=SHELLY", "", { brawler: null })).toBe(
      "/counters",
    );
  });
});
