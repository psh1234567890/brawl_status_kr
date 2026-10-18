import { describe, expect, it } from "vitest";
import { winRateInterval } from "./recommendationEvidence";

describe("recommendation evidence", () => {
  it("keeps a tiny perfect sample uncertain instead of displaying certainty", () => {
    const interval = winRateInterval(5, 5)!;
    expect(interval[0]).toBeCloseTo(56.5518, 3);
    expect(interval[1]).toBeCloseTo(100, 8);
    expect(winRateInterval(50, 50)![0]).toBeGreaterThan(interval[0]);
  });
  it("gives the published Wilson example and narrows with a larger sample", () => {
    const small = winRateInterval(5, 10)!;
    expect(small[0]).toBeCloseTo(23.6593, 3);
    expect(small[1]).toBeCloseTo(76.3407, 3);
    const large = winRateInterval(50, 100)!;
    expect(large[1] - large[0]).toBeLessThan(small[1] - small[0]);
    expect(winRateInterval(0, 5)![0]).toBeCloseTo(0, 8);
  });
  it("omits invalid or absent evidence instead of inventing a range", () => {
    for (const [wins, plays] of [[0, 0], [6, 5], [-1, 5], [2.5, 5], [1, Infinity], [NaN, 5]]) expect(winRateInterval(wins, plays)).toBeNull();
  });
});
