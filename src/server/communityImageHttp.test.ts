import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ auth: vi.fn(), onboard: vi.fn(), limit: vi.fn(), body: vi.fn(), normalize: vi.fn(), save: vi.fn() }));
vi.mock("./account", async original => ({ ...await original<typeof import("./account")>(), getAuthenticatedAccount: mocks.auth, requireOnboardedAccount: mocks.onboard }));
vi.mock("./accountHttp", async original => ({ ...await original<typeof import("./accountHttp")>(), enforceAccountRateLimit: mocks.limit }));
vi.mock("./communityImages", () => ({ readCommunityImageBody: mocks.body, normalizeCommunityImage: mocks.normalize, saveCommunityImage: mocks.save }));
import { AccountError } from "./account";
import { CommunityError } from "../utils/community";
import { POST } from "../app/api/community/images/route";
const userId = "00000000-0000-4000-8000-000000000001";
function request(origin = "http://localhost", expected = userId) {
  return new Request("http://localhost/api/community/images", { method: "POST", headers: { Origin: origin, "X-Expected-User-Id": expected, "Content-Type": "image/png" }, body: "image" });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ userId }); mocks.onboard.mockResolvedValue(undefined);
  mocks.limit.mockResolvedValue(null); mocks.body.mockResolvedValue(Buffer.from("normalized"));
  mocks.normalize.mockResolvedValue({ bytes: Buffer.from("webp"), width: 10, height: 10 });
  mocks.save.mockResolvedValue({ id: userId, width: 10, height: 10 });
});
describe("photo upload authorization and limits", () => {
  it("blocks cross-site uploads before reading a session or image bytes", async () => {
    expect((await POST(request("https://elsewhere.example"))).status).toBe(403);
    expect(mocks.auth).not.toHaveBeenCalled(); expect(mocks.body).not.toHaveBeenCalled();
  });
  it("requires a completed signup and the current account", async () => {
    mocks.auth.mockRejectedValueOnce(new AccountError(401, "LOGIN_REQUIRED"));
    expect((await POST(request())).status).toBe(401);
    expect((await POST(request("http://localhost", "wrong-account"))).status).toBe(403);
    mocks.onboard.mockRejectedValueOnce(new AccountError(428, "ONBOARDING_REQUIRED"));
    expect((await POST(request())).status).toBe(428);
    expect(mocks.body).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it("charges the generous attempt guard, but not the valid-photo allowance, for malformed files", async () => {
    mocks.normalize.mockRejectedValue(new CommunityError(415, "INVALID_IMAGE_TYPE"));
    expect((await POST(request())).status).toBe(415);
    expect(mocks.limit).toHaveBeenCalledOnce();
    expect(mocks.limit).toHaveBeenCalledWith([expect.objectContaining({ maxRequests: 60 })]);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("stores normalized bytes under the server identity without exposing storage URLs", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: userId, width: 10, height: 10 });
    expect(response.headers.get("Cache-Control")).toContain("private, no-store");
    expect(mocks.save).toHaveBeenCalledWith(userId, expect.objectContaining({ width: 10 }));
  });
});
