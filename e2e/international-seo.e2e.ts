import { expect, test } from "@playwright/test";
import { localizedLocales, numberLocales } from "../src/i18n/config";
import { getComparisonMessages } from "../src/i18n/playerComparisonMessages";

test("all ten comparison pages expose translated titles, canonical URLs and language links", async ({ page }) => {
  for (const locale of localizedLocales) {
    const path = "/" + locale + "/compare";
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page).toHaveTitle(new RegExp(getComparisonMessages(locale).title));
    await expect(page.locator("meta[name=description]")).toHaveAttribute("content", getComparisonMessages(locale).description);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://www.brawl-o1.site" + path);
    await expect(page.locator('link[rel="alternate"][hreflang="ru"]')).toHaveAttribute("href", "https://www.brawl-o1.site/ru/compare");
    await expect(page.locator("html")).toHaveAttribute("lang", numberLocales[locale]);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(getComparisonMessages(locale).title);
  }
});

test("Russian HTML carries Russian structured data, not Korean product snippets", async ({ page, request }) => {
  const response = await request.get("/ru");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  // An international neutral SSR root avoids falsely identifying Russian
  // content as Korean while the early script sets the exact language.
  expect(html).toContain('<html lang="und"');
  expect(html).toContain('<div lang="ru-RU"');

  await page.goto("/ru");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru-RU");
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  const structured = scripts.map((value) => JSON.parse(value) as {
    "@type": string; name?: string; description?: string; inLanguage?: string | string[];
  });
  const site = structured.find((schema) => schema["@type"] === "WebSite");
  const application = structured.find((schema) => schema["@type"] === "WebApplication");
  expect(site?.inLanguage).toBe("ru-RU");
  expect(site?.description).toMatch(/[А-Яа-яЁё]/);
  expect(application?.name).toBe("Brawl Status KR");
  expect(application?.inLanguage).toContain("ru-RU");
  expect(application?.description).not.toMatch(/[가-힣]/);
});
