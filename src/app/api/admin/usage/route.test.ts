import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedAccount: vi.fn(),
  readUsageHours: vi.fn(),
  summarizeUsage: vi.fn(),
  hasUsageAdminAccess: vi.fn(),
}));
vi.mock("../../../../server/account", () => ({ getAuthenticatedAccount: mocks.getAuthenticatedAccount }));
vi.mock("../../../../server/usageAnalytics", () => ({
  hasUsageAdminAccess: mocks.hasUsageAdminAccess,
  readUsageHours: mocks.readUsageHours,
  summarizeUsage: mocks.summarizeUsage,
}));
import { GET } from "./route";

describe("private analytics dashboard API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getAuthenticatedAccount.mockResolvedValue({ userId: "allowed" });
    mocks.hasUsageAdminAccess.mockResolvedValue(false);
    mocks.readUsageHours.mockResolvedValue([]);
    mocks.summarizeUsage.mockReturnValue({ today: { visits: 0 } });
  });
  const request = () => new Request("https://www.brawl-o1.site/api/admin/usage");

  it("fails closed when the database allowlist has no administrator", async () => {
    expect((await GET(request())).status).toBe(404);
    expect(mocks.getAuthenticatedAccount).toHaveBeenCalledOnce();
    expect(mocks.hasUsageAdminAccess).toHaveBeenCalledWith("allowed");
    expect(mocks.readUsageHours).not.toHaveBeenCalled();
  });
  it("hides data from non-admin users even after login", async () => {
    const response = await GET(request());
    expect(response.status).toBe(404);
    expect(mocks.readUsageHours).not.toHaveBeenCalled();
  });
  it("requires an authenticated session", async () => {
    mocks.getAuthenticatedAccount.mockRejectedValue(new Error("LOGIN_REQUIRED"));
    const response = await GET(request());
    expect(response.status).toBe(404);
    expect(mocks.readUsageHours).not.toHaveBeenCalled();
  });
  it("does not cache valid admin reports", async () => {
    mocks.hasUsageAdminAccess.mockResolvedValue(true);
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
    expect(await response.json()).toEqual({ today: { visits: 0 } });
  });
});
