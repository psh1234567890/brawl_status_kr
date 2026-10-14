import { isLocale } from "../../../../i18n/config";
import { getAuthenticatedAccount } from "../../../../server/account";
import { communityError, communityJson, communityMutation } from "../../../../server/communityHttp";
import { createCommunityPost, listCommunityPosts } from "../../../../server/community";
import { communityPage, validateCommunityPost } from "../../../../utils/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const language = params.get("locale") ?? "ko";
    const locale = isLocale(language) ? language : "ko";
    const owner = params.get("mine") === "1" ? (await getAuthenticatedAccount(request)).userId : undefined;
    return communityJson(await listCommunityPosts(locale, communityPage(params.get("page")), owner));
  } catch (error) { return communityError(error); }
}
export function POST(request: Request) {
  return communityMutation(request, { action: "post", keys: ["title", "body", "evidenceUrls", "locale", "acceptRules", "confirmIntent"] },
    (userId, body) => createCommunityPost(userId, validateCommunityPost(body)));
}
