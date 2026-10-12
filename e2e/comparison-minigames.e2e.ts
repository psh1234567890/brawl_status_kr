import { expect, test } from "@playwright/test";

test("ranked comparison panel displays anonymous verified leaderboard but requires opt-in account", async ({ page }) => {
  await page.route("**/api/minigames/competitive/leaderboard?*", route => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({
      gameId: "higher-lower", period: "today",
      items: [{ rank: 1, alias: "Player-ABCD123456", score: 9, total: 10, completedAt: "2026-10-12T01:00:00Z" }],
    }),
  }));
  await page.goto("/en/minigames/higher-lower");
  const ranked = page.getByRole("region", { name: "Server-verified leaderboard" });
  await expect(ranked.getByText("Player-ABCD123456")).toBeVisible();
  await expect(ranked.getByText("9/10")).toBeVisible();
  await expect(ranked.getByRole("button", { name: "Start ranked round" })).toHaveCount(0);
  await expect(ranked.getByText(/Sign in and complete account onboarding/)).toBeVisible();
  await ranked.getByRole("button", { name: "All time" }).click();
  await expect(ranked.getByRole("button", { name: "All time" })).toHaveAttribute("aria-pressed", "true");
});

for (const path of ["higher-lower", "release-order"] as const) {
  test(`comparison minigame ${path} completes an accessible 10-question round`, async ({ page }) => {
    await page.goto("/en/minigames/" + path);
    await expect(page.getByRole("button", { name: "Start game" })).toBeEnabled();
    await page.getByRole("button", { name: "Start game" }).click();

    for (let index = 0; index < 10; index++) {
      const options = page.getByRole("button", { name: /Fixture Brawler \d+/ });
      await expect(options).toHaveCount(2);
      await options.first().click();
      await expect(page.getByRole("status").filter({ hasText: /Correct|Not quite/ })).toBeVisible();
      const next = page.getByRole("button", { name: index === 9 ? "View results" : "Next question" });
      await expect(next).toBeFocused();
      await next.click();
    }
    await expect(page.getByRole("heading", { name: "View results" })).toBeVisible();
    await expect(page.getByText(/10 \/ 10/).first()).toBeVisible();
    await page.getByRole("button", { name: "Play again" }).click();
    await expect(page.getByRole("button", { name: "Start game" })).toBeVisible();
  });
}
