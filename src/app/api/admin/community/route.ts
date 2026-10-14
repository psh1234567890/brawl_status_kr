import { communityError, communityJson, communityMutation, requireCommunityAdmin } from "../../../../server/communityHttp";
import { moderateCommunityContent, readCommunityQueue } from "../../../../server/community";
import { CommunityError, communityPage, isCommunityId } from "../../../../utils/community";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await requireCommunityAdmin(request);
    const params = new URL(request.url).searchParams;
    const status = params.get("status") ?? "pending";
    if (status !== "pending" && status !== "published" && status !== "hidden" && status !== "rejected") throw new CommunityError(400, "INVALID_BODY");
    return communityJson(await readCommunityQueue(status, communityPage(params.get("page"))));
  } catch (error) { return communityError(error); }
}
export function PATCH(request: Request) {
  return communityMutation(request, { action: "moderate", keys: ["kind", "id", "revision", "status", "note"] }, async (userId, body) => {
    if ((body.kind !== "post" && body.kind !== "comment") || typeof body.id !== "string" || !isCommunityId(body.id)
      || !Number.isSafeInteger(body.revision) || Number(body.revision) < 0
      || (body.status !== "published" && body.status !== "rejected" && body.status !== "hidden")
      || typeof body.note !== "string" || body.note.trim().length < 2 || body.note.length > 1000) throw new CommunityError(400, "INVALID_BODY");
    await moderateCommunityContent(userId, body.kind, body.id, Number(body.revision), body.status, body.note.trim());
    return { status: body.status };
  });
}
