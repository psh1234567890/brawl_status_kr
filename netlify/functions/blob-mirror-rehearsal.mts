import { createHash, timingSafeEqual } from "node:crypto";
import { get } from "@vercel/blob";
import { putCommunityImageObject, getCommunityImageObject, deleteCommunityImageObject } from "../../src/server/communityImageStore";

// Temporary, narrowly scoped operator rehearsal. No request-controlled object keys,
// no database access, no secret output. This file must be removed after rehearsal.
const expiry = 1795481650962;
const expectedHash = Buffer.from("c0e2bb87ac4906d6d73432e5c3026304ec9d5f7880bf1340d88daf8952c75fa5", "hex");
const site = "919e60cd-ce32-4416-a633-f9b84e82ec28";
const host = "deploy-preview-140--brawloop-netlify-release-20261119.netlify.app";
const existing = "community/d8617682-b85e-4b41-97bc-917129e82b7a.webp";
const path = "smoke/eb519239-b6dc-47f7-8bad-e3ade8450608.webp";
const fixture = Buffer.from("UklGRh4AAABXRUJQVlA4TBEAAAAvAUAAAAdQp14Ur/+BiOh/AAA=", "base64");
const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const fixtureHash = digest(fixture);
function reply(status: number, body: object) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
}
async function netlifyBytes(key: string) {
  const stream = await getCommunityImageObject(key);
  return stream ? Buffer.from(await new Response(stream).arrayBuffer()) : null;
}
async function vercelBytes(key: string) {
  const result = await get(key, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN, abortSignal: AbortSignal.timeout(8000) });
  return result?.statusCode === 200 && result.stream ? Buffer.from(await new Response(result.stream).arrayBuffer()) : null;
}

export default async function handler(request: Request) {
  const key = request.headers.get("x-rehearsal-proof") ?? "";
  if (request.method !== "POST" || Date.now() > expiry ||
      process.env.SITE_ID !== site || new URL(request.url).hostname !== host ||
      !/^[0-9a-f]{64}$/.test(key) ||
      !timingSafeEqual(createHash("sha256").update(key).digest(), expectedHash)) {
    return reply(404, { ok: false });
  }
  if (process.env.COMMUNITY_IMAGE_STORAGE !== "netlify" ||
      process.env.COMMUNITY_IMAGE_ROLLBACK_MIRROR !== "vercel" ||
      !process.env.BLOB_READ_WRITE_TOKEN) return reply(503, { ok: false, stage: "configuration" });
  const phase = request.headers.get("x-rehearsal-phase");
  try {
    if (phase === "check") {
      const [n, v] = await Promise.all([netlifyBytes(existing), vercelBytes(existing)]);
      const match = !!n && !!v && n.length === 146238 && digest(n) === digest(v);
      return reply(match ? 200 : 409, { ok: match, stage: "existing-store-match", sizeMatch: !!n && !!v && n.length === v.length });
    }
    if (phase === "write") {
      const [n, v] = await Promise.all([netlifyBytes(path), vercelBytes(path)]);
      if (n || v) return reply(409, { ok: false, stage: "fixture-already-exists" });
      await putCommunityImageObject(path, fixture);
      return reply(200, { ok: true, stage: "dual-write" });
    }
    if (phase === "verify") {
      const [n, v] = await Promise.all([netlifyBytes(path), vercelBytes(path)]);
      const netlifyMatch = !!n && digest(n) === fixtureHash;
      const vercelMatch = !!v && digest(v) === fixtureHash;
      return reply(netlifyMatch && vercelMatch ? 200 : 409, { ok: netlifyMatch && vercelMatch, netlifyMatch, vercelMatch });
    }
    if (phase === "cleanup") {
      const [n, v] = await Promise.all([netlifyBytes(path), vercelBytes(path)]);
      if ((n && digest(n) !== fixtureHash) || (v && digest(v) !== fixtureHash)) return reply(409, { ok: false, stage: "unexpected-object" });
      if (n || v) await deleteCommunityImageObject(path);
      return reply(200, { ok: true, stage: "delete-requested" });
    }
    if (phase === "absent") {
      const [n, v] = await Promise.all([netlifyBytes(path), vercelBytes(path)]);
      return reply(!n && !v ? 200 : 409, { ok: !n && !v, netlifyAbsent: !n, vercelAbsent: !v });
    }
    return reply(404, { ok: false });
  } catch {
    return reply(503, { ok: false, stage: phase ?? "unknown" });
  }
}
