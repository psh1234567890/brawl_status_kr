import { expect, test } from "@playwright/test";

const tag = "9C82J8YPP";
const profile = {
  tag: `#${tag}`,
  name: "Progressive Player",
  trophies: 12345,
  highestTrophies: 13000,
  expLevel: 50,
  "3vs3Victories": 100,
  soloVictories: 20,
  duoVictories: 30,
  brawlers: [],
};

test("profile is interactive before slow battle and history requests complete", async ({ context, page }) => {
  await context.addCookies([{ name: "brawl-locale", value: "ko", url: "http://localhost:3020" }]);
  let releaseBattle: (() => void) | undefined;
  let releaseHistory: (() => void) | undefined;
  await page.route(/\/api\/player\?tag=/, (route) => route.fulfill({ json: profile }));
  await page.route(/\/api\/player\/matches\?tag=/, async (route) => {
    await new Promise<void>((resolve) => { releaseBattle = resolve; });
    await route.fulfill({ json: { items: [], storageStatus: "saved" } }).catch(() => {});
  });
  await page.route(/\/api\/player\/history\?tag=/, async (route) => {
    await new Promise<void>((resolve) => { releaseHistory = resolve; });
    await route.fulfill({ json: { totalTrackedGames: 0, daily: [], topModes: [], topMaps: [] } }).catch(() => {});
  });
  await page.route(/\/api\/player\/db-stats\?tag=/, (route) => route.fulfill({ json: { totalGames: 0, brawlers: [] } }));

  try {
    await page.goto("/");
    await page.getByRole("textbox", { name: "플레이어 태그" }).fill(tag);
    await page.getByRole("button", { name: "검색", exact: true }).click();

    // An outstanding battle API must not stop the name or profile tabs rendering.
    await expect(page.getByRole("heading", { level: 1, name: "Progressive Player" })).toBeVisible();
    await expect(page.getByRole("button", { name: "검색", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "전투", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "전투" })).toBeVisible();
    await expect.poll(() => Boolean(releaseBattle)).toBe(true);
    releaseBattle?.();
    await expect(page.getByRole("status").filter({ hasText: "전투" })).toHaveCount(0);

    await page.getByRole("button", { name: "누적", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "누적" })).toBeVisible();
    await expect.poll(() => Boolean(releaseHistory)).toBe(true);
    releaseHistory?.();
    await expect(page.getByRole("status").filter({ hasText: "누적" })).toHaveCount(0);
  } finally {
    releaseBattle?.();
    releaseHistory?.();
  }
});
