import { NextResponse } from "next/server";

function getRequestOrigin(request: Request) {
  return new URL(request.url).origin;
}

function isCrossSiteFetchMetadata(request: Request) {
  return request.headers.get("sec-fetch-site") === "cross-site";
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === getRequestOrigin(request);
  } catch {
    return false;
  }
}

export function rejectCrossSiteMutation(request: Request) {
  if (!isSameOrigin(request) || isCrossSiteFetchMetadata(request)) {
    return NextResponse.json(
      { error: "허용되지 않은 요청입니다. 페이지를 새로고침한 뒤 다시 시도해주세요." },
      { status: 403 },
    );
  }

  return null;
}
