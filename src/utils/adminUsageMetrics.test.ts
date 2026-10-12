import { describe, expect, it } from "vitest";
import { countryShare, searchSuccessRate } from "./adminUsageMetrics";

describe("private usage dashboard metrics", () => {
  it("calculates search success from matching event counts", () => {
    expect(searchSuccessRate({ searches: 100, successfulSearches: 89 })).toBe(89);
    expect(searchSuccessRate({ searches: 3, successfulSearches: 2 })).toBe(66.7);
    expect(searchSuccessRate({ searches: 0, successfulSearches: 0 })).toBeNull();
  });
  it("calculates country shares from the full seven-day country total", () => {
    expect(countryShare(8, 40)).toBe(20);
    expect(countryShare(3, 0)).toBe(0);
  });
});
