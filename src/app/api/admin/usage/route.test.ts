import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedAccount: vi.fn(),
  readUsageHours: vi.fn(),
  readUsageLifetime: vi.fn(),
  summarizeUsage: vi.fn(),
  summarizeLifetime: vi.fn(),
  summarizeEngagement: vi.fn(),
  hasUsageAdminAccess: vi.fn(),
  readRecentSearchTags: vi.fn(),
  readSearchCountries7Days: vi.fn(),
  readApiPerformanceHours: vi.fn(),
}));
vi.mock("../../../../server/searchTagAnalytics", () => ({
  readRecentSearchTags: mocks.readRecentSearchTags,
  readSearchCountries7Days: mocks.readSearchCountries7Days,
}));
vi.mock("../../../../server/account", () => ({ getAuthenticatedAccount: mocks.getAuthenticatedAccount }));
vi.mock("../../../../server/usageAnalytics", () => ({
  hasUsageAdminAccess: mocks.hasUsageAdminAccess,
  readUsageHours: mocks.readUsageHours,
  readUsageLifetime: mocks.readUsageLifetime,
  summarizeUsage: mocks.summarizeUsage,
  summarizeLifetime: mocks.summarizeLifetime,
  summarizeEngagement: mocks.summarizeEngagement,
}));
import { GET } from "./route";
vi.mock("../../../../server/apiPerformance", () => ({
  readApiPerformanceHours: mocks.readApiPerformanceHours,
}));

describe("private analytics dashboard API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getAuthenticatedAccount.mockResolvedValue({ userId: "allowed" });
    mocks.hasUsageAdminAccess.mockResolvedValue(false);
    mocks.readUsageHours.mockResolvedValue([]);
    mocks.readUsageLifetime.mockResolvedValue([]);
    mocks.readRecentSearchTags.mockResolvedValue([]);
    mocks.readSearchCountries7Days.mockResolvedValue([]);
    mocks.readApiPerformanceHours.mockResolvedValue([]);
    mocks.summarizeUsage.mockReturnValue({ today: { visits: 0 } });
    mocks.summarizeLifetime.mockReturnValue({ allTime: { visits: 0 }, trackingStartedAt: null });
  });
  const request = () => new Request("https://www.brawl-o1.site/api/admin/usage");

  it("fails closed when the database allowlist has no administrator", async () => {
    expect((await GET(request())).status).toBe(404);
    expect(mocks.getAuthenticatedAccount).toHaveBeenCalledOnce();
    expect(mocks.hasUsageAdminAccess).toHaveBeenCalledWith("allowed");
    expect(mocks.readUsageHours).not.toHaveBeenCalled();
    expect(mocks.readUsageLifetime).not.toHaveBeenCalled();
    expect(mocks.readRecentSearchTags).not.toHaveBeenCalled();
    expect(mocks.readSearchCountries7Days).not.toHaveBeenCalled();
    expect(mocks.readApiPerformanceHours).not.toHaveBeenCalled();
  });
  it("hides data from non-admin users even after login", async () => {
    const response = await GET(request());
    expect(response.status).toBe(404);
    expect(mocks.readUsageHours).not.toHaveBeenCalled();
    expect(mocks.readRecentSearchTags).not.toHaveBeenCalled();
  });
  it("requires an authenticated session", async () => {
    mocks.getAuthenticatedAccount.mockRejectedValue(new Error("LOGIN_REQUIRED"));
    const response = await GET(request());
    expect(response.status).toBe(404);
    expect(mocks.readUsageHours).not.toHaveBeenCalled();
    expect(mocks.readRecentSearchTags).not.toHaveBeenCalled();
  });
  it("does not cache valid admin reports", async () => {
    mocks.hasUsageAdminAccess.mockResolvedValue(true);
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
    expect(await response.json()).toEqual({
      today: { visits: 0 },
      allTime: { visits: 0 },
      trackingStartedAt: null,
      recentSearchTags: [],
      searchCountries7Days: [],
      apiPerformance24h: [],
      apiPerformance7d: [],
    });
    expect(mocks.readRecentSearchTags).toHaveBeenCalledOnce();
    expect(mocks.readSearchCountries7Days).toHaveBeenCalledOnce();
    expect(mocks.readUsageLifetime).toHaveBeenCalledOnce();
    expect(mocks.readApiPerformanceHours).toHaveBeenCalledTimes(2);
  });
});
