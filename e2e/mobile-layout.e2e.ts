import { expect, test } from "@playwright/test";

const routes = [
  "/", "/events", "/meta", "/maps", "/gamemodes", "/brawlers",
  "/minigames", "/minigames/brawler-quiz", "/minigames/silhouette-quiz",
  "/minigames/higher-lower", "/minigames/map-quiz",
  "/skins", "/clubs", "/rankings", "/teams", "/counters",
  "/status", "/account", "/about", "/privacy",
] as const;

for (const width of [320, 375, 768]) {
  test(`public navigation fits the ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 760 });
    for (const pathname of routes) {
      const response = await page.goto(pathname, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `HTTP response for ${pathname}`).toBe(200);
      await expect(page.locator("main").first()).toBeVisible();
      const overflow = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        page: document.documentElement.scrollWidth,
      }));
      expect(overflow.page, `horizontal overflow ${pathname}: ${JSON.stringify(overflow)}`)
        .toBeLessThanOrEqual(overflow.viewport + 1);
      const navigation = page.locator('nav[aria-label]').filter({ has: page.locator('a[href="/events"]') });
      if (await navigation.count()) {
        const navigationTargets = await navigation.locator("a").evaluateAll((links) =>
          links.map((link) => link.getBoundingClientRect().height),
        );
        expect(
          navigationTargets.every((height) => height >= 43.5),
          `undersized menu targets on ${pathname}`,
        ).toBe(true);
      }
      const languageSwitcher = page.locator('header select[aria-label]').first();
      if (await languageSwitcher.count()) {
        expect((await languageSwitcher.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
}
