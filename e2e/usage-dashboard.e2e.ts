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
      failureReasonsToday: { player_search_error_404: 1 },
      failureReasonsLast7Days: { player_search_error_404: 1, player_search_error_5xx: 1 },
      failureReasonsAllTime: { player_search_error_404: 5, player_search_error_5xx: 10 },
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
  await expect(page.getByRole("heading", { name: "오늘 플레이어 검색 실패 원인" })).toBeVisible();
  await expect(page.getByText("플레이어 없음 (404)").locator("..")).toContainText("1회");
  await page.getByRole("button", { name: "최근 7일", exact: true }).click();
  await expect(stats.first()).toContainText("최근 7일 방문 세션");
  await expect(stats.first()).toContainText("8");
  await expect(page.getByRole("heading", { name: "최근 7일 플레이어 검색 실패 원인" })).toBeVisible();
  await page.getByRole("button", { name: "전체 누적", exact: true }).click();
  await expect(stats.first()).toContainText("전체 누적 방문 세션");
  await expect(stats.first()).toContainText("123");
  await expect(page.getByRole("heading", { name: "전체 누적 플레이어 검색 실패 원인" })).toBeVisible();
  await expect(page.getByText("이전 기록·미분류 오류").locator("..")).toContainText("15회");
  await expect(page.getByRole("heading", { name: "전체 누적 미니게임별 종료" })).toBeVisible();
  await expect(page.getByRole("button", { name: "전체 누적" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(/통계 수집 시작 이후 누적/)).toBeVisible();
});

test("recent player tags stay in a fixed, keyboard-accessible scrolling table on desktop and mobile", async ({ page }) => {
  const tags = Array.from({ length: 200 }, (_, index) => ({
    playerTag: `2PYLQ${String(index).padStart(2, "0")}`,
    searchCount: String(index === 0 ? 5 : index + 1),
    lastSearchedAt: "2026-10-12T02:00:00.000Z",
    countries: index === 0
      ? [{ countryCode: "KR", searchCount: "2" }, { countryCode: "JP", searchCount: "1" }]
      : index === 1 ? [{ countryCode: "ZZ", searchCount: "2" }] : [],
  }));
  await page.route("**/api/admin/usage", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      today: { visits: 3, searches: 4, successfulSearches: 3, gameEnds: 1 },
      last7Days: { visits: 12, searches: 20, successfulSearches: 18, gameEnds: 5 },
      allTime: { visits: 100, searches: 250, successfulSearches: 230, gameEnds: 40 },
      byGameToday: {},
      byGame: {},
      byGameAllTime: {},
      trackingStartedAt: "2026-10-10T00:00:00.000Z",
      daily: [],
      recentHours: [],
      recentSearchTags: tags,
      sampledAt: "2026-10-12T02:00:00.000Z",
    }),
  }));

  await page.goto("/admin/usage");
  const region = page.getByRole("region", { name: "최근 검색된 플레이어 태그 목록" });
  await expect(region).toBeVisible();
  await expect(region).toHaveAttribute("tabindex", "0");
  await expect(region.locator("tbody tr")).toHaveCount(200);
  await expect(region.locator("thead")).toContainText("검색 방문자 접속 국가별 횟수");
  await expect(region.locator("tbody tr").first()).toContainText(/🇰🇷 (한국|대한민국) 2회/);
  await expect(region.locator("tbody tr").first()).toContainText("일본 1회");
  await expect(region.locator("tbody tr").first()).toContainText("이전 기록·미분류 2회");
  await expect(region.locator("tbody tr").nth(1)).toContainText("국가 미확인 2회");
  await expect(region.locator("tbody tr").nth(1)).not.toContainText("이전 기록");
  expect(await region.evaluate((element) => ({
    scrollable: element.scrollHeight > element.clientHeight,
    maxHeight: element.getBoundingClientRect().height,
    overflowY: getComputedStyle(element).overflowY,
  }))).toMatchObject({ scrollable: true, maxHeight: 320, overflowY: "auto" });
  await expect(region.locator("thead")).toHaveCSS("position", "sticky");

  await region.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  expect(await region.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(region.locator("tbody tr").last()).toBeAttached();

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await region.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    hasHorizontalScroll: element.scrollWidth > element.clientWidth,
  }))).toEqual({ height: 288, hasHorizontalScroll: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
