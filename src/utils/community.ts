import { isLocale, type Locale } from "../i18n/config";

export const COMMUNITY_RULES_VERSION = "community-v3";
export type CommunityStatus = "pending" | "published" | "rejected" | "hidden" | "withdrawn";
export type CommunityKind = "post" | "comment";
export type CommentKind = "opinion" | "correction";
export type CommunityImage = { id: string; width: number; height: number };
export type CommunityEntry = {
  id: string; postId: string; title: string; body: string; evidenceUrls: string[];
  images: CommunityImage[];
  alias: string; locale: Locale; status: CommunityStatus; createdAt: string;
  isOwner: boolean; kind: CommentKind | null; revision: number;
  moderationNote: string; commentCount: number; filtered: boolean;
};
export class CommunityError extends Error {
  constructor(public readonly status: number, public readonly code: string) { super(code); }
}
export const isCommunityId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function communityPage(value: string | null) {
  if (value === null) return 1;
  if (!/^[1-9][0-9]{0,2}$/.test(value)) throw new CommunityError(400, "INVALID_BODY");
  return Number(value);
}
function text(value: unknown, code: string) {
  if (typeof value !== "string") throw new CommunityError(400, code);
  const normalized = value.normalize("NFKC").trim();
  if (!normalized) {
    throw new CommunityError(400, code);
  }
  if (/[\p{Cf}\p{Cs}\u0000-\u0008\u000B-\u001F\u007F]/u.test(normalized)) throw new CommunityError(400, code + "_CHARACTERS");
  return normalized;
}
// A conservative display filter, not a verdict on intent or harassment.
export function redactCommunityText(value: string) {
  return value.replace(/씨[\s.*_-]*발|(?<![가-힣])시[\s.*_-]*발(?![가-힣])|ㅅ[\s.*_-]*ㅂ|병[\s.*_-]*신|ㅂ[\s.*_-]*ㅅ|좆|개[\s.*_-]*새[\s.*_-]*끼|지[\s.*_-]*랄|\b(?:fuck(?:ing|er|ed)?|bitch(?:es)?|asshole|cunt)\b/giu, "•••");
}
export function communityEvidence(value: unknown, required: boolean) {
  if (!Array.isArray(value) || value.length > 3 || (required && value.length === 0)) throw new CommunityError(400, "EVIDENCE_REQUIRED");
  return [...new Set(value.map(item => {
    if (typeof item !== "string" || item.length > 1000) throw new CommunityError(400, "INVALID_EVIDENCE");
    let url: URL;
    try { url = new URL(item.trim()); } catch { throw new CommunityError(400, "INVALID_EVIDENCE"); }
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) throw new CommunityError(400, "INVALID_EVIDENCE");
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const allowed = (
      (host === "youtube.com" || host === "m.youtube.com") && ((url.pathname === "/watch" && /^[\w-]{11}$/.test(url.searchParams.get("v") ?? "")) || /^\/shorts\/[\w-]{11}\/?$/.test(url.pathname))
    ) || (host === "youtu.be" && /^\/[\w-]{11}\/?$/.test(url.pathname))
      || (host === "vimeo.com" && /^\/\d+\/?$/.test(url.pathname))
      || (["imgur.com", "i.imgur.com"].includes(host) && /^\/(?:a\/|gallery\/)?[a-zA-Z0-9]+(?:\.(?:png|jpe?g|webp|gif))?\/?$/i.test(url.pathname))
      || (["postimg.cc", "i.postimg.cc"].includes(host) && /^\/[a-zA-Z0-9]+(?:\/[a-zA-Z0-9._-]+)?\/?$/.test(url.pathname));
    if (!allowed) throw new CommunityError(400, "INVALID_EVIDENCE");
    const videoId = url.searchParams.get("v");
    url.search = ""; url.hash = "";
    if ((host === "youtube.com" || host === "m.youtube.com") && url.pathname === "/watch") url.searchParams.set("v", videoId!);
    return url.href;
  }))];
}
export function validateCommunityPost(body: Record<string, unknown>) {
  if (body.acceptRules !== true) throw new CommunityError(400, "RULES_REQUIRED");
  if (typeof body.locale !== "string" || !isLocale(body.locale)) throw new CommunityError(400, "INVALID_BODY");
  const content = { title: text(body.title, "INVALID_TITLE"), body: text(body.body, "INVALID_POST_BODY"), locale: body.locale };
  const evidence = validateEvidence(body);
  return { ...content, ...evidence };
}
export function validateCommunityComment(body: Record<string, unknown>) {
  if (body.acceptRules !== true) throw new CommunityError(400, "RULES_REQUIRED");
  const kind = body.kind ?? "opinion";
  if (kind !== "opinion" && kind !== "correction") throw new CommunityError(400, "INVALID_BODY");
  return { body: text(body.body, "INVALID_COMMENT_BODY"), kind, ...validateEvidence(body) };
}
function validateEvidence(body: Record<string, unknown>) {
  const evidenceUrls = communityEvidence(body.evidenceUrls ?? [], false);
  const ids = body.imageIds ?? [];
  if (!Array.isArray(ids) || ids.length > 3 || ids.some(id => typeof id !== "string" || !isCommunityId(id)) || new Set(ids).size !== ids.length) {
    throw new CommunityError(400, "INVALID_IMAGES");
  }
  if (evidenceUrls.length + ids.length > 3) throw new CommunityError(400, "TOO_MANY_EVIDENCE");
  return { evidenceUrls, imageIds: ids as string[] };
}
