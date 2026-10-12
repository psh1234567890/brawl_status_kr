import { describe, expect, it } from "vitest";
import { GAME_MODE_ICON_IDS, getGameModeIconUrl, getGameModeIconUrlById } from "./gameModeIcons";

describe("game-mode icon matches verified BrawlAPI catalog IDs", () => {
  it("maps common player battle and full-name variants to correct game emblems", () => {
    expect(getGameModeIconUrl("gemGrab")).toBe("https://cdn.brawlify.com/game-modes/regular/48000000.png");
    expect(getGameModeIconUrl("Gem Grab")).toBe(getGameModeIconUrl("gemGrab"));
    expect(getGameModeIconUrl("brawlBall")).toBe("https://cdn.brawlify.com/game-modes/regular/48000005.png");
    expect(getGameModeIconUrl("knockout")).toBe("https://cdn.brawlify.com/game-modes/regular/48000020.png");
    expect(getGameModeIconUrl("  TRIOSHOWDOWN ")).toBe("https://cdn.brawlify.com/game-modes/regular/48000038.png");
    expect(Object.keys(GAME_MODE_ICON_IDS).length).toBeGreaterThan(100);
  });
  it("does not synthesize URLs for unknown or injected modes", () => {
    for (const value of [undefined, null, "", "Other", "friendly", "../ranked/Mythic", "gemGrab.png", "gemGrab/../../"]) {
      expect(getGameModeIconUrl(value)).toBeNull();
    }
    expect(getGameModeIconUrlById(48000000)).toBe(getGameModeIconUrl("gemGrab"));
    expect(getGameModeIconUrlById(12345678)).toBeNull();
    expect(getGameModeIconUrlById(NaN)).toBeNull();
  });
});
