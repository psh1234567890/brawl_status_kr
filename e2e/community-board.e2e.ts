import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { getCommunityMessages } from "../src/i18n/communityMessages";
import { getCommunityImageMessages } from "../src/i18n/communityImageMessages";
import type { Locale } from "../src/i18n/config";

const userId = "00000000-0000-4000-8000-000000000001";
const postId = "00000000-0000-4000-8000-000000000002";
const photoId = "00000000-0000-4000-8000-000000000003";
const commentId = "00000000-0000-4000-8000-000000000004";
const fixture = { id: postId, postId, alias: "Loop-000000000001", createdAt: "2026-10-19T00:00:00Z", status: "published", isOwner: false, kind: null, revision: 0, moderationNote: "", commentCount: 0, filtered: false, evidenceUrls: [], images: [], title: "A community question", body: "What is your favourite brawler?", locale: "en" };

for (const { locale, width, photo } of [
  { locale: "ko", width: 390, photo: true }, { locale: "de", width: 320, photo: false }, { locale: "en", width: 1280, photo: false },
] satisfies { locale: Locale; width: number; photo: boolean }[]) {
  test(`ordinary community writing and comments at ${locale} ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    const copy = getCommunityMessages(locale);
    const photos = getCommunityImageMessages(locale);
    const prefix = locale === "ko" ? "" : `/${locale}`;
    let submitted = false;
    let commented = false;
    let entry = { ...fixture, locale, images: [] as { id: string; width: number; height: number }[] };
    const image = await sharp({ create: { width: 320, height: 160, channels: 3, background: "#ffdc62" } }).png().toBuffer();
    await page.route("**/api/account", route => route.fulfill({ json: { state: "account", syncEnabled: false, account: { id: userId, nickname: "Preview member", defaultPlayerTag: null, profileRevision: 1, onboardingComplete: true, onboardingCompletedAt: "2026-10-19T00:00:00Z", policyReady: true } } }));
    await page.route("**/api/community/images", route => route.fulfill({ status: 201, json: { id: photoId, width: 320, height: 160 } }));
    await page.route(`**/api/community/images/${photoId}`, route => route.fulfill({ contentType: "image/png", body: image }));
    await page.route("**/api/community/posts?*", route => route.fulfill({ json: { posts: [entry], hasMore: false } }));
    await page.route("**/api/community/posts", async route => {
      const data = route.request().postDataJSON();
      expect(data.confirmIntent).toBeUndefined();
      expect(data.acceptRules).toBe(true);
      expect(data.evidenceUrls).toEqual([]);
      expect(data.imageIds).toEqual(photo ? [photoId] : []);
      entry = { ...entry, title: data.title, body: data.body, images: photo ? [{ id: photoId, width: 320, height: 160 }] : [] };
      submitted = true;
      await route.fulfill({ status: 201, json: { id: postId, status: "published" } });
    });
    await page.route(`**/api/community/posts/${postId}?*`, route => route.fulfill({ json: { post: entry, comments: commented ? [{ ...fixture, id: commentId, body: "Nice!", kind: "opinion", title: "", locale }] : [], hasMoreComments: false } }));
    await page.route(`**/api/community/posts/${postId}/comments`, async route => {
      const data = route.request().postDataJSON();
      expect(data.kind).toBe("opinion");
      expect(data.body).toBe("Nice!");
      expect(data.acceptRules).toBe(true);
      commented = true;
      await route.fulfill({ status: 201, json: { id: commentId, status: "published" } });
    });
    await page.goto(`${prefix}/community/new`);
    await page.getByRole("textbox", { name: copy.titleLabel, exact: true }).fill(entry.title);
    const body = page.getByRole("textbox", { name: copy.bodyLabel, exact: true });
    await body.fill(entry.body);
    await expect(page.locator('input[type="checkbox"], select[name="kind"]')).toHaveCount(0);
    if (photo) {
      await page.getByLabel(photos.add, { exact: true }).setInputFiles({ name: "preview.png", mimeType: "image/png", buffer: image });
      await expect(page.getByRole("img", { name: `${photos.alt} 1`, exact: true })).toBeVisible();
    }
    const pickerBox = await page.locator("fieldset").boundingBox();
    const bodyBox = await body.boundingBox();
    expect(pickerBox!.y + pickerBox!.height).toBeLessThanOrEqual(bodyBox!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`new-post-${locale}-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: copy.submitPost, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/community/${postId}$`));
    expect(submitted).toBe(true);
    const article = page.locator("article").first();
    await expect(article.getByRole("heading", { name: entry.title, exact: true })).toBeVisible();
    if (photo) {
      const postedPhoto = await article.locator("img").boundingBox();
      const postedBody = await article.getByText(entry.body, { exact: true }).boundingBox();
      expect(postedPhoto!.y + postedPhoto!.height).toBeLessThanOrEqual(postedBody!.y);
    }
    await page.getByRole("textbox", { name: copy.commentLabel, exact: true }).fill("Nice!");
    await page.getByRole("button", { name: copy.submitComment, exact: true }).click();
    await expect(page.getByText("Nice!", { exact: true })).toBeVisible();
    expect(commented).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`post-${locale}-${width}.png`), fullPage: true });
    await page.goto(`${prefix}/community`);
    await expect(page.getByRole("link", { name: new RegExp(entry.title) })).toBeVisible();
    await expect(page.getByText(entry.body, { exact: true })).toHaveCount(0);
  });
}
