import { timingSafeEqual } from "node:crypto";
import {
  accountErrorResponse,
  accountJson,
} from "../../../../server/accountHttp";
import { cleanupExpiredAccountData } from "../../../../server/accountMaintenance";

export const runtime = "nodejs";

function hasValidCronAuthorization(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || secret.length < 32 || !authorization?.startsWith("Bearer ")) {
    return false;
  }
  const supplied = authorization.slice("Bearer ".length);
  const left = Buffer.from(supplied);
  const right = Buffer.from(secret);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function handle(request: Request) {
  if (!hasValidCronAuthorization(request)) {
    return accountJson({ error: "UNAUTHORIZED" }, 401);
  }
  try {
    return accountJson(await cleanupExpiredAccountData());
  } catch (error) {
    return accountErrorResponse(error);
  }
}

// Vercel Cron invokes the route with GET. POST remains available for a
// secret-authenticated manual invocation from an operator environment.
export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
