"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAccount } from "../../hooks/useAccount";
import { localizedHref, numberLocales, type Locale } from "../../i18n/config";
import { getCommunityMessages } from "../../i18n/communityMessages";
import { isCommunityId, type CommunityEntry, type CommunityStatus } from "../../utils/community";
import styles from "./community.module.css";

export async function communityRequest<T>(url: string, method = "GET", body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { method, credentials: "same-origin", cache: "no-store", signal,
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "UNAVAILABLE");
  return data as T;
}
export function useCommunityRead<T>(url: string | null, scope: string) {
  const [revision, setRevision] = useState(0);
  const key = `${scope}:${url}:${revision}`;
  const [state, setState] = useState<{ key: string; data?: T; error?: boolean } | null>(null);
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    void communityRequest<T>(url, "GET", undefined, controller.signal)
      .then(data => { if (!controller.signal.aborted) setState({ key, data }); })
      .catch(() => { if (!controller.signal.aborted) setState({ key, error: true }); });
    return () => controller.abort();
  }, [url, key]);
  // Account changes hide the previous account's pending content immediately.
  return { data: state?.key === key ? state.data : undefined, error: state?.key === key && state.error,
    loading: url !== null && state?.key !== key, refresh: () => setRevision(value => value + 1) };
}
export function CommunityRules({ locale }: { locale: Locale }) {
  const copy = getCommunityMessages(locale);
  return <details className={styles.rules}><summary>{copy.rulesTitle}</summary><p>{copy.rulesBody}</p><p>{copy.publicNotice}</p><p>{copy.privacy}</p></details>;
}
export function CommunityGate({ locale }: { locale: Locale }) {
  const copy = getCommunityMessages(locale);
  const account = useAccount();
  return <div className={styles.login}><p>{account.status === "loading" ? copy.loading : copy.loginNotice}</p>
    {account.status !== "loading" && <Link className={styles.primary} href={localizedHref(locale, "/account")}>{account.status === "account" ? copy.onboarding : copy.login}</Link>}</div>;
}
function EntryMeta({ entry, locale }: { entry: CommunityEntry; locale: Locale }) {
  const copy = getCommunityMessages(locale);
  return <div className={styles.meta}><span>{entry.alias}</span><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString(numberLocales[locale], { dateStyle: "medium", timeStyle: "short" })}</time>
    <span className={styles.status}>{copy[entry.status]}</span>{entry.kind === "correction" && <strong>{copy.correction}</strong>}</div>;
}
export function EvidenceLinks({ urls, locale }: { urls: string[]; locale: Locale }) {
  const copy = getCommunityMessages(locale);
  return <div className={styles.evidence}>{urls.map((url, index) => <a key={url} href={url} target="_blank" rel="noopener noreferrer nofollow ugc">{copy.evidenceLabel} {index + 1} ({new URL(url).hostname})</a>)}</div>;
}
function errorMessage(error: unknown, locale: Locale) {
  const copy = getCommunityMessages(locale);
  const code = error instanceof Error ? error.message : "";
  if (code === "LOGIN_REQUIRED" || code === "ACCOUNT_MISMATCH") return copy.loginNotice;
  if (code === "ONBOARDING_REQUIRED") return copy.onboarding;
  if (code === "EVIDENCE_REQUIRED" || code === "INVALID_EVIDENCE") return copy.evidenceHint;
  if (code === "RULES_REQUIRED") return copy.acceptRules;
  if (code === "RATE_LIMITED") return copy.postingLimit;
  return copy.error;
}
export function CommunityBoard({ locale }: { locale: Locale }) {
  const copy = getCommunityMessages(locale);
  const account = useAccount();
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);
  const userId = account.account?.id;
  const activeMine = mine && account.status === "account";
  const result = useCommunityRead<{ posts: CommunityEntry[]; hasMore: boolean }>(`/api/community/posts?locale=${locale}&page=${page}${activeMine ? "&mine=1" : ""}`, userId ?? account.status);
  return <section className={styles.content}>
    <CommunityRules locale={locale} />
    <div className={styles.toolbar}><div className={styles.tabs} role="group" aria-label={copy.title}>
      <button type="button" aria-pressed={!activeMine} onClick={() => { setMine(false); setPage(1); }}>{copy.all}</button>
      {account.status === "account" && <button type="button" aria-pressed={activeMine} onClick={() => { setMine(true); setPage(1); }}>{copy.mine}</button>}
    </div><Link className={styles.primary} href={localizedHref(locale, "/community/new")}>{copy.write}</Link></div>
    <p className={styles.notice}>{copy.reviewNotice}</p>
    {result.loading && <p role="status">{copy.loading}</p>}
    {result.error && <p role="alert" className={styles.error}>{copy.unavailable}</p>}
    {result.data?.posts.length === 0 && <p className={styles.notice}>{copy.empty}</p>}
    {result.data?.posts.map(entry => <Link key={entry.id} href={localizedHref(locale, `/community/${entry.id}`)} className={styles.row}>
      <EntryMeta entry={entry} locale={locale} /><h2>{entry.title}</h2><p>{entry.body.slice(0, 130)}</p><p>{copy.comments} {entry.commentCount}</p>
    </Link>)}
    <div className={styles.pager}>{page > 1 && <button className={styles.secondary} onClick={() => setPage(value => value - 1)}>{copy.previous}</button>}
      {result.data?.hasMore && <button className={styles.secondary} onClick={() => setPage(value => value + 1)}>{copy.next}</button>}</div>
    {account.status !== "account" && <CommunityGate locale={locale} />}
  </section>;
}
export function CommunityNewPost({ locale }: { locale: Locale }) {
  const copy = getCommunityMessages(locale);
  const account = useAccount();
  const router = useRouter();
  return <section className={styles.content}><CommunityRules locale={locale} />
    {account.status === "account" && account.account?.onboardingComplete
      ? <CommunityForm key={account.account.id} locale={locale} userId={account.account.id} onSubmitted={id => { if (isCommunityId(id)) router.push(localizedHref(locale, `/community/${id}`)); }} />
      : <CommunityGate locale={locale} />}
    <Link href={localizedHref(locale, "/community")} className={styles.secondary}>{copy.back}</Link>
  </section>;
}
export function CommunityForm({ locale, userId, postId, onSubmitted }: { locale: Locale; userId: string; postId?: string; onSubmitted: (id: string) => void }) {
  const copy = getCommunityMessages(locale);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError("");
    const body = { expectedUserId: userId, body: String(data.get("body") ?? ""),
      evidenceUrls: String(data.get("evidence") ?? "").split(/\r?\n/).map(value => value.trim()).filter(Boolean), acceptRules: data.get("acceptRules") === "on",
      ...(postId ? { kind: data.get("kind") } : { title: data.get("title"), locale, confirmIntent: data.get("confirmIntent") === "on" }) };
    try {
      const result = await communityRequest<{ id: string }>(postId ? `/api/community/posts/${postId}/comments` : "/api/community/posts", "POST", body);
      form.reset(); onSubmitted(result.id);
    } catch (cause) { setError(errorMessage(cause, locale)); }
    finally { setBusy(false); }
  }
  return <form className={styles.form} onSubmit={event => void submit(event)}>
    {postId ? <label className={styles.field}>{copy.comments}<select name="kind" defaultValue="opinion"><option value="opinion">{copy.opinion}</option><option value="correction">{copy.correction}</option></select></label>
      : <label className={styles.field}>{copy.titleLabel}<input name="title" required minLength={4} maxLength={100} /></label>}
    <label className={styles.field}>{postId ? copy.commentLabel : copy.bodyLabel}<textarea name="body" required minLength={postId ? 2 : 20} maxLength={postId ? 2000 : 4000} /></label>
    <label className={styles.field}>{copy.evidenceLabel}<textarea className={styles.linksInput} name="evidence" required={!postId} maxLength={3002} spellCheck={false} autoCapitalize="off" placeholder="https://…" /><small>{copy.evidenceHint}</small></label>
    <p className={styles.notice}>{copy.publicNotice}</p>
    {!postId && <label className={styles.check}><input type="checkbox" name="confirmIntent" required />{copy.confirmIntent}</label>}
    <label className={styles.check}><input type="checkbox" name="acceptRules" required />{copy.acceptRules}</label>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <button className={styles.primary} type="submit" disabled={busy}>{busy ? copy.loading : postId ? copy.submitComment : copy.submitPost}</button>
    <p className={styles.notice}>{copy.reviewNotice} {copy.postingLimit}</p>
  </form>;
}
function WithdrawButton({ entry, kind, userId, locale, onDone }: { entry: CommunityEntry; kind: "post" | "comment"; userId: string; locale: Locale; onDone: () => void }) {
  const copy = getCommunityMessages(locale);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function withdraw() {
    setBusy(true); setError("");
    try { await communityRequest(`/api/community/${kind === "post" ? "posts" : "comments"}/${entry.id}`, "DELETE", { expectedUserId: userId }); onDone(); }
    catch (cause) { setError(errorMessage(cause, locale)); }
    finally { setBusy(false); }
  }
  return <><button className={styles.secondary} disabled={busy} onClick={() => void withdraw()}>{copy.withdraw}</button>{error && <p role="alert" className={styles.error}>{error}</p>}</>;
}
export function CommunityPost({ id, locale }: { id: string; locale: Locale }) {
  const copy = getCommunityMessages(locale);
  const account = useAccount();
  const userId = account.account?.id;
  const [commentPage, setCommentPage] = useState(1);
  const [sent, setSent] = useState(false);
  const result = useCommunityRead<{ post: CommunityEntry; comments: CommunityEntry[]; hasMoreComments: boolean }>(`/api/community/posts/${id}?commentPage=${commentPage}`, userId ?? account.status);
  const post = result.data?.post;
  const canWrite = account.status === "account" && account.account?.onboardingComplete;
  function refresh() { setCommentPage(1); result.refresh(); }
  return <section className={styles.content}>
    <Link className={styles.secondary} href={localizedHref(locale, "/community")}>{copy.back}</Link>
    {result.loading && <p role="status" className={styles.notice}>{copy.loading}</p>}
    {result.error && <p role="alert" className={styles.error}>{copy.unavailable}</p>}
    {post && <><article className={styles.row}><EntryMeta entry={post} locale={locale} /><h2>{post.title}</h2>
      <p className={styles.notice}>{copy.reviewNotice}</p><div className={styles.body}>{post.body}</div><EvidenceLinks urls={post.evidenceUrls} locale={locale} />
      {post.filtered && <p className={styles.notice}>{copy.filtered}</p>}
      {post.moderationNote && <p className={styles.notice}>{post.moderationNote}</p>}
      {post.isOwner && userId && post.status !== "withdrawn" && <WithdrawButton entry={post} kind="post" userId={userId} locale={locale} onDone={refresh} />}
    </article><section className={styles.comments} aria-label={copy.comments}><h2>{copy.comments} {post.commentCount}</h2>
      {result.data?.comments.map(comment => <article key={comment.id} className={styles.comment} data-kind={comment.kind}>
        <EntryMeta entry={comment} locale={locale} /><div className={styles.body}>{comment.body}</div><EvidenceLinks urls={comment.evidenceUrls} locale={locale} />
        {comment.filtered && <p className={styles.notice}>{copy.filtered}</p>}{comment.moderationNote && <p className={styles.notice}>{comment.moderationNote}</p>}
        {comment.isOwner && userId && comment.status !== "withdrawn" && <WithdrawButton entry={comment} kind="comment" userId={userId} locale={locale} onDone={refresh} />}
      </article>)}
      <div className={styles.pager}>{commentPage > 1 && <button className={styles.secondary} onClick={() => setCommentPage(value => value - 1)}>{copy.previous}</button>}{result.data?.hasMoreComments && <button className={styles.secondary} onClick={() => setCommentPage(value => value + 1)}>{copy.more}</button>}</div>
      {sent && <p role="status" className={styles.success}>{copy.commentSent}</p>}
      {post.status === "published" && <><CommunityRules locale={locale} />{canWrite && userId
        ? <CommunityForm key={`${id}:${userId}`} locale={locale} userId={userId} postId={id} onSubmitted={() => { setSent(true); refresh(); }} />
        : <CommunityGate locale={locale} />}</>}
    </section></>}
  </section>;
}
export type CommunityAdminEntry = CommunityEntry & { rawTitle: string; rawBody: string };
export function CommunityModeration() {
  const account = useAccount();
  const userId = account.account?.id;
  const [status, setStatus] = useState<CommunityStatus>("pending");
  const [page, setPage] = useState(1);
  const result = useCommunityRead<{ posts: CommunityAdminEntry[]; comments: CommunityAdminEntry[]; hasMore: boolean }>(userId ? `/api/admin/community?status=${status}&page=${page}` : null, userId ?? account.status);
  return <section className={styles.content}><p className={styles.notice}>증거의 전후 맥락, 개인정보, 욕설·공격 유도와 반론 여부를 확인한 뒤 처리하세요. 공개 승인은 공식 제재나 계정 소유권 인증이 아닙니다.</p>
    {!userId && <CommunityGate locale="ko" />}
    {userId && <><label className={styles.field}>검토 상태<select value={status} onChange={event => { setStatus(event.target.value as CommunityStatus); setPage(1); }}>{(["pending", "published", "rejected", "hidden"] as const).map(value => <option key={value} value={value}>{getCommunityMessages("ko")[value]}</option>)}</select></label>
      {result.error && <p role="alert">접근할 수 없거나 커뮤니티를 불러오지 못했습니다.</p>}{result.loading && <p role="status">불러오는 중…</p>}
      {result.data && result.data.posts.length + result.data.comments.length === 0 && <p className={styles.notice}>해당 상태의 글·댓글이 없습니다.</p>}
      {result.data?.posts.map(entry => <ModerationEntry key={entry.id} entry={entry} kind="post" userId={userId} onDone={result.refresh} />)}
      {result.data?.comments.map(entry => <ModerationEntry key={entry.id} entry={entry} kind="comment" userId={userId} onDone={result.refresh} />)}
      <div className={styles.pager}>{page > 1 && <button className={styles.secondary} onClick={() => setPage(value => value - 1)}>이전</button>}{result.data?.hasMore && <button className={styles.secondary} onClick={() => setPage(value => value + 1)}>다음</button>}</div></>}
  </section>;
}
function ModerationEntry({ entry, kind, userId, onDone }: { entry: CommunityAdminEntry; kind: "post" | "comment"; userId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try { await communityRequest("/api/admin/community", "PATCH", { expectedUserId: userId, kind, id: entry.id, revision: entry.revision, status: data.get("status"), note: data.get("note") }); onDone(); }
    catch { setError("처리하지 못했습니다. 다른 운영자의 변경이나 상위 글의 공개 상태를 확인하고 새로고침하세요."); }
    finally { setBusy(false); }
  }
  return <article className={styles.adminEntry}><EntryMeta entry={entry} locale="ko" /><h2>{kind === "post" ? "글" : entry.kind === "correction" ? "반론·정정 댓글" : "댓글"}: {entry.rawTitle}</h2>
    <p className={styles.body}>{entry.rawBody}</p><EvidenceLinks urls={entry.evidenceUrls} locale="ko" />
    <Link href={`/community/${entry.postId}`} className={styles.secondary}>게시물 열기</Link>
    <form onSubmit={event => void submit(event)}><label className={styles.field}>처리<select name="status" defaultValue="published"><option value="published">공개 승인</option><option value="rejected">반려</option><option value="hidden">공개 중단</option></select></label>
      <label className={styles.field}>검토 사유<input name="note" required minLength={2} maxLength={1000} /></label><button className={styles.primary} disabled={busy}>처리</button></form>
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </article>;
}
