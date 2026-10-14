import { getAuthenticatedAccount, requireExpectedUser, requireOnboardedAccount } from "../../../../server/account";
import { enforceAccountRateLimit } from "../../../../server/accountHttp";
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
    const attempts = await enforceAccountRateLimit([{ scope: "community-image-attempt-user-hour", subject: userId, windowSeconds: 3600, maxRequests: 60 }]);
    if (attempts) return attempts;
    const image = await normalizeCommunityImage(await readCommunityImageBody(request));
    const limited = await enforceAccountRateLimit([{ scope: "community-image-user-hour", subject: userId, windowSeconds: 3600, maxRequests: 9 }]);
    if (limited) return limited;
    return communityJson(await saveCommunityImage(userId, image), 201);
  } catch (error) { return communityError(error); }
}
