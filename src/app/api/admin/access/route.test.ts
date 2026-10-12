import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedAccount: vi.fn(),
  hasUsageAdminAccess: vi.fn(),
}));
vi.mock("../../../../server/account", () => ({
  getAuthenticatedAccount: mocks.getAuthenticatedAccount,
}));
vi.mock("../../../../server/usageAnalytics", () => ({
  hasUsageAdminAccess: mocks.hasUsageAdminAccess,
}));
import { GET } from "./route";

describe("admin navigation permission probe", () => {
  const request = () => new Request("https://www.brawl-o1.site/api/admin/access");
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getAuthenticatedAccount.mockResolvedValue({ userId: "server-authenticated-id" });
    mocks.hasUsageAdminAccess.mockResolvedValue(false);
  });

  it("does not reveal a dashboard link to normal signed-in users", async () => {
    const response = await GET(request());
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
    expect(mocks.hasUsageAdminAccess).toHaveBeenCalledWith("server-authenticated-id");
    expect(await response.json()).toEqual({ error: "NOT_FOUND" });
  });

  it("denies guests and database permission errors without leaking details", async () => {
    mocks.getAuthenticatedAccount.mockRejectedValueOnce(new Error("LOGIN_REQUIRED"));
    expect((await GET(request())).status).toBe(404);
    expect(mocks.hasUsageAdminAccess).not.toHaveBeenCalled();

    mocks.getAuthenticatedAccount.mockResolvedValue({ userId: "server-authenticated-id" });
    mocks.hasUsageAdminAccess.mockRejectedValueOnce(new Error("private DB error"));
    const response = await GET(request());
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "NOT_FOUND" });
  });

  it("returns only a private empty success for a server-authorized admin", async () => {
    mocks.hasUsageAdminAccess.mockResolvedValue(true);
    const response = await GET(request());
    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
    expect(await response.text()).toBe("");
  });
});
