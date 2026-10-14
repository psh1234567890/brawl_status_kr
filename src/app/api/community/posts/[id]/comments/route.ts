import { createCommunityComment } from "../../../../../../server/community";
import { communityMutation } from "../../../../../../server/communityHttp";
import { CommunityError, isCommunityId, validateCommunityComment } from "../../../../../../utils/community";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return communityMutation(request, { action: "comment", keys: ["body", "kind", "evidenceUrls", "acceptRules"], parse: body => {
    if (!isCommunityId(id)) throw new CommunityError(404, "NOT_FOUND");
    return validateCommunityComment(body);
  } }, (userId, input) => createCommunityComment(userId, id, input));
}
