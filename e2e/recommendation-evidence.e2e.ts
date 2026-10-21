import { expect, test } from "@playwright/test";
import { recommendationEvidenceMessages } from "../src/i18n/recommendationEvidenceMessages";
import { recommendationFreshnessMessages } from "../src/i18n/recommendationFreshnessMessages";
import type { Locale } from "../src/i18n/config";

for (const { locale, width } of [
  { locale: "ko", width: 320 }, { locale: "en", width: 390 }, { locale: "de", width: 320 },
] satisfies { locale: Locale; width: number }[]) {
  test(`recommendation evidence is readable at ${locale} ${width}px`, async ({ page }, testInfo) => {
    const copy = recommendationEvidenceMessages[locale];
    const freshness = recommendationFreshnessMessages[locale];
    await page.setViewportSize({ width, height: 844 });
    await page.route("**/api/meta", route => route.fulfill({
      headers: { "x-meta-refreshed-at": "2026-10-18T12:00:00.000Z" },
      json: [{ mode: "brawlBall", map: "Backyard Bowl", brawlers: [
        { id: 16000000, name: "SHELLY", plays: 5, wins: 5, draws: 0, winRate: 100, score: 50, confidence: "LOW", confidenceScore: 10, recentPlays: 5, lastBattleAt: "2026-10-18T11:00:00.000Z" },
        { id: 16000001, name: "COLT", plays: 100, wins: 60, draws: 0, winRate: 60, score: 57, confidence: "HIGH", confidenceScore: 100, recentPlays: 0, lastBattleAt: "2026-10-09T11:00:00.000Z" },
      ] }],
    }));
    await page.goto(`${locale === "ko" ? "" : `/${locale}`}/meta?map=Backyard+Bowl&gameMode=brawlBall`);
    const card = page.locator("article").filter({ hasText: copy.low });
    await expect(card.getByText(copy.low, { exact: true })).toBeVisible();
    await expect(page.locator("time[datetime='2026-10-18T12:00:00.000Z']")).toBeVisible();
    const oldCard = page.locator("article").filter({ hasText: freshness.low });
    await expect(oldCard.getByText(freshness.sample, { exact: true })).toBeVisible();
    await expect(oldCard.getByText(freshness.low, { exact: true })).toBeVisible();
    await expect(oldCard.locator("dl").filter({ hasText: freshness.recent })).toContainText("0");
    await expect(oldCard.locator("time[datetime='2026-10-09T11:00:00.000Z']")).toBeVisible();
    await expect(card.locator("time[datetime='2026-10-18T11:00:00.000Z']")).toContainText("20");
    const summary = card.locator("summary");
    await expect(summary).toHaveText(copy.why);
    const box = await summary.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await summary.click();
    await expect(card.getByText(copy.method, { exact: true })).toBeVisible();
    await expect(card.getByText(freshness.explanation, { exact: true })).toBeVisible();
    await expect(card.getByText(copy.limits, { exact: true })).toBeVisible();
    await expect(card.getByText(new RegExp(`${copy.interval.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:`))).toContainText(/57.*100/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await card.screenshot({ path: testInfo.outputPath(`evidence-${locale}-${width}.png`) });
    await oldCard.screenshot({ path: testInfo.outputPath(`old-evidence-${locale}-${width}.png`) });
  });
}

test("missing recency metadata does not invent recent counts or warnings", async ({ page }) => {
  const freshness = recommendationFreshnessMessages.ko;
  await page.route("**/api/meta", route => route.fulfill({ json: [{ mode: "brawlBall", map: "Backyard Bowl", brawlers: [
    { id: 16000001, name: "COLT", plays: 100, wins: 60, draws: 0, winRate: 60, score: 57, confidence: "HIGH", confidenceScore: 100 },
  ] }] }));
  await page.goto("/meta?map=Backyard+Bowl&gameMode=brawlBall");
  await expect(page.locator("article")).toHaveCount(1);
  await expect(page.getByText(freshness.recent, { exact: true })).toHaveCount(0);
  await expect(page.getByText(freshness.low, { exact: true })).toHaveCount(0);
});
