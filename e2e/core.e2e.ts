import { expect, test } from "@playwright/test";
import { getAccountMessages } from "../src/i18n/accountMessages";
import { locales, localizedHref } from "../src/i18n/config";
import { getMessages } from "../src/i18n/messages";

test("home exposes current maps above the fold and removes expired rotations", async ({ context, page }) => {
  await context.addCookies([{ name: "brawl-locale", value: "ko", url: "http://localhost:3020" }]);
  await page.route("**/api/account", route => route.fulfill({ json: { state: "guest", syncEnabled: false } }));
  const now = Date.now();
  await page.clock.setFixedTime(new Date(now));
  const event = (slotId: number, mode: string, map: string, start: number, end: number) => ({
    slotId, mapId: 15000000 + slotId, mode, map,
    startTime: new Date(start).toISOString(), endTime: new Date(end).toISOString(),
  });
  await page.route("**/api/events", route => route.fulfill({ json: {
    fetchedAt: new Date(now).toISOString(),
    active: [
      event(1, "brawlBall", "Triple Dribble", now - 60_000, now + 5_000),
      event(2, "gemGrab", "Crystal Arcade", now - 60_000, now + 3_600_000),
      event(3, "heist", "Expired Map", now - 60_000, now - 1_000),
      event(5, "brawlArena", "Silver Highlands", now - 60_000, now + 3_600_000),
      event(6, "knockout5V5", "Crescendo", now - 60_000, now + 3_600_000),
    ],
    upcoming: [event(4, "brawlBall", "Backyard Bowl", now + 6_000, now + 3_600_000)],
  } }));
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto("/");
  const rotation = page.getByTestId("current-maps");
  const first = rotation.getByRole("link", { name: "브롤 볼 · 트리플 드리블 · 이 맵 추천 브롤러 보기", exact: true });
  await expect(first).toBeVisible();
  expect((await first.boundingBox())!.y + (await first.boundingBox())!.height).toBeLessThan(780);
  await expect(first).toHaveAttribute("href", "/meta?map=Triple+Dribble&gameMode=brawlBall");
  await expect(first.locator("time")).toContainText("교체까지");
  await expect(rotation.getByRole("link", { name: /브롤 아레나 ·/ })).toHaveCount(1);
  await expect(rotation.getByRole("link", { name: /5대5 녹아웃 ·/ })).toHaveCount(1);
  await expect(rotation.getByText("Expired Map", { exact: true })).toHaveCount(0);
  await expect(rotation.getByText("뒷마당 월드컵", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.clock.setFixedTime(new Date(now + 10_000));
  await expect(first).toHaveCount(0);
  const next = rotation.getByRole("link", { name: "브롤 볼 · 뒷마당 월드컵 · 이 맵 추천 브롤러 보기", exact: true });
  await expect(next).toBeVisible();
  await next.click();
  await expect(page).toHaveURL(/\/meta\?map=Backyard\+Bowl&gameMode=brawlBall$/);

  await page.goto("/events");
  await expect(page.getByTestId("current-maps").getByRole("link", { name: "젬 그랩 · 수정 오락실 · 이 맵 추천 브롤러 보기", exact: true })).toBeVisible();
});

test("rotation failures can retry without blocking player search", async ({ context, page }) => {
  await context.addCookies([{ name: "brawl-locale", value: "ko", url: "http://localhost:3020" }]);
  await page.route("**/api/account", route => route.fulfill({ json: { state: "guest", syncEnabled: false } }));
  let failed = true;
  await page.route("**/api/events", route => failed
    ? route.fulfill({ status: 503, json: { error: "unavailable" } })
    : route.fulfill({ json: { active: [], upcoming: [], fetchedAt: new Date().toISOString() } }));
  await page.goto("/");
  const rotation = page.getByTestId("current-maps");
  await expect(rotation.getByText("현재 맵을 불러오지 못했어요.", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "플레이어 태그", exact: true })).toBeEnabled();
  failed = false;
  await rotation.getByRole("button", { name: "다시 시도", exact: true }).click();
  await expect(rotation.getByText("현재 공개된 맵이 없어요.", { exact: true })).toBeVisible();
});

test("page views are batched anonymously and analytics opt-out stops all client counters", async ({ context, page }) => {
  const batches: unknown[] = [];
  const events: string[] = [];
  await context.addCookies([{ name: "brawl-locale", value: "ko", url: "http://localhost:3020" }]);
  await context.route("**/api/events", route => route.fulfill({ json: {
    active: [], upcoming: [], fetchedAt: new Date().toISOString(),
  } }));
  await context.route("**/api/usage/event", route => {
    const body = route.request().postDataJSON();
    batches.push(body); events.push(...(body.events ?? [body.event]));
    return route.fulfill({ status: 204 });
  });
  await page.goto("/");
  await expect.poll(() => events.filter(event => event === "page_view").length).toBe(1);
  expect(batches).toHaveLength(1);
  expect(events).toContain("browser_session");
  expect(JSON.stringify(batches)).not.toMatch(/tag|userId|pathname|referrer/);
  await page.goto("/privacy");
  await expect.poll(() => events.filter(event => event === "page_view").length).toBe(2);
  await page.getByRole("checkbox", { name: "방문·검색·미니게임 통계 및 검색 태그 기록 제외" }).check();
  const before = batches.length;
  await page.goto("/");
  await expect(page.getByTestId("current-maps").getByText("현재 공개된 맵이 없어요.", { exact: true })).toBeVisible();
  expect(batches).toHaveLength(before);
  expect(await page.evaluate(() => localStorage.getItem("brawl_usage_last_activity_v1"))).toBeNull();
});

test("home header exposes localized account entry without mobile overflow", async ({ context, page }) => {
  await context.route("**/api/account", (route) => route.fulfill({
    json: { state: "guest", syncEnabled: false },
  }));
  await context.addCookies([{ name: "brawl-locale", value: "ko", url: "http://localhost:3020" }]);
  await page.setViewportSize({ width: 320, height: 740 });

  for (const locale of locales) {
    await page.goto(localizedHref(locale, "/"));
    const siteHome = page.locator("header").getByRole("link", { name: `Brawloop · ${getMessages(locale).common.home}`, exact: true });
    await expect(siteHome).toHaveText("brawloop");
    await expect(siteHome).toHaveAttribute("href", localizedHref(locale, "/"));
    const login = page.locator("header").getByRole("link", { name: getAccountMessages(locale).navLogin, exact: true });
    await expect(login).toBeVisible();
    await expect(login).toHaveAttribute("href", localizedHref(locale, "/account"));
    expect((await login.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await expect(page.locator("header summary")).toBeVisible();
    const shortcuts = page.getByRole("navigation", { name: getMessages(locale).home.shortcuts, exact: true });
    await expect(shortcuts.getByRole("link")).toHaveCount(8);
    for (const path of ["/minigames", "/community", "/compare", "/rankings", "/brawlers", "/skins", "/meta", "/events"]) {
      const link = shortcuts.locator(`a[href="${localizedHref(locale, path)}"]`);
      await expect(link).toBeVisible();
      const box = await link.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box!.y + box!.height).toBeLessThanOrEqual(740);
    }
    const header = await page.locator("header").boundingBox();
    expect(header?.height).toBeLessThanOrEqual(76);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/en");
  await page.goto("/en/events");
  await expect(page.locator("header").getByRole("link", { name: /Brawloop/ })).toBeVisible();
  await page.goto("/en");
  await page.locator("header").getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/account$/);
  await expect(page.getByRole("button", { name: "Continue with Google", exact: true })).toBeVisible();
});

test("mobile menu keeps navigation and language access without a tall sticky header", async ({ context, page }) => {
  await context.addCookies([{ name: "brawl-locale", value: "ko", url: "http://localhost:3020" }]);
  await context.route("**/api/account", route => route.fulfill({ json: { state: "guest", syncEnabled: false } }));
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto("/");

  const header = page.locator("header");
  await expect.poll(async () => (await header.boundingBox())?.height ?? 999).toBeLessThanOrEqual(76);
  await header.locator('summary[aria-label="전체 메뉴"]').click();
  await expect(header.getByRole("navigation", { name: getMessages("ko").common.mainNavigation })).toBeVisible();
  await expect(header.getByRole("combobox", { name: "언어" })).toBeVisible();
  await header.getByRole("link", { name: "플레이어 비교" }).click();
  await expect(page).toHaveURL(/\/compare$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("admin users can reach the dashboard from the compact mobile account menu", async ({ context, page }) => {
  await context.addCookies([{ name: "brawl-locale", value: "ko", url: "http://localhost:3020" }]);
  await page.route("**/api/account", route => route.fulfill({ json: {
    state: "account", syncEnabled: false,
    account: {
      id: "00000000-0000-4000-8000-000000000001", nickname: "NOSU2",
      defaultPlayerTag: null, profileRevision: 1, onboardingComplete: true,
      onboardingCompletedAt: "2026-01-01T00:00:00Z", policyReady: true,
      eligibilityPolicyTexts: null, eligibilityRules: null, policyVersions: null,
    },
  } }));
  await page.route("**/api/admin/access", route => route.fulfill({ status: 204 }));
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  const header = page.locator("header");
  await expect.poll(async () => (await header.boundingBox())?.height ?? 999).toBeLessThanOrEqual(76);
  const avatar = header.getByRole("button", { name: "계정 메뉴: NOSU2" });
  await avatar.click();
  const admin = header.getByRole("menuitem", { name: "운영자 대시보드" });
  await expect(admin).toBeVisible();
  await expect(admin).toHaveAttribute("href", "/admin/usage");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("compact subpage header keeps the mobile comparison form visible", async ({ context, page }) => {
  await context.addCookies([{ name: "brawl-locale", value: "ko", url: "http://localhost:3020" }]);
  await page.setViewportSize({ width: 375, height: 760 });
  await page.goto("/compare");
  await expect(page.getByRole("textbox", { name: "플레이어 A 태그" })).toBeVisible();
  await expect.poll(async () => (await page.locator("header").boundingBox())?.height ?? 999).toBeLessThan(240);
  await page.locator("header summary").click();
  const navigation = page.getByRole("navigation", { name: getMessages("ko").common.mainNavigation });
  await expect(navigation.getByRole("link", { name: "플레이어 비교" })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("header").getByRole("combobox", { name: "언어" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator("header summary").click();
});

test("subpage mobile menu highlights the active section and keeps all destinations", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  for (const locale of locales) {
    await page.goto(localizedHref(locale, "/events"));
    await page.locator("header summary").click();
    const copy = getMessages(locale).common;
    const navigation = page.getByRole("navigation", { name: copy.mainNavigation });
    const eventsLink = navigation.getByRole("link", { name: copy.events, exact: true });
    await expect(eventsLink).toHaveAttribute("aria-current", "page");
    await expect(navigation.getByRole("link", { name: copy.home, exact: true })).not.toHaveAttribute("aria-current", "page");
    await expect(page.locator("header").getByRole("link", { name: /Brawloop/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }

  await page.goto("/en/status");
  await page.locator("header summary").click();
  const copy = getMessages("en").common;
  const navigation = page.getByRole("navigation", { name: copy.mainNavigation });
  const statusLink = navigation.getByRole("link", { name: copy.status, exact: true });
  await expect(statusLink).toHaveAttribute("aria-current", "page");
  await expect(statusLink).toBeVisible();
  await expect(navigation.getByRole("link", { name: copy.skins, exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: copy.counters, exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: copy.rankings, exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("home account menu works with keyboard and accounts off remains hidden", async ({ page }) => {
  // Browser-only UI fixtures; production authentication is unchanged.
  let current: object = {
    state: "account", syncEnabled: false,
    account: {
      id: "00000000-0000-4000-8000-000000000001", nickname: "A long account nickname for QA",
      defaultPlayerTag: null, profileRevision: 1, onboardingComplete: true,
      onboardingCompletedAt: "2026-01-01T00:00:00Z", policyReady: true,
      eligibilityPolicyTexts: null, eligibilityRules: null, policyVersions: null,
    },
  };
  await page.route("**/api/account", (route) => route.fulfill({ json: current }));
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/en");
  const trigger = page.getByRole("button", { name: "Account menu: A long account nickname for QA", exact: true });
  await expect(trigger).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await trigger.focus();
  await page.keyboard.press("Enter");
  const manage = page.getByRole("menuitem", { name: "Manage account", exact: true });
  await expect(manage).toBeFocused();
  await expect(manage).toHaveAttribute("href", "/en/account");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Sign out", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("menu")).toHaveCount(0);

  current = { state: "disabled", syncEnabled: false };
  await page.reload();
  await expect(trigger).toHaveCount(0);
  await expect(page.locator("header").getByRole("link", { name: "Sign in", exact: true })).toHaveCount(0);
});
for (const locale of ["ko", "en"] as const) {
  test(`data status in ${locale} renders a timestamped snapshot or an honest unavailable notice`, async ({ page }) => {
    const copy = getMessages(locale).status;
    const response = await page.goto(locale === "ko" ? "/status" : "/en/status");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: copy.title, exact: true })).toBeVisible();
    const unavailable = page.getByText(copy.unavailable, { exact: true });
    const snapshot = page.getByText(copy.cacheNotice, { exact: false });
    await expect(unavailable.or(snapshot)).toHaveCount(1);
    if (await unavailable.count()) {
      await expect(page.getByText(copy.totalRows, { exact: true })).toHaveCount(0);
    } else {
      await expect(snapshot).toContainText(copy.snapshotAt);
    }
  });
}

test("deletion in another tab cannot leave a stale deletion warning on a new account", async ({ context, page }) => {
  const oldId = "00000000-0000-4000-8000-000000000001";
  const newId = "00000000-0000-4000-8000-000000000002";
  await context.addInitScript((id) => {
    sessionStorage.setItem("brawl-status:account:pending-deletion-user", id);
  }, oldId);
  const account = (id: string, active: boolean) => ({
    state: "account", syncEnabled: false, deletionIntentActive: active, deletionReauthReady: active,
    account: {
      id, nickname: id === oldId ? "Old UI account" : "New UI account", defaultPlayerTag: null,
      profileRevision: 1, onboardingComplete: true, onboardingCompletedAt: "2026-01-01T00:00:00Z",
      policyReady: true, eligibilityPolicyTexts: null, eligibilityRules: null, policyVersions: null,
    },
  });
  let current: object = account(oldId, true);
  await context.route("**/api/account", (route) => {
    if (route.request().method() === "DELETE") {
      expect(route.request().postDataJSON()).toEqual({ expectedUserId: oldId, confirmation: true });
      current = { state: "guest", syncEnabled: false };
      return route.fulfill({ json: { deleted: true } });
    }
    expect(route.request().method()).toBe("GET");
    return route.fulfill({ json: current });
  });
  // UI-only fixture. Both tabs start with the same pending deletion marker,
  // but sessionStorage removal in the deleting tab does not clear the other tab.
  const otherTab = await context.newPage();
  await page.goto("/account");
  await otherTab.goto("/account");
  await expect(otherTab.getByRole("textbox", { name: "닉네임", exact: true })).toHaveValue("Old UI account");
  await page.getByRole("checkbox", { name: "내 계정과 계정 데이터를 삭제하는 데 동의합니다.", exact: true }).check();
  await page.getByRole("button", { name: "계정 영구 삭제", exact: true }).click();
  await expect(page.getByText("계정과 계정 데이터가 삭제되었습니다.", { exact: true })).toBeVisible();
  await expect(otherTab.getByRole("heading", { name: "선택 사항인 계정", exact: true })).toBeVisible();
  expect(await otherTab.evaluate(() => sessionStorage.getItem("brawl-status:account:pending-deletion-user"))).toBe(oldId);
  current = account(newId, false);
  await otherTab.evaluate(() => window.dispatchEvent(new Event("brawlStatusAccountSessionChanged")));
  await expect(otherTab.getByRole("textbox", { name: "닉네임", exact: true })).toHaveValue("New UI account");
  await expect(otherTab.getByRole("alert").filter({ hasText: "삭제를 요청한 계정과 다른 Google 계정입니다." })).toHaveCount(0);
  await otherTab.getByRole("checkbox", { name: "내 계정과 계정 데이터를 삭제하는 데 동의합니다.", exact: true }).check();
  await expect(otherTab.getByRole("button", { name: "삭제 전에 Google로 다시 로그인해 주세요.", exact: true })).toBeEnabled();
});

test("an active deletion intent still blocks a different account in the UI", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("brawl-status:account:pending-deletion-user", "00000000-0000-4000-8000-000000000001"));
  await page.route("**/api/account", (route) => {
    expect(route.request().method()).toBe("GET");
    return route.fulfill({ json: {
      state: "account", syncEnabled: false, deletionIntentActive: true, deletionReauthReady: false,
      account: { id: "00000000-0000-4000-8000-000000000002", nickname: "Other UI account", profileRevision: 1, defaultPlayerTag: null, onboardingComplete: true },
    } });
  });
  await page.goto("/account");
  await expect(page.getByRole("alert").filter({ hasText: "삭제를 요청한 계정과 다른 Google 계정입니다." })).toBeVisible();
  await page.getByRole("checkbox", { name: "내 계정과 계정 데이터를 삭제하는 데 동의합니다.", exact: true }).check();
  await expect(page.getByRole("button", { name: "삭제 전에 Google로 다시 로그인해 주세요.", exact: true }).first()).toBeDisabled();
});

test("explicit normal sign-in clears a previous deletion UI target without deleting data", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("brawl-status:account:pending-deletion-user", "00000000-0000-4000-8000-000000000001");
  });
  await page.route("**/api/account", (route) => {
    expect(route.request().method()).toBe("GET");
    return route.fulfill({ json: { state: "guest", syncEnabled: false, signInPolicy: { version: "ui-fixture-v1", texts: { ko: "UI 테스트: 계정은 만 16세 이상입니다." } } } });
  });
  await page.route("**/api/auth/sign-in/social", (route) => {
    expect(route.request().postDataJSON()).toMatchObject({ provider: "google", callbackURL: "/account", confirmEligibility: true, eligibilityPolicyVersion: "ui-fixture-v1" });
    // Keep this UI-only regression entirely local; do not open real Google.
    return route.fulfill({ status: 503, json: { error: "SIGN_IN_UNAVAILABLE" } });
  });
  await page.goto("/account");
  const deletionReauth = page.getByRole("button", { name: "삭제 전에 Google로 다시 로그인해 주세요.", exact: true });
  await expect(deletionReauth).toBeVisible();
  await expect(page.getByRole("button", { name: "Google로 계속", exact: true })).toBeDisabled();
  await page.getByRole("checkbox", { name: "서비스에 표시된 계정 이용 자격 요건을 확인했으며 이에 해당합니다.", exact: true }).check();
  await page.getByRole("button", { name: "Google로 계속", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "요청을 완료하지 못했습니다." })).toBeVisible();
  await expect(deletionReauth).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem("brawl-status:account:pending-deletion-user"))).toBeNull();
});

test("account PB list refreshes after a delayed import acknowledgement without reloading", async ({ page }) => {
  // Browser-only UI fixture: no auth bypass or database writes in the app.
  const userId = "00000000-0000-4000-8000-000000000001";
  let bestReads = 0;
  let best = {
    gameId: "brawler-quiz", mode: "practice", rulesetVersion: 1,
    score: 1, total: 10, source: "client_play", revision: 1,
    clientRecordedAt: null, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  };
  let releaseMerge!: () => void;
  const mergeGate = new Promise<void>((resolve) => { releaseMerge = resolve; });
  let markMergeStarted!: () => void;
  const mergeStarted = new Promise<void>((resolve) => { markMergeStarted = resolve; });
  await page.route("**/api/account", (route) => route.fulfill({
    json: {
      state: "account", syncEnabled: true, deletionReauthReady: false,
      account: {
        id: userId, nickname: "UI Fixture", defaultPlayerTag: null, profileRevision: 1,
        onboardingComplete: true, onboardingCompletedAt: "2026-01-01T00:00:00Z",
        policyReady: true, eligibilityPolicyTexts: null, eligibilityRules: null, policyVersions: null,
      },
    },
  }));
  // This browser-only fixture uses an in-memory account response. Prevent
  // background private dashboard requests from reaching real auth/DB services.
  await page.route("**/api/account/dashboard", route => route.fulfill({
    json: { defaultPlayerTag: null, player: null, rankings: [] },
  }));
  await page.route("**/api/account/minigame-bests", (route) => {
    bestReads += 1;
    return route.fulfill({ json: { personalBests: [best] } });
  });
  await page.route("**/api/account/minigame-bests/merge", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.expectedUserId).toBe(userId);
    expect(body.candidates).toContainEqual(expect.objectContaining({ score: 8, total: 10 }));
    markMergeStarted();
    await mergeGate;
    best = { ...best, score: 8, revision: 2 };
    await route.fulfill({ json: { personalBests: [best] } });
  });
  await page.addInitScript(() => {
    localStorage.setItem("brawl-status:minigames:brawler-quiz:v1:best", JSON.stringify({
      practice: { found: 8, total: 10, percentage: 80, mode: "practice", recordedAt: "2026-01-01T00:00:00Z" },
    }));
  });
  try {
    await page.goto("/en/account");
    const bestSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Mini Game personal bests", exact: true }),
    });
    await expect(bestSection).toContainText("1 / 10");
    await page.getByRole("button", { name: "Import this browser’s personal bests", exact: true }).click();
    await mergeStarted;
    await expect(bestSection).not.toContainText("8 / 10");
    releaseMerge();
    await expect(bestSection).toContainText("8 / 10");
    await expect(bestSection.getByText("Synced", { exact: true })).toBeVisible();
    await expect.poll(() => bestReads).toBe(2);
    await expect(page).toHaveURL(/\/en\/account$/);
  } finally {
    releaseMerge();
  }
});

test("skin catalog filters client-side", async ({ page }) => {
  await page.goto("/skins");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("브롤스타즈 스킨 도감");
  const articles = page.locator("article");
  expect(await articles.count()).toBeGreaterThan(0);

  await page.getByRole("searchbox", { name: "스킨 또는 브롤러 검색" }).fill("__NO_SKIN_MATCH__");
  await expect(page.getByText("조건에 맞는 스킨이 없습니다.")).toBeVisible();
  await expect(articles).toHaveCount(0);
});

test("map catalog filters client-side and links to map recommendations", async ({ page }) => {
  await page.goto("/maps");

  await expect(page.getByRole("heading", { level: 1, name: "맵 도감" })).toBeVisible();
  const search = page.getByRole("searchbox", { name: "맵 이름 검색" });
  await expect(search).toBeVisible();
  await expect(page.getByLabel("게임모드 필터")).toBeVisible();

  const mapArticles = page.locator("article");
  expect(await mapArticles.count()).toBeGreaterThan(0);
  await expect(mapArticles.first().getByRole("link", { name: "추천 브롤러" })).toHaveAttribute(
    "href",
    /\/meta\?map=/,
  );

  await search.fill("__NO_MAP_MATCH__");
  await expect(page.getByText("조건에 맞는 맵이 없습니다.")).toBeVisible();
  await expect(mapArticles).toHaveCount(0);
});

test("brawler catalog filters by name, rarity, and class", async ({ page }) => {
  await page.goto("/brawlers");

  await expect(page.getByRole("heading", { level: 1, name: "브롤러 도감" })).toBeVisible();
  const search = page.getByRole("searchbox", { name: "브롤러 이름 검색" });
  const rarity = page.getByLabel("브롤러 희귀도 필터");
  const classFilter = page.getByLabel("브롤러 역할 필터");
  await expect(search).toBeVisible();
  await expect(rarity).toBeVisible();
  await expect(classFilter).toBeVisible();

  const articles = page.locator("article");
  expect(await articles.count()).toBeGreaterThan(0);

  await search.fill("__NO_BRAWLER_MATCH__");
  await expect(page.getByText("조건에 맞는 브롤러가 없습니다.")).toBeVisible();
  await expect(articles).toHaveCount(0);

  await search.fill("");
  const rarityValue = await rarity.locator("option").nth(1).getAttribute("value");
  const classValue = await classFilter.locator("option").nth(1).getAttribute("value");
  expect(rarityValue).toBeTruthy();
  expect(classValue).toBeTruthy();
  await rarity.selectOption(rarityValue!);
  await classFilter.selectOption(classValue!);
  const selectedRarity = await rarity.locator("option:checked").textContent();
  const selectedClass = await classFilter.locator("option:checked").textContent();
  await expect.poll(async () => {
    const [rarityLabels, classLabels] = await Promise.all([
      articles.locator("h2 + p").allTextContents(), articles.locator("h2 + p + p").allTextContents(),
    ]);
    if (rarityLabels.length === 0) return page.getByText("조건에 맞는 브롤러가 없습니다.").isVisible();
    return rarityLabels.every((label) => label.trim() === selectedRarity?.trim()) &&
      classLabels.length === rarityLabels.length &&
      classLabels.every((label) => label.trim() === selectedClass?.trim());
  }).toBe(true);
});

for (const allImagesFail of [false, true]) {
  test(`brawler catalog recovers missing portraits with ${allImagesFail ? "an accessible graphic" : "the supplied game avatar"}`, async ({ page, context }) => {
    await context.addCookies([{ name: "brawl-locale", value: "ko", url: "http://localhost:3020" }]);
    await page.route("https://cdn.brawlify.com/brawlers/**", route => route.fulfill({ status: 404 }));
    await page.route("https://cdn.brawlify.com/profile-icons/regular/**", route => allImagesFail
      ? route.fulfill({ status: 404 })
      : route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") }));
    await page.goto("/brawlers");
    await page.getByRole("searchbox", { name: "브롤러 이름 검색" }).fill("shelly");
    const card = page.locator("article").filter({ has: page.getByRole("heading", { name: "쉘리", exact: true }) });
    const portrait = card.getByRole("img", { name: "쉘리", exact: true });
    await expect(portrait).toBeVisible();
    if (allImagesFail) {
      await expect(portrait.locator("svg")).toHaveCount(1);
      await expect(portrait).toHaveText("");
    } else {
      await expect(portrait).toHaveAttribute("src", /\/profile-icons\/regular\/\d+\.png$/);
      await expect.poll(() => portrait.evaluate(element => element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0)).toBe(true);
    }
  });
}

test("desktop shortcuts avoid header duplicates while mobile keeps every destination", async ({ page, context }) => {
  await context.addCookies([{ name: "brawl-locale", value: "ko", url: "http://localhost:3020" }]);
  await page.route("**/api/meta", route => route.fulfill({ json: [] }));
  await page.goto("/");
  const shortcuts = page.getByRole("navigation", { name: "바로가기", exact: true });
  for (const [width, count] of [[1280, 4], [900, 5], [390, 8]]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(shortcuts.locator("a:visible")).toHaveCount(count);
  }
  await page.setViewportSize({ width: 1280, height: 844 });
  const headerLinks = page.locator("header").getByRole("navigation", { name: "주요 기능", exact: true }).getByRole("link");
  await expect(headerLinks).toHaveText(["전적", "브롤러 추천", "미니게임", "도감", "트롤 박제"]);
  await headerLinks.filter({ hasText: "브롤러 추천" }).click();
  await expect(page).toHaveURL(/\/meta$/);
  await expect(page.locator("header").getByRole("link", { name: "브롤러 추천", exact: true })).toHaveAttribute("aria-current", "page");
});

test("language switcher preserves the current localized route", async ({ page }) => {
  await page.goto("/skins?q=colt&sort=NAME");
  await page.getByRole("combobox", { name: "언어" }).selectOption("en");

  await expect(page).toHaveURL(/\/en\/skins\?q=colt&sort=NAME$/);
  await expect(page.getByRole("heading", { level: 1, name: "Skin Catalog" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe("en-US");
});

test("direct localized loads set the document language", async ({ page }) => {
  await page.goto("/ja/brawlers");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ブロウラー");
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe("ja-JP");
});

test("localized routes emit localized Open Graph and Twitter metadata", async ({ page }) => {
  const response = await page.goto("/en/meta");
  expect(response?.status()).toBe(200);

  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "en_US");
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    "content",
    /Search Brawl Stars players/,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary");
  await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute(
    "content",
    /Search Brawl Stars players/,
  );
});

test("skin filters hydrate from and write back to the shareable URL", async ({ page }) => {
  await page.goto("/skins?q=Shelly&sort=NAME&defaults=show");

  await expect(page.getByRole("searchbox", { name: "스킨 또는 브롤러 검색" })).toHaveValue("Shelly");
  await expect(page.getByRole("combobox", { name: "스킨 정렬", exact: true })).toHaveValue("NAME");
  await expect(page.locator('input[type="checkbox"]')).not.toBeChecked();

  await page.getByRole("searchbox", { name: "스킨 또는 브롤러 검색" }).fill("Colt");
  await expect(page).toHaveURL(/q=Colt/);
});

test("meta filters hydrate from and update the shareable URL", async ({ page }) => {
  await page.route("**/api/meta", async (route) => {
    await route.fulfill({
      json: [
        { mode: "gemGrab", map: "Hard Rock Mine", brawlers: [
          {
            id: 16000000,
            name: "SHELLY",
            plays: 25,
            wins: 15,
            draws: 1,
            winRate: 60,
            score: 50,
            confidence: "HIGH",
            confidenceScore: 80,
          },
        ] },
        { mode: "gemGrab", map: "Double Swoosh", brawlers: [
          {
            id: 16000001,
            name: "COLT",
            plays: 30,
            wins: 18,
            draws: 0,
            winRate: 60,
            score: 52,
            confidence: "HIGH",
            confidenceScore: 90,
          },
        ] },
      ],
    });
  });

  await page.goto("/meta?map=Hard%20Rock%20Mine&min=20&confidence=HIGH&sort=WIN_RATE");
  await expect(page.getByLabel("최소 표본")).toHaveValue("20");
  await expect(page.getByLabel("신뢰도")).toHaveValue("HIGH");
  await expect(page.getByLabel("정렬")).toHaveValue("WIN_RATE");

  await page.getByRole("button", { name: "이중 곡선" }).click();
  await expect(page).toHaveURL(/map=Double\+Swoosh/);
});

test("meta keeps solo showdown selected and separates modes sharing a map", async ({ page }) => {
  const stat = (name: string) => ({
    name,
    plays: 25,
    wins: 15,
    draws: 0,
    winRate: 60,
    score: 50,
    confidence: "HIGH",
    confidenceScore: 80,
  });
  await page.route("**/api/meta", async (route) => {
    await route.fulfill({
      json: [
        { mode: "gemGrab", map: "Hard Rock Mine", brawlers: [stat("COLT")] },
        { mode: "soloShowdown", map: "Rockwall Brawl", brawlers: [stat("SHELLY")] },
        { mode: "soloShowdown", map: "Hard Rock Mine", brawlers: [stat("NITA")] },
      ],
    });
  });

  await page.goto("/meta");
  await page.getByRole("button", { name: "솔로 쇼다운" }).click();
  await expect(page.getByRole("button", { name: "솔로 쇼다운" })).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/gameMode=soloShowdown/);
  await expect(page.getByRole("heading", { name: /바위 장벽 전투.*추천/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "암석 광산" })).toBeVisible();
  await page.getByRole("button", { name: "암석 광산" }).click();
  await expect(page.getByRole("heading", { name: /암석 광산.*추천/ })).toBeVisible();
  await expect(page.getByText("니타", { exact: true })).toBeVisible();
  await expect(page.getByText("콜트", { exact: true })).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "솔로 쇼다운" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("니타", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "바운티" }).click();
  await expect(page.getByRole("button", { name: "바운티" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("status").filter({ hasText: "아직 저장된 맵 데이터가 없습니다." })).toBeVisible();
});

test("meta recommends from the most recently searched player's owned brawlers", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("recentTags", JSON.stringify(["2PYLQ"]));
  });
  await page.route("**/api/meta", async (route) => {
    await route.fulfill({
      json: [
        { mode: "gemGrab", map: "Hard Rock Mine", brawlers: [
          {
            id: 16000000,
            name: "SHELLY",
            plays: 100,
            wins: 70,
            draws: 0,
            winRate: 70,
            score: 66,
            confidence: "HIGH",
            confidenceScore: 100,
          },
          {
            id: 16000001,
            name: "COLT",
            plays: 80,
            wins: 48,
            draws: 0,
            winRate: 60,
            score: 56,
            confidence: "HIGH",
            confidenceScore: 100,
          },
        ] },
      ],
    });
  });
  await page.route("**/api/player?tag=2PYLQ", async (route) => {
    await route.fulfill({
      json: {
        tag: "#2PYLQ",
        name: "Owned Picks Player",
        dataFreshness: { status: "stale", fetchedAt: "2026-10-10T00:00:00Z" },
        trophies: 30000,
        highestTrophies: 31000,
        expLevel: 200,
        "3vs3Victories": 1000,
        soloVictories: 100,
        duoVictories: 100,
        brawlers: [
          {
            id: 16000001,
            name: "COLT",
            power: 11,
            trophies: 850,
            highestTrophies: 900,
          },
        ],
      },
    });
  });

  await page.goto("/meta?map=Hard%20Rock%20Mine");
  const personalized = page
    .getByRole("heading", { level: 3, name: "플레이어 보유 브롤러 추천" })
    .locator("xpath=ancestor::section[1]");
  await expect(personalized).toContainText("Owned Picks Player");
  await expect(personalized).toContainText("외부 서비스의 일시적인 장애로 최근 정상 조회 데이터를 표시합니다.");
  await expect(personalized).toContainText("콜트");
  await expect(personalized).not.toContainText("쉘리");
  await expect(personalized).toContainText("850");
});

test("meta loading and failure states expose assistive roles", async ({ page }) => {
  await page.route("**/api/meta", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({ status: 500, json: { error: "테스트 메타 오류" } });
  });

  await page.goto("/meta");
  await expect(page.getByRole("status")).toContainText("메타 통계를 불러오는 중");
  await expect(page.locator('[role="alert"]').filter({ hasText: "테스트 메타 오류" })).toBeVisible();
});

test("team meta loading and empty states expose status semantics", async ({ page }) => {
  await page.route("**/api/meta/teams?**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({ json: { items: [], maps: [] } });
  });

  await page.goto("/teams");
  await expect(page.getByRole("status")).toContainText("팀 조합을 계산하는 중");
  await expect(page.getByRole("status")).toContainText("아직 충분한 팀 조합 표본이 없습니다.");
});

test("team meta refetches when the selected map changes", async ({ page }) => {
  const requestedUrls: string[] = [];
  await page.route("**/api/meta/teams?**", async (route) => {
    requestedUrls.push(route.request().url());
    await route.fulfill({
      json: {
        items: [
          {
            map: "Hard Rock Mine",
            team: "SHELLY + COLT + NITA",
            plays: 20,
            wins: 12,
            winRate: 60,
            score: 50,
          },
        ],
        maps: ["Hard Rock Mine", "Double Swoosh"],
      },
    });
  });

  await page.goto("/teams");
  const select = page.getByLabel("맵 선택");
  await expect(select).toBeVisible();
  await select.selectOption("Hard Rock Mine");

  await expect.poll(() =>
    requestedUrls.some((url) => url.includes("map=Hard+Rock+Mine")),
  ).toBe(true);
});

test("counter selection hydrates from and updates the shareable URL", async ({ page }) => {
  await page.route("**/api/meta/counters?brawler=*", async (route) => {
    await route.fulfill({ json: { items: [] } });
  });

  await page.goto("/counters?brawler=SHELLY");
  const select = page.getByLabel("브롤러 선택");
  await expect(select).toHaveValue(/SHELLY/i);

  const secondValue = await select.locator("option").nth(1).getAttribute("value");
  expect(secondValue).toBeTruthy();
  await select.selectOption(secondValue!);
  await expect(page).toHaveURL(new RegExp(`brawler=${encodeURIComponent(secondValue!)}`, "i"));
});

test("counter API failures are announced as alerts", async ({ page }) => {
  await page.route("**/api/meta/counters?brawler=*", async (route) => {
    await route.fulfill({ status: 503, json: { error: "테스트 카운터 오류" } });
  });

  await page.goto("/counters?brawler=SHELLY");
  await expect(
    page.locator('[role="alert"]').filter({ hasText: "테스트 카운터 오류" }),
  ).toBeVisible();
});

test("mobile home exposes other features before opening the full menu", async ({ context, page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.addCookies([
    { name: "brawl-locale", value: "ko", url: "http://localhost:3020" },
  ]);

  await page.goto("/");
  const trigger = page.locator('header summary[aria-label="전체 메뉴"]');
  const shortcuts = page.getByRole("navigation", { name: "바로가기", exact: true });
  await expect(shortcuts.getByRole("link", { name: "트롤 박제", exact: true })).toBeVisible();
  await shortcuts.getByRole("link", { name: "트롤 박제", exact: true }).click();
  await expect(page).toHaveURL(/\/community$/);
  await page.goto("/");
  await trigger.click();
  const copy = getMessages("ko").common;
  const navigation = page.getByRole("navigation", { name: copy.mainNavigation });
  await expect(navigation).toBeVisible();
  for (const [path, label] of [["/", copy.home], ["/meta", copy.meta], ["/skins", copy.skins], ["/rankings", copy.rankings]]) {
    const link = navigation.getByRole("link", { name: label, exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", path);
  }
  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("core document routes render their main heading", async ({ page }) => {
  for (const path of ["/about", "/methodology", "/privacy", "/terms", "/contact"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("AdSense stays disabled cleanly when publisher settings are absent", async ({ page, request }) => {
  const adsTxt = await request.get("/ads.txt");
  expect(adsTxt.status()).toBe(404);

  await page.goto("/maps");
  await expect(page.locator(".adsbygoogle")).toHaveCount(0);
});

test("owned-skin endpoint validates player tags before upstream lookup", async ({ request }) => {
  const response = await request.get("/api/player/skins?tag=INVALID!");
  expect(response.status()).toBe(400);
});
