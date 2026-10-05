import { expect, test, type Page } from "@playwright/test";
import { locales, localizedHref } from "../src/i18n/config";
import { getMinigameMessages } from "../src/i18n/minigameMessages";
import { brawlerQuizGuideMessages } from "../src/i18n/minigames/brawlerQuizGuideMessages";

test.use({ locale: "ko-KR" });

const onePixelPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/TioAAAAASUVORK5CYII=", "base64");

async function stabilizeRandom(page: Page) {
  await page.addInitScript(() => { Math.random = () => 0; });
}

async function mockBrawlifyImages(page: Page, failFirstImage = false) {
  let failed = false;
  await page.route("**/_next/image**", async (route) => {
    const source = new URL(route.request().url()).searchParams.get("url") ?? "";
    if (!source.includes("cdn.brawlify.com")) return route.continue();
    if (failFirstImage && !failed) {
      failed = true;
      return route.abort("failed");
    }
    return route.fulfill({ status: 200, contentType: "image/png", body: onePixelPng });
  });
  await page.route("https://cdn.brawlify.com/**", async (route) => {
    if (failFirstImage && !failed) {
      failed = true;
      return route.abort("failed");
    }
    return route.fulfill({ status: 200, contentType: "image/png", body: onePixelPng });
  });
}

test("quiz images load directly from the CDN without hosting transformations", async ({ page }) => {
  const transformationRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/_next/image") {
      transformationRequests.push(request.url());
    }
  });
  await mockBrawlifyImages(page);
  for (const [path, imagePath] of [
    ["silhouette-quiz", "/brawlers/model/"],
    ["map-quiz", "/maps/"],
  ]) {
    await page.goto(`/minigames/${path}`);
    await page.getByRole("button", { name: "게임 시작", exact: true }).click();
    const image = page.locator(`img[src^="https://cdn.brawlify.com${imagePath}"]`).first();
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((element: HTMLImageElement) =>
      element.complete && element.naturalWidth > 0,
    )).toBe(true);
  }
  expect(transformationRequests).toEqual([]);
  // Also reject manually requested transformations, not just the generated markup.
  const response = await page.request.get("/_next/image?url=%2Ffavicon.ico&w=64&q=75");
  expect(response.status()).toBe(404);
});

test("homepage shortcut opens a six-card hub with four playable games", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: getMinigameMessages("ko").quizTitle })).toHaveAttribute("href", "/minigames/brawler-quiz");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole("complementary").getByRole("link", { name: /미니게임/ }).click();
  await expect(page).toHaveURL(/\/minigames$/);
  await expect(page.getByRole("heading", { level: 1, name: "브롤스타즈 미니게임" })).toBeVisible();
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(6);
  await expect(cards.nth(0).getByRole("heading", { name: "나는 브롤러 종류를 100가지 이상 알고있다" })).toBeVisible();
  await expect(cards.nth(1).getByRole("heading", { name: "브롤러 실루엣 퀴즈" })).toBeVisible();
  await expect(cards.nth(2).getByRole("heading", { name: "하이어 오어 로어" })).toBeVisible();
  await expect(cards.nth(3).getByRole("heading", { name: "맵 이름 맞히기" })).toBeVisible();
  await expect(cards.nth(4).getByRole("heading", { name: "가젯·스타파워 주인 맞히기" })).toBeVisible();
  await expect(cards.nth(5).getByRole("heading", { name: "브롤러 출시 순서" })).toBeVisible();
  await expect(cards.getByRole("link", { name: "게임 시작" })).toHaveCount(4);
  await expect(cards.nth(2).getByRole("link")).toHaveCount(0);
  await cards.nth(0).getByRole("link", { name: "게임 시작" }).click();
  await expect(page).toHaveURL(/\/minigames\/brawler-quiz$/);
});

test("name quiz is readable by crawlers without JavaScript in all ten languages", async ({ browser, baseURL, request }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, locale: "ko-KR", baseURL });
  const page = await context.newPage();
  try {
    for (const locale of locales) {
      const path = localizedHref(locale, "/minigames/brawler-quiz");
      const copy = getMinigameMessages(locale);
      const guide = brawlerQuizGuideMessages[locale];
      const canonical = "https://www.brawl-o1.site" + path;
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.quizTitle);
      await expect(page).toHaveTitle(copy.quizTitle + " | " + guide.searchLabel + " | Brawl Status KR");
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", copy.quizMetaDescription);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical);
      await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(10);
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", copy.quizTitle + " | " + guide.searchLabel + " | Brawl Status KR");
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://www.brawl-o1.site/images/minigames/brawler-quiz-100.png");
      await expect(page.getByRole("heading", { level: 2, name: guide.title, exact: true })).toBeVisible();
      await expect(page.getByText(guide.rules, { exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: guide.catalogLink, exact: true })).toHaveAttribute("href", localizedHref(locale, "/brawlers"));
      expect(await page.locator('script[type="application/ld+json"]').allTextContents()).toEqual(expect.arrayContaining([
        expect.stringContaining('"@type":"BreadcrumbList"'),
      ]));
      expect(await page.locator('meta[name="robots"]').getAttribute("content")).not.toContain("noindex");
    }
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBe(true);
    const xml = await sitemap.text();
    for (const locale of locales) expect(xml).toContain("<loc>https://www.brawl-o1.site" + localizedHref(locale, "/minigames/brawler-quiz") + "</loc>");
    const image = await request.get("/images/minigames/brawler-quiz-100.png");
    expect(image.ok()).toBe(true);
    expect(image.headers()["content-type"]).toContain("image/png");
  } finally {
    await context.close();
  }
});

test("existing name quiz remains playable and keeps its personal best", async ({ page }) => {
  await mockBrawlifyImages(page);
  await page.goto("/minigames/brawler-quiz");
  await expect(page.getByRole("button", { name: "게임 시작" })).toBeVisible();
  await expect(page.getByText(/전체 브롤러 \d+명/)).toBeVisible();
  await page.getByRole("button", { name: "게임 시작" }).click();
  const answer = page.getByRole("textbox", { name: "브롤러 이름" });
  await expect(answer).toBeFocused();
  await answer.fill("쉘리");
  await answer.press("Enter");
  await expect(page.getByRole("progressbar", { name: "맞힌 브롤러" })).toHaveAttribute("aria-valuenow", "1");
  await expect(page.getByRole("list", { name: "맞힌 브롤러" })).toBeVisible();

  await answer.fill("shelly");
  await answer.press("Enter");
  await expect(page.getByRole("progressbar", { name: "맞힌 브롤러" })).toHaveAttribute("aria-valuenow", "1");
  await expect(page.getByText("이미 맞힌 브롤러입니다.")).toBeVisible();
  await answer.fill("__NOT_A_BRAWLER__");
  await answer.press("Enter");
  await expect(page.getByRole("progressbar", { name: "맞힌 브롤러" })).toHaveAttribute("aria-valuenow", "1");
  await expect(page.getByText("명단에 없는 이름입니다. 다시 시도해 보세요.")).toBeVisible();
  await expect(page.getByRole("region", { name: "놓친 브롤러" })).toHaveCount(0);
  await page.getByRole("button", { name: "포기하고 결과 보기" }).click();
  await expect(page.getByRole("heading", { name: "도전 결과" })).toBeVisible();
  await expect(page.getByRole("region", { name: "놓친 브롤러" })).toBeVisible();
  await expect(page.getByRole("button", { name: "다시 도전" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("brawl-status:minigames:brawler-quiz:v1:best") ?? "{}")["5m"]?.found)).toBe(1);
  await page.reload();
  await expect(page.getByText(/최고 기록: 1 \/ \d+ \(/)).toBeVisible();
});

for (const shareMethod of ["native", "clipboard"] as const) {
  test(`renamed quiz shares its result with a canonical link using ${shareMethod}`, async ({ page }) => {
    await page.addInitScript((method) => {
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: method === "native" ? async (data: ShareData) => {
          Object.assign(window, { sharedQuizResult: data });
        } : undefined,
      });
      Object.defineProperty(navigator.clipboard, "writeText", {
        configurable: true,
        value: async (text: string) => { Object.assign(window, { sharedQuizResult: text }); },
      });
    }, shareMethod);
    await page.goto("/minigames/brawler-quiz");
    await page.getByRole("button", { name: "게임 시작", exact: true }).click();
    await page.getByRole("textbox", { name: "브롤러 이름", exact: true }).fill("쉘리");
    await page.getByRole("textbox", { name: "브롤러 이름", exact: true }).press("Enter");
    await page.getByRole("button", { name: "포기하고 결과 보기", exact: true }).click();
    await page.getByRole("button", { name: "결과 공유", exact: true }).click();
    const result = await page.evaluate(() => Reflect.get(window, "sharedQuizResult"));
    if (shareMethod === "native") {
      expect(result).toMatchObject({
        title: "나는 브롤러 종류를 100가지 이상 알고있다",
        text: expect.stringMatching(/나는 브롤러 종류를 100가지 이상 알고있다: 1\//),
        url: "https://www.brawl-o1.site/minigames/brawler-quiz",
      });
    } else {
      expect(result).toContain("나는 브롤러 종류를 100가지 이상 알고있다: 1/");
      expect(result).toContain("\nhttps://www.brawl-o1.site/minigames/brawler-quiz");
    }
  });
}

test("silhouette quiz accepts the exact brawler name and can finish early", async ({ page }) => {
  await stabilizeRandom(page);
  await mockBrawlifyImages(page);
  await page.goto("/minigames/silhouette-quiz");
  await expect(page.getByText(/출제 가능한 기본 브롤러 12명/)).toBeVisible();
  await page.getByRole("button", { name: "게임 시작" }).click();
  const answer = page.getByRole("textbox", { name: "브롤러 이름" });
  await expect(answer).toBeFocused();
  await answer.fill("COLT");
  await answer.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "정답입니다." })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  await page.getByRole("button", { name: "다음 문제" }).click();
  await expect(answer).toBeFocused();
  await answer.fill("NITA");
  await answer.press("Enter");
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
  await page.getByRole("button", { name: "여기서 종료" }).click();
  await expect(page.getByRole("heading", { name: "결과 보기" })).toBeVisible();
  await expect(page.getByText("2문제를 완료하고 도전을 마쳤습니다.")).toBeVisible();
  await expect(page.getByText("최고 기록: 0 / 10 (0%)")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "다시 도전" })).toBeVisible();
});

test("silhouette image failure skips that image without scoring it", async ({ page }) => {
  await stabilizeRandom(page);
  await mockBrawlifyImages(page, true);
  await page.goto("/minigames/silhouette-quiz");
  await page.getByRole("button", { name: "게임 시작" }).click();
  await expect(page.getByRole("textbox", { name: "브롤러 이름" })).toBeFocused();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  const answer = page.getByRole("textbox", { name: "브롤러 이름" });
  await answer.fill("NITA");
  await answer.press("Enter");
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
});

test("map quiz locks an answer, scores once, and shows the answer recap", async ({ page }) => {
  await stabilizeRandom(page);
  await mockBrawlifyImages(page);
  await page.goto("/minigames/map-quiz");
  await expect(page.getByText(/맵 \d+개/)).toBeVisible();
  await page.getByRole("button", { name: "게임 시작" }).click();
  const answer = page.getByRole("button", { name: "Fixture Map 02" });
  await expect(answer).toBeEnabled();
  await answer.click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  await expect(page.getByRole("button", { name: "Fixture Map 02" })).toBeDisabled();
  await page.getByRole("button", { name: "여기서 종료" }).click();
  await expect(page.getByRole("heading", { name: "결과 보기" })).toBeVisible();
  await expect(page.getByText("Fixture Map 02")).toBeVisible();
});

test("ability quiz filters modes and awards one point for the owning brawler", async ({ page }) => {
  await stabilizeRandom(page);
  await page.goto("/minigames/ability-quiz");
  await expect(page.getByText(/능력 \d+개/)).toBeVisible();
  await page.getByRole("button", { name: "게임 시작" }).click();
  await expect(page.getByText("Fixture Gadget 02")).toBeVisible();
  await page.getByRole("button", { name: "콜트" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  await expect(page.getByRole("status").filter({ hasText: "정답입니다." })).toBeVisible();
  await page.getByRole("button", { name: "여기서 종료" }).click();
  await expect(page.getByRole("heading", { name: "결과 보기" })).toBeVisible();
  await expect(page.getByText("Fixture Gadget 02")).toBeVisible();
});

test("localized English quiz renders translated controls and accepts English answers", async ({ page }) => {
  await mockBrawlifyImages(page);
  await page.goto("/en/minigames/brawler-quiz");
  await expect(page.getByRole("heading", { level: 1, name: getMinigameMessages("en").quizTitle })).toBeVisible();
  await page.getByRole("button", { name: "Start game" }).click();
  const answer = page.getByRole("textbox", { name: "Brawler name" });
  await answer.fill("SHELLY");
  await answer.press("Enter");
  await expect(page.getByRole("progressbar", { name: "Brawlers found" })).toHaveAttribute("aria-valuenow", "1");
});

test("blocked game routes are localized, informational, and excluded from search", async ({ page }) => {
  await page.goto("/en/minigames/higher-lower");
  await expect(page.getByRole("heading", { level: 1, name: "Higher or Lower" })).toBeVisible();
  await expect(page.getByText("Data pending")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start game" })).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('link[hreflang="en"]')).toHaveCount(0);
});
