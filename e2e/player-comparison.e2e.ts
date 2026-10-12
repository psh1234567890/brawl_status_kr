import { expect, test, type Page } from "@playwright/test";

const alphaTag = "9C82J8YPP";
const betaTag = "2PY";

function makePlayer(tag: string, name: string, trophies: number) {
  return {
    tag: "#" + tag, name, trophies, highestTrophies: trophies + 1000, expLevel: 80,
    "3vs3Victories": Math.floor(trophies / 10), soloVictories: 80, duoVictories: 15,
    rankedRankName: "MYTHIC I", rankedElo: 5200,
    highestAllTimeRankedRankName: "LEGENDARY I", highestAllTimeRankedElo: 8300,
    brawlers: [
      { id: 16000000, name: "SHELLY", power: 11, trophies: 600, highestTrophies: 700,
        gadgets: [], starPowers: [], hyperCharges: [] },
      { id: 16000001, name: "COLT", power: 1, trophies: 500, highestTrophies: 600,
        gadgets: [], starPowers: [], hyperCharges: [] },
    ],
  };
}

async function mockPlayers(page: Page) {
  await page.route(/\/api\/player\?tag=/, async route => {
    const tag = new URL(route.request().url()).searchParams.get("tag");
    if (tag === alphaTag) {
      await route.fulfill({ json: makePlayer(alphaTag, "Alpha User", 50000) });
    } else if (tag === betaTag) {
      await route.fulfill({ json: makePlayer(betaTag, "Beta User", 40000) });
    } else {
      await route.fulfill({ status: 404, json: { error: "NOT_FOUND" } });
    }
  });
}

test("compares two accounts at narrow width and provides normalized share URL", async ({ page }) => {
  await mockPlayers(page);
  await page.setViewportSize({ width: 375, height: 780 });
  await page.goto("/compare");
  await page.getByRole("textbox", { name: "플레이어 A 태그" }).fill("#" + alphaTag);
  await page.getByRole("textbox", { name: "플레이어 B 태그" }).fill(betaTag);
  await page.getByRole("button", { name: "비교하기" }).click();
  await expect(page.getByRole("heading", { name: "Alpha User" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Beta User" })).toBeVisible();
  await expect(page.getByRole("region", { name: "프로필 비교" })).toContainText("50,000");
  await expect(page.getByRole("region", { name: "프로필 비교" })).toContainText("40,000");
  await expect(page.getByRole("region", { name: "프로필 비교" })).toContainText("7,765");
  await expect(page.getByRole("region", { name: "트로피 상위 브롤러" })).toContainText("쉘리");
  await expect(page.getByRole("button", { name: "비교 링크 복사" })).toBeVisible();
  await expect(page).toHaveURL(/\/compare\?a=9C82J8YPP&b=2PY$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("shared comparison link preloads both players without manual submit", async ({ page }) => {
  await mockPlayers(page);
  await page.goto("/en/compare?a=" + alphaTag + "&b=" + betaTag);
  await expect(page.getByRole("heading", { name: "Alpha User" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Beta User" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Player A tag" })).toHaveValue(alphaTag);
  await expect(page.getByRole("textbox", { name: "Player B tag" })).toHaveValue(betaTag);
});

test("rejects invalid or identical tags without making public API requests", async ({ page }) => {
  let requests = 0;
  await page.route(/\/api\/player\?tag=/, async route => {
    requests++;
    await route.fulfill({ status: 404, json: {} });
  });
  await page.goto("/compare");
  await page.getByRole("textbox", { name: "플레이어 A 태그" }).fill("#2PY");
  await page.getByRole("textbox", { name: "플레이어 B 태그" }).fill("2py");
  await page.getByRole("button", { name: "비교하기" }).click();
  await expect(page.locator("form [role='alert']")).toContainText("서로 다른");
  expect(requests).toBe(0);
});

test("shows partial profile if the other side fails", async ({ page }) => {
  await page.route(/\/api\/player\?tag=/, route => {
    const tag = new URL(route.request().url()).searchParams.get("tag");
    return tag === alphaTag
      ? route.fulfill({ json: makePlayer(alphaTag, "Alpha User", 50000) })
      : route.fulfill({ status: 503, json: { error: "upstream down" } });
  });
  await page.goto("/compare?a=" + alphaTag + "&b=" + betaTag);
  await expect(page.getByRole("heading", { name: "Alpha User" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Player B" }).getByRole("alert")).toContainText("503");
  await expect(page.getByRole("region", { name: "프로필 비교" })).toHaveCount(0);
});
