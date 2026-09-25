"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import {
  clearAccountPersonalBestCache,
  flushPendingAccountOperations,
  getPendingAccountOperations,
  notifyAccountPersonalBestQueueFailed,
  retryPendingAccountOperations,
  resumeAwaitingAccountOperations,
} from "../utils/accountStore";
import { createKeyedSingleFlight, createRequestSequence } from "../utils/accountConcurrency";

export type AccountDto = {
  id: string;
  nickname: string;
  defaultPlayerTag: string | null;
  profileRevision: number;
  onboardingCompletedAt: string | null;
  onboardingComplete: boolean;
  policyReady: boolean;
  eligibilityPolicyTexts: Record<"ko" | "en" | "ja" | "pt-br" | "es" | "tr" | "de" | "fr" | "it" | "ru", string> | null;
  eligibilityRules: {
    minimumAge: number;
    regions: "all" | string[];
    guardianConsent: "not-supported";
    attestation: "self";
  } | null;
  policyVersions: { terms: string; privacy: string; eligibility: string } | null;
};

export type AccountSnapshot = {
  status: "loading" | "disabled" | "guest" | "account" | "deletionOnly" | "error";
  account: AccountDto | null;
  deletionUserId: string | null;
  deletionReauthReady: boolean;
  syncEnabled: boolean;
  syncState:
    | "localOnly"
    | "checking"
    | "syncing"
    | "synced"
    | "offline"
    | "loginRequired"
    | "failed"
    | "pending"
    | "blocked";
  pendingCount: number;
  errorCode: string | null;
};

const INITIAL: AccountSnapshot = {
  status: "loading",
  account: null,
  deletionUserId: null,
  deletionReauthReady: false,
  syncEnabled: false,
  syncState: "checking",
  pendingCount: 0,
  errorCode: null,
};
const SESSION_CHANGE_KEY = "brawl-status:account-session-change";
const CHANGE_EVENT = "brawlStatusAccountSessionChanged";
const SYNC_EVENT = "accountPersonalBestsChanged";
const QUEUE_FAILED_EVENT = "accountPersonalBestQueueFailed";
const listeners = new Set<() => void>();
let snapshot = INITIAL;
const requestSequence = createRequestSequence();
let refreshPromise: { sequence: number; promise: Promise<void> } | null = null;
const flushPromises = createKeyedSingleFlight<string, void>();
const retryTimers = new Map<string, number>();
let channel: BroadcastChannel | undefined;
let lifecycleAttached = false;

function emit() {
  for (const listener of listeners) listener();
}

function update(next: AccountSnapshot) {
  snapshot = next;
  emit();
}

export function getAccountSnapshot() {
  return snapshot;
}

function mapFlushState(state: "synced" | "pending" | "awaiting-account" | "blocked" | "offline"): AccountSnapshot["syncState"] {
  if (state === "awaiting-account") return "loginRequired";
  return state;
}

function isCurrentAccount(userId: string, sequence: number) {
  return requestSequence.isCurrent(sequence) &&
    snapshot.status === "account" && snapshot.account?.id === userId;
}

function updateCurrentAccount(
  userId: string,
  sequence: number,
  patch: Partial<AccountSnapshot>,
) {
  if (!isCurrentAccount(userId, sequence)) return false;
  update({ ...snapshot, ...patch });
  return true;
}

async function refreshSyncStatus(
  userId: string,
  sequence = requestSequence.current(),
) {
  if (
    !isCurrentAccount(userId, sequence) ||
    !snapshot.account ||
    !snapshot.syncEnabled ||
    !snapshot.account.onboardingComplete
  ) return;

  const flightKey = `${sequence}:${userId}`;
  return flushPromises.run(flightKey, async () => {
    const oldTimer = retryTimers.get(userId);
    if (oldTimer !== undefined) window.clearTimeout(oldTimer);
    retryTimers.delete(userId);
    updateCurrentAccount(userId, sequence, { syncState: "checking" });
    try {
      await resumeAwaitingAccountOperations(userId);
      if (!isCurrentAccount(userId, sequence)) return;
      const operations = await getPendingAccountOperations(userId);
      if (!isCurrentAccount(userId, sequence)) return;
      const pendingCount = operations.length;
      if (!navigator.onLine) {
        updateCurrentAccount(userId, sequence, {
          pendingCount,
          syncState: pendingCount ? "offline" : "synced",
        });
        return;
      }
      if (pendingCount === 0) {
        updateCurrentAccount(userId, sequence, { pendingCount: 0, syncState: "synced" });
        return;
      }
      updateCurrentAccount(userId, sequence, { pendingCount, syncState: "syncing" });
      const result = await flushPendingAccountOperations(
        userId,
        () => isCurrentAccount(userId, sequence),
      );
      if (!isCurrentAccount(userId, sequence)) return;
      const latest = await getPendingAccountOperations(userId).catch(() => operations);
      if (!isCurrentAccount(userId, sequence)) return;
      updateCurrentAccount(userId, sequence, {
        pendingCount: latest.length,
        syncState: mapFlushState(result.state),
      });
      if (result.state === "pending" && result.retryAt) {
        const timer = window.setTimeout(() => {
          if (isCurrentAccount(userId, sequence)) void refreshSyncStatus(userId, sequence);
        }, Math.max(250, result.retryAt - Date.now()));
        retryTimers.set(userId, timer);
      }
    } catch {
      updateCurrentAccount(userId, sequence, {
        syncState: navigator.onLine ? "failed" : "offline",
      });
    }
  });
}

function invalidateAccountSnapshot() {
  const previousUserId = snapshot.account?.id;
  requestSequence.invalidate();
  for (const timer of retryTimers.values()) window.clearTimeout(timer);
  retryTimers.clear();
  update(INITIAL);
  if (previousUserId) void clearAccountPersonalBestCache(previousUserId);
}

export async function refreshAccountStatus(options: { force?: boolean } = {}) {
  if (options.force) invalidateAccountSnapshot();
  const currentSequence = requestSequence.current();
  if (refreshPromise?.sequence === currentSequence) return refreshPromise.promise;
  const sequence = requestSequence.begin();
  const promise = (async () => {
    try {
      const response = await fetch("/api/account", {
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => null) as
        | { state?: string; syncEnabled?: boolean; account?: AccountDto; deletionUserId?: string | null; deletionReauthReady?: boolean; error?: string }
        | null;
      if (!response.ok || !payload) throw new Error(payload?.error ?? "ACCOUNT_UNAVAILABLE");
      if (!requestSequence.isCurrent(sequence)) return;
      const previous = snapshot.account?.id;
      if (payload.state === "disabled") {
        update({ ...INITIAL, status: "disabled", syncState: "localOnly" });
      } else if (payload.state === "guest") {
        update({ ...INITIAL, status: "guest", syncState: "localOnly" });
      } else if (
        payload.state === "deletion-only" &&
        (typeof payload.deletionUserId === "string" || payload.deletionUserId === null) &&
        typeof payload.deletionReauthReady === "boolean"
      ) {
        update({
          ...INITIAL,
          status: "deletionOnly",
          deletionUserId: payload.deletionUserId,
          deletionReauthReady: payload.deletionReauthReady,
          syncState: "localOnly",
        });
      } else if (payload.state === "account" && payload.account) {
        const accountCanSync =
          payload.syncEnabled === true && payload.account.onboardingComplete;
        update({
          status: "account",
          account: payload.account,
          deletionUserId: null,
          deletionReauthReady: payload.deletionReauthReady === true,
          syncEnabled: payload.syncEnabled === true,
          syncState: accountCanSync ? "checking" : "localOnly",
          pendingCount: 0,
          errorCode: null,
        });
        void refreshSyncStatus(payload.account.id, sequence);
      } else {
        throw new Error("INVALID_ACCOUNT_RESPONSE");
      }
      const current = snapshot.account?.id;
      if (previous && previous !== current) void clearAccountPersonalBestCache(previous);
    } catch (error) {
      if (!requestSequence.isCurrent(sequence)) return;
      update({
        ...snapshot,
        status: "error",
        syncState: navigator.onLine ? "failed" : "offline",
        errorCode: error instanceof Error ? error.message : "ACCOUNT_UNAVAILABLE",
      });
    }
  })().finally(() => {
    if (refreshPromise?.promise === promise) refreshPromise = null;
  });
  refreshPromise = { sequence, promise };
  return promise;
}

export function publishAccountSessionChange() {
  if (typeof window === "undefined") return Promise.resolve();
  invalidateAccountSnapshot();
  window.dispatchEvent(new Event(CHANGE_EVENT));
  channel?.postMessage({ type: "refresh" });
  try {
    localStorage.setItem(SESSION_CHANGE_KEY, String(Date.now()));
  } catch {
    // The BroadcastChannel and current tab event remain available.
  }
  return refreshAccountStatus();
}

async function retryCurrentSync() {
  const userId = snapshot.account?.id;
  if (!userId || snapshot.status !== "account") return;
  const sequence = requestSequence.current();
  try {
    await retryPendingAccountOperations(userId);
    if (!isCurrentAccount(userId, sequence)) return;
    await refreshSyncStatus(userId, sequence);
  } catch {
    updateCurrentAccount(userId, sequence, { syncState: "failed" });
  }
}

function attachLifecycle() {
  if (lifecycleAttached || typeof window === "undefined") return;
  lifecycleAttached = true;
  const refreshIfVisible = () => {
    if (document.visibilityState === "visible") void refreshAccountStatus();
  };
  window.addEventListener("focus", refreshIfVisible);
  document.addEventListener("visibilitychange", refreshIfVisible);
  window.addEventListener("online", () => {
    void refreshAccountStatus();
  });
  window.addEventListener("offline", () => {
    if (snapshot.status === "account") update({ ...snapshot, syncState: "offline" });
  });
  window.addEventListener(CHANGE_EVENT, () => void refreshAccountStatus());
  window.addEventListener(SYNC_EVENT, () => {
    const userId = snapshot.account?.id;
    if (userId) void refreshSyncStatus(userId);
  });
  window.addEventListener(QUEUE_FAILED_EVENT, () => {
    if (snapshot.status === "account") update({ ...snapshot, syncState: "failed" });
  });
  window.addEventListener("storage", (event) => {
    if (event.key === SESSION_CHANGE_KEY) {
      invalidateAccountSnapshot();
      void refreshAccountStatus();
    }
  });
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel("brawl-status-account-v1");
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (event.data && typeof event.data === "object" && (event.data as { type?: unknown }).type === "refresh") {
        invalidateAccountSnapshot();
        void refreshAccountStatus();
      }
    };
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  attachLifecycle();
  if (snapshot.status === "loading") void refreshAccountStatus();
  return () => {
    listeners.delete(listener);
  };
}

export function useAccount() {
  const state = useSyncExternalStore(subscribe, getAccountSnapshot, () => INITIAL);
  return { ...state, refresh: refreshAccountStatus, retrySync: retryCurrentSync };
}

export function usePersonalBest() {
  const state = useAccount();
  const roundOwner = useRef<string | null>(null);
  const beginRound = useCallback(() => {
    roundOwner.current = state.status === "account" && state.syncEnabled && state.account?.onboardingComplete
      ? state.account?.id ?? null
      : null;
  }, [state.account?.id, state.account?.onboardingComplete, state.status, state.syncEnabled]);
  const recordPersonalBest = useCallback(async (
    gameId: "brawler-quiz" | "silhouette-quiz" | "map-quiz" | "ability-quiz",
    mode: string,
    score: number,
    total: number,
    clientRecordedAt: string,
  ) => {
    const userId = roundOwner.current;
    roundOwner.current = null;
    if (!userId) return;
    const { parsePersonalBestCandidate } = await import("../utils/minigames/personalBest");
    const { queueAccountPersonalBest } = await import("../utils/accountStore");
    try {
      const candidate = parsePersonalBestCandidate({
        gameId,
        mode,
        rulesetVersion: 1,
        score,
        total,
        clientRecordedAt,
      });
      const result = await queueAccountPersonalBest(userId, candidate);
      if (!result.persisted) notifyAccountPersonalBestQueueFailed();
    } catch {
      // The existing guest record remains available if account storage is unavailable.
      notifyAccountPersonalBestQueueFailed();
    }
  }, []);
  return { beginRound, recordPersonalBest };
}
