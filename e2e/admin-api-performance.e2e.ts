import { expect, test } from "@playwright/test";

test("private dashboard shows honest API monitoring metrics at narrow viewport", async ({ page }) => {
  const perf = {
    route: "api.player", requests: "100", totalDuration: "45000",
    ok: "92", notFound: "3", rateLimited: "2", other4xx: "0", serverErrors: "3",
    le250: "25", le500: "35", le1000: "30", le2000: "6",
    le5000: "3", le10000: "1", over10000: "0",
  };
  await page.route("**/api/admin/usage", route => route.fulfill({ json: {
    today: { visits: 1, searches: 1, successfulSearches: 1, gameEnds: 0 },
    last7Days: { visits: 4, searches: 2, successfulSearches: 2, gameEnds: 0 },
    allTime: { visits: 10, searches: 6, successfulSearches: 6, gameEnds: 0 },
    daily: [], recentHours: [], recentSearchTags: [], searchCountries7Days: [],
    byGame: {}, byGameToday: {}, byGameAllTime: {}, trackingStartedAt: null,
    apiPerformance24h: [perf], apiPerformance7d: [{ ...perf, requests: "200", totalDuration: "90000",
      le250: "50", le500: "70", le1000: "60", le2000: "12", le5000: "6", le10000: "2", over10000: "0" }],
    sampledAt: "2026-10-12T14:00:00Z",
  } }));
  await page.setViewportSize({ width: 375, height: 760 });
  await page.goto("/admin/usage");
  const monitor = page.getByRole("region", { name: "API별 성능 집계표" });
  await expect(page.getByRole("heading", { name: "API 응답 성능·장애" })).toBeVisible();
  await expect(monitor).toContainText("플레이어 프로필");
  await expect(monitor).toContainText("450ms");
  await expect(monitor).toContainText("1~2초");
  await expect(monitor).toContainText("3건 (3.0%)");
  await page.getByRole("group", { name: "API 성능 집계 기간" }).getByRole("button", { name: "API 7일" }).click();
  await expect(page.getByText("측정 요청 200건", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
