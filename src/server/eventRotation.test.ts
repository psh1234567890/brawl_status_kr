import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./upstream", () => ({ fetchBrawlApiSnapshot: mocks.fetch }));

import { getEventRotation, InvalidEventRotationError, normalizeEventRotation } from "./eventRotation";

const fetchedAt = "2026-10-17T08:00:00.000Z";
const now = Date.parse(fetchedAt);
function event(overrides: Record<string, unknown> = {}) {
  return {
    slotId: 1,
    startTime: "20261017T070000.000Z",
    endTime: "20261017T090000.000Z",
    event: { id: 15000001, mode: "gemGrab", map: "Hard Rock Mine" },
    ...overrides,
  };
}

describe("live event rotation", () => {
  beforeEach(() => {
    mocks.fetch.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });
  afterEach(() => vi.useRealTimers());

  it("converts explicit UTC times and separates current, future and expired maps at boundaries", () => {
    const current = event({ startTime: "20261017T080000.000Z" });
    const future = event({ slotId: 2, startTime: "20261017T090000.000Z", endTime: "20261017T100000.000Z" });
    const expired = event({ slotId: 3, endTime: "20261017T080000.000Z" });
    const result = normalizeEventRotation([current, future, expired], fetchedAt, now);
    expect(result.active).toEqual([{
      slotId: 1, mapId: 15000001, mode: "gemGrab", map: "Hard Rock Mine",
      startTime: fetchedAt, endTime: "2026-10-17T09:00:00.000Z",
    }]);
    expect(result.upcoming).toHaveLength(1);
    expect(result.upcoming[0].slotId).toBe(2);
  });

  it("deduplicates identical slots while preserving the same map in another slot or time", () => {
    const base = event();
    const result = normalizeEventRotation([
      base, base, event({ slotId: 2 }),
      event({ startTime: "20261017T090000.000Z", endTime: "20261017T100000.000Z" }),
    ], fetchedAt, now);
    expect(result.active).toHaveLength(2);
    expect(result.upcoming).toHaveLength(1);
  });

  it.each([
    null, {}, { active: [], upcoming: [] }, [null],
    [event({ slotId: "1" })], [event({ event: { id: 0, mode: "gemGrab", map: "Map" } })],
    [event({ event: { id: 1, mode: "", map: "Map" } })],
    [event({ startTime: "20260230T070000.000Z" })],
    [event({ startTime: "20261017T250000.000Z" })],
    [event({ startTime: "2026-10-17T07:00:00" })],
    [event({ startTime: "not a timestamp" })],
    [event({ startTime: "20261017T090000.000Z" })],
  ])("rejects malformed provider data rather than returning a successful empty rotation: %j", (value) => {
    expect(() => normalizeEventRotation(value, fetchedAt, now)).toThrow(InvalidEventRotationError);
  });

  it("allows a genuine empty provider list", () => {
    expect(normalizeEventRotation([], fetchedAt, now)).toEqual({ active: [], upcoming: [], fetchedAt });
  });

  it("reclassifies a cached snapshot and drops maps once they expire", async () => {
    mocks.fetch.mockResolvedValue({
      data: [event({ endTime: "20261017T080100.000Z" })],
      freshness: { fetchedAt, status: "stale" },
    });
    expect((await getEventRotation()).active).toHaveLength(1);
    vi.setSystemTime(now + 60_000);
    expect(await getEventRotation()).toEqual({ active: [], upcoming: [], fetchedAt });
    expect(mocks.fetch).toHaveBeenCalledWith("/events/rotation", 60_000, 300_000);
  });

  it("does not hide malformed snapshots or provider failures", async () => {
    mocks.fetch.mockResolvedValueOnce({ data: {}, freshness: { fetchedAt, status: "live" } });
    await expect(getEventRotation()).rejects.toThrow(InvalidEventRotationError);
    mocks.fetch.mockRejectedValueOnce(new Error("provider unavailable"));
    await expect(getEventRotation()).rejects.toThrow("provider unavailable");
  });
});
