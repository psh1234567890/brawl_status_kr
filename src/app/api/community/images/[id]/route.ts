import { communityError, communityJson, communityMutation, optionalCommunityUser } from "../../../../../server/communityHttp";
import { readCommunityImage, removeCommunityImage } from "../../../../../server/communityImages";
import { hasUsageAdminAccess } from "../../../../../server/usageAnalytics";
import { CommunityError, isCommunityId } from "../../../../../utils/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!isCommunityId(id)) return communityJson({ error: "NOT_FOUND" }, 404);
    const viewer = await optionalCommunityUser(request);
    // An unavailable admin allowlist must not prevent an owner/public read;
    // privileged access still fails closed.
    const admin = viewer ? await hasUsageAdminAccess(viewer).catch(() => false) : false;
    const image = await readCommunityImage(id, viewer, admin);
    return new Response(image.stream, { headers: {
      "Content-Type": "image/webp", "Content-Length": String(image.byte_size),
      "Content-Disposition": 'inline; filename="evidence.webp"', "Cache-Control": "private, no-store",
      "Pragma": "no-cache", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow",
      "Cross-Origin-Resource-Policy": "same-origin",
    } });
  } catch (error) { return communityError(error); }
}
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return communityMutation(request, { action: "image-delete", keys: [], parse: () => {
    if (!isCommunityId(id)) throw new CommunityError(404, "NOT_FOUND");
  } }, async userId => { await removeCommunityImage(id, userId); return { removed: true }; });
}
