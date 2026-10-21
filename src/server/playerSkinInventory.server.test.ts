import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ profile: vi.fn(), supplemental: vi.fn() }));
vi.mock("./upstream", () => ({ fetchBrawlApiSnapshot: mocks.profile }));
vi.mock("./brawlaceSkins", () => ({ fetchBrawlaceSkinInventory: mocks.supplemental }));
vi.mock("./observability", () => ({ logSkinSupplementalOutcome: vi.fn() }));
import { fetchPlayerSkinInventory, fetchSupplementalSkinInventory } from "./playerSkinInventory";

describe("player skin availability resilience", () => {
  beforeEach(() => {
    vi.stubEnv("BRAWLACE_SKIN_LOOKUP_ENABLED", "false");
    mocks.profile.mockReset();
    mocks.supplemental.mockReset();
  });
  it("uses a bounded stale official profile during an upstream outage", async () => {
    mocks.profile.mockResolvedValue({
      data: { brawlers: [{ name: "SHELLY", skin: { id: 1, name: "STAR SHELLY" } }] },
      freshness: { status: "stale", fetchedAt: "2026-10-11T00:00:00Z" },
    });
    const result = await fetchPlayerSkinInventory("#2PYLQ");
    expect(result.coverage).toBe("equipped");
    expect(result.skins[0].name).toBe("STAR SHELLY");
    expect(mocks.profile).toHaveBeenCalledWith("/players/%232PYLQ", 30_000, 300_000);
    expect(mocks.supplemental).not.toHaveBeenCalled();
  });
  it("does not call a disabled optional skin provider", async () => {
    expect(await fetchSupplementalSkinInventory("#2PYLQ")).toBeNull();
    expect(mocks.supplemental).not.toHaveBeenCalled();
  });
  it("suppresses repeated failed optional provider calls for the same tag", async () => {
    vi.stubEnv("BRAWLACE_SKIN_LOOKUP_ENABLED", "true");
    mocks.supplemental.mockRejectedValue(new Error("provider unavailable"));
    await expect(fetchSupplementalSkinInventory("#28P9L")).rejects.toThrow();
    await expect(fetchSupplementalSkinInventory("#28P9L")).rejects.toThrow();
    expect(mocks.supplemental).toHaveBeenCalledTimes(1);
  });
});
