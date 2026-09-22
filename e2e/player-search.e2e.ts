import { expect, test, type Page } from "@playwright/test";

const tag = "9C82J8YPP";

test.beforeEach(async ({ context, page }) => {
  await context.addCookies([
    { name: "brawl-locale", value: "ko", url: "http://127.0.0.1:3020" },
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

async function mockPlayerApis(page: Page) {
  await page.route(/\/api\/player\/skins\?tag=/, async (route) => {
    await route.fulfill({ status: 204 });
  });

  await page.route(/\/api\/player\/matches\?tag=/, async (route) => {
    await route.fulfill({ json: { items: [] } });
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
