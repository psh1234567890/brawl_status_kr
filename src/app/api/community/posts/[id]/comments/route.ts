import { createCommunityComment } from "../../../../../../server/community";
import { communityMutation } from "../../../../../../server/communityHttp";
import { CommunityError, isCommunityId, validateCommunityComment } from "../../../../../../utils/community";
import { checkCommunityImageDrafts } from "../../../../../../server/communityImages";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return communityMutation(request, { action: "comment", keys: ["body", "kind", "evidenceUrls", "imageIds", "acceptRules"], parse: body => {
    if (!isCommunityId(id)) throw new CommunityError(404, "NOT_FOUND");
    return validateCommunityComment(body);
  }, check: checkCommunityImageDrafts }, (userId, input) => createCommunityComment(userId, id, input));
}
