import { isIP } from "node:net";
import { NextResponse } from "next/server";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

export function consumeRateLimit(
  key: string,
  options: RateLimitOptions,
  now = Date.now(),
): RateLimitResult {
  const current = buckets.get(key);
  const bucket =
    !current || current.resetAt <= now
      ? { count: 0, resetAt: now + options.windowMs }
      : current;

  bucket.count += 1;
  buckets.set(key, bucket);

  if (buckets.size > 2_000) {
    for (const [bucketKey, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(bucketKey);
    }

    while (buckets.size > 2_000) {
      const oldestKey = buckets.keys().next().value as string | undefined;
      if (!oldestKey) break;
      buckets.delete(oldestKey);
    }
  }

  return {
    allowed: bucket.count <= options.limit,
    limit: options.limit,
    remaining: Math.max(options.limit - bucket.count, 0),
    resetAt: bucket.resetAt,
  };
}

// These sources are set by the hosting platform at runtime.
export function getTrustedClientIpHeader(
  onVercel = process.env.VERCEL === "1",
  onNetlify = Boolean(process.env.SITE_ID && process.env.SITE_NAME),
) {
  if (onVercel) return "x-vercel-forwarded-for";
  if (onNetlify) return "x-nf-client-connection-ip";
  return undefined;
}

// Keep a shared fallback bucket if the platform address is unavailable.
export function getClientAddress(
  request: Request,
  onVercel = process.env.VERCEL === "1",
) {
  const header = getTrustedClientIpHeader(onVercel);
  if (!header) return "local";
  let candidate = request.headers.get(header);
  if (onVercel) candidate = candidate?.split(",", 1)[0] ?? null;
  const address = candidate?.trim();
  if (address && isIP(address)) return address;
  return onVercel ? "vercel-ip-unavailable" : "netlify-ip-unavailable";
}

export function rejectRateLimitedRequest(
  request: Request,
  scope: string,
  options: RateLimitOptions,
) {
  const result = consumeRateLimit(`${scope}:${getClientAddress(request)}`, options);
  if (result.allowed) return null;

  return NextResponse.json(
    { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1_000)),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    },
  );
}

export function clearRateLimitBucketsForTest() {
  buckets.clear();
}

export function getRateLimitBucketCountForTest() {
  return buckets.size;
}
