import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ auth: vi.fn(), onboard: vi.fn(), limit: vi.fn(), admin: vi.fn(), post: vi.fn(), comment: vi.fn(), withdraw: vi.fn(), moderate: vi.fn(), queue: vi.fn() }));
vi.mock("./account", async importOriginal => ({ ...await importOriginal<typeof import("./account")>(), getAuthenticatedAccount: mocks.auth, requireOnboardedAccount: mocks.onboard }));
vi.mock("./accountHttp", async importOriginal => ({ ...await importOriginal<typeof import("./accountHttp")>(), enforceAccountRateLimit: mocks.limit }));
vi.mock("./usageAnalytics", () => ({ hasUsageAdminAccess: mocks.admin }));
vi.mock("./community", () => ({ createCommunityPost: mocks.post, createCommunityComment: mocks.comment, withdrawCommunityContent: mocks.withdraw, moderateCommunityContent: mocks.moderate, readCommunityQueue: mocks.queue }));
vi.mock("./communityImages", () => ({ checkCommunityImageDrafts: vi.fn().mockResolvedValue(undefined) }));
import { AccountError } from "./account";
import { POST as post } from "../app/api/community/posts/route";
import { POST as comment } from "../app/api/community/posts/[id]/comments/route";
import { DELETE as withdrawPost } from "../app/api/community/posts/[id]/route";
import { DELETE as withdrawComment } from "../app/api/community/comments/[id]/route";
import { GET as queue, PATCH as moderate } from "../app/api/admin/community/route";
import { CommunityError } from "../utils/community";
import { checkCommunityImageDrafts } from "./communityImages";

const userId = "00000000-0000-4000-8000-000000000001";
const id = "00000000-0000-4000-8000-000000000002";
const input = { expectedUserId: userId, title: "Test match report", body: "Synthetic match evidence context for a test.", locale: "en", evidenceUrls: ["https://youtu.be/abcdefghijk"], acceptRules: true, confirmIntent: true };
const context = () => ({ params: Promise.resolve({ id }) });
function request(body: unknown, method = "POST", origin = "http://localhost") {
  return new Request("http://localhost/api/community", { method, headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ userId });
  mocks.onboard.mockResolvedValue(undefined);
  mocks.limit.mockResolvedValue(null);
  mocks.admin.mockResolvedValue(false);
  mocks.post.mockResolvedValue({ id, status: "published" });
  mocks.comment.mockResolvedValue({ id, status: "published" });
  vi.mocked(checkCommunityImageDrafts).mockResolvedValue(undefined);
});
describe("community mutation authorization", () => {
  it("requires a registered session on every post/comment mutation", async () => {
    mocks.auth.mockRejectedValue(new AccountError(401, "LOGIN_REQUIRED"));
    const responses = await Promise.all([post(request(input)), comment(request(input), context()), withdrawPost(request({ expectedUserId: userId }, "DELETE"), context()), withdrawComment(request({ expectedUserId: userId }, "DELETE"), context())]);
    expect(responses.map(response => response.status)).toEqual([401, 401, 401, 401]);
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.comment).not.toHaveBeenCalled();
    expect(mocks.withdraw).not.toHaveBeenCalled();
  });
  it("rejects cross-site requests before inspecting a session", async () => {
    expect((await post(request(input, "POST", "https://elsewhere.example"))).status).toBe(403);
    expect(mocks.auth).not.toHaveBeenCalled();
  });
  it("rejects a stale account ID and client-supplied moderation/author fields", async () => {
    expect((await post(request({ ...input, expectedUserId: id }))).status).toBe(403);
    expect((await post(request({ ...input, status: "published" }))).status).toBe(400);
    expect((await post(request({ ...input, authorId: id }))).status).toBe(400);
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it("requires account onboarding and bounds request bytes", async () => {
    mocks.onboard.mockRejectedValue(new AccountError(428, "ONBOARDING_REQUIRED"));
    expect((await post(request(input))).status).toBe(428);
    expect(mocks.limit).not.toHaveBeenCalled();
    expect((await post(request({ ...input, body: "x".repeat(1024 * 1024) }))).status).toBe(413);
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it("publishes beyond the former daily and hourly quotas without charging a limiter", async () => {
    mocks.limit.mockResolvedValue(new Response(JSON.stringify({ error: "RATE_LIMITED" }), { status: 429 }));
    for (let attempt = 0; attempt < 4; attempt++) expect((await post(request({ ...input, title: "한", body: "글" }))).status).toBe(201);
    for (let attempt = 0; attempt < 21; attempt++) expect((await comment(request({ expectedUserId: userId, body: "네", kind: "opinion", acceptRules: true }), context())).status).toBe(201);
    expect(mocks.limit).not.toHaveBeenCalled();
    expect(mocks.post).toHaveBeenCalledTimes(4);
    expect(mocks.comment).toHaveBeenCalledTimes(21);
  });
  it("rejects empty fields, invalid evidence and missing rules consent", async () => {
    for (const [change, code] of [[{ title: " " }, "INVALID_TITLE"], [{ body: " " }, "INVALID_POST_BODY"], [{ evidenceUrls: ["https://example.invalid/evidence.png"] }, "INVALID_EVIDENCE"], [{ acceptRules: false }, "RULES_REQUIRED"]] as const) {
      const response = await post(request({ ...input, ...change }));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: code });
    }
    expect(mocks.limit).not.toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
    const invalidComment = await comment(request({ expectedUserId: userId, body: " ", kind: "correction", acceptRules: true }), context());
    expect(invalidComment.status).toBe(400);
    expect(await invalidComment.json()).toEqual({ error: "INVALID_COMMENT_BODY" });
    expect(mocks.limit).not.toHaveBeenCalled();
    expect((await post(request(input))).status).toBe(201);
    expect(mocks.limit).not.toHaveBeenCalled();
  });
  it("uses the server session identity and returns a published submission", async () => {
    const response = await post(request(input));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id, status: "published" });
    expect(mocks.post).toHaveBeenCalledWith(userId, expect.objectContaining({ title: input.title }));
    expect(response.headers.get("Cache-Control")).toContain("private, no-store");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });
  it("does not consume a post allowance for expired or foreign photos", async () => {
    vi.mocked(checkCommunityImageDrafts).mockRejectedValue(new CommunityError(400, "IMAGE_EXPIRED"));
    expect((await post(request({ ...input, evidenceUrls: [], imageIds: [id] }))).status).toBe(400);
    expect(mocks.limit).not.toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it("hides non-administrator review access and preserves ownership failures", async () => {
    expect((await queue(new Request("http://localhost/api/admin/community"))).status).toBe(404);
    expect((await moderate(request({ expectedUserId: userId }, "PATCH"))).status).toBe(404);
    expect(mocks.queue).not.toHaveBeenCalled();
    expect(mocks.moderate).not.toHaveBeenCalled();
    mocks.withdraw.mockRejectedValue(new CommunityError(404, "NOT_FOUND"));
    expect((await withdrawPost(request({ expectedUserId: userId }, "DELETE"), context())).status).toBe(404);
    expect(mocks.withdraw).toHaveBeenCalledWith("post", id, userId);
  });
  it("requires a valid revision and decision for an administrator", async () => {
    mocks.admin.mockResolvedValue(true);
    const body = { expectedUserId: userId, kind: "post", id, revision: 0, status: "published", note: "Evidence reviewed" };
    expect((await moderate(request({ ...body, revision: -1 }, "PATCH"))).status).toBe(400);
    expect((await moderate(request({ ...body, status: "withdrawn" }, "PATCH"))).status).toBe(400);
    expect((await moderate(request(body, "PATCH"))).status).toBe(200);
    expect(mocks.moderate).toHaveBeenCalledOnce();
  });
});
