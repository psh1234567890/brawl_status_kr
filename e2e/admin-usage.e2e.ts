import { expect, test } from "@playwright/test";

test("private usage dashboard shows success rate and anonymized country breakdown on mobile", async ({ page }) => {
  await page.route("**/api/admin/usage", (route) => route.fulfill({
    json: {
      today: { visits: 12, searches: 10, successfulSearches: 8, gameEnds: 2 },
      last7Days: { visits: 65, searches: 40, successfulSearches: 32, gameEnds: 11 },
      allTime: { visits: 130, searches: 80, successfulSearches: 64, gameEnds: 22 },
      trackingStartedAt: "2026-09-01T00:00:00.000Z",
      daily: [
        { day: "2026-10-06", visits: 4, searches: 0, successfulSearches: 0, gameEnds: 0 },
        { day: "2026-10-07", visits: 6, searches: 2, successfulSearches: 2, gameEnds: 0 },
        { day: "2026-10-08", visits: 8, searches: 3, successfulSearches: 3, gameEnds: 1 },
        { day: "2026-10-09", visits: 8, searches: 4, successfulSearches: 3, gameEnds: 1 },
        { day: "2026-10-10", visits: 9, searches: 6, successfulSearches: 5, gameEnds: 2 },
        { day: "2026-10-11", visits: 18, searches: 15, successfulSearches: 11, gameEnds: 5 },
        { day: "2026-10-12", visits: 12, searches: 10, successfulSearches: 8, gameEnds: 2 },
      ],
      searchCountries7Days: [
        { countryCode: "KR", searchCount: "30" },
        { countryCode: "JP", searchCount: "10" },
      ],
      recentSearchTags: [
        { playerTag: "9C82J8YPP", searchCount: "2", lastSearchedAt: "2026-10-12T06:16:00Z", countries: [] },
        { playerTag: "Y2PP8V", searchCount: "7", lastSearchedAt: "2026-10-11T14:00:00Z", countries: [] },
      ],
      byGame: {}, byGameToday: {}, byGameAllTime: {},
      failureReasonsToday: {}, failureReasonsLast7Days: {}, failureReasonsAllTime: {},
      recentHours: [],
      sampledAt: "2026-10-12T08:00:00Z",
    },
  }));
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto("/admin/usage");
  await expect(page.getByRole("heading", { name: /플레이어 검색 성공률/ })).toBeVisible();
  await expect(page.getByText("80.0%", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "최근 7일 검색 방문 국가" })).toBeVisible();
  await expect(page.getByText("75.0%", { exact: false })).toBeVisible();

  const tagRows = page.getByRole("region", { name: "최근 검색된 플레이어 태그 목록" }).locator("tbody tr");
  await expect(tagRows).toHaveCount(2);
  await page.getByRole("searchbox", { name: "태그 검색" }).fill("Y2PP");
  await expect(tagRows).toHaveCount(1);
  await expect(tagRows.first()).toContainText("#Y2PP8V");
  await page.getByRole("searchbox", { name: "태그 검색" }).clear();
  await page.getByRole("combobox", { name: "정렬" }).selectOption("popular");
  await expect(tagRows.first()).toContainText("#Y2PP8V");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
