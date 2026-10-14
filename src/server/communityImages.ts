import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import sharp from "sharp";
import { db } from "../db";
import { CommunityError, type CommunityImage, type CommunityKind } from "../utils/community";
import { deleteCommunityImageObject, getCommunityImageObject, putCommunityImageObject } from "./communityImageStore";

export const COMMUNITY_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export async function readCommunityImageBody(request: Request) {
  const type = request.headers.get("content-type")?.split(";")[0];
  if (!["image/jpeg", "image/png", "image/webp"].includes(type ?? "")) throw new CommunityError(415, "INVALID_IMAGE_TYPE");
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > COMMUNITY_IMAGE_MAX_BYTES)) throw new CommunityError(413, "IMAGE_TOO_LARGE");
  if (!request.body) throw new CommunityError(400, "INVALID_IMAGE");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > COMMUNITY_IMAGE_MAX_BYTES) { await reader.cancel(); throw new CommunityError(413, "IMAGE_TOO_LARGE"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, size);
}
export async function normalizeCommunityImage(bytes: Buffer) {
  if (!bytes.length || bytes.length > COMMUNITY_IMAGE_MAX_BYTES) throw new CommunityError(413, "IMAGE_TOO_LARGE");
  // Do not accept SVG (even if libvips could render it), animated images or
  // arbitrary data disguised by the request's Content-Type.
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  if (!jpeg && !png && !webp) throw new CommunityError(415, "INVALID_IMAGE_TYPE");
  try {
    const image = sharp(bytes, { limitInputPixels: 20_000_000, failOn: "warning" });
    const meta = await image.metadata();
    if ((meta.pages ?? 1) !== 1 || !["jpeg", "png", "webp"].includes(meta.format ?? "")) throw new Error("Unsupported image");
    // Metadata is deliberately not copied: EXIF/GPS and original names never
    // enter the object store. Rotate before removing orientation metadata.
    const { data, info } = await image.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 86 }).toBuffer({ resolveWithObject: true });
    if (data.length > COMMUNITY_IMAGE_MAX_BYTES) throw new Error("Encoded image too large");
    return { bytes: data, width: info.width, height: info.height };
  } catch { throw new CommunityError(400, "INVALID_IMAGE"); }
}
export async function saveCommunityImage(userId: string, image: Awaited<ReturnType<typeof normalizeCommunityImage>>): Promise<CommunityImage> {
  const id = randomUUID();
  const pathname = `community/${id}.webp`;
  const client = await db.$client.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO public.community_image_objects(object_path) VALUES ($1)", [pathname]);
    await client.query("INSERT INTO public.community_images(id, owner_id, object_path, width, height, byte_size) VALUES ($1,$2,$3,$4,$5,$6)", [id, userId, pathname, image.width, image.height, image.bytes.length]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
  finally { client.release(); }
  try {
    await putCommunityImageObject(pathname, image.bytes);
    const result = await db.$client.query("UPDATE public.community_images SET ready = true WHERE id = $1 RETURNING id", [id]);
    if (!result.rowCount) throw new CommunityError(409, "IMAGE_EXPIRED");
    return { id, width: image.width, height: image.height };
  } catch (error) {
    // The independent object inventory retains uncertain uploads for cleanup.
    await db.$client.query("DELETE FROM public.community_images WHERE id = $1", [id]).catch(() => undefined);
    throw error;
  }
}
export async function attachCommunityImages(client: PoolClient, userId: string, ids: string[], kind: CommunityKind, contentId: string) {
  if (!ids.length) return;
  // Lock before checking ownership/binding so concurrent submissions or removal
  // cannot reuse the same upload or steal another member's pending evidence.
  const result = await client.query("SELECT id FROM public.community_images WHERE id = ANY($1::uuid[]) AND owner_id = $2 AND ready AND post_id IS NULL AND comment_id IS NULL AND created_at > now() - interval '24 hours' ORDER BY id FOR UPDATE", [ids, userId]);
  if (result.rowCount !== ids.length) throw new CommunityError(400, "IMAGE_EXPIRED");
  const column = kind === "post" ? "post_id" : "comment_id";
  await client.query(`UPDATE public.community_images SET ${column} = $2 WHERE id = ANY($1::uuid[])`, [ids, contentId]);
}
export async function checkCommunityImageDrafts(userId: string, input: { imageIds: string[] }) {
  if (!input.imageIds.length) return;
  const result = await db.$client.query("SELECT id FROM public.community_images WHERE id = ANY($1::uuid[]) AND owner_id = $2 AND ready AND post_id IS NULL AND comment_id IS NULL AND created_at > now() - interval '24 hours'", [input.imageIds, userId]);
  if (result.rowCount !== input.imageIds.length) throw new CommunityError(400, "IMAGE_EXPIRED");
}
export async function readCommunityImage(id: string, viewer?: string, admin = false) {
  const result = await db.$client.query<{ object_path: string; width: number; height: number; byte_size: number }>(`
    SELECT i.object_path, i.width, i.height, i.byte_size FROM public.community_images i
    LEFT JOIN public.community_posts p ON p.id = i.post_id
    LEFT JOIN public.community_comments c ON c.id = i.comment_id
    LEFT JOIN public.community_posts cp ON cp.id = c.post_id
    WHERE i.id = $1 AND i.ready AND (
      (i.post_id IS NULL AND i.comment_id IS NULL AND i.created_at > now() - interval '24 hours' AND i.owner_id = $2::uuid)
      OR ((i.post_id IS NOT NULL OR i.comment_id IS NOT NULL) AND
        (i.owner_id = $2::uuid OR $3 OR p.status = 'published' OR (c.status = 'published' AND cp.status = 'published')))
    )`, [id, viewer ?? null, admin]);
  if (!result.rows[0]) throw new CommunityError(404, "NOT_FOUND");
  const stream = await getCommunityImageObject(result.rows[0].object_path);
  if (!stream) throw new CommunityError(404, "NOT_FOUND");
  return { stream, ...result.rows[0] };
}
export async function removeCommunityImage(id: string, userId: string) {
  const result = await db.$client.query("DELETE FROM public.community_images WHERE id = $1 AND owner_id = $2 AND post_id IS NULL AND comment_id IS NULL RETURNING id", [id, userId]);
  if (!result.rowCount) throw new CommunityError(404, "NOT_FOUND");
}
export async function cleanupCommunityImages() {
  const expired = await db.$client.query("DELETE FROM public.community_images WHERE post_id IS NULL AND comment_id IS NULL AND created_at <= now() - interval '24 hours'");
  // Wait past the bounded upload timeout before deleting. This covers an
  // account being deleted while its upload is still in flight.
  const queued = await db.$client.query<{ object_path: string }>("SELECT o.object_path FROM public.community_image_objects o WHERE o.created_at < now() - interval '5 minutes' AND NOT EXISTS (SELECT 1 FROM public.community_images i WHERE i.object_path = o.object_path) ORDER BY o.created_at LIMIT 100");
  let deleted = 0;
  for (const row of queued.rows) {
    try {
      await deleteCommunityImageObject(row.object_path);
      await db.$client.query("DELETE FROM public.community_image_objects WHERE object_path = $1", [row.object_path]);
      deleted++;
    } catch { /* Keep the inventory entry for the next maintenance retry. */ }
  }
  return { expired: expired.rowCount ?? 0, deleted, retry: queued.rows.length - deleted };
}
