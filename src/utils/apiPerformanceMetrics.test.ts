import { describe, expect, it } from "vitest";
import { summarizeApiPerformance, type ApiPerformanceCounts } from "./apiPerformanceMetrics";

const base: ApiPerformanceCounts = {
  route: "api.player", requests: "100", totalDuration: "45000",
  ok: "92", notFound: "3", rateLimited: "2", other4xx: "0", serverErrors: "3",
  le250: "25", le500: "35", le1000: "30", le2000: "6",
  le5000: "3", le10000: "1", over10000: "0",
};

describe("private API performance reporting", () => {
  it("calculates averages, 5xx and 429 rates with the correct denominator", () => {
    expect(summarizeApiPerformance(base)).toMatchObject({
      requests: 100, averageMs: 450, serverErrors: 3, rateLimited: 2,
      serverErrorRate: 3, limitRate: 2, p95Band: "1~2초",
    });
  });
  it("does not invent P95 or averages for missing observations", () => {
    expect(summarizeApiPerformance({ ...base, requests: "0" })).toMatchObject({
      averageMs: null, p95Band: null, serverErrorRate: null, limitRate: null,
    });
  });
  it("labels the open-ended tail, never claiming a precise P95", () => {
    expect(summarizeApiPerformance({ ...base, le250: "0", le500: "0", le1000: "0",
      le2000: "0", le5000: "0", le10000: "0", over10000: "100" }).p95Band)
      .toBe("10초 초과");
  });
});
