import { createHmac, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { expect, seedVerifiedDeletionSession, test } from "./fixtures/auth";

test.skip(!process.env.DATABASE_URL, "Account integration E2E requires a disposable PostgreSQL database.");

test("account page remains optional and private account APIs return a safe DTO", async ({ page, context, syntheticAccount }, testInfo) => {
  await page.goto("/en/account");
  await expect(page.getByRole("heading", { name: /account/i })).toBeVisible();
  await expect(page).toHaveTitle(/Account/i);
  const robots = await page.locator('meta[name="robots"]').getAttribute("content");
  expect(robots).toContain("noindex");

  const origin = String(testInfo.project.use.baseURL);
  const response = await context.request.get("/api/account", { headers: { Origin: origin } });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.state).toBe("account");
  expect(body.account.id).toBe(syntheticAccount.userId);
  expect(body.account.nickname).toMatch(/^CI-/);
  expect(JSON.stringify(body)).not.toContain(syntheticAccount.email);
  expect(JSON.stringify(body)).not.toContain(syntheticAccount.sessionToken);
  expect(response.headers()["cache-control"]).toContain("private, no-store");
});

test("account navigation is keyboard accessible and the account page fits a narrow viewport", async ({ page, syntheticAccount }) => {
  expect(syntheticAccount.userId).toHaveLength(36);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/account");
  const trigger = page.locator('button[aria-haspopup="menu"][aria-label*="CI-"]');
  await expect(trigger).toBeVisible();
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("profile writes normalize tags, use optimistic revision, and enforce account scope", async ({ context, syntheticAccount }, testInfo) => {
  const origin = String(testInfo.project.use.baseURL);
  const changed = await context.request.patch("/api/account/profile", {
    headers: { Origin: origin },
    data: {
      expectedUserId: syntheticAccount.userId,
      expectedRevision: 1,
      nickname: "  CI Player  ",
      defaultPlayerTag: " #2py ",
    },
  });
  expect(changed.status()).toBe(200);
  expect((await changed.json()).account).toMatchObject({ nickname: "CI Player", defaultPlayerTag: "2PY", profileRevision: 2 });

  const mismatch = await context.request.patch("/api/account/profile", {
    headers: { Origin: origin },
    data: {
      expectedUserId: randomUUID(),
      expectedRevision: 2,
      nickname: "Other account",
      defaultPlayerTag: null,
    },
  });
  expect(mismatch.status()).toBe(403);
  expect((await mismatch.json()).error).toBe("ACCOUNT_MISMATCH");
});

test("Mini Game cloud PB writes are monotonic, idempotent, and account scoped", async ({ context, syntheticAccount }, testInfo) => {
  const origin = String(testInfo.project.use.baseURL);
  const write = (operationId: string, score: number, total: number) => context.request.post("/api/account/minigame-bests", {
    headers: { Origin: origin },
    data: {
      operationId,
      expectedUserId: syntheticAccount.userId,
      rulesetVersion: 1,
      candidate: { gameId: "brawler-quiz", mode: "3m", rulesetVersion: 1, score, total, clientRecordedAt: "not-a-date" },
    },
  });

  const arbitraryRuleset = await context.request.post("/api/account/minigame-bests", {
    headers: { Origin: origin },
    data: {
      operationId: randomUUID(),
      expectedUserId: syntheticAccount.userId,
      rulesetVersion: 2,
      candidate: { gameId: "map-quiz", mode: "standard", rulesetVersion: 2, score: 9, total: 10, clientRecordedAt: null },
    },
  });
  expect(arbitraryRuleset.status()).toBe(400);
  expect((await arbitraryRuleset.json()).error).toBe("INVALID_RULESET_VERSION");

  const mismatchedRuleset = await context.request.post("/api/account/minigame-bests", {
    headers: { Origin: origin },
    data: {
      operationId: randomUUID(),
      expectedUserId: syntheticAccount.userId,
      rulesetVersion: 2,
      candidate: { gameId: "map-quiz", mode: "standard", rulesetVersion: 1, score: 9, total: 10, clientRecordedAt: null },
    },
  });
  expect(mismatchedRuleset.status()).toBe(400);
  expect((await mismatchedRuleset.json()).error).toBe("INVALID_RULESET");

  const operationId = randomUUID();
  const first = await write(operationId, 9, 10);
  expect(first.status()).toBe(200);
  expect((await first.json()).personalBests[0]).toMatchObject({ score: 9, total: 10, clientRecordedAt: null, revision: 1 });

  const retry = await write(operationId, 9, 10);
  expect(retry.status()).toBe(200);
  expect((await retry.json()).personalBests[0].revision).toBe(1);

  const conflict = await write(operationId, 10, 10);
  expect(conflict.status()).toBe(409);
  expect((await conflict.json()).error).toBe("IDEMPOTENCY_CONFLICT");

  const stale = await write(randomUUID(), 8, 10);
  expect(stale.status()).toBe(200);
  expect((await stale.json()).personalBests[0]).toMatchObject({ score: 9, total: 10, revision: 1 });

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    await pool.query(
      "UPDATE public.account_sync_receipts SET created_at = now() - interval '2 seconds', expires_at = now() - interval '1 second' WHERE user_id = $1 AND operation_id = $2",
      [syntheticAccount.userId, operationId],
    );
  } finally {
    await pool.end();
  }
  const expiredReplay = await write(operationId, 9, 10);
  expect(expiredReplay.status()).toBe(200);
  expect((await expiredReplay.json()).personalBests[0]).toMatchObject({ score: 9, total: 10, revision: 1 });

  const betterEquivalentRatio = await write(randomUUID(), 90, 100);
  expect(betterEquivalentRatio.status()).toBe(200);
  expect((await betterEquivalentRatio.json()).personalBests[0]).toMatchObject({ score: 90, total: 100, revision: 2 });
  const exactTie = await write(randomUUID(), 90, 100);
  expect(exactTie.status()).toBe(200);
  expect((await exactTie.json()).personalBests[0]).toMatchObject({ score: 90, total: 100, revision: 2 });

  const checkPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  let constraintCode: string | undefined;
  try {
    await checkPool.query(
      "INSERT INTO public.minigame_personal_bests (user_id, game_id, mode, ruleset_version, score, total, source) VALUES ($1, 'map-quiz', 'standard', 2, 8, 10, 'client_play')",
      [syntheticAccount.userId],
    );
  } catch (error) {
    constraintCode = error && typeof error === "object" && "code" in error
      ? String(error.code)
      : undefined;
  } finally {
    await checkPool.end();
  }
  expect(constraintCode).toBe("23514");
});

test("concurrent Mini Game improvements converge on the best score", async ({ context, syntheticAccount }, testInfo) => {
  const origin = String(testInfo.project.use.baseURL);
  const write = (score: number) => context.request.post("/api/account/minigame-bests", {
    headers: { Origin: origin },
    data: {
      operationId: randomUUID(),
      expectedUserId: syntheticAccount.userId,
      rulesetVersion: 1,
      candidate: { gameId: "map-quiz", mode: "standard", rulesetVersion: 1, score, total: 10, clientRecordedAt: null },
    },
  });
  const responses = await Promise.all([write(8), write(10)]);
  expect(responses.every((response) => response.status() === 200)).toBe(true);
  const final = await context.request.get("/api/account/minigame-bests", { headers: { Origin: origin } });
  expect(final.status()).toBe(200);
  expect((await final.json()).personalBests).toContainEqual(expect.objectContaining({
    gameId: "map-quiz",
    mode: "standard",
    score: 10,
    total: 10,
  }));
});

test("account deletion requires explicit confirmation and invalidates the session", async ({ context, syntheticAccount }, testInfo) => {
  const origin = String(testInfo.project.use.baseURL);
  await seedVerifiedDeletionSession(context, syntheticAccount, origin);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    await pool.query(
      "UPDATE public.auth_accounts SET account_id = $2 WHERE user_id = $1 AND provider_id = 'google'",
      [syntheticAccount.userId, "different-google-subject"],
    );
    const differentGoogleAccount = await context.request.delete("/api/account", {
      headers: { Origin: origin },
      data: { expectedUserId: syntheticAccount.userId, confirmation: true },
    });
    expect(differentGoogleAccount.status()).toBe(403);
    expect((await differentGoogleAccount.json()).error).toBe("FRESH_GOOGLE_SIGN_IN_REQUIRED");
    await pool.query(
      "UPDATE public.auth_accounts SET account_id = $2 WHERE user_id = $1 AND provider_id = 'google'",
      [syntheticAccount.userId, syntheticAccount.googleSubject],
    );

    await pool.query(
      "INSERT INTO public.minigame_personal_bests (user_id, game_id, mode, ruleset_version, score, total, source) VALUES ($1, 'brawler-quiz', '3m', 1, 8, 10, 'client_play')",
      [syntheticAccount.userId],
    );
    await pool.query(
      "INSERT INTO public.account_sync_receipts (user_id, operation_id, payload_hash, expires_at) VALUES ($1, $2, $3, now() + interval '7 days')",
      [syntheticAccount.userId, randomUUID(), "a".repeat(64)],
    );
    const response = await context.request.delete("/api/account", {
      headers: { Origin: origin },
      data: { expectedUserId: syntheticAccount.userId, confirmation: true },
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ deleted: true });
    const account = await context.request.get("/api/account", { headers: { Origin: origin } });
    expect((await account.json()).state).toBe("guest");
    const remaining = await pool.query<{
      users: string;
      accounts: string;
      sessions: string;
      personal_bests: string;
      receipts: string;
      tombstones: string;
      safety_ledger: string;
    }>(
      "SELECT (SELECT count(*) FROM public.auth_users WHERE id = $1) AS users, (SELECT count(*) FROM public.auth_accounts WHERE user_id = $1) AS accounts, (SELECT count(*) FROM public.auth_sessions WHERE user_id = $1) AS sessions, (SELECT count(*) FROM public.minigame_personal_bests WHERE user_id = $1) AS personal_bests, (SELECT count(*) FROM public.account_sync_receipts WHERE user_id = $1) AS receipts, (SELECT count(*) FROM public.account_deletion_tombstones WHERE user_id = $1) AS tombstones, (SELECT count(*) FROM account_safety.deletion_ledger WHERE user_id = $1) AS safety_ledger",
      [syntheticAccount.userId],
    );
    expect(remaining.rows[0]).toEqual({
      users: "0",
      accounts: "0",
      sessions: "0",
      personal_bests: "0",
      receipts: "0",
      tombstones: "1",
      safety_ledger: "1",
    });
    const limiterSecret = process.env.ACCOUNT_RATE_LIMIT_SECRET;
    expect(limiterSecret).toBeTruthy();
    const deletionLimitHash = createHmac("sha256", limiterSecret!)
      .update("account-delete-user")
      .update("\0")
      .update(syntheticAccount.userId)
      .digest("hex");
    const remainingDeletionLimit = await pool.query(
      "SELECT count(*) FROM public.account_rate_limits WHERE scope = 'account-delete-user' AND subject_hash = $1",
      [deletionLimitHash],
    );
    expect(remainingDeletionLimit.rows[0].count).toBe("0");
  } finally {
    await pool.end();
  }
});
