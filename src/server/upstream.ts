type CacheEntry = {
  fetchedAt: number;
  retainUntil: number;
  retryAt: number;
  value: unknown;
};

export type BrawlApiSnapshot<T> = {
  data: T;
  freshness: { status: "live" | "cached" | "stale"; fetchedAt: string };
};

type FailureReason = "http" | "maintenance" | "invalid_response" | "timeout" | "network" | "configuration";
const RETRYABLE_HTTP_STATUSES = new Set([408, 500, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526]);
const REQUEST_BUDGET_MS = 8_000;

export class UpstreamApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly reason: FailureReason = "http",
    public readonly retryable = false,
  ) {
    super(message);
  }
}

export function resolveBrawlApiBaseUrl(value: string | undefined) {
  if (!value?.trim()) {
    throw new UpstreamApiError(500, "서버 API 연결 설정이 없습니다.", "configuration");
  }

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new UpstreamApiError(500, "서버 API 연결 주소가 올바르지 않습니다.", "configuration");
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new UpstreamApiError(500, "서버 API 연결 주소는 인증정보가 없는 HTTPS URL이어야 합니다.", "configuration");
  }

  return url.toString().replace(/\/$/, "");
}

async function readJsonResponse(response: Response) {
  if (!response.ok) {
    if (response.status === 503) {
      const body: unknown = await response.json().catch((error) => {
        if (isTransportError(error) && !response.headers.has("retry-after")) throw error;
        return null;
      });
      if (body && typeof body === "object" && "reason" in body && body.reason === "inMaintenance") {
        console.warn(JSON.stringify({ event: "brawl_api_maintenance", status: 503 }));
        throw new UpstreamApiError(
          503,
          "브롤스타즈 API가 점검 중입니다. 점검이 끝나면 다시 검색해 주세요.",
          "maintenance",
        );
      }
    }
    // Release unread gateway error bodies before another attempt. Never log their contents.
    if (!response.bodyUsed) void response.body?.cancel().catch(() => {});
    throw new UpstreamApiError(
      response.status, "브롤스타즈 데이터를 불러오지 못했습니다.", "http",
      RETRYABLE_HTTP_STATUSES.has(response.status) && !response.headers.has("retry-after"),
    );
  }
  try {
    const data: unknown = await response.json();
    if (!data || typeof data !== "object") throw new Error();
    return data;
  } catch (error) {
    if (isTransportError(error)) throw error;
    throw new UpstreamApiError(502, "외부 API가 올바르지 않은 응답을 반환했습니다.", "invalid_response");
  }
}

/** Bounded, instance-local cache. A cold serverless instance has no stale fallback. */
export function createBrawlApiClient(maxEntries = 2_000) {
  const responseCache = new Map<string, CacheEntry>();
  const pendingRequests = new Map<string, Promise<CacheEntry>>();

  async function fetchSnapshot<T>(
    path: string,
    ttlMs: number,
    maxStaleAgeMs = 0,
  ): Promise<BrawlApiSnapshot<T>> {
    // Configuration errors and missing credentials must never be hidden by cached data.
    const apiKey = process.env.BRAWL_STARS_API_KEY;
    if (!apiKey) {
      throw new UpstreamApiError(500, "서버 API 설정이 없습니다.", "configuration");
    }
    const baseUrl = resolveBrawlApiBaseUrl(process.env.BRAWL_STARS_API_BASE_URL);
    const key = `${baseUrl}${path}`;
    const now = Date.now();
    const cached = responseCache.get(key);
    if (cached) {
      cached.retainUntil = Math.max(cached.retainUntil, cached.fetchedAt + maxStaleAgeMs);
      if (cached.fetchedAt + ttlMs > now) return snapshot<T>(cached, "cached");
      if (canUseStale(cached, maxStaleAgeMs) && cached.retryAt > now) {
        return snapshot<T>(cached, "stale");
      }
      if (cached.retainUntil <= now) responseCache.delete(key);
    }

    let request = pendingRequests.get(key);
    if (!request) {
      request = (async () => {
        try {
          // All requests here are upstream GETs, including the read before a local
          // battle-log save. Retry only that read, never the database mutation.
          // A usable snapshot takes priority over spending time on a second attempt.
          const canRetry = !(cached && canUseStale(cached, maxStaleAgeMs));
          const startedAt = performance.now();
          let value: unknown;
          for (let attempt = 0; attempt < (canRetry ? 2 : 1); attempt += 1) {
            try {
              const remainingMs = Math.max(1, Math.floor(REQUEST_BUDGET_MS - (performance.now() - startedAt)));
              const response = await fetch(key, {
                headers: { Authorization: `Bearer ${apiKey}` },
                cache: "no-store",
                signal: AbortSignal.timeout(Math.min(canRetry ? 4_000 : REQUEST_BUDGET_MS, remainingMs)),
              });
              value = await readJsonResponse(response);
              break;
            } catch (error) {
              const failure = normalizeFailure(error);
              const delayMs = 150 + Math.floor(Math.random() * 100);
              const willRetry = canRetry && attempt === 0 && failure.retryable &&
                performance.now() - startedAt + delayMs < REQUEST_BUDGET_MS;
              console.warn(JSON.stringify({
                event: "upstream_request_failed", resource: resourceName(path),
                status: failure.status, reason: failure.reason, attempt: attempt + 1, willRetry,
              }));
              if (!willRetry) throw failure;
              await new Promise((resolve) => setTimeout(resolve, delayMs));
              if (performance.now() - startedAt >= REQUEST_BUDGET_MS) throw failure;
            }
          }
          const fetchedAt = Date.now();
          const entry = {
            value, fetchedAt, retryAt: 0,
            retainUntil: fetchedAt + Math.max(ttlMs, maxStaleAgeMs),
          };
          responseCache.delete(key);
          responseCache.set(key, entry);
          prune();
          return entry;
        } catch (error) {
          throw normalizeFailure(error);
        }
      })();
      pendingRequests.set(key, request);
    }

    try {
      const entry = await request;
      entry.retainUntil = Math.max(entry.retainUntil, entry.fetchedAt + maxStaleAgeMs);
      return snapshot<T>(entry, "live");
    } catch (error) {
      const transient = error instanceof UpstreamApiError &&
        (error.status === 408 || error.status === 429 || error.status >= 500);
      if (!transient) responseCache.delete(key);
      if (transient && cached && canUseStale(cached, maxStaleAgeMs)) {
        // Do not extend the original data age. Briefly suppress repeated failing refreshes.
        cached.retryAt = Date.now() + 5_000;
        console.warn(JSON.stringify({ event: "upstream_stale_fallback", status: error.status }));
        return snapshot<T>(cached, "stale");
      }
      throw error;
    } finally {
      if (pendingRequests.get(key) === request) pendingRequests.delete(key);
    }
  }

  function prune() {
    const now = Date.now();
    for (const [key, entry] of responseCache) {
      if (entry.retainUntil <= now) responseCache.delete(key);
    }
    while (responseCache.size > maxEntries) {
      const oldestKey = responseCache.keys().next().value;
      if (oldestKey === undefined) break;
      responseCache.delete(oldestKey);
    }
  }

  return { fetchSnapshot };
}

function isTransportError(error: unknown): error is Error {
  return error instanceof Error && ["TypeError", "TimeoutError", "AbortError"].includes(error.name);
}

function normalizeFailure(error: unknown) {
  if (error instanceof UpstreamApiError) return error;
  const timeout = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
  return new UpstreamApiError(
    timeout ? 504 : 503, "브롤스타즈 서버와 일시적으로 연결할 수 없습니다.",
    timeout ? "timeout" : "network", isTransportError(error),
  );
}

function resourceName(path: string) {
  if (path.startsWith("/players/")) return path.endsWith("/battlelog") ? "battlelog" : "player";
  if (path === "/events/rotation") return "events";
  if (path.startsWith("/clubs/")) return "club";
  if (path.startsWith("/rankings/")) return "rankings";
  return "other";
}

function canUseStale(entry: CacheEntry, maxAgeMs: number) {
  return maxAgeMs > 0 && entry.fetchedAt + maxAgeMs > Date.now();
}

function snapshot<T>(entry: CacheEntry, status: BrawlApiSnapshot<T>["freshness"]["status"]): BrawlApiSnapshot<T> {
  return { data: entry.value as T, freshness: { status, fetchedAt: new Date(entry.fetchedAt).toISOString() } };
}

const client = createBrawlApiClient();
export const fetchBrawlApiSnapshot = client.fetchSnapshot;

/** Existing callers keep fresh-only behavior; stale responses require explicit opt-in and UI labeling. */
export async function fetchBrawlApi<T>(path: string, ttlMs: number): Promise<T> {
  return (await fetchBrawlApiSnapshot<T>(path, ttlMs)).data;
}

