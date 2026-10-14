import { withdrawCommunityContent } from "../../../../../server/community";
import { communityMutation } from "../../../../../server/communityHttp";
import { CommunityError, isCommunityId } from "../../../../../utils/community";
export const runtime = "nodejs";
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return communityMutation(request, { action: "withdraw", keys: [] }, async userId => {
    if (!isCommunityId(id)) throw new CommunityError(404, "NOT_FOUND");
    await withdrawCommunityContent("comment", id, userId);
    return { status: "withdrawn" };
  });
}
