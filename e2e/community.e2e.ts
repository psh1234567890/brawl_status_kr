import { Pool } from "pg";
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
  for (const url of ["/api/community/posts", "/api/community/posts/00000000-0000-4000-8000-000000000001/comments"]) {
    const response = await context.request.post(url, { headers: { Origin: origin }, data: {} });
    expect(response.status()).toBe(401);
  }
});

test("registered submissions and corrections stay private until administrator review", async ({ page, context, browser, syntheticAccount }, testInfo) => {
  const origin = String(testInfo.project.use.baseURL);
  const title = "Synthetic report " + syntheticAccount.userId.slice(0, 8);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const anonymous = await browser.newContext();
  try {
    await page.goto("/en/community/new");
    await page.getByRole("textbox", { name: "Title", exact: true }).fill(title);
    await page.locator('textarea[name="body"]').fill("Synthetic test evidence context; this is not an actual player report.");
    await page.locator('textarea[name="evidence"]').fill("https://youtu.be/abcdefghijk");
    await page.locator('input[name="confirmIntent"]').check();
    await page.locator('input[name="acceptRules"]').check();
    await page.getByRole("button", { name: "Submit for review", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/community\/[a-f0-9-]{36}$/);
    await expect(page.getByText("Pending review", { exact: true })).toBeVisible();
    const id = new URL(page.url()).pathname.split("/").at(-1)!;
    expect((await anonymous.request.get(origin + "/api/community/posts/" + id)).status()).toBe(404);
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
    expect((await anonymous.request.get(origin + "/api/community/posts/" + id)).status()).toBe(200);

    await page.goto("/en/community/" + id);
    await page.locator('select[name="kind"]').selectOption("correction");
    const correction = "Synthetic correction: the previous action is missing from the clip.";
    await page.locator('textarea[name="body"]').fill(correction);
    await page.locator('input[name="acceptRules"]').check();
    await page.getByRole("button", { name: "Submit comment for review", exact: true }).click();
    await expect(page.getByText("Comment submitted for moderator review.", { exact: true })).toBeVisible();
    await expect(page.getByText(correction, { exact: true })).toBeVisible();
    const beforeReview = await (await anonymous.request.get(origin + "/api/community/posts/" + id)).json();
    expect(beforeReview.comments).toEqual([]);
    await page.goto("/admin/community");
    const correctionReview = page.locator("article").filter({ hasText: correction });
    await correctionReview.getByLabel("검토 사유", { exact: true }).fill("Synthetic correction reviewed for the test");
    await correctionReview.getByRole("button", { name: "처리", exact: true }).click();
    await expect(correctionReview).toHaveCount(0);
    const published = await (await anonymous.request.get(origin + "/api/community/posts/" + id)).json();
    expect(published.comments).toHaveLength(1);
    expect(published.comments[0]).toMatchObject({ kind: "correction", body: correction, status: "published" });
    expect(JSON.stringify(published)).not.toContain(syntheticAccount.userId);
    expect(JSON.stringify(published)).not.toContain(syntheticAccount.email);
  } finally {
    await anonymous.close();
    await pool.query("DELETE FROM analytics_private.usage_admin_allowlist WHERE user_id = $1", [syntheticAccount.userId]).catch(() => undefined);
    await pool.end();
  }
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
