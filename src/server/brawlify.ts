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

export class BrawlifyApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function fetchBrawlify<T>(path: string, revalidateSeconds = 3600): Promise<T> {
  let lastError: BrawlifyApiError | undefined;

  for (const baseUrl of BRAWLIFY_BASE_URLS) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        next: { revalidate: revalidateSeconds },
        signal: AbortSignal.timeout(10_000),
      });
      const text = await response.text();

      if (!response.ok) {
        lastError = new BrawlifyApiError(
          response.status,
          "Brawl Stars 도감 데이터를 불러오지 못했습니다.",
        );
        continue;
      }
      if (!text) return {} as T;

      try {
        return JSON.parse(text) as T;
      } catch {
        lastError = new BrawlifyApiError(
          response.status,
          "Brawl Stars 도감 서버에서 JSON이 아닌 응답을 받았습니다.",
        );
      }
    } catch (error) {
      lastError =
        error instanceof BrawlifyApiError
          ? error
          : new BrawlifyApiError(
              503,
              "Brawl Stars 도감 서버에 연결하지 못했습니다.",
            );
    }
  }

  throw lastError ?? new BrawlifyApiError(503, "Brawl Stars 도감 데이터를 불러오지 못했습니다.");
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
