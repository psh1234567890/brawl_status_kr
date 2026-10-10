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

export class UpstreamApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function resolveBrawlApiBaseUrl(value: string | undefined) {
  if (!value?.trim()) {
    throw new UpstreamApiError(500, "서버 API 연결 설정이 없습니다.");
  }

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new UpstreamApiError(500, "서버 API 연결 주소가 올바르지 않습니다.");
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new UpstreamApiError(500, "서버 API 연결 주소는 인증정보가 없는 HTTPS URL이어야 합니다.");
  }

  return url.toString().replace(/\/$/, "");
}

async function readJsonResponse(response: Response) {
  if (!response.ok) {
    throw new UpstreamApiError(response.status, "브롤스타즈 데이터를 불러오지 못했습니다.");
  }
  try {
    const data: unknown = await response.json();
    if (!data || typeof data !== "object") throw new Error();
    return data;
  } catch {
    throw new UpstreamApiError(502, "외부 API가 올바르지 않은 응답을 반환했습니다.");
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
      throw new UpstreamApiError(500, "서버 API 설정이 없습니다.");
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
          const response = await fetch(key, {
            headers: { Authorization: `Bearer ${apiKey}` },
            cache: "no-store",
            signal: AbortSignal.timeout(8_000),
          });
          const value = await readJsonResponse(response);
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
          if (error instanceof UpstreamApiError) throw error;
          throw new UpstreamApiError(
            error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name) ? 504 : 503,
            "브롤스타즈 서버와 일시적으로 연결할 수 없습니다.",
          );
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

