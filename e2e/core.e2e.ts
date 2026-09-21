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
  await page.goto("/skins");
  await page.getByRole("combobox", { name: "언어" }).selectOption("en");

  await expect(page).toHaveURL(/\/en\/skins$/);
  await expect(page.getByRole("heading", { level: 1, name: "Skin Catalog" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe("en-US");
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
