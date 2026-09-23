import type {
  BrawlifyBrawler,
  BrawlifyEventsResponse,
  BrawlifyGameMode,
  BrawlifyIconsResponse,
  BrawlifyListResponse,
  BrawlifyMap,
} from "../types/brawlify";

const BRAWLIFY_BASE_URLS = [
  "https://api.brawlapi.com/v1",
  "https://brawlapi-v1.pages.dev/v1",
] as const;
const BRAWLIFY_HEDGE_DELAY_MS = 1_500;
const BRAWLIFY_TIMEOUT_MS = 10_000;

export class BrawlifyApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function fetchBrawlify<T>(path: string, revalidateSeconds = 3600): Promise<T> {
  const [primaryUrl, fallbackUrl] = BRAWLIFY_BASE_URLS;
  const primaryController = new AbortController();
  const fallbackController = new AbortController();
  let releaseFallback!: () => void;
  const fallbackTrigger = new Promise<void>((resolve) => {
    releaseFallback = resolve;
  });
  const hedgeTimer = setTimeout(releaseFallback, BRAWLIFY_HEDGE_DELAY_MS);

  const primary = fetchBrawlifyEndpoint<T>(
    primaryUrl,
    path,
    revalidateSeconds,
    primaryController.signal,
  ).catch((error) => {
    releaseFallback();
    throw error;
  });

  const fallback = fallbackTrigger.then(() =>
    fetchBrawlifyEndpoint<T>(
      fallbackUrl,
      path,
      revalidateSeconds,
      fallbackController.signal,
    ),
  );

  try {
    return await Promise.any([primary, fallback]);
  } catch (error) {
    if (error instanceof AggregateError) {
      const apiError = error.errors.find(
        (candidate): candidate is BrawlifyApiError =>
          candidate instanceof BrawlifyApiError,
      );
      if (apiError) throw apiError;
    }
    throw new BrawlifyApiError(
      503,
      "Brawl Stars 도감 데이터를 불러오지 못했습니다.",
    );
  } finally {
    clearTimeout(hedgeTimer);
    primaryController.abort();
    fallbackController.abort();
  }
}

async function fetchBrawlifyEndpoint<T>(
  baseUrl: string,
  path: string,
  revalidateSeconds: number,
  cancelSignal: AbortSignal,
) {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      next: { revalidate: revalidateSeconds },
      signal: AbortSignal.any([
        cancelSignal,
        AbortSignal.timeout(BRAWLIFY_TIMEOUT_MS),
      ]),
    });
    const text = await response.text();

    if (!response.ok) {
      throw new BrawlifyApiError(
        response.status,
        "Brawl Stars 도감 데이터를 불러오지 못했습니다.",
      );
    }
    if (!text) return {} as T;

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new BrawlifyApiError(
        response.status,
        "Brawl Stars 도감 서버에서 JSON이 아닌 응답을 받았습니다.",
      );
    }
  } catch (error) {
    if (error instanceof BrawlifyApiError) throw error;
    throw new BrawlifyApiError(
      503,
      "Brawl Stars 도감 서버에 연결하지 못했습니다.",
    );
  }
}

export async function getBrawlifyBrawlers() {
  return fetchBrawlify<BrawlifyListResponse<BrawlifyBrawler>>("/brawlers", 86_400);
}

export async function getBrawlifyMaps() {
  return fetchBrawlify<BrawlifyListResponse<BrawlifyMap>>("/maps", 21_600);
}

export async function getBrawlifyGameModes() {
  return fetchBrawlify<BrawlifyListResponse<BrawlifyGameMode>>("/gamemodes", 86_400);
}

export async function getBrawlifyEvents() {
  return fetchBrawlify<BrawlifyEventsResponse>("/events", 300);
}

export async function getBrawlifyIcons() {
  return fetchBrawlify<BrawlifyIconsResponse>("/icons", 86_400);
}
