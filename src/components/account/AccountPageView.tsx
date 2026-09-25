"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  getAccountDeletionMessages,
  getAccountErrorMessage,
  getAccountMessages,
} from "../../i18n/accountMessages";
import { localizedHref, type Locale } from "../../i18n/config";
import { getMessages } from "../../i18n/messages";
import { useAccount } from "../../hooks/useAccount";
import {
  readAccountPersonalBests,
  queueLegacyPersonalBestImport,
  removeAccountBrowserData,
  writeAccountPersonalBests,
} from "../../utils/accountStore";
import type { PersonalBestRecord } from "../../utils/minigames/personalBest";
import { readLegacyPersonalBestCandidates } from "../../utils/minigames/legacyImport";
import { localizedModeLabel } from "../../i18n/accountMessages";
import { publishAccountSessionChange, refreshAccountStatus } from "../../hooks/useAccount";
import { signOutAccount, startGoogleSignIn } from "../../utils/accountAuthClient";
import SyncStatus from "./SyncStatus";

type ApiErrorBody = { error?: unknown; account?: unknown; personalBests?: unknown };
const DELETE_TARGET_SESSION_KEY = "brawl-status:account:pending-deletion-user";

function clearDeletionTarget() {
  try {
    window.sessionStorage.removeItem(DELETE_TARGET_SESSION_KEY);
  } catch {
    // Session state cannot authorize deletion; the server still verifies it.
  }
}

async function readResponse(response: Response) {
  return await response.json().catch(() => ({})) as ApiErrorBody;
}

function extractErrorCode(body: ApiErrorBody) {
  return typeof body.error === "string" ? body.error : "UNKNOWN";
}

function isPersonalBestRecord(value: unknown): value is PersonalBestRecord {
  return Boolean(
    value && typeof value === "object" &&
    typeof (value as PersonalBestRecord).gameId === "string" &&
    typeof (value as PersonalBestRecord).mode === "string" &&
    Number.isSafeInteger((value as PersonalBestRecord).score) &&
    Number.isSafeInteger((value as PersonalBestRecord).total) &&
    Number.isSafeInteger((value as PersonalBestRecord).revision),
  );
}

export default function AccountPageView({ locale }: { locale: Locale }) {
  const copy = getAccountMessages(locale);
  const deletionCopy = getAccountDeletionMessages(locale);
  const common = getMessages(locale);
  const state = useAccount();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [profileDraft, setProfileDraft] = useState<{
    userId: string;
    revision: number;
    nickname: string;
    playerTag: string;
  } | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [confirmEligibility, setConfirmEligibility] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [needsFreshGoogle, setNeedsFreshGoogle] = useState(false);
  const [deletionTargetUserId, setDeletionTargetUserId] = useState<string | null>(null);
  const [bests, setBests] = useState<PersonalBestRecord[]>([]);
  const [bestLoading, setBestLoading] = useState(false);
  const [legacyCandidates, setLegacyCandidates] = useState<ReturnType<typeof readLegacyPersonalBestCandidates>>([]);
  const [bestsForUser, setBestsForUser] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const accountId = state.account?.id;
  const accountRevision = state.account?.profileRevision;
  const accountOnboarded = state.account?.onboardingComplete;
  const syncEnabled = state.syncEnabled;
  const effectiveDeletionTargetUserId =
    state.status === "deletionOnly" && !state.deletionUserId ? null : deletionTargetUserId;
  const profileDraftIsCurrent = Boolean(
    profileDraft && profileDraft.userId === accountId && profileDraft.revision === accountRevision,
  );
  const nickname = profileDraftIsCurrent ? profileDraft!.nickname : state.account?.nickname ?? "";
  const playerTag = profileDraftIsCurrent ? profileDraft!.playerTag : state.account?.defaultPlayerTag ?? "";
  const displayedBests = state.account && bestsForUser === state.account.id ? bests : [];
  const deletionAccountMismatch = Boolean(
    effectiveDeletionTargetUserId &&
    (state.account?.id ?? (state.status === "deletionOnly" ? state.deletionUserId : null)) !== effectiveDeletionTargetUserId,
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored = window.sessionStorage.getItem(DELETE_TARGET_SESSION_KEY);
        if (stored && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored)) {
          setDeletionTargetUserId(stored);
        }
      } catch {
        // The server still enforces same-account fresh authentication.
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (state.status === "deletionOnly" && !state.deletionUserId && deletionTargetUserId) {
      clearDeletionTarget();
    }
  }, [deletionTargetUserId, state.deletionUserId, state.status]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  const refreshLegacyCandidates = useCallback(() => {
    try {
      setLegacyCandidates(readLegacyPersonalBestCandidates(window.localStorage));
    } catch {
      setLegacyCandidates([]);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(refreshLegacyCandidates, 0);
    return () => window.clearTimeout(timeout);
  }, [refreshLegacyCandidates]);

  useEffect(() => {
    if (state.status !== "account" || !accountId) return;
    const activeAccountId = accountId;
    const sequence = ++requestSequence.current;
    let cancelled = false;
    void (async () => {
      const cached = await readAccountPersonalBests(activeAccountId).catch(() => []);
      if (cancelled || sequence !== requestSequence.current) return;
      setBestLoading(true);
      setBestsForUser(activeAccountId);
      setBests(cached.filter(isPersonalBestRecord));
      if (!accountOnboarded || !syncEnabled) {
        setBestLoading(false);
        return;
      }
      try {
        const response = await fetch("/api/account/minigame-bests", {
          cache: "no-store",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });
        const body = await readResponse(response);
        if (!response.ok) throw new Error(extractErrorCode(body));
        const records = Array.isArray(body.personalBests) ? body.personalBests.filter(isPersonalBestRecord) : [];
        if (cancelled || sequence !== requestSequence.current) return;
        setBests(records);
        setBestsForUser(activeAccountId);
        await writeAccountPersonalBests(activeAccountId, records);
      } catch (requestError) {
        if (!cancelled && sequence === requestSequence.current) {
          setError(getAccountErrorMessage(locale, requestError instanceof Error ? requestError.message : null));
        }
      } finally {
        if (!cancelled && sequence === requestSequence.current) setBestLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId, accountOnboarded, locale, state.status, syncEnabled]);

  async function handleGoogleSignIn() {
    setBusy(true);
    setError("");
    try {
      await startGoogleSignIn(localizedHref(locale, "/account"));
    } catch {
      setError(copy.errorGeneric);
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    setError("");
    try {
      await signOutAccount();
      clearDeletionTarget();
      setDeletionTargetUserId(null);
      setNeedsFreshGoogle(false);
      setNotice(copy.signOut);
    } catch {
      setError(copy.signOutFailed);
    } finally {
      setBusy(false);
    }
  }

  async function handleOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.account) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account/onboarding", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedUserId: state.account.id,
          acceptTerms,
          acknowledgePrivacy: acceptPrivacy,
          confirmEligibility,
        }),
      });
      const body = await readResponse(response);
      if (!response.ok) throw new Error(extractErrorCode(body));
      await refreshAccountStatus();
      setNotice(copy.completeOnboarding);
    } catch (requestError) {
      setError(getAccountErrorMessage(locale, requestError instanceof Error ? requestError.message : null));
    } finally {
      setBusy(false);
    }
  }

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.account) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedUserId: state.account.id,
          expectedRevision: state.account.profileRevision,
          nickname,
          defaultPlayerTag: playerTag.trim() || null,
        }),
      });
      const body = await readResponse(response);
      if (!response.ok) {
        if (response.status === 409 && body.account && typeof body.account === "object") {
          await refreshAccountStatus();
        }
        throw new Error(extractErrorCode(body));
      }
      setNotice(copy.profileSaved);
      await refreshAccountStatus();
    } catch (requestError) {
      const code = requestError instanceof Error ? requestError.message : null;
      setError(code === "PROFILE_CHANGED" ? copy.profileConflict : getAccountErrorMessage(locale, code));
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    if (!state.account || legacyCandidates.length === 0) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const operationId = crypto.randomUUID();
      const result = await queueLegacyPersonalBestImport(state.account.id, legacyCandidates, operationId);
      if (!result.persisted) throw new Error("LOCAL_STORAGE_FAILED");
      setNotice(copy.importQueued);
      await refreshAccountStatus();
    } catch {
      setError(copy.importFailed);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    const targetUserId = state.account?.id ??
      (state.status === "deletionOnly" ? state.deletionUserId : null);
    if (!targetUserId || !deleteConfirmed) return;
    if (!state.deletionReauthReady) {
      await handleFreshGoogleSignIn();
      return;
    }
    if (effectiveDeletionTargetUserId && effectiveDeletionTargetUserId !== targetUserId) {
      setError(deletionCopy.differentAccount);
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    setNeedsFreshGoogle(false);
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedUserId: targetUserId, confirmation: true }),
      });
      const body = await readResponse(response);
      if (!response.ok) {
        const code = extractErrorCode(body);
        if (code === "FRESH_GOOGLE_SIGN_IN_REQUIRED") {
          setNeedsFreshGoogle(true);
          setDeletionTargetUserId(targetUserId);
          try {
            window.sessionStorage.setItem(DELETE_TARGET_SESSION_KEY, targetUserId);
          } catch {
            // The server remains authoritative; a fresh session is still required.
          }
        }
        throw new Error(code);
      }
      const browserData = await removeAccountBrowserData(targetUserId);
      clearDeletionTarget();
      setDeletionTargetUserId(null);
      await publishAccountSessionChange();
      setNotice(browserData.cleared ? deletionCopy.deleted : deletionCopy.browserCleanupFailed);
    } catch (requestError) {
      setError(getAccountErrorMessage(locale, requestError instanceof Error ? requestError.message : null));
    } finally {
      setBusy(false);
    }
  }

  async function handleFreshGoogleSignIn() {
    const targetUserId = effectiveDeletionTargetUserId ?? state.account?.id ??
      (state.status === "deletionOnly" ? state.deletionUserId : null);
    if (!targetUserId && state.status !== "deletionOnly") return;
    setBusy(true);
    setError("");
    try {
      if (targetUserId) {
        setDeletionTargetUserId(targetUserId);
        window.sessionStorage.setItem(DELETE_TARGET_SESSION_KEY, targetUserId);
      }
      const response = await fetch("/api/account/deletion/reauth", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(targetUserId ? { expectedUserId: targetUserId } : {}),
          callbackURL: localizedHref(locale, "/account"),
        }),
      });
      const body = await readResponse(response);
      if (!response.ok) throw new Error(extractErrorCode(body));
      await startGoogleSignIn(localizedHref(locale, "/account"));
    } catch {
      setError(getAccountErrorMessage(locale, "FRESH_GOOGLE_SIGN_IN_REQUIRED"));
      setBusy(false);
    }
  }

  if (state.status === "loading") {
    return <div role="status" className="rounded-xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-600">{copy.sync.checking}</div>;
  }

  if (state.status === "disabled") {
    return <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">{copy.disabledTitle}</h2><p className="mt-2 text-sm font-bold leading-6 text-slate-600">{copy.disabledBody}</p></section>;
  }

  if (state.status === "deletionOnly") {
    return (
      <section className="rounded-xl border border-rose-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-black text-rose-900">{copy.deleteTitle}</h2>
        <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-slate-600">{copy.deleteDescription}</p>
        {error || deletionAccountMismatch ? <p ref={errorRef} tabIndex={-1} role="alert" className="mt-4 text-sm font-bold text-rose-700">{deletionAccountMismatch ? deletionCopy.differentAccount : error}</p> : null}
        {notice ? <p ref={noticeRef} tabIndex={-1} role="status" aria-live="polite" className="mt-4 text-sm font-bold text-emerald-700">{notice}</p> : null}
        {state.deletionReauthReady ? (
          <>
            <label className="mt-4 flex min-h-11 items-start gap-3 text-sm font-bold leading-6 text-slate-700"><input type="checkbox" checked={deleteConfirmed} onChange={(event) => setDeleteConfirmed(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-rose-600" />{copy.deleteConfirm}</label>
            <button type="button" disabled={busy || !deleteConfirmed || deletionAccountMismatch} onClick={() => void handleDelete()} className="mt-3 min-h-11 rounded-lg bg-rose-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{busy ? copy.deleting : copy.deleteButton}</button>
          </>
        ) : (
          <button type="button" disabled={busy || deletionAccountMismatch} onClick={() => void handleFreshGoogleSignIn()} className="mt-4 min-h-11 rounded-lg border border-rose-300 px-4 py-2 text-sm font-black text-rose-800 disabled:opacity-60">{busy ? copy.sync.checking : copy.deleteFreshSession}</button>
        )}
        <button type="button" disabled={busy} onClick={() => void handleSignOut()} className="ml-2 mt-4 min-h-11 rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 disabled:opacity-50">{copy.signOut}</button>
      </section>
    );
  }

  if (state.status === "error") {
    return <section className="rounded-xl border border-amber-200 bg-white p-6 shadow-sm"><p role="alert" className="text-sm font-bold text-amber-900">{copy.serviceUnavailable}</p><button type="button" onClick={() => void state.refresh()} className="mt-4 min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white">{copy.retry}</button></section>;
  }

  if (state.status === "guest") {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-black text-slate-950">{copy.guestTitle}</h2>
        <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-slate-600">{copy.guestBody}</p>
        {error ? <p ref={errorRef} tabIndex={-1} role="alert" className="mt-4 text-sm font-bold text-rose-700">{error}</p> : null}
        {notice ? <p ref={noticeRef} tabIndex={-1} role="status" aria-live="polite" className="mt-4 text-sm font-bold text-emerald-700">{notice}</p> : null}
        <button type="button" disabled={busy} onClick={() => void handleGoogleSignIn()} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">
          {busy ? copy.sync.checking : copy.googleSignIn}
        </button>
        {effectiveDeletionTargetUserId ? <button type="button" disabled={busy} onClick={() => void handleFreshGoogleSignIn()} className="ml-2 mt-5 inline-flex min-h-11 items-center justify-center rounded-lg border border-rose-300 px-4 py-2 text-sm font-black text-rose-800 disabled:opacity-60">{copy.deleteFreshSession}</button> : null}
      </section>
    );
  }

  const profileLocked = !state.account?.onboardingComplete;
  return (
    <div className="space-y-5">
      {error || deletionAccountMismatch ? <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">{deletionAccountMismatch ? deletionCopy.differentAccount : error}</p> : null}
      {notice ? <p ref={noticeRef} tabIndex={-1} role="status" aria-live="polite" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{notice}</p> : null}

      {profileLocked ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-black text-slate-950">{copy.onboardingTitle}</h2>
          {!state.account?.policyReady || !state.account.policyVersions ? (
            <p className="mt-3 text-sm font-bold leading-6 text-slate-600">{copy.policyUnavailable}</p>
          ) : (
            <form onSubmit={handleOnboarding} className="mt-4 space-y-4">
              {state.account.eligibilityPolicyTexts?.[locale] ? <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{state.account.eligibilityPolicyTexts[locale]}</p> : null}
              <label className="flex min-h-11 items-start gap-3 text-sm font-bold leading-6 text-slate-700"><input type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-blue-600" />{copy.acceptTerms}<Link href={localizedHref(locale, "/terms")} className="underline">{common.home.terms}</Link></label>
              <label className="flex min-h-11 items-start gap-3 text-sm font-bold leading-6 text-slate-700"><input type="checkbox" checked={acceptPrivacy} onChange={(event) => setAcceptPrivacy(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-blue-600" />{copy.acknowledgePrivacy}<Link href={localizedHref(locale, "/privacy")} className="underline">{common.common.privacy}</Link></label>
              <label className="flex min-h-11 items-start gap-3 text-sm font-bold leading-6 text-slate-700"><input type="checkbox" checked={confirmEligibility} onChange={(event) => setConfirmEligibility(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-blue-600" />{copy.confirmEligibility}</label>
              <button type="submit" disabled={busy || !acceptTerms || !acceptPrivacy || !confirmEligibility} className="min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{busy ? copy.saving : copy.completeOnboarding}</button>
            </form>
          )}
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-black text-slate-950">{copy.accountTitle}</h2><p className="mt-1 text-sm font-bold text-slate-500">{state.account?.nickname}</p></div>
          <SyncStatus locale={locale} state={state.syncState} pendingCount={state.pendingCount} onRetry={() => void state.retrySync()} />
        </div>
        <form onSubmit={handleProfileSave} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-black text-slate-700">{copy.nickname}<input value={nickname} onChange={(event) => setProfileDraft({ userId: state.account!.id, revision: state.account!.profileRevision, nickname: event.target.value, playerTag })} maxLength={64} autoComplete="nickname" disabled={busy || profileLocked} placeholder={copy.nicknamePlaceholder} className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 text-base font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" /></label>
          <label className="block text-sm font-black text-slate-700">{copy.playerTag}<div className="mt-2 flex gap-2"><input value={playerTag} onChange={(event) => setProfileDraft({ userId: state.account!.id, revision: state.account!.profileRevision, nickname, playerTag: event.target.value })} maxLength={16} autoCapitalize="characters" autoComplete="off" disabled={busy || profileLocked} placeholder={copy.playerTagPlaceholder} className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-base font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" /><button type="button" disabled={busy || profileLocked || !playerTag} onClick={() => setProfileDraft({ userId: state.account!.id, revision: state.account!.profileRevision, nickname, playerTag: "" })} className="min-h-11 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 disabled:opacity-50">{copy.clearTag}</button></div><span className="mt-2 block text-xs font-semibold leading-5 text-slate-500">{copy.playerTagHelp}</span></label>
          <div className="sm:col-span-2"><button type="submit" disabled={busy || profileLocked} className="min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{busy ? copy.saving : copy.saveProfile}</button></div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-black text-slate-950">{copy.personalBests}</h2><SyncStatus locale={locale} state={state.syncState} pendingCount={state.pendingCount} onRetry={() => void state.retrySync()} /></div>
        {bestLoading ? <p role="status" className="mt-4 text-sm font-bold text-slate-500">{copy.sync.checking}</p> : bests.length === 0 ? <p className="mt-4 text-sm font-bold text-slate-500">{copy.noPersonalBests}</p> : (
          <ul className="mt-4 divide-y divide-slate-100">
            {displayedBests.map((best) => (
              <li key={[best.gameId, best.mode, best.rulesetVersion].join(":")} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="font-bold text-slate-700">{copy.gameNames[best.gameId as keyof typeof copy.gameNames]} · {localizedModeLabel(locale, best.mode)}</span>
                <span className="font-black tabular-nums text-blue-700">{best.score} / {best.total} ({Math.floor((best.score * 100) / best.total)}%)</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {state.syncEnabled && state.account?.onboardingComplete ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black text-slate-950">{copy.localImportTitle}</h2><p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-slate-600">{copy.localImportDescription}</p></div><button type="button" onClick={refreshLegacyCandidates} className="min-h-11 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700">{copy.retry}</button></div>
          {legacyCandidates.length ? <><p className="mt-4 text-sm font-black text-slate-700">{copy.localImportCount.replace("{count}", String(legacyCandidates.length))}</p><ul className="mt-3 grid gap-2 sm:grid-cols-2">{legacyCandidates.map((candidate) => <li key={[candidate.gameId, candidate.mode].join(":")} className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">{copy.gameNames[candidate.gameId as keyof typeof copy.gameNames]} · {localizedModeLabel(locale, candidate.mode)} · {candidate.score}/{candidate.total}</li>)}</ul><button type="button" disabled={busy} onClick={() => void handleImport()} className="mt-4 min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{busy ? copy.importing : copy.importRecords}</button></> : <p className="mt-4 text-sm font-bold text-slate-500">{copy.noLocalRecords}</p>}
        </section>
      ) : null}

      <section className="rounded-xl border border-rose-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-black text-rose-800">{copy.deleteTitle}</h2>
        <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{copy.deleteDescription}</p>
        <label className="mt-4 flex min-h-11 items-start gap-3 text-sm font-bold leading-6 text-slate-700"><input type="checkbox" checked={deleteConfirmed} onChange={(event) => setDeleteConfirmed(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-rose-600" />{copy.deleteConfirm}</label>
        {state.pendingCount > 0 ? <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">{deletionCopy.pendingSignOut.replace("{count}", String(state.pendingCount))}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy || !deleteConfirmed || deletionAccountMismatch} onClick={() => void handleDelete()} className="min-h-11 rounded-lg bg-rose-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{busy ? copy.deleting : state.deletionReauthReady ? copy.deleteButton : copy.deleteFreshSession}</button>{needsFreshGoogle || deletionAccountMismatch ? <button type="button" disabled={busy} onClick={() => void handleFreshGoogleSignIn()} className="min-h-11 rounded-lg border border-rose-300 px-4 py-2 text-sm font-black text-rose-800">{copy.deleteFreshSession}</button> : null}<button type="button" disabled={busy} onClick={() => void handleSignOut()} className="min-h-11 rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 disabled:opacity-50">{copy.signOut}</button></div>
      </section>
    </div>
  );
}
