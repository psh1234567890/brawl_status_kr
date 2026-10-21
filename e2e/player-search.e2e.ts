import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { localizedHref } from "../src/i18n/config";
import { getMessages } from "../src/i18n/messages";
import { profileHubMessages, profileMapPicksLabels } from "../src/i18n/profileHubMessages";
import { eventRotationMessages } from "../src/i18n/eventRotationMessages";
import { getPersonalizedMetaMessages } from "../src/i18n/personalizedMetaMessages";

const tag = "9C82J8YPP";

for (const [locale, width] of [["ko", 320], ["de", 320], ["en", 390], ["ko", 1280]] as const) {
  test(`profile next actions keep live map recommendations accessible at ${width}px in ${locale}`, async ({ page }) => {
    const errors: string[] = [];
    const playerRequests: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("request", request => {
      const url = new URL(request.url());
      if (url.pathname === "/api/player") playerRequests.push(url.searchParams.get("tag") ?? "");
    });
    await mockRecommendationAccount(page);
    await page.setViewportSize({ width, height: 844 });
    await page.route("**/api/events", route => route.fulfill({ json: {
      active: [{ slotId: 2, mapId: 15000010, mode: "brawlBall", map: "Triple Dribble",
        startTime: new Date(Date.now() - 60_000).toISOString(), endTime: new Date(Date.now() + 600_000).toISOString() }],
      upcoming: [], fetchedAt: new Date().toISOString(),
    } }));
    await page.route("**/api/meta", route => route.fulfill({ json: [{ mode: "brawlBall", map: "Triple Dribble", brawlers: [
      { id: 16000000, name: "SHELLY", plays: 20, wins: 12, draws: 0, winRate: 60, score: 48, confidence: "MEDIUM", confidenceScore: 40 },
    ] }] }));
    const copy = getMessages(locale);
    const actionsCopy = profileHubMessages[locale];
    const shots = join(tmpdir(), "brawloop-search-actions-20261018");
    await mkdir(shots, { recursive: true });
    await page.goto(localizedHref(locale, "/"));
    await expect(page.getByRole("button", { name: /Recommendation QA/ })).toBeVisible();
    const shortcuts = page.getByRole("navigation", { name: copy.home.shortcuts, exact: true });
    await expect(shortcuts.locator("a")).toHaveCount(15);
    const leading = shortcuts.locator("a");
    for (const [index, path] of ["/meta", "/minigames", "/compare"].entries()) {
      await expect(leading.nth(index)).toHaveAttribute("href", localizedHref(locale, path));
      if (width < 761) await expect(leading.nth(index)).toBeVisible();
    }
    await shortcuts.screenshot({ path: join(shots, `home-shortcuts-${locale}-${width}.png`) });
    await page.getByRole("textbox", { name: copy.home.playerTag }).fill(tag);
    await page.getByRole("button", { name: copy.home.search, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "E2E Player" })).toBeVisible();
    const actions = page.getByRole("group", { name: actionsCopy.actionLabel, exact: true });
    await actions.getByRole("button", { name: actionsCopy.save, exact: true }).click();
    await expect(actions.getByRole("button", { name: actionsCopy.saved, exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(actions.getByRole("link", { name: actionsCopy.compare, exact: true })).toHaveAttribute("href", `${localizedHref(locale, "/compare")}?a=${tag}`);
    for (const control of await actions.locator("a,button").all()) {
      const box = await control.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("heading", { level: 1, name: "E2E Player" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(shots, `profile-${locale}-${width}.png`) });
    await expect(page).toHaveURL(new RegExp(`${localizedHref(locale, "/")}\\?tag=${tag}$`));
    await actions.getByRole("button", { name: profileMapPicksLabels[locale], exact: true }).click();
    const rotation = page.getByTestId("current-maps");
    await expect(rotation).toBeFocused();
    const mapBox = (await rotation.boundingBox())!;
    expect(mapBox.y).toBeGreaterThanOrEqual(0);
    expect(mapBox.y + mapBox.height).toBeLessThanOrEqual(844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole("heading", { level: 1, name: "E2E Player" })).toHaveCount(1);
    await page.screenshot({ path: join(shots, `map-picker-${locale}-${width}.png`) });
    await rotation.getByRole("link", { name: new RegExp(eventRotationMessages[locale].recommendation) }).click();
    await expect(page).toHaveURL(new RegExp(`${localizedHref(locale, "/meta")}\\?map=Triple\\+Dribble&gameMode=brawlBall&tag=${tag}$`));
    await expect(page.getByRole("heading", { level: 1, name: copy.meta.title })).toBeVisible();
    await expect(page.locator("main article")).toHaveCount(1);
    const personalizedCopy = getPersonalizedMetaMessages(locale);
    const owned = page.getByRole("heading", { name: personalizedCopy.title, exact: true }).locator("xpath=ancestor::section[1]");
    await expect(owned).toContainText(`#${tag}`);
    await expect(owned.getByText(personalizedCopy.sourceLabels.selected, { exact: true })).toBeVisible();
    await expect(owned).toContainText("E2E Player");
    expect(playerRequests.every(requested => requested === tag)).toBe(true);
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: "E2E Player" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: copy.home.playerTag })).toHaveValue(tag);
    await expect(actions.getByRole("button", { name: actionsCopy.saved, exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "E2E Player" })).toBeVisible();
    await page.locator("header").getByRole("link", { name: `Brawloop · ${copy.common.home}`, exact: true }).click();
    await expect(page).toHaveURL(localizedHref(locale, "/"));
    await expect(page.getByRole("heading", { name: "E2E Player", exact: true })).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: copy.home.playerTag })).toHaveValue("");
    await expect(shortcuts.locator("a:visible")).toHaveCount(15);
    await page.goBack();
    await expect(page.getByRole("heading", { name: "E2E Player", exact: true })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(localizedHref(locale, "/"));
    await expect(page.getByRole("heading", { name: "E2E Player", exact: true })).toHaveCount(0);
    await page.goForward();
    await expect(page.getByRole("heading", { name: "E2E Player", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("selected player survives full rotation, recommendation filters, reload, and back on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockRecommendationAccount(page);
  await page.addInitScript(() => localStorage.setItem("recentTags", JSON.stringify(["8PQL"])));
  const playerRequests: string[] = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.pathname === "/api/player") playerRequests.push(url.searchParams.get("tag") ?? "");
  });
  await page.route("**/api/events", route => route.fulfill({ json: {
    active: [{ slotId: 2, mapId: 15000010, mode: "brawlBall", map: "Triple Dribble",
      startTime: new Date(Date.now() - 60_000).toISOString(), endTime: new Date(Date.now() + 600_000).toISOString() }],
    upcoming: [], fetchedAt: new Date().toISOString(),
  } }));
  const brawlers = [{ id: 16000000, name: "SHELLY", plays: 100, wins: 60, draws: 0,
    winRate: 60, score: 57, confidence: "HIGH", confidenceScore: 100 }];
  await page.route("**/api/meta", route => route.fulfill({ json: [
    { mode: "brawlBall", map: "Triple Dribble", brawlers },
    { mode: "gemGrab", map: "Hard Rock Mine", brawlers },
  ] }));
  await page.goto("/?tag=" + tag);
  await expect(page.getByRole("heading", { name: "E2E Player", exact: true })).toBeVisible();
  const rotation = page.getByTestId("current-maps");
  const allEvents = rotation.getByRole("link", { name: eventRotationMessages.ko.allEvents, exact: true });
  await expect(allEvents).toHaveAttribute("href", `/events?tag=${tag}`);
  await allEvents.click();
  await expect(page).toHaveURL(`/events?tag=${tag}`);
  await page.getByTestId("current-maps").getByRole("link", { name: /이 맵 추천 브롤러 보기/ }).click();
  const owned = page.getByRole("heading", { name: "플레이어 보유 브롤러 추천", exact: true }).locator("xpath=ancestor::section[1]");
  await expect(owned).toContainText("E2E Player");
  await expect(owned).toContainText(`#${tag}`);
  await page.getByRole("combobox", { name: "최소 표본", exact: true }).selectOption("20");
  await page.getByRole("combobox", { name: "표본 규모", exact: true }).selectOption("HIGH");
  await page.getByRole("combobox", { name: "정렬", exact: true }).selectOption("WIN_RATE");
  await page.getByRole("button", { name: "젬 그랩", exact: true }).click();
  expect(new URL(page.url()).searchParams.get("tag")).toBe(tag);
  await expect(owned).toContainText(`#${tag}`);
  await page.reload();
  await expect(owned).toContainText("E2E Player");
  await expect(owned.getByText("선택한 플레이어", { exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "최소 표본", exact: true })).toHaveValue("20");
  await expect(page.getByRole("combobox", { name: "표본 규모", exact: true })).toHaveValue("HIGH");
  await expect(page.getByRole("combobox", { name: "정렬", exact: true })).toHaveValue("WIN_RATE");
  await expect(page.getByRole("button", { name: "젬 그랩", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(playerRequests.length).toBeGreaterThanOrEqual(3);
  expect(playerRequests.every(requested => requested === tag)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goBack();
  await expect(page).toHaveURL(`/events?tag=${tag}`);
  await page.goBack();
  await expect(page).toHaveURL(`/?tag=${tag}`);
  await expect(page.getByRole("heading", { name: "E2E Player", exact: true })).toBeVisible();
});

test("a shared selected-player URL overrides account and recent tags on a cold phone load", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await mockRecommendationAccount(page);
  await page.addInitScript(() => localStorage.setItem("recentTags", JSON.stringify(["8PQL"])));
  const requestedTags: string[] = [];
  await page.route(/\/api\/player\?tag=/, route => {
    requestedTags.push(new URL(route.request().url()).searchParams.get("tag") ?? "");
    return route.fulfill({ json: { tag: `#${tag}`, name: "Shared selected player", brawlers: [] } });
  });
  await page.route("**/api/meta", route => route.fulfill({ json: [{ mode: "gemGrab", map: "Hard Rock Mine", brawlers: [
    { id: 16000000, name: "SHELLY", plays: 20, wins: 12, draws: 0,
      winRate: 60, score: 48, confidence: "MEDIUM", confidenceScore: 40 },
  ] }] }));
  await page.goto(`/meta?map=Hard+Rock+Mine&tag=%23${tag.toLowerCase()}`);
  const owned = page.getByRole("heading", { name: "플레이어 보유 브롤러 추천", exact: true }).locator("xpath=ancestor::section[1]");
  await expect(owned).toContainText("Shared selected player");
  await expect(owned).toContainText(`#${tag}`);
  await expect(page.getByRole("button", { name: /Recommendation QA/ })).toBeVisible();
  expect(requestedTags.length).toBeGreaterThan(0);
  expect(requestedTags.every(requested => requested === tag)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const navigation of ["back", "logo"] as const) {
  test(`returning home by ${navigation} cancels a pending player lookup`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    let releaseResponse!: () => void;
    let requestStarted!: () => void;
    let responseFinished!: () => void;
    const pending = new Promise<void>(resolve => { releaseResponse = resolve; });
    const started = new Promise<void>(resolve => { requestStarted = resolve; });
    const finished = new Promise<void>(resolve => { responseFinished = resolve; });
    await page.unroute(/\/api\/player\?tag=/);
    await page.route(/\/api\/player\?tag=/, async route => {
      requestStarted();
      await pending;
      await route.fulfill({ json: { tag: `#${tag}`, name: "Late player", brawlers: [] } }).catch(() => {});
      responseFinished();
    });
    await page.goto("/");
    await page.getByRole("textbox", { name: "플레이어 태그" }).fill(tag);
    await page.getByRole("button", { name: "검색", exact: true }).click();
    await started;
    await expect(page).toHaveURL(`/?tag=${tag}`);
    if (navigation === "back") await page.goBack();
    else await page.getByRole("link", { name: "Brawloop · 전적 검색", exact: true }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("textbox", { name: "플레이어 태그" })).toHaveValue("");
    await expect(page.getByRole("button", { name: "검색", exact: true })).toBeEnabled();
    releaseResponse();
    await finished;
    await expect(page.getByRole("heading", { name: "Late player", exact: true })).toHaveCount(0);
    await expect(page).toHaveURL("/");
  });
}

test("profile map picker can retry an outage without losing the displayed player", async ({ page }) => {
  let failed = true;
  await page.route("**/api/events", route => failed
    ? route.fulfill({ status: 503, json: { error: "unavailable" } })
    : route.fulfill({ json: { active: [], upcoming: [], fetchedAt: new Date().toISOString() } }));
  await page.goto("/?tag=" + tag);
  await expect(page.getByRole("heading", { level: 1, name: "E2E Player" })).toBeVisible();
  await page.getByRole("button", { name: profileMapPicksLabels.ko, exact: true }).click();
  const picker = page.getByTestId("current-maps");
  await expect(picker.getByText(eventRotationMessages.ko.unavailable, { exact: true })).toBeVisible();
  failed = false;
  await picker.getByRole("button", { name: eventRotationMessages.ko.retry, exact: true }).click();
  await expect(picker.getByText(eventRotationMessages.ko.empty, { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "E2E Player" })).toHaveCount(1);
});

test("successful search to recommendations sends only anonymous flow counters once", async ({ page }) => {
  const bodies: Array<{ event?: string; events?: string[] }> = [];
  await page.route("**/api/usage/event", route => {
    bodies.push(route.request().postDataJSON());
    return route.fulfill({ status: 204 });
  });
  await page.route("**/api/events", route => route.fulfill({ json: { active: [], upcoming: [], fetchedAt: new Date().toISOString() } }));
  await page.route("**/api/meta", route => route.fulfill({ json: [{ mode: "gemGrab", map: "Hard Rock Mine", brawlers: [
    { id: 16000000, name: "SHELLY", plays: 20, wins: 12, draws: 0, winRate: 60, score: 48, confidence: "MEDIUM", confidenceScore: 40 },
  ] }] }));
  const events = () => bodies.flatMap(body => body.events ?? [body.event!]);
  await page.goto("/");
  await page.getByRole("textbox", { name: "플레이어 태그" }).fill(tag);
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "E2E Player" })).toBeVisible();
  await expect.poll(() => events().includes("funnel_search")).toBe(true);
  await page.goto("/meta");
  await expect.poll(() => events().includes("funnel_after_meta")).toBe(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: /암석 광산 추천/ })).toBeVisible();
  expect(events().filter(event => event === "funnel_followup")).toHaveLength(1);
  expect(events().filter(event => event === "funnel_after_meta")).toHaveLength(1);
  expect(bodies.every(body => Object.keys(body).length === 1)).toBe(true);
  expect(JSON.stringify(bodies)).not.toContain(tag);
  await page.goto("/privacy");
  await page.getByRole("checkbox", { name: "방문·검색·미니게임 통계 및 검색 태그 기록 제외" }).check();
  expect(await page.evaluate(() => localStorage.getItem("brawl_product_session_v1"))).toBeNull();
});

test.beforeEach(async ({ context, page }) => {
  await context.addCookies([
    { name: "brawl-locale", value: "ko", url: "http://localhost:3020" },
  ]);
  await mockPlayerApis(page);
  await page.route("**/api/events", route => route.fulfill({ json: { active: [], upcoming: [], fetchedAt: new Date().toISOString() } }));
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
  const experience = await profile.getByText("경험치 레벨", { exact: true }).locator("..").boundingBox();
  const victories = await profile.getByText("3v3 승리", { exact: true }).locator("..").boundingBox();
  expect(experience).not.toBeNull();
  expect(victories).not.toBeNull();
  expect(Math.abs(experience!.y - victories!.y)).toBeLessThan(2);
  expect(victories!.x).toBeGreaterThan(experience!.x + experience!.width);
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect.poll(() => events.includes("profile_save")).toBe(true);
  trophies = 12400;
  // A profile refresh now restores that player; visit home to choose a saved player.
  await page.goto("/");
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

async function mockRecommendationAccount(page: Page) {
  await page.route("**/api/account", route => route.fulfill({ json: {
    state: "account", syncEnabled: false,
    account: {
      id: "00000000-0000-4000-8000-000000000001", nickname: "Recommendation QA",
      defaultPlayerTag: "2PYLQ", profileRevision: 1, onboardingComplete: true,
      onboardingCompletedAt: "2026-01-01T00:00:00Z", policyReady: true,
      eligibilityPolicyTexts: null, eligibilityRules: null, policyVersions: null,
    },
  } }));
  await page.route("**/api/admin/access", route => route.fulfill({ status: 404 }));
}
