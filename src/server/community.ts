import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { db } from "../db";
import type { Locale } from "../i18n/config";
import { COMMUNITY_RULES_VERSION, CommunityError, redactCommunityText, type CommunityEntry, type CommunityKind, type CommunityStatus } from "../utils/community";
import type { validateCommunityComment, validateCommunityPost } from "../utils/community";
import { attachCommunityImages } from "./communityImages";
import type { CommunityImage } from "../utils/community";

type Row = {
  id: string; post_id?: string; title?: string; body: string; evidence_urls: string[];
  alias: string; locale: Locale; status: CommunityStatus; created_at: Date;
  author_id: string; kind?: "opinion" | "correction"; review_revision: number;
  moderation_note: string; comment_count?: number;
  parent_body?: string; parent_evidence_urls?: string[]; parent_status?: CommunityStatus;
  images?: CommunityImage[]; parent_images?: CommunityImage[];
};
function dto(row: Row, viewer?: string): CommunityEntry {
  const title = redactCommunityText(row.title ?? "");
  const body = redactCommunityText(row.body);
  return { id: row.id, postId: row.post_id ?? row.id, title, body, evidenceUrls: row.evidence_urls, images: row.images ?? [],
    alias: row.alias, locale: row.locale, status: row.status, createdAt: row.created_at.toISOString(),
    isOwner: row.author_id === viewer, kind: row.kind ?? null, revision: row.review_revision,
    moderationNote: row.author_id === viewer ? redactCommunityText(row.moderation_note) : "",
    commentCount: Number(row.comment_count ?? 0), filtered: title !== (row.title ?? "") || body !== row.body };
}
// Return only same-origin image IDs and dimensions. Object paths remain private.
const imageSelect = (column: "post_id" | "comment_id", parent: string) => `(SELECT coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'width', i.width, 'height', i.height) ORDER BY i.created_at, i.id), '[]'::jsonb) FROM public.community_images i WHERE i.${column} = ${parent}.id AND i.ready)`;
const postSelect = `SELECT p.*, a.alias, ${imageSelect("post_id", "p")} AS images, (SELECT count(*)::int FROM public.community_comments c WHERE c.post_id = p.id AND c.status = 'published') AS comment_count FROM public.community_posts p JOIN public.community_profiles a ON a.user_id = p.author_id`;
export async function listCommunityPosts(locale: Locale, page: number, ownerId?: string) {
  const result = await db.$client.query<Row>(`${postSelect} WHERE p.locale = $1 AND ${ownerId ? "p.author_id = $2" : "p.status = 'published'"} ORDER BY p.created_at DESC, p.id DESC LIMIT 21 OFFSET $${ownerId ? 3 : 2}`,
    ownerId ? [locale, ownerId, (page - 1) * 20] : [locale, (page - 1) * 20]);
  return { posts: result.rows.slice(0, 20).map(row => dto(row, ownerId)), hasMore: result.rows.length > 20 };
}
export async function readCommunityPost(id: string, viewer?: string, page = 1) {
  const result = await db.$client.query<Row>(`${postSelect} WHERE p.id = $1 AND (p.status = 'published' OR p.author_id = $2::uuid)`, [id, viewer ?? null]);
  if (!result.rows[0]) throw new CommunityError(404, "NOT_FOUND");
  const comments = await db.$client.query<Row>(`SELECT c.*, a.alias, p.locale, ${imageSelect("comment_id", "c")} AS images FROM public.community_comments c JOIN public.community_profiles a ON a.user_id = c.author_id JOIN public.community_posts p ON p.id = c.post_id WHERE c.post_id = $1 AND (c.status = 'published' OR c.author_id = $2::uuid) ORDER BY c.created_at DESC, c.id DESC LIMIT 51 OFFSET $3`, [id, viewer ?? null, (page - 1) * 50]);
  return { post: dto(result.rows[0], viewer), comments: comments.rows.slice(0, 50).map(row => dto(row, viewer)), hasMoreComments: comments.rows.length > 50 };
}
export async function createCommunityPost(userId: string, input: ReturnType<typeof validateCommunityPost>) {
  const client = await db.$client.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO public.community_profiles (user_id, alias, rules_version) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET rules_version = EXCLUDED.rules_version, accepted_at = now()", [userId, "Loop-" + randomBytes(6).toString("hex").toUpperCase(), COMMUNITY_RULES_VERSION]);
    const id = randomUUID();
    await client.query("INSERT INTO public.community_posts (id, author_id, locale, title, body, evidence_urls, status) VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'published')", [id, userId, input.locale, input.title, input.body, JSON.stringify(input.evidenceUrls)]);
    await attachCommunityImages(client, userId, input.imageIds, "post", id);
    await client.query("COMMIT");
    return { id, status: "published" as const };
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
  finally { client.release(); }
}
export async function createCommunityComment(userId: string, postId: string, input: ReturnType<typeof validateCommunityComment>) {
  const client = await db.$client.connect();
  try {
    await client.query("BEGIN");
    // Lock the parent against withdrawal/moderation until the comment commits.
    const parent = await client.query("SELECT id FROM public.community_posts WHERE id = $1 AND status = 'published' FOR SHARE", [postId]);
    if (!parent.rowCount) throw new CommunityError(404, "NOT_FOUND");
    await client.query("INSERT INTO public.community_profiles (user_id, alias, rules_version) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET rules_version = EXCLUDED.rules_version, accepted_at = now()", [userId, "Loop-" + randomBytes(6).toString("hex").toUpperCase(), COMMUNITY_RULES_VERSION]);
    const id = randomUUID();
    await client.query("INSERT INTO public.community_comments (id, post_id, author_id, kind, body, evidence_urls, status) VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'published')", [id, postId, userId, input.kind, input.body, JSON.stringify(input.evidenceUrls)]);
    await attachCommunityImages(client, userId, input.imageIds, "comment", id);
    await client.query("COMMIT");
    return { id, status: "published" as const };
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
  finally { client.release(); }
}
export async function withdrawCommunityContent(kind: CommunityKind, id: string, userId: string) {
  const table = kind === "post" ? "community_posts" : "community_comments";
  const result = await db.$client.query(`UPDATE public.${table} SET status = 'withdrawn', review_revision = review_revision + 1 WHERE id = $1 AND author_id = $2 AND status <> 'withdrawn' RETURNING id`, [id, userId]);
  if (!result.rowCount) throw new CommunityError(404, "NOT_FOUND");
}
export async function readCommunityQueue(status: "pending" | "published" | "hidden" | "rejected", page: number) {
  const [posts, comments] = await Promise.all([
    db.$client.query<Row>(`${postSelect} WHERE p.status = $1 ORDER BY p.created_at, p.id LIMIT 21 OFFSET $2`, [status, (page - 1) * 20]),
    db.$client.query<Row>(`SELECT c.*, a.alias, p.locale, p.title, ${imageSelect("comment_id", "c")} AS images, ${imageSelect("post_id", "p")} AS parent_images, p.body AS parent_body, p.evidence_urls AS parent_evidence_urls, p.status AS parent_status FROM public.community_comments c JOIN public.community_profiles a ON a.user_id = c.author_id JOIN public.community_posts p ON p.id = c.post_id WHERE c.status = $1 ORDER BY c.created_at, c.id LIMIT 21 OFFSET $2`, [status, (page - 1) * 20]),
  ]);
  const entry = (row: Row) => ({ ...dto(row), rawTitle: row.title ?? "", rawBody: row.body, moderationNote: row.moderation_note,
    ...(row.parent_status ? { parentBody: row.parent_body, parentEvidenceUrls: row.parent_evidence_urls, parentImages: row.parent_images ?? [], parentStatus: row.parent_status } : {}) });
  return { posts: posts.rows.slice(0, 20).map(entry), comments: comments.rows.slice(0, 20).map(entry), hasMore: posts.rows.length > 20 || comments.rows.length > 20 };
}
export async function moderateCommunityContent(actorId: string, kind: CommunityKind, id: string, revision: number, status: "published" | "rejected" | "hidden", note: string) {
  const client = await db.$client.connect();
  const table = kind === "post" ? "community_posts" : "community_comments";
  try {
    await client.query("BEGIN");
    if (kind === "comment" && status === "published") {
      const parent = await client.query("SELECT p.id FROM public.community_posts p JOIN public.community_comments c ON c.post_id = p.id WHERE c.id = $1 AND p.status = 'published' FOR SHARE OF p", [id]);
      if (!parent.rowCount) throw new CommunityError(409, "PARENT_NOT_PUBLISHED");
    }
    const updated = await client.query(`UPDATE public.${table} SET status = $3, moderation_note = $4, reviewed_at = now(), review_revision = review_revision + 1 WHERE id = $1 AND review_revision = $2 AND status <> 'withdrawn' RETURNING id`, [id, revision, status, note]);
    if (!updated.rowCount) throw new CommunityError(409, "REVIEW_CONFLICT");
    await client.query("INSERT INTO public.community_moderation_log (id, post_id, comment_id, actor_id, decision) VALUES ($1, $2, $3, $4, $5)", [randomUUID(), kind === "post" ? id : null, kind === "comment" ? id : null, actorId, status]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
  finally { client.release(); }
}
