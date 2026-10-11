import "server-only";

import { consumeAccountRateLimits } from "./accountRateLimit";
import { getClientAddress } from "./rateLimit";

/**
 * Extra cross-instance protection for expensive public mutations.
 * The existing atomic account-rate-limit table stores an HMAC subject hash,
 * never a raw visitor IP. The fast process-local limiter still runs first.
 */
export async function rejectSharedPublicRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowSeconds = 60,
): Promise<Response | null> {
  try {
    const decision = await consumeAccountRateLimits([{
      scope,
      subject: getClientAddress(request),
      windowSeconds,
      maxRequests: limit,
    }]);
    if (decision.allowed) return null;
    return Response.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(Math.max(1, decision.retryAfter)),
      } },
    );
  } catch {
    // Never turn an analytics/abuse-counter database outage into a public API outage.
    // The independent process-local guard remains active.
    console.warn(JSON.stringify({ event: "shared_public_rate_limit_unavailable", scope }));
    return null;
  }
}
