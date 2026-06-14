import type {
  BrawlifyBrawler,
  BrawlifyEventsResponse,
  BrawlifyGameMode,
  BrawlifyIconsResponse,
  BrawlifyListResponse,
  BrawlifyMap,
} from "../types/brawlify";

const BRAWLIFY_BASE_URL = "https://api.brawlify.com/v1";

export class BrawlifyApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function fetchBrawlify<T>(path: string, revalidateSeconds = 3600): Promise<T> {
  const response = await fetch(`${BRAWLIFY_BASE_URL}${path}`, {
    next: { revalidate: revalidateSeconds },
    signal: AbortSignal.timeout(10_000),
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : {};
  if (!response.ok) {
    throw new BrawlifyApiError(response.status, "Brawlify 데이터를 불러오지 못했습니다.");
  }
  return data as T;
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
