import { NextResponse } from "next/server";
import { rejectRateLimitedRequest } from "../../../server/rateLimit";
import { fetchBrawlApi, UpstreamApiError } from "../../../server/upstream";
import type { ClubData, ClubMember, ClubSearchResponse } from "../../../types/brawl";
import { isValidPlayerTag, normalizePlayerTag } from "../../../utils/playerTag";

export async function GET(request: Request) {
  const rejected = rejectRateLimitedRequest(request, "club-search", {
    limit: 40,
    windowMs: 60_000,
  });
  if (rejected) return rejected;

  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");
  if (!tag || !isValidPlayerTag(tag)) {
    return NextResponse.json({ error: "올바른 클럽 태그가 필요합니다." }, { status: 400 });
  }

  try {
    const cleanTag = normalizePlayerTag(tag);
    const [club, members] = await Promise.all([
      fetchBrawlApi<ClubData>(`/clubs/%23${cleanTag}`, 60_000),
      fetchBrawlApi<{ items: ClubMember[] }>(`/clubs/%23${cleanTag}/members`, 60_000),
    ]);
    const response: ClubSearchResponse = {
      club,
      members: members.items ?? club.members ?? [],
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to fetch club:", error);
    const status = error instanceof UpstreamApiError ? error.status : 502;
    return NextResponse.json({ error: "클럽 정보를 불러오지 못했습니다." }, { status });
  }
}
