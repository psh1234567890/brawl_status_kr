import { expect, test } from "@playwright/test";
import { getMessages } from "../src/i18n/messages";

for (const locale of ["ko", "en"] as const) {
  test(`privacy page in ${locale} lets visitors exclude future analytics without consent for search`, async ({ page, context }) => {
    const privacyPath = locale === "ko" ? "/privacy" : "/en/privacy";
    const homePath = locale === "ko" ? "/" : "/en";
    await page.goto(homePath);
    // The search page never asks visitors to consent to normal tag analytics.
    await expect(page.getByText("운영자에게 검색 진단 정보 공유 (선택)")).toHaveCount(0);
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(0);

    await page.goto(privacyPath);
    const control = page.getByRole("checkbox", {
      name: locale === "ko"
        ? "방문·검색·미니게임 통계 및 검색 태그 기록 제외"
        : "Exclude visits, searches, minigames and searched player tags",
    });
    await expect(control).toBeVisible();
    await expect(control).not.toBeChecked();

    await control.check();
    await expect(control).toBeChecked();
    expect((await context.cookies()).some((cookie) =>
      cookie.name === "brawl_analytics_opt_out" && cookie.value === "1"
    )).toBe(true);

    await page.reload();
    await expect(control).toBeChecked();
    await control.uncheck();
    expect((await context.cookies()).some((cookie) =>
      cookie.name === "brawl_analytics_opt_out" && cookie.value === "1"
    )).toBe(false);

    await page.goto(homePath);
    await expect(page.getByRole("textbox", {
      name: getMessages(locale).home.playerTag,
    })).toBeVisible();
  });
}
