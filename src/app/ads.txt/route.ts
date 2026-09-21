import { buildAdsTxtLine } from "../../utils/adsense";

export function GET() {
  const line = buildAdsTxtLine(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID);
  if (!line) {
    return new Response("AdSense is not configured.\n", {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  return new Response(`${line}\n`, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
