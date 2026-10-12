import { expect, test } from "@playwright/test";

const accountId = "11111111-1111-4111-8111-111111111111";
const account = {
  state: "account", syncEnabled: false,
  account: {
    id: accountId, nickname: "Site Operator", defaultPlayerTag: null,
    profileRevision: 1, onboardingCompletedAt: "2026-10-01T00:00:00.000Z",
    onboardingComplete: true, policyReady: true,
    eligibilityPolicyTexts: null, eligibilityRules: null, policyVersions: null,
  },
};

test("authorized owner gets dashboard shortcut in main and catalog header", async ({ page, context }) => {
  await context.addCookies([{ name: "brawl-locale", value: "ko", url: "http://localhost:3020" }]);
  await page.route("**/api/account", route => route.fulfill({ json: account }));
  let permissionChecks = 0;
  await page.route("**/api/admin/access", route => {
    permissionChecks++;
    return route.fulfill({ status: 204 });
  });
  await page.setViewportSize({ width: 375, height: 780 });
  await page.goto("/");
  const admin = page.getByRole("link", { name: "운영자 대시보드" });
  await expect(admin).toBeVisible();
  await expect(admin).toHaveAttribute("href", "/admin/usage");
  expect(permissionChecks).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.goto("/brawlers");
  await expect(page.getByRole("link", { name: "운영자 대시보드" })).toBeVisible();
});

test("signed-in non-admin never gets a dashboard link", async ({ page, context }) => {
  await context.addCookies([{ name: "brawl-locale", value: "ko", url: "http://localhost:3020" }]);
  await page.route("**/api/account", route => route.fulfill({ json: account }));
  await page.route("**/api/admin/access", route => route.fulfill({ status: 404, json: { error: "NOT_FOUND" } }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "계정 메뉴: Site Operator" })).toBeVisible();
  await expect(page.getByRole("link", { name: "운영자 대시보드" })).toHaveCount(0);
});

test("guest does not request admin permissions or see a dashboard link", async ({ page, context }) => {
  await context.addCookies([{ name: "brawl-locale", value: "ko", url: "http://localhost:3020" }]);
  await page.route("**/api/account", route => route.fulfill({
    json: { state: "guest", syncEnabled: false, signInPolicy: null },
  }));
  let probes = 0;
  await page.route("**/api/admin/access", route => {
    probes++;
    return route.fulfill({ status: 404 });
  });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "로그인", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "운영자 대시보드" })).toHaveCount(0);
  expect(probes).toBe(0);
});

test("dashboard shortcut disappears on account change even when its permission check is slow", async ({ page, context }) => {
  await context.addCookies([{ name: "brawl-locale", value: "ko", url: "http://localhost:3020" }]);
  let currentAccount = account;
  await page.route("**/api/account", route => route.fulfill({ json: currentAccount }));
  await page.route("**/api/admin/access", route => route.fulfill({ status: 204 }));
  await page.goto("/");
  await expect(page.getByRole("link", { name: "운영자 대시보드" })).toBeVisible();
  currentAccount = { ...account, account: { ...account.account, id: "22222222-2222-4222-8222-222222222222", nickname: "Normal User" } };
  await page.route("**/api/admin/access", route => route.fulfill({ status: 404 }));
  await page.reload();
  await expect(page.getByRole("button", { name: "계정 메뉴: Normal User" })).toBeVisible();
  await expect(page.getByRole("link", { name: "운영자 대시보드" })).toHaveCount(0);
});
