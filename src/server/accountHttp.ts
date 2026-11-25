import "server-only";

import { NextResponse } from "next/server";
import { AccountError } from "./account";
import {
  consumeAccountRateLimits,
  getAccountRateLimitResponse,
} from "./accountRateLimit";
import { getClientAddress } from "./rateLimit";

export function accountJson(
  body: unknown,
  status = 200,
  headers?: HeadersInit,
) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Cache-Control", "private, no-store");
  responseHeaders.set("Pragma", "no-cache");
  return NextResponse.json(body, { status, headers: responseHeaders });
}

export function accountErrorResponse(error: unknown) {
  if (error instanceof AccountError) {
    return accountJson(
      { error: error.code, ...(error.details ?? {}) },
      error.status,
    );
  }
  return accountJson({ error: "ACCOUNT_UNAVAILABLE" }, 503);
}

export function getTrustedRequestSubject(request: Request) {
  const address = getClientAddress(request);
  return address === "local" ? "local-unavailable" : address;
}

export async function enforceAccountRateLimit(
  rules: Parameters<typeof consumeAccountRateLimits>[0],
) {
  const result = await consumeAccountRateLimits(rules);
  return result.allowed ? null : getAccountRateLimitResponse(result.retryAfter);
}

export function accountUnavailableResponse() {
  return accountJson({ error: "ACCOUNT_UNAVAILABLE" }, 503);
}
