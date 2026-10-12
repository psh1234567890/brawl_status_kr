import { expect, test } from "@playwright/test";

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
