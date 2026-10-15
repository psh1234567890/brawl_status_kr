import { expect, test, type Page } from "@playwright/test";

const tag = "9C82J8YPP";

test.beforeEach(async ({ context, page }) => {
  await context.addCookies([
    { name: "brawl-locale", value: "ko", url: "http://localhost:3020" },
  ]);
  await mockPlayerApis(page);
});

test("player summaries wait for persistence without delaying the profile", async ({ page }) => {
  let finishSave!: () => void;
  const pendingSave = new Promise<void>((resolve) => { finishSave = resolve; });
  let saved = false;
  let summaryRequests = 0;
  let readBeforeSave = false;
  await page.unroute(/\/api\/player\/matches\?tag=/);
  await page.route(/\/api\/player\/matches\?tag=/, async (route) => {
    await pendingSave;
    saved = true;
    await route.fulfill({ json: { items: [], storageStatus: "saved" } });
  });
  page.on("request", (request) => {
    if (/\/api\/player\/(db-stats|history)\?tag=/.test(request.url())) {
      summaryRequests += 1;
      if (!saved) readBeforeSave = true;
    }
  });
  await page.goto("/");
  await page.getByRole("textbox", { name: "플레이어 태그" }).fill(tag);
  await page.getByRole("button", { name: "검색", exact: true }).click();
  try {
    await expect(page.getByRole("heading", { level: 1, name: "E2E Player" })).toBeVisible();
    expect(summaryRequests).toBe(0);
  } finally {
    finishSave();
  }
  await expect.poll(() => summaryRequests).toBe(2);
  expect(readBeforeSave).toBe(false);
});

test("saved player reopens with a real trophy delta and anonymous action counts", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", error => runtimeErrors.push(error.message));
  let trophies = 12345;
  const events: string[] = [];
  await page.route("**/api/usage/event", route => {
    const body = route.request().postDataJSON();
    events.push(...(body.events ?? [body.event]));
    return route.fulfill({ status: 204 });
  });
  await page.unroute(/\/api\/player\?tag=/);
  await page.route(/\/api\/player\?tag=/, route => route.fulfill({ json: {
    tag: "#" + tag, name: "Return Player", trophies, highestTrophies: 13000,
    expLevel: 50, "3vs3Victories": 100, soloVictories: 20, duoVictories: 30, brawlers: [],
  } }));
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page.getByRole("textbox", { name: "플레이어 태그" }).fill(tag);
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Return Player" })).toBeVisible();
  const profile = page.getByRole("region", { name: "프로필 아이콘", exact: true });
  await expect(profile.getByRole("heading", { name: "프로필 통계", exact: true })).toBeVisible();
  await expect(profile.getByText("경험치 레벨", { exact: true })).toBeVisible();
  await expect(profile.getByText("3v3 승리", { exact: true })).toBeVisible();
  await expect(profile.locator("details, summary")).toHaveCount(0);
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect.poll(() => events.includes("profile_save")).toBe(true);
  trophies = 12400;
  await page.reload();
  await page.getByRole("button", { name: /Return Player.*12345|Return Player.*12,345/ }).first().click();
  await expect(page.getByText(/지난 조회 대비.*\+55/)).toBeVisible();
  await expect.poll(() => events.includes("profile_reopen")).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.getByText(/지난 조회 대비.*\+55/).scrollIntoViewIfNeeded();
  const trophyValue = page.locator("strong").filter({ hasText: /^12,400$/ });
  expect(await trophyValue.evaluate(element => element.getBoundingClientRect().height <= parseFloat(getComputedStyle(element).lineHeight) * 1.1)).toBe(true);
  expect(runtimeErrors).toEqual([]);
  await page.getByRole("heading", { name: "Return Player" }).locator("xpath=ancestor::section[1]").screenshot({ path: test.info().outputPath("saved-player-mobile.png") });
});

test("progression panel calculates remaining coins and resources for owned Brawlers", async ({ page }) => {
  await page.unroute(/\/api\/player\?tag=/);
  await page.route(/\/api\/player\?tag=/, route => route.fulfill({ json: {
    tag: "#" + tag, name: "Progression Player",
    trophies: 16000, highestTrophies: 16000, expLevel: 60,
    "3vs3Victories": 300, soloVictories: 10, duoVictories: 12,
    brawlers: [
      { id: 16000000, name: "SHELLY", power: 1, trophies: 0, highestTrophies: 0,
        gadgets: [{ id: 1, name: "Test" }], starPowers: [], hyperCharges: [] },
      { id: 16000001, name: "COLT", power: 11, trophies: 500, highestTrophies: 600,
        gadgets: [], starPowers: [], hyperCharges: [] },
    ],
  } }));
  await page.setViewportSize({ width: 375, height: 760 });
  await page.goto("/");
  await page.getByRole("textbox", { name: "플레이어 태그" }).fill(tag);
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Progression Player" })).toBeVisible();
  const panel = page.getByRole("region", { name: "브롤러 성장률·강화 비용" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
  await expect(panel).toContainText("7,765");
  await expect(panel).toContainText("3,740");
  await panel.getByRole("button", { name: "브롤러별 강화 비용 보기" }).click();
  await expect(panel.locator("tbody tr")).toHaveCount(2);
  await expect(panel.locator("tbody")).toContainText("쉘리");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
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
  const profile = page.getByRole("heading", { level: 1, name: "E2E Player" }).locator("xpath=ancestor::section[1]");
  await expect(profile.getByText("#" + tag)).toBeVisible();
  await expect(profile.getByRole("link", { name: "친구와 비교" })).toHaveAttribute("href", "/compare?a=" + tag);
  await expect(profile.getByRole("button", { name: "저장" })).toBeVisible();
  await expect(profile.getByRole("button", { name: "공유" })).toBeVisible();
  await expect(profile.locator("details, summary")).toHaveCount(0);
  await expect(profile.getByRole("heading", { name: "프로필 통계", exact: true })).toBeVisible();
  await expect(profile.getByText("경험치 레벨", { exact: true })).toBeVisible();
  await expect(profile.getByText("3v3 승리", { exact: true })).toBeVisible();
  await expect(profile.locator('img[src*="/ranked/regular/Mythic.png"]').first()).toBeVisible();
  await expect(profile.locator('img[src*="/ranked/regular/Legendary.png"]')).toBeVisible();
  await expect(profile).toContainText("신화 II");
  await expect(profile).toContainText("전설 I");
  await expect(profile.locator('img[src="/game-assets/trophy.png"]')).toHaveCount(3);
  await expect(profile.locator('img[src*="/game-modes/regular/48000006.png"]')).toBeVisible();
  await expect(profile.locator('img[src*="/game-modes/regular/48000009.png"]')).toBeVisible();
  await profile.getByRole("button", { name: "저장" }).click();
  await expect(profile.getByRole("button", { name: "저장됨" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("recentTags"))).toContain(tag);
  expect(skinRequests).toBe(0);

  await page.getByRole("button", { name: "브롤러", exact: true }).click();
  await expect(page.getByText("보유 스킨은 별도 조회")).toBeVisible();
  await page.getByRole("button", { name: "보유 스킨 조회" }).click();
  await expect.poll(() => skinRequests).toBe(1);
  await expect(page.getByText("현재 착용 스킨 확인 완료")).toBeVisible();
});

test("a shared player link opens the profile and comparison pre-fills the tag", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 760 });
  await page.goto("/?tag=" + tag);
  await expect(page.getByRole("heading", { level: 1, name: "E2E Player" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "바로가기" })).toBeHidden();
  await expect(page.getByRole("textbox", { name: "플레이어 태그" })).toHaveValue(tag);
  await page.getByRole("link", { name: "친구와 비교" }).click();
  await expect(page).toHaveURL(new RegExp("/compare\\?a=" + tag));
  await expect(page.getByRole("textbox", { name: "플레이어 A 태그" })).toHaveValue(tag);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("owned hypercharges show matching artwork and unknown IDs keep a fallback", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "플레이어 태그" }).fill(tag);
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "E2E Player" })).toBeVisible();
  await page.getByRole("button", { name: "브롤러", exact: true }).click();
  await page.getByRole("button", { name: /쉘리/ }).first().click();
  const dialog = page.getByRole("dialog");
  const hyperImage = dialog.locator('img[src="https://cdn.bsinfox.com/hypercharges/23000613.png"]');
  await expect(hyperImage).toBeVisible();
  await expect(dialog.locator('img[src="/game-assets/trophy.png"]')).toHaveCount(2);
  await expect(hyperImage).toHaveAttribute("alt", "Sample Hypercharge");
  await expect(dialog).toContainText("Unlisted Future Hypercharge");
  await expect(dialog.locator('img[src*="/hypercharges/99999999.png"]')).toHaveCount(0);
});

test("battle log and detail show the exact BrawlAPI Gem Grab mode icon", async ({ page }) => {
  await page.unroute(/\/api\/player\/matches\?tag=/);
  await page.route(/\/api\/player\/matches\?tag=/, async route => {
    await route.fulfill({ json: {
      storageStatus: "saved",
      items: [{
        battleTime: "20261012T123045.000Z",
        event: { mode: "gemGrab", map: "Hard Rock Mine" },
        battle: {
          type: "normal", result: "victory", duration: 120, trophyChange: 8,
          teams: [[
            { tag: "#" + tag, name: "E2E Player", brawler: { id: 16000000, name: "SHELLY", power: 11, trophies: 500 } },
          ], [
            { tag: "#9R90", name: "Opponent", brawler: { id: 16000001, name: "COLT", power: 9, trophies: 400 } },
          ]],
        },
      }],
    } });
  });
  await page.goto("/");
  await page.getByRole("textbox", { name: "플레이어 태그" }).fill(tag);
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page.getByRole("heading", { name: "E2E Player", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "전투", exact: true }).click();
  await expect(page.locator('img[src*="/game-modes/regular/48000000.png"]').first()).toBeVisible();
  await page.getByRole("button", { name: /젬 그랩.*암석 광산/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator('img[src*="/game-modes/regular/48000000.png"]')).toBeVisible();
  await expect(dialog.locator('img[src="/game-assets/trophy.png"]')).toHaveCount(3);
  await expect(dialog.getByRole("heading", { name: "젬 그랩" })).toBeVisible();
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

test("history tab renders tracked activity and explains the 90-day window", async ({ page }) => {
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
  await expect(page.getByText("최근 90일 동안 기록된 활동일 중 마지막 21개를 표시합니다.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "최근 90일 활동 히트맵" })).toBeVisible();
  await expect(page.getByRole("img", { name: /2026-09-22.*수집 경기: 20/ })).toBeVisible();
  await expect(page.getByText("기록이 없는 날짜는 실제로 플레이하지 않은 날이 아닐 수도 있어.", { exact: false })).toBeVisible();
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
  await page.getByRole("button", { name: "저장", exact: true }).click();
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
        rankedRankName: "MYTHIC II",
        rankedElo: 7000,
        highestAllTimeRankedRankName: "LEGENDARY I",
        highestAllTimeRankedElo: 9000,
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
            hyperCharges: [
              { id: 23000613, name: "Sample Hypercharge" },
              { id: 99999999, name: "Unlisted Future Hypercharge" },
            ],
            gears: [],
          },
        ],
      },
    });
  });
}
