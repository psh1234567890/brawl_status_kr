"use client";

import {
  comparePersonalBest,
  personalBestSlotKey,
  sortPersonalBestRecords,
  type PersonalBestCandidate,
  type PersonalBestRecord,
} from "./minigames/personalBest";

const DATABASE_NAME = "brawl-status-account-v1";
const DATABASE_VERSION = 1;
const CACHE_STORE = "personalBestCache";
const OUTBOX_STORE = "outbox";
const CHANGE_EVENT = "accountPersonalBestsChanged";
const QUEUE_FAILED_EVENT = "accountPersonalBestQueueFailed";
const MAX_OUTBOX_OPERATIONS_PER_ACCOUNT = 64;
const CACHE_KEY_PREFIX = "brawl-status:account:";

export type OutboxOperation = {
  operationId: string;
  userId: string;
  source: "legacy_import" | "client_play";
  candidates: PersonalBestCandidate[];
  createdAt: number;
  attempts: number;
  nextAttemptAt: number;
  state: "pending" | "sending" | "awaiting-account" | "blocked";
  errorCode: string | null;
};

export type QueueResult = {
  persisted: boolean;
  queued: boolean;
  bests: PersonalBestRecord[];
};

export type FlushResult = {
  pending: number;
  synced: number;
  state: "synced" | "pending" | "awaiting-account" | "blocked" | "offline";
  retryAt?: number;
};

function dispatchChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function personalBestCacheKey(userId: string) {
  return CACHE_KEY_PREFIX + userId + ":minigame-bests:v1";
}

function openDatabase() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("INDEXEDDB_UNAVAILABLE"));
  }
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(CACHE_STORE)) {
        database.createObjectStore(CACHE_STORE, { keyPath: "userId" });
      }
      if (!database.objectStoreNames.contains(OUTBOX_STORE)) {
        const outbox = database.createObjectStore(OUTBOX_STORE, {
          keyPath: "operationId",
        });
        outbox.createIndex("userId", "userId", { unique: false });
        outbox.createIndex("nextAttemptAt", "nextAttemptAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("INDEXEDDB_OPEN_FAILED"));
    request.onblocked = () => reject(new Error("INDEXEDDB_BLOCKED"));
  });
}

function waitForTransaction(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("INDEXEDDB_TRANSACTION_FAILED"));
    transaction.onabort = () => reject(transaction.error ?? new Error("INDEXEDDB_TRANSACTION_ABORTED"));
  });
}

function requestValue<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("INDEXEDDB_REQUEST_FAILED"));
  });
}

function readLocalCache(userId: string) {
  try {
    const value = localStorage.getItem(personalBestCacheKey(userId));
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (record): record is PersonalBestRecord =>
        Boolean(
          record &&
            typeof record === "object" &&
            typeof record.gameId === "string" &&
            typeof record.mode === "string" &&
            Number.isSafeInteger(record.score) &&
            Number.isSafeInteger(record.total),
        ),
    );
  } catch {
    return [];
  }
}

function writeLocalCache(userId: string, bests: readonly PersonalBestRecord[]) {
  try {
    localStorage.setItem(personalBestCacheKey(userId), JSON.stringify(bests));
  } catch {
    // IndexedDB is canonical; the localStorage mirror is only a display fallback.
  }
}

function createOperationId() {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new Error("SECURE_RANDOM_UNAVAILABLE");
  }
  return crypto.randomUUID();
}

export async function readAccountPersonalBests(userId: string) {
  try {
    const database = await openDatabase();
    const transaction = database.transaction(CACHE_STORE, "readonly");
    const stored = await requestValue<{ userId: string; bests: PersonalBestRecord[] } | undefined>(
      transaction.objectStore(CACHE_STORE).get(userId),
    );
    await waitForTransaction(transaction);
    database.close();
    if (stored && Array.isArray(stored.bests)) return stored.bests;
  } catch {
    // Continue with the non-authoritative localStorage mirror.
  }
  return readLocalCache(userId);
}

export async function writeAccountPersonalBests(
  userId: string,
  bests: readonly PersonalBestRecord[],
) {
  const normalized = sortPersonalBestRecords(bests);
  writeLocalCache(userId, normalized);
  const database = await openDatabase();
  const transaction = database.transaction(CACHE_STORE, "readwrite");
  transaction.objectStore(CACHE_STORE).put({
    userId,
    bests: normalized,
    updatedAt: Date.now(),
  });
  await waitForTransaction(transaction);
  database.close();
  dispatchChange();
}

function optimisticRecord(
  previous: readonly PersonalBestRecord[],
  candidate: PersonalBestCandidate,
  now: string,
) {
  const key = personalBestSlotKey(candidate);
  const index = previous.findIndex((record) => personalBestSlotKey(record) === key);
  if (index >= 0 && comparePersonalBest(candidate, previous[index]) <= 0) {
    return [...previous];
  }
  const next = [...previous];
  const existing = index >= 0 ? previous[index] : undefined;
  const record: PersonalBestRecord = {
    ...candidate,
    source: "client_play",
    revision: (existing?.revision ?? 0) + 1,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  if (index >= 0) next[index] = record;
  else next.push(record);
  return sortPersonalBestRecords(next);
}

async function queueOperation(
  userId: string,
  source: OutboxOperation["source"],
  candidates: readonly PersonalBestCandidate[],
): Promise<QueueResult> {
  const database = await openDatabase();
  const transaction = database.transaction([CACHE_STORE, OUTBOX_STORE], "readwrite");
  const cacheStore = transaction.objectStore(CACHE_STORE);
  const outboxStore = transaction.objectStore(OUTBOX_STORE);
  const stored = await requestValue<{ userId: string; bests: PersonalBestRecord[] } | undefined>(
    cacheStore.get(userId),
  );
  let bests = stored?.bests ?? readLocalCache(userId);
  const pendingOperations = await requestValue<OutboxOperation[]>(
    outboxStore.index("userId").getAll(userId),
  );
  let changed = false;
  for (const candidate of candidates) {
    const next = optimisticRecord(bests, candidate, new Date().toISOString());
    if (next.length !== bests.length || next.some((record, index) => record !== bests[index])) {
      changed = true;
      bests = next;
    }
  }

  const firstCandidate = candidates[0];
  const coalescible = source === "client_play" && candidates.length === 1
    ? pendingOperations.find((operation) =>
        operation.source === "client_play" &&
        operation.state === "pending" &&
        operation.attempts === 0 &&
        operation.candidates.length === 1 &&
        personalBestSlotKey(operation.candidates[0]) === personalBestSlotKey(firstCandidate!),
      )
    : undefined;
  if (!coalescible && pendingOperations.length >= MAX_OUTBOX_OPERATIONS_PER_ACCOUNT) {
    await waitForTransaction(transaction);
    database.close();
    return { persisted: false, queued: false, bests: stored?.bests ?? readLocalCache(userId) };
  }
  let queuedCandidate = [...candidates];
  if (coalescible && firstCandidate) {
    const pendingCandidate = coalescible.candidates[0];
    queuedCandidate = [comparePersonalBest(firstCandidate, pendingCandidate) > 0
      ? firstCandidate
      : pendingCandidate];
  }
  const operation: OutboxOperation = coalescible
    ? { ...coalescible, candidates: queuedCandidate }
    : {
        operationId: createOperationId(),
        userId,
        source,
        candidates: queuedCandidate,
        createdAt: Date.now(),
        attempts: 0,
        nextAttemptAt: Date.now(),
        state: "pending",
        errorCode: null,
      };
  if (changed) cacheStore.put({ userId, bests, updatedAt: Date.now() });
  if (coalescible) outboxStore.put(operation);
  else outboxStore.add(operation);
  await waitForTransaction(transaction);
  database.close();
  writeLocalCache(userId, bests);
  dispatchChange();
  return { persisted: true, queued: true, bests };
}

export async function queueAccountPersonalBest(
  userId: string,
  candidate: PersonalBestCandidate,
): Promise<QueueResult> {
  return queueOperation(userId, "client_play", [candidate]);
}

export async function queueLegacyPersonalBestImport(
  userId: string,
  candidates: readonly PersonalBestCandidate[],
  operationId = createOperationId(),
): Promise<QueueResult> {
  const database = await openDatabase();
  const transaction = database.transaction([CACHE_STORE, OUTBOX_STORE], "readwrite");
  const cacheStore = transaction.objectStore(CACHE_STORE);
  const outboxStore = transaction.objectStore(OUTBOX_STORE);
  const stored = await requestValue<{ userId: string; bests: PersonalBestRecord[] } | undefined>(
    cacheStore.get(userId),
  );
  const bests = stored?.bests ?? readLocalCache(userId);
  const existing = await requestValue<OutboxOperation[]>(outboxStore.index("userId").getAll(userId));
  if (existing.length >= MAX_OUTBOX_OPERATIONS_PER_ACCOUNT) {
    await waitForTransaction(transaction);
    database.close();
    return { persisted: false, queued: false, bests };
  }
  outboxStore.add({
    operationId,
    userId,
    source: "legacy_import",
    candidates: [...candidates],
    createdAt: Date.now(),
    attempts: 0,
    nextAttemptAt: Date.now(),
    state: "pending",
    errorCode: null,
  } satisfies OutboxOperation);
  await waitForTransaction(transaction);
  database.close();
  writeLocalCache(userId, bests);
  dispatchChange();
  return { persisted: true, queued: true, bests };
}

export async function getPendingAccountOperations(userId: string) {
  const database = await openDatabase();
  const transaction = database.transaction(OUTBOX_STORE, "readonly");
  const request = transaction.objectStore(OUTBOX_STORE).index("userId").getAll(userId);
  const values = await requestValue<OutboxOperation[]>(request);
  await waitForTransaction(transaction);
  database.close();
  return values.sort((left, right) => left.createdAt - right.createdAt);
}

async function updateOutboxOperation(operation: OutboxOperation) {
  const database = await openDatabase();
  const transaction = database.transaction(OUTBOX_STORE, "readwrite");
  transaction.objectStore(OUTBOX_STORE).put(operation);
  await waitForTransaction(transaction);
  database.close();
  dispatchChange();
}

async function removeOutboxOperation(operationId: string) {
  const database = await openDatabase();
  const transaction = database.transaction(OUTBOX_STORE, "readwrite");
  transaction.objectStore(OUTBOX_STORE).delete(operationId);
  await waitForTransaction(transaction);
  database.close();
  dispatchChange();
}

function retryDelay(attempt: number, response?: Response) {
  const retryAfter = response?.headers.get("retry-after");
  if (retryAfter) {
    const retrySeconds = Number(retryAfter);
    const retryAt = Number.isFinite(retrySeconds)
      ? Date.now() + Math.max(retrySeconds, 0) * 1_000
      : Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) {
      return Math.min(Math.max(retryAt - Date.now(), 250), 60 * 60 * 1_000);
    }
  }
  const cap = Math.min(1_000 * 2 ** Math.min(attempt, 10), 60 * 60 * 1_000);
  return Math.round(cap * (0.75 + Math.random() * 0.5));
}

export async function flushPendingAccountOperations(
  userId: string,
  isCurrentAccount: () => boolean,
): Promise<FlushResult> {
  if (!isCurrentAccount()) return { pending: 0, synced: 0, state: "awaiting-account" };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { pending: 0, synced: 0, state: "offline" };
  }

  let operations: OutboxOperation[];
  try {
    operations = await getPendingAccountOperations(userId);
  } catch {
    return { pending: 0, synced: 0, state: "blocked" };
  }

  let synced = 0;
  for (const operation of operations) {
    if (operation.state === "blocked") {
      return { pending: operations.length - synced, synced, state: "blocked" };
    }
    if (operation.state === "awaiting-account") {
      return { pending: operations.length - synced, synced, state: "awaiting-account" };
    }
    if (!isCurrentAccount()) {
      return { pending: operations.length - synced, synced, state: "awaiting-account" };
    }
    if (operation.nextAttemptAt > Date.now()) {
      return {
        pending: operations.length - synced,
        synced,
        state: "pending",
        retryAt: operation.nextAttemptAt,
      };
    }

    const path = operation.source === "legacy_import"
      ? "/api/account/minigame-bests/merge"
      : "/api/account/minigame-bests";
    const payload = {
      operationId: operation.operationId,
      expectedUserId: operation.userId,
      rulesetVersion: 1,
      ...(operation.source === "legacy_import"
        ? { candidates: operation.candidates }
        : { candidate: operation.candidates[0] }),
    };

    operation.state = "sending";
    await updateOutboxOperation(operation);
    if (!isCurrentAccount()) {
      operation.state = "awaiting-account";
      await updateOutboxOperation(operation);
      return { pending: operations.length - synced, synced, state: "awaiting-account" };
    }

    let response: Response;
    try {
      response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      const attempts = operation.attempts + 1;
      operation.attempts = attempts;
      operation.state = "pending";
      operation.nextAttemptAt = Date.now() + retryDelay(attempts);
      await updateOutboxOperation(operation).catch(() => undefined);
      return {
        pending: operations.length - synced,
        synced,
        state: "pending",
        retryAt: operation.nextAttemptAt,
      };
    }

    // A response can arrive after logout or an account switch. Keep the
    // durable operation for its original owner and do not repopulate its cache.
    if (!isCurrentAccount()) {
      operation.state = "awaiting-account";
      operation.errorCode = "LOGIN_REQUIRED";
      await updateOutboxOperation(operation).catch(() => undefined);
      return { pending: operations.length - synced, synced, state: "awaiting-account" };
    }

    if (response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { personalBests?: PersonalBestRecord[] }
        | null;
      if (!isCurrentAccount()) {
        operation.state = "awaiting-account";
        operation.errorCode = "LOGIN_REQUIRED";
        await updateOutboxOperation(operation).catch(() => undefined);
        return { pending: operations.length - synced, synced, state: "awaiting-account" };
      }
      if (!body || !Array.isArray(body.personalBests)) {
        operation.state = "blocked";
        operation.errorCode = "INVALID_SERVER_RESPONSE";
        await updateOutboxOperation(operation).catch(() => undefined);
        return { pending: operations.length - synced, synced, state: "blocked" };
      }
      await writeAccountPersonalBests(userId, body.personalBests);
      await removeOutboxOperation(operation.operationId);
      synced += 1;
      continue;
    }

    if (response.status === 401) {
      operation.state = "awaiting-account";
      operation.errorCode = "LOGIN_REQUIRED";
      await updateOutboxOperation(operation).catch(() => undefined);
      return { pending: operations.length - synced, synced, state: "awaiting-account" };
    }

    if (response.status === 429 || response.status >= 500) {
      operation.attempts += 1;
      operation.state = "pending";
      operation.nextAttemptAt = Date.now() + retryDelay(operation.attempts, response);
      await updateOutboxOperation(operation).catch(() => undefined);
      return {
        pending: operations.length - synced,
        synced,
        state: "pending",
        retryAt: operation.nextAttemptAt,
      };
    }

    operation.state = "blocked";
    operation.errorCode = "SYNC_REJECTED";
    await updateOutboxOperation(operation).catch(() => undefined);
    return { pending: operations.length - synced, synced, state: "blocked" };
  }

  return {
    pending: Math.max(operations.length - synced, 0),
    synced,
    state: operations.length === synced ? "synced" : "pending",
  };
}

export async function retryPendingAccountOperations(userId: string) {
  const operations = await getPendingAccountOperations(userId);
  for (const operation of operations) {
    if (operation.state === "sending") continue;
    operation.state = "pending";
    operation.errorCode = null;
    operation.nextAttemptAt = Date.now();
    await updateOutboxOperation(operation);
  }
  dispatchChange();
}

export async function resumeAwaitingAccountOperations(userId: string) {
  const operations = await getPendingAccountOperations(userId);
  for (const operation of operations) {
    if (operation.state !== "awaiting-account") continue;
    operation.state = "pending";
    operation.errorCode = null;
    operation.nextAttemptAt = Date.now();
    await updateOutboxOperation(operation);
  }
}

export async function removeAccountBrowserData(userId: string) {
  let cleared = true;
  let database: IDBDatabase | undefined;
  try {
    database = await openDatabase();
    const transaction = database.transaction([CACHE_STORE, OUTBOX_STORE], "readwrite");
    transaction.objectStore(CACHE_STORE).delete(userId);
    const index = transaction.objectStore(OUTBOX_STORE).index("userId");
    const operations = await requestValue<OutboxOperation[]>(index.getAll(userId));
    for (const operation of operations) {
      transaction.objectStore(OUTBOX_STORE).delete(operation.operationId);
    }
    await waitForTransaction(transaction);
  } catch {
    cleared = false;
  } finally {
    database?.close();
  }
  try {
    localStorage.removeItem(personalBestCacheKey(userId));
  } catch {
    cleared = false;
  }
  dispatchChange();
  return { cleared };
}

export async function clearAccountPersonalBestCache(userId: string) {
  try {
    const database = await openDatabase();
    const transaction = database.transaction(CACHE_STORE, "readwrite");
    transaction.objectStore(CACHE_STORE).delete(userId);
    await waitForTransaction(transaction);
    database.close();
  } catch {
    // Account state is still invalidated even if local cache storage is unavailable.
  }
  try {
    localStorage.removeItem(personalBestCacheKey(userId));
  } catch {
    // Browser storage can be unavailable.
  }
  dispatchChange();
}

export function subscribeAccountPersonalBests(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function notifyAccountPersonalBestQueueFailed() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(QUEUE_FAILED_EVENT));
}
