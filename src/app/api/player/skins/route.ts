import { NextResponse } from "next/server";
import { withApiMonitoring } from "../../../../server/observability";
import {
  fetchPlayerSkinInventory,
  fetchSupplementalSkinInventory,
} from "../../../../server/playerSkinInventory";
import { rejectRateLimitedRequest } from "../../../../server/rateLimit";
import { UpstreamApiError } from "../../../../server/upstream";
import { isValidPlayerTag } from "../../../../utils/playerTag";

async function getPlayerSkins(request: Request) {
  const rejected = rejectRateLimitedRequest(request, "player-skins", {
    limit: 20,
    windowMs: 60_000,
  });
  if (rejected) return rejected;

  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");
  if (!tag || !isValidPlayerTag(tag)) {
    return NextResponse.json({ error: "올바른 플레이어 태그가 필요합니다." }, { status: 400 });
  }

  try {
    if (searchParams.get("supplemental") === "1") {
      const supplemental = await fetchSupplementalSkinInventory(tag);
      if (!supplemental) {
        return new Response(null, {
          status: 204,
          headers: { "X-Skin-Inventory-Status": "disabled" },
        });
      }
      return skinInventoryResponse(supplemental);
    }
    return skinInventoryResponse(await fetchPlayerSkinInventory(tag));
  } catch (error) {
    const status = error instanceof UpstreamApiError ? error.status : 502;
    return NextResponse.json(
      { error: "스킨 정보를 불러오지 못했습니다." },
      {
        status,
        headers: { "X-Skin-Inventory-Status": "unavailable" },
      },
    );
  }
}

function skinInventoryResponse(
  inventory: Awaited<ReturnType<typeof fetchPlayerSkinInventory>>,
) {
  return NextResponse.json(inventory, {
    headers: { "X-Skin-Inventory-Status": inventory.supplementalStatus },
  });
}

export const GET = withApiMonitoring("api.player.skins", getPlayerSkins, { slowMs: 1_500 });
