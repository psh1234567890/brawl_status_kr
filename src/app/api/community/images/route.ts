import { getAuthenticatedAccount, requireExpectedUser, requireOnboardedAccount } from "../../../../server/account";
import { communityError, communityJson } from "../../../../server/communityHttp";
import { normalizeCommunityImage, readCommunityImageBody, saveCommunityImage } from "../../../../server/communityImages";
import { rejectCrossSiteMutation } from "../../../../server/requestGuard";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  if (rejectCrossSiteMutation(request)) return communityJson({ error: "CROSS_SITE_REQUEST" }, 403);
  try {
    const { userId } = await getAuthenticatedAccount(request);
    requireExpectedUser({ expectedUserId: request.headers.get("x-expected-user-id") }, userId);
    await requireOnboardedAccount(userId);
    const image = await normalizeCommunityImage(await readCommunityImageBody(request));
    return communityJson(await saveCommunityImage(userId, image), 201);
  } catch (error) { return communityError(error); }
}
