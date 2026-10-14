import { readCommunityPost, withdrawCommunityContent } from "../../../../../server/community";
import { communityError, communityJson, communityMutation, optionalCommunityUser } from "../../../../../server/communityHttp";
import { CommunityError, communityPage, isCommunityId } from "../../../../../utils/community";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!isCommunityId(id)) throw new CommunityError(404, "NOT_FOUND");
    return communityJson(await readCommunityPost(id, await optionalCommunityUser(request), communityPage(new URL(request.url).searchParams.get("commentPage"))));
  } catch (error) { return communityError(error); }
}
export async function DELETE(request: Request, context: Context) {
  const { id } = await context.params;
  return communityMutation(request, { action: "withdraw", keys: [] }, async userId => {
    if (!isCommunityId(id)) throw new CommunityError(404, "NOT_FOUND");
    await withdrawCommunityContent("post", id, userId);
    return { status: "withdrawn" };
  });
}
