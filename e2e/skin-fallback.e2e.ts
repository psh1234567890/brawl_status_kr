import { expect, test } from "@playwright/test";

test("skin provider error keeps equipped baseline but labels the partial coverage", async ({ context, page }) => {
  await context.addCookies([{ name: "brawl-locale", value: "ko", url: "http://localhost:3020" }]);
  await page.route(/\/api\/player\?tag=/, route => route.fulfill({
    json: {
      tag: "#9C82J8YPP", name: "Skin Fallback", trophies: 1234,
      highestTrophies: 1400, expLevel: 20, "3vs3Victories": 10,
      soloVictories: 5, duoVictories: 6,
      brawlers: [{
        id: 16000000, name: "SHELLY", trophies: 500, highestTrophies: 550, power: 11,
        skin: { id: 29000000, name: "STAR SHELLY" },
        gadgets: [], starPowers: [], hyperCharges: [], gears: [],
      }],
    },
  }));
  await page.route(/\/api\/player\/matches\?tag=/, route => route.fulfill({ json: { items: [], storageStatus: "saved" } }));
  await page.route(/\/api\/player\/db-stats\?tag=/, route => route.fulfill({ json: { totalGames: 0, brawlers: [] } }));
  await page.route(/\/api\/player\/history\?tag=/, route => route.fulfill({ json: { totalTrackedGames: 0, daily: [], topModes: [], topMaps: [] } }));
  await page.route(/\/api\/player\/skins\?tag=/, route => route.fulfill({ status: 502, json: { error: "provider unavailable" } }));

  await page.goto("/");
  await page.getByRole("textbox", { name: "플레이어 태그" }).fill("9C82J8YPP");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Skin Fallback", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "브롤러", exact: true }).click();
  await page.getByRole("button", { name: "보유 스킨 조회", exact: true }).click();
  await expect(page.getByText("보유 스킨 일부 미표시")).toBeVisible();
  await expect(page.getByRole("button", { name: "다시 조회" })).toBeEnabled();
  await expect(page.getByText("착용만 확인")).toBeVisible();
  await page.getByRole("button", { name: /쉘리.*상세/ }).click();
  await expect(page.getByText("보조 조회에 실패해 공식 API에서 제공되는 스킨만 표시합니다.")).toBeVisible();
  await expect(page.getByText("현재 착용", { exact: true })).toBeVisible();
});
