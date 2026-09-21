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

test("owned-skin auxiliary lookup stays disabled without explicit operator opt-in", async ({ request }) => {
  const response = await request.get("/api/player/skins?tag=2PYLQ");
  expect(response.status()).toBe(503);
  await expect(response.json()).resolves.toMatchObject({
    error: "보유 스킨 목록을 불러오지 못했습니다.",
  });
});
