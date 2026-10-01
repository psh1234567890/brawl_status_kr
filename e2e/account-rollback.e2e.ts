import { expect, seedVerifiedDeletionSession, test } from "./fixtures/auth";

test.skip(!process.env.DATABASE_URL, "Account rollback E2E requires a disposable PostgreSQL database.");
test.skip(process.env.ACCOUNTS_MODE !== "off", "Run this suite with ACCOUNTS_MODE=off.");
test.skip(process.env.ACCOUNT_DELETION_ONLY !== "1", "Run this suite with ACCOUNT_DELETION_ONLY=1.");

test("rollback keeps only existing-account deletion reauthentication available", async ({ context, syntheticAccount }, testInfo) => {
  const origin = String(testInfo.project.use.baseURL);
  const status = await context.request.get("/api/account", { headers: { Origin: origin } });
  expect(status.status()).toBe(200);
  expect(await status.json()).toMatchObject({
    state: "deletion-only",
    deletionUserId: syntheticAccount.userId,
    deletionReauthReady: false,
    syncEnabled: false,
  });

  const regularSignIn = await context.request.post("/api/auth/sign-in/social", {
    headers: { Origin: origin },
    data: { provider: "google", callbackURL: "/account", disableRedirect: true },
  });
  expect(regularSignIn.status()).toBe(404);

  const profileWrite = await context.request.patch("/api/account/profile", {
    headers: { Origin: origin },
    data: {
      expectedUserId: syntheticAccount.userId,
      expectedRevision: 1,
      nickname: "Not enabled",
      defaultPlayerTag: null,
    },
  });
  expect(profileWrite.status()).toBe(404);

  const unverifiedDelete = await context.request.delete("/api/account", {
    headers: { Origin: origin },
    data: { expectedUserId: syntheticAccount.userId, confirmation: true },
  });
  expect(unverifiedDelete.status()).toBe(403);

  const reauth = await context.request.post("/api/account/deletion/reauth", {
    headers: { Origin: origin },
    data: { expectedUserId: syntheticAccount.userId, callbackURL: "/en/account" },
  });
  expect(reauth.status()).toBe(200);
  const started = await context.request.post("/api/auth/sign-in/social", {
    headers: { Origin: origin },
    data: { provider: "google", callbackURL: "/en/account", disableRedirect: true },
  });
  expect(started.status()).toBe(200);
  const body = await started.json() as { url: string };
  expect(new URL(body.url).searchParams.get("prompt")).toBe("select_account");
  expect(new URL(body.url).searchParams.get("max_age")).toBe("0");
});

test("a verified existing account can finish deletion while account features are off", async ({ context, syntheticAccount }, testInfo) => {
  const origin = String(testInfo.project.use.baseURL);
  await seedVerifiedDeletionSession(context, syntheticAccount, origin);

  const status = await context.request.get("/api/account", { headers: { Origin: origin } });
  expect(await status.json()).toMatchObject({
    state: "deletion-only",
    deletionUserId: syntheticAccount.userId,
    deletionReauthReady: true,
    syncEnabled: false,
  });

  const deletion = await context.request.delete("/api/account", {
    headers: { Origin: origin },
    data: { expectedUserId: syntheticAccount.userId, confirmation: true },
  });
  expect(deletion.status()).toBe(200);
  expect(await deletion.json()).toEqual({ deleted: true });

  const after = await context.request.get("/api/account", { headers: { Origin: origin } });
  expect(await after.json()).toMatchObject({
    state: "deletion-only",
    deletionUserId: null,
    deletionReauthReady: false,
    syncEnabled: false,
  });
});

test("a signed-out visitor can only discover an already-linked Google account for deletion", async ({ context, syntheticAccount }, testInfo) => {
  const origin = String(testInfo.project.use.baseURL);
  await context.clearCookies();

  const status = await context.request.get("/api/account", { headers: { Origin: origin } });
  expect(await status.json()).toMatchObject({
    state: "deletion-only",
    deletionUserId: null,
    deletionReauthReady: false,
    syncEnabled: false,
  });

  const reauth = await context.request.post("/api/account/deletion/reauth", {
    headers: { Origin: origin },
    data: { callbackURL: "/en/account" },
  });
  expect(reauth.status()).toBe(200);
  const started = await context.request.post("/api/auth/sign-in/social", {
    headers: { Origin: origin },
    data: { provider: "google", callbackURL: "/en/account", disableRedirect: true },
  });
  expect(started.status()).toBe(200);
  const body = await started.json() as { url: string };
  expect(new URL(body.url).searchParams.get("prompt")).toBe("select_account");
  expect(new URL(body.url).searchParams.get("max_age")).toBe("0");
  expect(syntheticAccount.googleSubject).toContain("ci-google-sub-");
});
