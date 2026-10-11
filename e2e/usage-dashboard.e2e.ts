import { expect, test } from "@playwright/test";

test("admin dashboard switches between today, seven days, and lifetime totals", async ({ page }) => {
  await page.route("**/api/admin/usage", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      today: { visits: 2, searches: 3, successfulSearches: 2, gameEnds: 1 },
      last7Days: { visits: 8, searches: 11, successfulSearches: 9, gameEnds: 5 },
      allTime: { visits: 123, searches: 250, successfulSearches: 220, gameEnds: 90 },
      byGameToday: { map_quiz: 1 },
      byGame: { map_quiz: 5 },
      byGameAllTime: { map_quiz: 90 },
      trackingStartedAt: "2026-10-10T00:00:00.000Z",
      daily: [{ day: "2026-10-12", visits: 2 }],
      recentHours: [],
      recentSearchTags: [],
      sampledAt: "2026-10-12T03:00:00.000Z",
    }),
  }));
  await page.goto("/admin/usage");
  const stats = page.locator("article");
  await expect(stats.first()).toContainText("오늘 방문 세션");
  await expect(stats.first()).toContainText("2");
  await page.getByRole("button", { name: "최근 7일", exact: true }).click();
  await expect(stats.first()).toContainText("최근 7일 방문 세션");
  await expect(stats.first()).toContainText("8");
  await page.getByRole("button", { name: "전체 누적", exact: true }).click();
  await expect(stats.first()).toContainText("전체 누적 방문 세션");
  await expect(stats.first()).toContainText("123");
  await expect(page.getByRole("heading", { name: "전체 누적 미니게임별 종료" })).toBeVisible();
  await expect(page.getByRole("button", { name: "전체 누적" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(/통계 수집 시작 이후 누적/)).toBeVisible();
});
