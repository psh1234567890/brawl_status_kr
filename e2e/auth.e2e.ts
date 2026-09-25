import { expect, test } from "./fixtures/auth";

test.skip(!process.env.DATABASE_URL, "Auth integration E2E requires a disposable PostgreSQL database.");

test("Google OAuth starts only with an internal account callback and uses the configured provider", async ({ context }, testInfo) => {
  const origin = String(testInfo.project.use.baseURL);
  const rejected = await context.request.post("/api/auth/sign-in/social", {
    headers: { Origin: origin },
    data: { provider: "google", callbackURL: "https://attacker.invalid/steal" },
  });
  expect(rejected.status()).toBe(400);
  expect((await rejected.json()).error).toBe("INVALID_CALLBACK");

  const unsupported = await context.request.post("/api/auth/sign-up/email", {
    headers: { Origin: origin },
    data: { email: "not-enabled@example.invalid", password: "not-used" },
  });
  expect(unsupported.status()).toBe(404);

  const started = await context.request.post("/api/auth/sign-in/social", {
    headers: { Origin: origin },
    data: {
      provider: "google",
      callbackURL: "/account",
      errorCallbackURL: "/account",
      newUserCallbackURL: "/account",
      disableRedirect: true,
    },
  });
  expect(started.status()).toBe(200);
  const body = await started.json() as { url?: unknown };
  expect(typeof body.url).toBe("string");
  const authorizationUrl = new URL(body.url as string);
  expect(authorizationUrl.protocol).toBe("https:");
  expect(authorizationUrl.hostname).toBe("accounts.google.com");
  expect(authorizationUrl.searchParams.get("redirect_uri")).toBe(`${origin}/api/auth/callback/google`);
  expect(authorizationUrl.searchParams.get("response_type")).toBe("code");
  expect(authorizationUrl.searchParams.get("state")).toBeTruthy();
  expect(authorizationUrl.searchParams.get("code_challenge")).toBeTruthy();
  expect(authorizationUrl.searchParams.get("code_challenge_method")).toBe("S256");
});

test("an existing session must sign out before starting another Google session", async ({ context, syntheticAccount }, testInfo) => {
  const origin = String(testInfo.project.use.baseURL);
  const response = await context.request.post("/api/auth/sign-in/social", {
    headers: { Origin: origin },
    data: { provider: "google", callbackURL: "/account", disableRedirect: true },
  });
  expect(response.status()).toBe(409);
  expect((await response.json()).error).toBe("ALREADY_SIGNED_IN");
  expect(syntheticAccount.userId).toHaveLength(36);
});

test("deletion reauthentication asks Google for a fresh account authentication", async ({ context, syntheticAccount }, testInfo) => {
  const origin = String(testInfo.project.use.baseURL);
  const reauth = await context.request.post("/api/account/deletion/reauth", {
    headers: { Origin: origin },
    data: { expectedUserId: syntheticAccount.userId, callbackURL: "/en/account" },
  });
  expect(reauth.status()).toBe(200);

  const started = await context.request.post("/api/auth/sign-in/social", {
    headers: { Origin: origin },
    data: {
      provider: "google",
      callbackURL: "/en/account",
      errorCallbackURL: "/en/account",
      newUserCallbackURL: "/en/account",
      disableRedirect: true,
    },
  });
  expect(started.status()).toBe(200);
  const body = await started.json() as { url?: unknown };
  const authorizationURL = new URL(body.url as string);
  expect(authorizationURL.searchParams.get("prompt")).toBe("select_account");
  expect(authorizationURL.searchParams.get("max_age")).toBe("0");
  expect(authorizationURL.searchParams.get("state")).toBeTruthy();
  expect(authorizationURL.searchParams.get("code_challenge_method")).toBe("S256");
});
