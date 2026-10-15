import { Pool } from "pg";
import sharp from "sharp";
import { expect, test } from "./fixtures/auth";

test.skip(!process.env.DATABASE_URL, "Community E2E requires the disposable account database.");
if (process.env.DATABASE_URL) {
  const target = new URL(process.env.DATABASE_URL);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) || !target.pathname.endsWith("_test")) throw new Error("Community E2E only accepts an isolated loopback test database.");
}

test("guests can read the community but cannot submit posts or comments", async ({ page, context }, testInfo) => {
  const origin = String(testInfo.project.use.baseURL);
  await page.goto("/en/community");
  await expect(page.getByRole("heading", { level: 1, name: "Match reports", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Published posts", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.getByRole("link", { name: "Write a post", exact: true }).click();
  await expect(page.getByText("Sign up and sign in to write posts or comments.", { exact: true })).toBeVisible();
  await expect(page.locator('input[name="title"]')).toHaveCount(0);
  for (const url of ["/api/community/posts", "/api/community/images", "/api/community/posts/00000000-0000-4000-8000-000000000001/comments"]) {
    const response = await context.request.post(url, { headers: { Origin: origin }, data: {} });
    expect(response.status()).toBe(401);
  }
});

test("registered posts and comments publish immediately without writing quotas or length rules", async ({ page, context, browser, syntheticAccount }, testInfo) => {
  test.setTimeout(45_000);
  const origin = String(testInfo.project.use.baseURL);
  const title = "Synthetic report " + syntheticAccount.userId.slice(0, 8);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const anonymous = await browser.newContext();
  try {
    // Invalid evidence still gets a useful validation error.
    for (let attempt = 0; attempt < 4; attempt++) {
      const invalid = await context.request.post("/api/community/posts", { headers: { Origin: origin }, data: { expectedUserId: syntheticAccount.userId, title, body: "Synthetic test evidence context, not an actual report.", locale: "en", evidenceUrls: ["https://example.invalid/evidence.png"], acceptRules: true, confirmIntent: true } });
      expect(invalid.status()).toBe(400);
      expect(await invalid.json()).toMatchObject({ error: "INVALID_EVIDENCE" });
    }
    await page.goto("/en/community/new");
    await page.getByRole("textbox", { name: "Title", exact: true }).fill("");
    await page.locator('textarea[name="body"]').fill("글");
    await page.locator('textarea[name="evidence"]').fill("https://youtu.be/abcdefghijk");
    await page.locator('input[name="confirmIntent"]').check();
    await page.locator('input[name="acceptRules"]').check();
    await page.getByRole("button", { name: "Publish post", exact: true }).click();
    await expect(page.locator("form").getByRole("alert")).toHaveText("Enter a title.");
    await expect(page.getByRole("textbox", { name: "Title", exact: true })).toBeFocused();
    await expect(page.getByRole("textbox", { name: "Title", exact: true })).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator('textarea[name="body"]')).toHaveValue("글");
    for (const control of await page.locator('input[name="title"], textarea[name="body"]').all()) {
      await expect(control).not.toHaveAttribute("minlength");
      await expect(control).not.toHaveAttribute("maxlength");
    }
    await page.getByRole("textbox", { name: "Title", exact: true }).fill(title);
    // A real file picker, canvas normalization, server decoding and private
    // object read. All bytes and allegations are synthetic, in the CI database.
    const image = await sharp({ create: { width: 300, height: 150, channels: 3, background: "#5842ce" } }).png().toBuffer();
    const upload = page.waitForResponse(response => response.url().endsWith("/api/community/images") && response.request().method() === "POST");
    await page.getByLabel("Choose photos", { exact: true }).setInputFiles({ name: "synthetic-evidence.png", mimeType: "image/png", buffer: image });
    const uploadResponse = await upload;
    expect(uploadResponse.status()).toBe(201);
    const uploaded = await uploadResponse.json();
    await expect(page.getByRole("img", { name: "Attached evidence photo 1", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove photo 1", exact: true })).toBeVisible();
    expect((await anonymous.request.get(origin + "/api/community/images/" + uploaded.id)).status()).toBe(404);
    // Draft photos stay private until they are attached to a published post.
    const ownImage = await context.request.get("/api/community/images/" + uploaded.id);
    expect(ownImage.status()).toBe(200);
    expect(ownImage.headers()["cache-control"]).toContain("private, no-store");
    await page.locator('textarea[name="evidence"]').fill("");
    await page.getByRole("button", { name: "Publish post", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/community\/[a-f0-9-]{36}$/);
    await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Post published.");
    const id = new URL(page.url()).pathname.split("/").at(-1)!;
    expect((await anonymous.request.get(origin + "/api/community/posts/" + id)).status()).toBe(200);
    expect((await anonymous.request.get(origin + "/api/community/images/" + uploaded.id)).status()).toBe(200);
    const body = { expectedUserId: syntheticAccount.userId, kind: "post", id, revision: 0, status: "published", note: "Synthetic evidence review" };
    expect((await context.request.patch("/api/admin/community", { headers: { Origin: origin }, data: body })).status()).toBe(404);

    // Only this isolated test account is granted the existing administrator role.
    await pool.query("CREATE SCHEMA IF NOT EXISTS analytics_private");
    await pool.query("CREATE TABLE IF NOT EXISTS analytics_private.usage_admin_allowlist (user_id uuid PRIMARY KEY)");
    await pool.query("INSERT INTO analytics_private.usage_admin_allowlist (user_id) VALUES ($1)", [syntheticAccount.userId]);
    await page.goto("/admin/community");
    const review = page.locator("article").filter({ has: page.getByRole("heading", { name: "글: " + title, exact: true }) });
    await review.getByLabel("검토 사유", { exact: true }).fill("Synthetic evidence reviewed for the test");
    await review.getByRole("button", { name: "처리", exact: true }).click();
    await expect(review).toHaveCount(0);
    expect((await anonymous.request.get(origin + "/api/community/posts/" + id)).status()).toBe(404);
    expect((await anonymous.request.get(origin + "/api/community/images/" + uploaded.id)).status()).toBe(404);
    await page.getByLabel("검토 상태", { exact: true }).selectOption("hidden");
    await review.getByLabel("검토 사유", { exact: true }).fill("Synthetic post restored after a moderation check");
    await review.getByRole("button", { name: "처리", exact: true }).click();
    await expect(review).toHaveCount(0);
    expect((await anonymous.request.get(origin + "/api/community/posts/" + id)).status()).toBe(200);
    expect((await anonymous.request.get(origin + "/api/community/images/" + uploaded.id)).status()).toBe(200);

    await page.goto("/en/community/" + id);
    await page.locator('select[name="kind"]').selectOption("correction");
    const correction = "x";
    await page.locator('textarea[name="body"]').fill(correction);
    await page.locator('input[name="acceptRules"]').check();
    await page.getByRole("button", { name: "Post comment", exact: true }).click();
    await expect(page.getByText("Comment published.", { exact: true })).toBeVisible();
    await expect(page.getByText(correction, { exact: true })).toBeVisible();
    const published = await (await anonymous.request.get(origin + "/api/community/posts/" + id)).json();
    expect(published.comments).toHaveLength(1);
    expect(published.comments[0]).toMatchObject({ kind: "correction", body: correction, status: "published" });
    expect(JSON.stringify(published)).not.toContain(syntheticAccount.userId);
    expect(JSON.stringify(published)).not.toContain(syntheticAccount.email);
    await context.request.delete("/api/community/posts/" + id, { headers: { Origin: origin }, data: { expectedUserId: syntheticAccount.userId } });
    expect((await anonymous.request.get(origin + "/api/community/images/" + uploaded.id)).status()).toBe(404);
  } finally {
    await anonymous.close().catch(() => undefined);
    await pool.query("DELETE FROM analytics_private.usage_admin_allowlist WHERE user_id = $1", [syntheticAccount.userId]).catch(() => undefined);
    await pool.end();
  }
});

test("members can exceed former quotas and publish text beyond former length boundaries", async ({ context, request, syntheticAccount }, testInfo) => {
  test.setTimeout(45_000);
  const headers = { Origin: String(testInfo.project.use.baseURL) };
  let postId = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await context.request.post("/api/community/posts", { headers, data: {
      expectedUserId: syntheticAccount.userId, title: attempt ? "한" : "t".repeat(120),
      body: attempt ? "글" : "글".repeat(4500), locale: "en", evidenceUrls: ["https://youtu.be/abcdefghijk"], acceptRules: true, confirmIntent: true,
    } });
    expect(response.status()).toBe(201);
    const post = await response.json();
    expect(post.status).toBe("published");
    if (!attempt) postId = post.id;
  }
  for (let attempt = 0; attempt < 21; attempt++) {
    const response = await context.request.post("/api/community/posts/" + postId + "/comments", { headers, data: {
      expectedUserId: syntheticAccount.userId, body: attempt ? "네" : "c".repeat(2500), kind: "opinion", acceptRules: true,
    } });
    expect(response.status()).toBe(201);
  }
  const published = await (await request.get("/api/community/posts/" + postId)).json();
  expect(published.post).toMatchObject({ title: "t".repeat(120), body: "글".repeat(4500), status: "published" });
  expect(published.comments).toHaveLength(21);
  expect(published.comments.every((entry: { status: string }) => entry.status === "published")).toBe(true);
  expect(published.comments.some((entry: { body: string }) => entry.body === "c".repeat(2500))).toBe(true);
});

test("an unfinished signup cannot write through the API", async ({ context, syntheticAccount }, testInfo) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    await pool.query("UPDATE public.auth_users SET onboarding_completed_at = NULL WHERE id = $1", [syntheticAccount.userId]);
    const response = await context.request.post("/api/community/posts", { headers: { Origin: String(testInfo.project.use.baseURL) }, data: { expectedUserId: syntheticAccount.userId } });
    expect(response.status()).toBe(428);
    expect(await response.json()).toMatchObject({ error: "ONBOARDING_REQUIRED" });
  } finally { await pool.end(); }
});
