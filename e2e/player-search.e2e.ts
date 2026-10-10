import { expect, test, type Page } from "@playwright/test";

const tag = "9C82J8YPP";

test.beforeEach(async ({ context, page }) => {
  await context.addCookies([
    { name: "brawl-locale", value: "ko", url: "http://localhost:3020" },
  ]);
  await mockPlayerApis(page);
});

test("player search renders a profile and stores the recent tag", async ({ page }) => {
  let skinRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/player/skins?tag=")) skinRequests += 1;
  });

  await page.goto("/");
  await page.getByRole("textbox", { name: "플레이어 태그" }).fill(tag);
  await page.getByRole("button", { name: "검색" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "E2E Player" })).toBeVisible();
  await expect(page.getByText(`현재 태그 ${tag}`)).toBeVisible();
  await expect(page.getByRole("button", { name: "즐겨찾기 추가" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("recentTags"))).toContain(tag);
  expect(skinRequests).toBe(0);

  await page.getByRole("button", { name: "브롤러", exact: true }).click();
  await expect(page.getByText("보유 스킨은 별도 조회")).toBeVisible();
  await page.getByRole("button", { name: "보유 스킨 조회" }).click();
  await expect.poll(() => skinRequests).toBe(1);
  await expect(page.getByText("현재 착용 스킨 확인 완료")).toBeVisible();
});

test("owned-skin lookup falls back to the recent browser cache after a refresh failure", async ({ page }) => {
  await page.unroute(/\/api\/player\/skins\?tag=/);
  let skinRequests = 0;
  await page.route(/\/api\/player\/skins\?tag=/, async (route) => {
    skinRequests += 1;
    if (skinRequests === 1) {
      await route.fulfill({
        json: {
          tag,
          source: "brawlace",
          coverage: "owned",
          supplementalStatus: "ready",
          skins: [
            { brawlerName: "SHELLY", name: "WITCH SHELLY", source: "brawlace" },
          ],
          byBrawler: {
            SHELLY: [
              { brawlerName: "SHELLY", name: "WITCH SHELLY", source: "brawlace" },
            ],
          },
        },
      });
      return;
    }
    await route.fulfill({ status: 502, json: { error: "temporary failure" } });
  });

  await page.goto("/");
  await page.getByRole("textbox", { name: "플레이어 태그" }).fill(tag);
  await page.getByRole("button", { name: "검색" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "E2E Player" })).toBeVisible();

  await page.getByRole("button", { name: "브롤러", exact: true }).click();
  await page.getByRole("button", { name: "보유 스킨 조회" }).click();
  await expect(page.getByText("보유 스킨 조회 완료")).toBeVisible();

  await page.getByRole("button", { name: "새로 조회" }).click();
  await expect.poll(() => skinRequests).toBe(2);
  await expect(page.getByText("최근 보유 스킨 캐시 사용")).toBeVisible();
});

test("history tab renders tracked activity and explains the 60-day window", async ({ page }) => {
  await page.unroute(/\/api\/player\/history\?tag=/);
  await page.route(/\/api\/player\/history\?tag=/, async (route) => {
    await route.fulfill({
      json: {
        totalTrackedGames: 37,
        trackedDays: 2,
        totalTrophyDelta: 24,
        daily: [
          {
            day: "2026-09-21",
            plays: 17,
            wins: 10,
            defeats: 6,
            draws: 1,
            trophyDelta: 8,
          },
          {
            day: "2026-09-22",
            plays: 20,
            wins: 13,
            defeats: 7,
            draws: 0,
            trophyDelta: 16,
          },
        ],
        topModes: [
          { name: "gemGrab", plays: 22, wins: 14, winRate: 63.6, trophyDelta: 18 },
        ],
        topMaps: [
          { name: "Hard Rock Mine", plays: 15, wins: 9, winRate: 60, trophyDelta: 10 },
        ],
      },
    });
  });

  await page.goto("/");
  await page.getByRole("textbox", { name: "플레이어 태그" }).fill(tag);
  await page.getByRole("button", { name: "검색" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "E2E Player" })).toBeVisible();

  await page.getByRole("button", { name: "누적", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "누적 활동 분석" })).toBeVisible();
  await expect(page.getByText("최근 최대 60개 활동일 중 마지막 21개를 표시합니다.")).toBeVisible();
  await expect(page.getByText("09-22")).toBeVisible();
  await expect(page.getByText("09-21")).toBeVisible();
  await expect(page.getByText("젬 그랩")).toBeVisible();
  await expect(page.getByText("암석 광산")).toBeVisible();
});

test("stale lookup and persistence failure remain visible alongside a later stats failure", async ({ page }) => {
  await mockPlayerApis(page, { stale: true, storageUnavailable: true });
  await page.route(/\/api\/player\/history\?tag=/, (route) => route.fulfill({ status: 503, json: { error: "offline" } }));
  await page.goto("/");
  await page.getByRole("textbox", { name: "플레이어 태그" }).fill(tag);
  await page.getByRole("button", { name: "검색" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "E2E Player" })).toBeVisible();
  await expect(page.getByText("외부 서비스의 일시적인 장애로 최근 정상 조회 데이터를 표시합니다.", { exact: false })).toBeVisible();
  await expect(page.getByText("최근 전투는 불러왔지만 누적 통계에 저장하지 못했습니다.", { exact: false })).toBeVisible();
  await expect(page.getByText("프로필은 불러왔지만 누적 통계는 갱신하지 못했습니다.", { exact: false })).toBeVisible();
});

test("a browser that denies storage can still search successfully", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException("Storage denied", "SecurityError"); };
    Storage.prototype.setItem = () => { throw new DOMException("Storage full", "QuotaExceededError"); };
  });
  await page.goto("/");
  await page.getByRole("textbox", { name: "플레이어 태그" }).fill(tag);
  await page.getByRole("button", { name: "검색" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "E2E Player" })).toBeVisible();
  await page.getByRole("button", { name: "즐겨찾기 추가" }).click();
  expect(errors).toEqual([]);
});

async function mockPlayerApis(page: Page, options: { stale?: boolean; storageUnavailable?: boolean } = {}) {
  const dataFreshness = options.stale ? { status: "stale", fetchedAt: "2026-10-10T00:00:00Z" } : undefined;
  await page.route(/\/api\/player\/skins\?tag=/, async (route) => {
    await route.fulfill({ status: 204 });
  });

  await page.route(/\/api\/player\/matches\?tag=/, async (route) => {
    await route.fulfill({ json: { items: [], storageStatus: options.storageUnavailable ? "unavailable" : "saved" } });
  });

  await page.route(/\/api\/player\/db-stats\?tag=/, async (route) => {
    await route.fulfill({ json: { totalGames: 0, brawlers: [] } });
  });

  await page.route(/\/api\/player\/history\?tag=/, async (route) => {
    await route.fulfill({
      json: {
        totalTrackedGames: 0,
        trackedDays: 0,
        totalTrophyDelta: 0,
        daily: [],
        topModes: [],
        topMaps: [],
      },
    });
  });

  await page.route(/\/api\/player\?tag=/, async (route) => {
    await route.fulfill({
      json: {
        tag: `#${tag}`,
        dataFreshness,
        name: "E2E Player",
        nameColor: "0xff3366cc",
        trophies: 12345,
        highestTrophies: 13000,
        expLevel: 50,
        "3vs3Victories": 100,
        soloVictories: 20,
        duoVictories: 30,
        isQualifiedFromChampionshipChallenge: false,
        brawlers: [
          {
            id: 16000000,
            name: "SHELLY",
            power: 11,
            trophies: 500,
            highestTrophies: 700,
            gadgets: [],
            starPowers: [],
            hyperCharges: [],
            gears: [],
          },
        ],
      },
    });
  });
}
