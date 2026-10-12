import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getHyperchargeImageUrl, HYPERCHARGE_IMAGE_IDS } from "./hyperchargeImages";
import { getGameModeIconUrlById } from "./gameModeIcons";

describe("real Brawl Stars artwork availability", () => {
  it("uses exact supported hypercharge ability IDs from BSInfo CDN", () => {
    expect(HYPERCHARGE_IMAGE_IDS.size).toBe(107);
    expect(getHyperchargeImageUrl(23000613))
      .toBe("https://cdn.bsinfox.com/hypercharges/23000613.png");
    expect(getHyperchargeImageUrl(23001473))
      .toBe("https://cdn.bsinfox.com/hypercharges/23001473.png");
    for (const id of [NaN, -1, 0, 42, 23000612, 23001474, 123456789]) {
      expect(getHyperchargeImageUrl(id)).toBeNull();
    }
  });

  it("uses distinct actual game modes for solo and duo showdown wins", () => {
    expect(getGameModeIconUrlById(48000006))
      .toBe("https://cdn.brawlify.com/game-modes/regular/48000006.png");
    expect(getGameModeIconUrlById(48000009))
      .toBe("https://cdn.brawlify.com/game-modes/regular/48000009.png");
  });

  it.each(["trophy.png", "coin.png"])("bundles a real PNG for %s", file => {
    const data = readFileSync(resolve(process.cwd(), "public", "game-assets", file));
    expect(data.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(data.length).toBeGreaterThan(1000);
    expect(data.length).toBeLessThan(100_000);
  });
});
