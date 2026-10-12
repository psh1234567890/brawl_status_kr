import { describe, expect, it } from "vitest";
import { buildActivityHeatmap, heatmapIntensity } from "./activityHeatmap";
import type { PlayerHistoryDay } from "../types/brawl";

const row = (day: string, plays: number): PlayerHistoryDay => ({
  day, plays, wins: 0, defeats: 0, draws: 0, trophyDelta: 0,
});

describe("recorded-activity heatmap", () => {
  it("uses the latest 90 KST calendar days (including today)", () => {
    const result = buildActivityHeatmap([
      row("2026-10-13", 4), row("2026-10-12", 2), row("2026-07-15", 99),
    ], new Date("2026-10-12T15:30:00Z")); // October 13 00:30 KST
    expect(result.days).toHaveLength(90);
    expect(result.days[0].day).toBe("2026-07-16");
    expect(result.days.at(-1)).toEqual({ day: "2026-10-13", plays: 4 });
    expect(result.recordedDays).toBe(2);
    expect(result.days.find((x) => x.day === "2026-10-11")?.plays).toBeNull();
  });
  it("distinguishes never recorded from actual recorded activity", () => {
    expect(heatmapIntensity(null, 10)).toBe(0);
    expect(heatmapIntensity(1, 10)).toBe(1);
    expect(heatmapIntensity(10, 10)).toBe(4);
  });
});
