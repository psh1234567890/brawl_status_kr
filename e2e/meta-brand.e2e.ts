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

test("meta preserves an unsampled rotation map instead of recommending for another map", async ({ page, context }) => {
  await context.addCookies([{ name: "brawl-locale", value: "ko", url: "http://localhost:3020" }]);
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
  await page.route("**/api/meta", route => route.fulfill({
    json: [
      { mode: "gemGrab", map: "Hard Rock Mine", brawlers: [stat("COLT")] },
      { mode: "brawlBall", map: "Super Beach", brawlers: [stat("SHELLY")] },
    ],
  }));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/meta?map=Uncollected+Rotation+Map&gameMode=brawlBall&min=999&confidence=invalid&sort=invalid");

  await expect(page.getByText("선택한 맵에는 아직 충분한 표본이 없습니다.", { exact: true })).toBeVisible();
  await expect(page.getByText("Uncollected Rotation Map", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "브롤 볼", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "슈퍼 해변", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("main article")).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("map")).toBe("Uncollected Rotation Map");

  await page.getByRole("button", { name: "슈퍼 해변", exact: true }).click();
  await expect(page.getByText("쉘리", { exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "최소 표본", exact: true })).toHaveValue("5");
  await expect(page.getByRole("combobox", { name: "신뢰도", exact: true })).toHaveValue("ALL");
  await expect(page.getByRole("combobox", { name: "정렬", exact: true })).toHaveValue("SCORE");

  await page.getByRole("button", { name: "젬 그랩", exact: true }).click();
  await expect(page.getByText("콜트", { exact: true })).toBeVisible();
  await expect(page.getByText("쉘리", { exact: true })).not.toBeVisible();
  expect(new URL(page.url()).searchParams.get("gameMode")).toBe("gemGrab");
});
