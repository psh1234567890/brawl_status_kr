import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), getSession: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../db", () => ({ db: { $client: { query: mocks.query } } }));
vi.mock("./auth", () => ({
  getAuth: () => ({ api: { getSession: mocks.getSession } }),
  isDeletionGoogleSubjectAllowed: () => true,
}));
vi.mock("./account", () => ({
  AccountError: class extends Error {},
  isUUID: (value: unknown) => typeof value === "string" && /^[0-9a-f-]{36}$/.test(value),
}));

import { readDeletionReauthForCurrentSession } from "./accountDeletion";

const userId = "00000000-0000-4000-8000-000000000001";
const otherId = "00000000-0000-4000-8000-000000000002";
const cookieRequest = () => new Request("http://localhost/api/account", {
  headers: { cookie: "brawl-account-deletion=" + "a".repeat(43) },
});

function storedIntent(overrides: Record<string, unknown> = {}) {
  return {
    id: "synthetic-verification", value: JSON.stringify({
      flow: "existing-session", userId, initiatingSessionId: "original-session",
      googleSubject: "synthetic-subject", callbackURL: "/account",
      originalSessionExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      status: "verified", stateHash: "a".repeat(64),
      startedAt: new Date(Date.now() - 2_000).toISOString(),
      verifiedAt: new Date(Date.now() - 500).toISOString(), verifiedSessionId: "fresh-session",
      ...overrides,
    }),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSession.mockResolvedValue({
    user: { id: userId },
    session: { id: "fresh-session", createdAt: new Date(Date.now() - 1_000), expiresAt: new Date(Date.now() + 60_000) },
  });
  mocks.query.mockImplementation(async (sql: string) => ({
    rows: sql.includes("auth_accounts") ? [{ account_id: "synthetic-subject" }] : [],
  }));
});

describe("server-owned deletion activity", () => {
  it("ignores absent, consumed or expired intents without approving deletion", async () => {
    const result = await readDeletionReauthForCurrentSession(cookieRequest());
    expect(result).toMatchObject({ ready: false, intentActive: false });
    expect(mocks.query.mock.calls.some(([sql]) => sql.includes("expires_at > now()"))).toBe(true);
  });

  it("keeps a mismatched active intent visible without making it deletion proof", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ account_id: "synthetic-subject" }] })
      .mockResolvedValueOnce({ rows: [storedIntent({ userId: otherId })] });
    expect(await readDeletionReauthForCurrentSession(cookieRequest())).toMatchObject({ ready: false, intentActive: true });
  });

  it("requires the same session for an active verified intent", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ account_id: "synthetic-subject" }] })
      .mockResolvedValueOnce({ rows: [storedIntent({ verifiedSessionId: "other-session" })] });
    expect(await readDeletionReauthForCurrentSession(cookieRequest())).toMatchObject({ ready: false, intentActive: true });
  });

  it("reports readiness only for the same Google identity and fresh session", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [{ account_id: "synthetic-subject" }] })
      .mockResolvedValueOnce({ rows: [storedIntent()] });
    expect(await readDeletionReauthForCurrentSession(cookieRequest())).toMatchObject({ ready: true, intentActive: true });
  });
});
