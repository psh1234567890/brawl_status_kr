import { expect, test } from "@playwright/test";
import { getAccountMessages } from "../src/i18n/accountMessages";
import { locales, localizedHref } from "../src/i18n/config";

test("home header exposes localized account entry without mobile overflow", async ({ context, page }) => {
  await context.route("**/api/account", (route) => route.fulfill({
    json: { state: "guest", syncEnabled: false },
  }));
  await context.addCookies([{ name: "brawl-locale", value: "ko", url: "http://localhost:3020" }]);
  await page.setViewportSize({ width: 320, height: 740 });

  for (const locale of locales) {
    await page.goto(localizedHref(locale, "/"));
    const login = page.locator("header").getByRole("link", { name: getAccountMessages(locale).navLogin, exact: true });
    await expect(login).toBeVisible();
    await expect(login).toHaveAttribute("href", localizedHref(locale, "/account"));
    expect((await login.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/en");
  await page.locator("header").getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/account$/);
  await expect(page.getByRole("button", { name: "Continue with Google", exact: true })).toBeVisible();
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
    await page.waitForLoadState("networkidle");
    expect(bestReads).toBe(2);
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
  await expect.poll(async () => (await articles.count()) > 0 || await page.getByText("조건에 맞는 브롤러가 없습니다.").isVisible()).toBe(true);
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
  await expect(page.locator("select").nth(4)).toHaveValue("NAME");
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

test("mobile quick navigation is visible on a phone-sized viewport", async ({ context, page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.addCookies([
    { name: "brawl-locale", value: "ko", url: "http://localhost:3020" },
  ]);

  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "모바일 빠른 이동" });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole("link", { name: "홈" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "추천" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "스킨" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "랭킹" })).toBeVisible();
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
