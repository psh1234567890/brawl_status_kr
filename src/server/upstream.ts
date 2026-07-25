type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

const responseCache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<unknown>>();

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
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new UpstreamApiError(
      response.ok ? 502 : response.status,
      "외부 API가 올바르지 않은 응답을 반환했습니다.",
    );
  }
}

export async function fetchBrawlApi<T>(path: string, ttlMs: number): Promise<T> {
  const now = Date.now();
  const cached = responseCache.get(path);
  if (cached && cached.expiresAt > now) return cached.value as T;

  const pending = pendingRequests.get(path);
  if (pending) return pending as Promise<T>;

  const request = (async () => {
    const apiKey = process.env.BRAWL_STARS_API_KEY;
    if (!apiKey) {
      throw new UpstreamApiError(500, "서버 API 설정이 없습니다.");
    }

    const baseUrl = resolveBrawlApiBaseUrl(process.env.BRAWL_STARS_API_BASE_URL);
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
      throw new UpstreamApiError(
        response.status,
        "브롤스타즈 데이터를 불러오지 못했습니다.",
      );
    }

    responseCache.set(path, { expiresAt: Date.now() + ttlMs, value: data });
    return data as T;
  })();

  pendingRequests.set(path, request);
  try {
    return await request;
  } finally {
    pendingRequests.delete(path);
  }
}

