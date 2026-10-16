import { expect, test } from "@playwright/test";

test("meta dashboard keeps branded controls usable across phone and desktop widths", async ({ page, context }) => {
  await context.addCookies([{ name: "brawl-locale", value: "ko", url: "http://localhost:3020" }]);
  await page.route("**/api/meta", route => route.fulfill({
    json: [{
      mode: "gemGrab",
      map: "Hard Rock Mine",
      brawlers: [{
        id: 16000000,
        name: "SHELLY",
        plays: 25,
        wins: 15,
        draws: 0,
        winRate: 60,
        score: 50,
        confidence: "HIGH",
        confidenceScore: 80,
      }],
    }],
  }));

  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/meta");

    await expect(page.getByRole("heading", { level: 1, name: "브롤스타즈 맵별 추천 브롤러" })).toBeVisible();
    await expect(page.locator("main > div > header > div")).toHaveCSS("background-color", "rgb(255, 223, 107)");

    const selectedMode = page.getByRole("button", { name: "젬 그랩", exact: true });
    await expect(selectedMode).toHaveAttribute("aria-pressed", "true");
    expect((await selectedMode.boundingBox())?.height).toBeGreaterThanOrEqual(44);

    for (const name of ["최소 표본", "신뢰도", "정렬"]) {
      const control = page.getByRole("combobox", { name, exact: true });
      await expect(control).toBeVisible();
      expect((await control.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }

    await expect(page.getByText("쉘리", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
