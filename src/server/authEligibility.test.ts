import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { locales } from "../i18n/config";

const mocks = vi.hoisted(() => ({ state: vi.fn(), attach: vi.fn(), options: vi.fn() }));
afterEach(() => vi.unstubAllEnvs());
vi.mock("server-only", () => ({}));
vi.mock("../db", () => ({ db: {} }));
vi.mock("./accountRateLimit", () => ({ consumeBetterAuthRateLimit: vi.fn() }));
vi.mock("@better-auth/drizzle-adapter", () => ({ drizzleAdapter: () => ({}) }));
vi.mock("better-auth", () => ({ betterAuth: (options: unknown) => { mocks.options(options); return options; } }));
vi.mock("better-auth/api", () => ({
  APIError: class extends Error {},
  createAuthMiddleware: (callback: unknown) => callback,
  addOAuthServerContext: mocks.attach,
  getOAuthState: mocks.state,
}));

type Options = {
  hooks: { before: (context: { path: string; headers?: Headers }) => Promise<void> };
  socialProviders: { google: { disableSignUp?: boolean; prompt: string } };
  databaseHooks: {
    user: { create: { before: (user: Record<string, unknown>) => Promise<unknown> } };
    session: { create: { before: (session: Record<string, unknown>) => Promise<unknown> } };
  };
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3020");
  vi.stubEnv("BETTER_AUTH_SECRET", "unit-test-only-auth-secret-123456789");
  vi.stubEnv("GOOGLE_CLIENT_ID", "unit-only");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "unit-only");
  vi.stubEnv("ACCOUNT_TERMS_VERSION", "test-terms");
  vi.stubEnv("ACCOUNT_PRIVACY_NOTICE_VERSION", "test-privacy");
  vi.stubEnv("ACCOUNT_ELIGIBILITY_POLICY_VERSION", "test-eligibility");
  vi.stubEnv("ACCOUNT_ELIGIBILITY_RULES_JSON", JSON.stringify({ minimumAge: 16, regions: "all", guardianConsent: "not-supported", attestation: "self" }));
  vi.stubEnv("ACCOUNT_ELIGIBILITY_POLICY_TEXTS_JSON", JSON.stringify(Object.fromEntries(locales.map((locale) => [locale, "unit test notice"]))));
});

async function options(deletion = false) {
  const auth = await import("./auth");
  return (deletion ? auth.getDeletionAuth() : auth.getAuth()) as unknown as Options;
}

describe("pre-login Google eligibility state", () => {
  it("requires the sanitized server header and attaches server-owned OAuth state", async () => {
    const auth = await options();
    await expect(auth.hooks.before({ path: "/sign-in/social" })).rejects.toThrow();
    await expect(auth.hooks.before({ path: "/sign-in/social", headers: new Headers({ "x-brawl-eligibility-version": "old" }) })).rejects.toThrow();
    await auth.hooks.before({ path: "/sign-in/social", headers: new Headers({ "x-brawl-eligibility-version": "test-eligibility" }) });
    expect(mocks.attach).toHaveBeenCalledWith({ brawlEligibilityVersion: "test-eligibility" });
    expect(auth.socialProviders.google.prompt).toBe("select_account");
  });
  it("rejects missing, client-supplied or stale state before user or session persistence", async () => {
    const auth = await options();
    for (const state of [null, { brawlEligibilityVersion: "test-eligibility" }, { serverContext: { brawlEligibilityVersion: "old" } }]) {
      mocks.state.mockResolvedValue(state);
      await expect(auth.databaseHooks.user.create.before({})).rejects.toThrow();
      await expect(auth.databaseHooks.session.create.before({})).rejects.toThrow();
    }
  });
  it("allows acknowledged state and clears session request identifiers", async () => {
    const auth = await options();
    mocks.state.mockResolvedValue({ serverContext: { brawlEligibilityVersion: "test-eligibility" } });
    await expect(auth.databaseHooks.session.create.before({ ipAddress: "synthetic", userAgent: "synthetic" })).resolves.toEqual({ data: { ipAddress: null, userAgent: null } });
    const user = await auth.databaseHooks.user.create.before({ name: "Google real name", image: "google-avatar", emailVerified: true }) as { data: Record<string, unknown> };
    expect(user.data.name).toMatch(/^BS-/);
    expect(user.data.image).toBeNull();
  });
  it("invalidates an in-flight OAuth flow if the configured policy version changes", async () => {
    const auth = await options();
    mocks.state.mockResolvedValue({ serverContext: { brawlEligibilityVersion: "test-eligibility" } });
    vi.stubEnv("ACCOUNT_ELIGIBILITY_POLICY_VERSION", "new-eligibility");
    await expect(auth.databaseHooks.session.create.before({})).rejects.toThrow();
  });
  it("preserves deletion-only reauthentication without opening signup", async () => {
    const auth = await options(true);
    expect(auth.socialProviders.google.disableSignUp).toBe(true);
    await auth.hooks.before({ path: "/sign-in/social" });
    expect(mocks.attach).not.toHaveBeenCalled();
    mocks.state.mockResolvedValue(null);
    await expect(auth.databaseHooks.session.create.before({})).resolves.toEqual({ data: { ipAddress: null, userAgent: null } });
  });
});
