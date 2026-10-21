import { expect, test } from "@playwright/test";
import { getPersonalizedMetaMessages } from "../src/i18n/personalizedMetaMessages";
import { recommendationFreshnessMessages } from "../src/i18n/recommendationFreshnessMessages";
import { localizedHref } from "../src/i18n/config";

const tag = "9C82J8YPP";
const brawlers = [
  { id: 16000000, name: "SHELLY", power: 4, recentPlays: 0 },
  { id: 16000001, name: "COLT", power: 11, recentPlays: 8 },
  { id: 16000002, name: "BULL", power: 9, recentPlays: 2 },
  { id: 16000008, name: "NITA", power: 10, recentPlays: undefined },
  { id: 16000003, name: "BROCK", power: 11, recentPlays: 5 },
  { id: 16000010, name: "EL PRIMO", power: 8, recentPlays: -1 },
  { id: 16000024, name: "ROSA", power: 11, recentPlays: 9 },
];

test.beforeEach(async ({ page }) => {
  await page.route("**/api/account", route => route.fulfill({ json: { state: "guest", syncEnabled: false } }));
  await page.route("**/api/meta", route => route.fulfill({ json: [{ mode: "gemGrab", map: "Hard Rock Mine", brawlers: [
    { id: 16000023, name: "LEON", plays: 100, wins: 80, draws: 0, winRate: 80, score: 90, confidence: "HIGH", confidenceScore: 100, recentPlays: 10 },
    ...brawlers.map((brawler, index) => ({ ...brawler, plays: 100, wins: 60, draws: 0,
      winRate: 60, score: 80 - index * 10, confidence: "HIGH", confidenceScore: 100 })),
  ] }] }));
  await page.route("**/api/player?tag=*", route => route.fulfill({ json: {
    tag: `#${tag}`, name: "Power filter player", brawlers: brawlers.map(brawler => ({ ...brawler, trophies: 500 })),
  } }));
});

for (const [locale, width] of [["ko", 320], ["en", 390], ["de", 320], ["ko", 1280]] as const) {
  test(`owned picks filter by power with compact evidence at ${width}px in ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const copy = getPersonalizedMetaMessages(locale);
    const freshness = recommendationFreshnessMessages[locale];
    const profileRequests: string[] = [];
    page.on("request", request => {
      const url = new URL(request.url());
      if (url.pathname === "/api/player") profileRequests.push(url.searchParams.get("tag") ?? "");
    });
    await page.goto(`${localizedHref(locale, "/meta")}?map=Hard+Rock+Mine&gameMode=gemGrab&tag=${tag}`);
    const region = page.getByRole("region", { name: copy.title, exact: true });
    await expect(region).toContainText("Power filter player");
    const cards = region.locator("li:visible");
    await expect(cards).toHaveCount(width < 600 ? 3 : 5);
    await expect(cards.first().locator("a")).toHaveAttribute("href", localizedHref(locale, "/brawlers/16000000"));
    await expect(cards.first()).toContainText(`${copy.power} 4`);
    await expect(cards.first()).toContainText(copy.lowRecent);
    const recentEvidence = cards.first().locator("dl div").filter({ has: page.getByText(freshness.recent, { exact: true }) });
    await expect(recentEvidence.locator("dd")).toHaveText("0");
    await expect(region.getByText(freshness.sample, { exact: true }).first()).toBeVisible();
    const toggle = region.getByRole("button", { name: copy.showAll.replace("{count}", "7"), exact: true });
    await toggle.click();
    await expect(region.getByRole("button", { name: copy.showLess, exact: true })).toHaveAttribute("aria-expanded", "true");
    await expect(cards).toHaveCount(7);
    const unknown = cards.filter({ has: page.locator(`a[href="${localizedHref(locale, "/brawlers/16000008")}"]`) });
    await expect(unknown.locator("dl dd").last()).toHaveText("—");
    const invalid = cards.filter({ has: page.locator(`a[href="${localizedHref(locale, "/brawlers/16000010")}"]`) });
    await expect(invalid.locator("dl dd").last()).toHaveText("—");
    await region.getByRole("button", { name: copy.showLess, exact: true }).click();
    await expect(cards).toHaveCount(width < 600 ? 3 : 5);
    const requestsBeforeFiltering = profileRequests.length;
    const filter = region.getByRole("combobox", { name: copy.powerFilter, exact: true });
    await filter.selectOption("9");
    await expect(filter).toHaveValue("9");
    await expect(cards).toHaveCount(width < 600 ? 3 : 5);
    await expect(cards.first().locator("a")).toHaveAttribute("href", localizedHref(locale, "/brawlers/16000001"));
    await expect(cards.first()).toContainText(`${copy.score} 70`);
    if (width < 600) await region.getByRole("button", { name: copy.showAll.replace("{count}", "5"), exact: true }).click();
    await expect(cards).toHaveCount(5);
    await expect(region.locator(`a[href="${localizedHref(locale, "/brawlers/16000000")}"]`)).toHaveCount(0);
    await filter.selectOption("11");
    await expect(cards).toHaveCount(3);
    for (const card of await cards.all()) await expect(card).toContainText(`${copy.power} 11`);
    await expect(region.getByRole("button")).toHaveCount(0);
    expect(profileRequests).toHaveLength(requestsBeforeFiltering);
    expect(new URL(page.url()).searchParams.get("tag")).toBe(tag);
    expect(new URL(page.url()).searchParams.get("map")).toBe("Hard Rock Mine");
    expect(new URL(page.url()).searchParams.get("ownedPower")).toBe("11");
    await page.reload();
    await expect(filter).toHaveValue("11");
    await expect(cards).toHaveCount(3);
    expect(profileRequests.every(requestedTag => requestedTag === tag)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const box = (await filter.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  });
}

test("power empty state can reset while preserving the player and map", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.route("**/api/player?tag=*", route => route.fulfill({ json: {
    tag: `#${tag}`, name: "Low power player", brawlers: [{ ...brawlers[0], trophies: 20 }],
  } }));
  await page.goto(`/meta?map=Hard+Rock+Mine&gameMode=gemGrab&tag=${tag}&ownedPower=11`);
  const region = page.getByRole("region", { name: getPersonalizedMetaMessages("ko").title, exact: true });
  await expect(region.getByRole("status")).toHaveText(getPersonalizedMetaMessages("ko").noMatches);
  await region.getByRole("button", { name: "파워 필터 해제", exact: true }).click();
  await expect(region.locator("li:visible")).toHaveCount(1);
  await expect(region.getByRole("combobox", { name: "보유 브롤러 파워", exact: true })).toHaveValue("0");
  expect(new URL(page.url()).searchParams.get("ownedPower")).toBeNull();
  expect(new URL(page.url()).searchParams.get("tag")).toBe(tag);
  expect(new URL(page.url()).searchParams.get("map")).toBe("Hard Rock Mine");
});
