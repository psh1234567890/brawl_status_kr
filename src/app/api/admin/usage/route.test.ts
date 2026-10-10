import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedAccount: vi.fn(),
  readUsageHours: vi.fn(),
  summarizeUsage: vi.fn(),
  isUsageAdminUser: vi.fn(),
}));
vi.mock("../../../../server/account", () => ({ getAuthenticatedAccount: mocks.getAuthenticatedAccount }));
vi.mock("../../../../server/usageAnalytics", () => ({
  isUsageAdminUser: mocks.isUsageAdminUser,
  readUsageHours: mocks.readUsageHours,
  summarizeUsage: mocks.summarizeUsage,
}));
import { GET } from "./route";

describe("private analytics dashboard API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.USAGE_ADMIN_USER_IDS;
    mocks.getAuthenticatedAccount.mockResolvedValue({ userId: "allowed" });
    mocks.isUsageAdminUser.mockReturnValue(false);
    mocks.readUsageHours.mockResolvedValue([]);
    mocks.summarizeUsage.mockReturnValue({ today: { visits: 0 } });
  });
  const request = () => new Request("https://www.brawl-o1.site/api/admin/usage");

  it("fails closed when owner allowlist is absent", async () => {
    expect((await GET(request())).status).toBe(404);
    expect(mocks.getAuthenticatedAccount).not.toHaveBeenCalled();
  });
  it("hides data from non-admin users even after login", async () => {
    process.env.USAGE_ADMIN_USER_IDS = "allowed";
    const response = await GET(request());
    expect(response.status).toBe(404);
    expect(mocks.readUsageHours).not.toHaveBeenCalled();
  });
  it("requires an authenticated session", async () => {
    process.env.USAGE_ADMIN_USER_IDS = "allowed";
    mocks.getAuthenticatedAccount.mockRejectedValue(new Error("LOGIN_REQUIRED"));
    const response = await GET(request());
    expect(response.status).toBe(404);
    expect(mocks.readUsageHours).not.toHaveBeenCalled();
  });
  it("does not cache valid admin reports", async () => {
    process.env.USAGE_ADMIN_USER_IDS = "allowed";
    mocks.isUsageAdminUser.mockReturnValue(true);
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
    expect(await response.json()).toEqual({ today: { visits: 0 } });
  });
});
