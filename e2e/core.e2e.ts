import { expect, test } from "@playwright/test";

test("skin catalog filters client-side", async ({ page }) => {
  await page.goto("/skins");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("브롤스타즈 스킨 도감");
  const articles = page.locator("article");
  expect(await articles.count()).toBeGreaterThan(0);

  await page.getByRole("searchbox", { name: "스킨 또는 브롤러 검색" }).fill("__NO_SKIN_MATCH__");
  await expect(page.getByText("조건에 맞는 스킨이 없습니다.")).toBeVisible();
  await expect(articles).toHaveCount(0);
});

test("language switcher preserves the current localized route", async ({ page }) => {
  await page.goto("/skins?q=colt&sort=NAME");
  await page.getByRole("combobox", { name: "언어" }).selectOption("en");

  await expect(page).toHaveURL(/\/en\/skins\?q=colt&sort=NAME$/);
  await expect(page.getByRole("heading", { level: 1, name: "Skin Catalog" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe("en-US");
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
      json: {
        "Hard Rock Mine": [
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
        ],
        "Double Swoosh": [
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
        ],
      },
    });
  });

  await page.goto("/meta?map=Hard%20Rock%20Mine&min=20&confidence=HIGH&sort=WIN_RATE");
  await expect(page.getByLabel("최소 표본")).toHaveValue("20");
  await expect(page.getByLabel("신뢰도")).toHaveValue("HIGH");
  await expect(page.getByLabel("정렬")).toHaveValue("WIN_RATE");

  await page.getByRole("button", { name: "이중 곡선" }).click();
  await expect(page).toHaveURL(/map=Double\+Swoosh/);
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
    { name: "brawl-locale", value: "ko", url: "http://127.0.0.1:3020" },
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
