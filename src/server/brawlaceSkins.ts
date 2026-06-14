import type { PlayerOwnedSkin, PlayerSkinInventoryResponse } from "../types/brawl";
import { normalizePlayerTag } from "../utils/playerTag";

const BRAWLACE_BASE_URL = "https://brawlace.com";
const BRAWLACE_READER_BASE_URL = "https://r.jina.ai/http://r.jina.ai/http://";
const MAX_BRAWLACE_SKINS_HTML_BYTES = 1_000_000;

export class BrawlaceSkinLookupError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
  }
}

export async function fetchBrawlaceSkinInventory(tag: string): Promise<PlayerSkinInventoryResponse> {
  const cleanTag = normalizePlayerTag(tag);
  const skins = await fetchBrawlaceSkins(cleanTag);

  return {
    byBrawler: groupSkinsByBrawler(skins),
    skins,
    source: "brawlace",
    tag: cleanTag,
  };
}

async function fetchBrawlaceSkins(cleanTag: string) {
  try {
    const html = await fetchBrawlaceDirectHtml(cleanTag);
    const skins = parseBrawlaceSkinTable(html);
    if (skins.length > 0) return skins;
    throw new BrawlaceSkinLookupError("보유 스킨 표를 찾지 못했습니다.");
  } catch (error) {
    console.warn("Brawlace direct skin lookup failed; trying reader fallback:", getLookupLog(error));
  }

  const markdown = await fetchBrawlaceReaderMarkdown(cleanTag);
  const skins = parseBrawlaceSkinMarkdown(markdown);
  if (skins.length > 0) return skins;

  throw new BrawlaceSkinLookupError("보유 스킨 보조 조회 결과가 비어 있습니다.");
}

async function fetchBrawlaceDirectHtml(cleanTag: string) {
  const response = await fetch(`${BRAWLACE_BASE_URL}/players/%23${cleanTag}/skins`, {
    headers: {
      accept: "text/html,*/*",
      "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      "user-agent": "Brawl Status KR skin lookup",
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new BrawlaceSkinLookupError("보유 스킨 보조 조회에 실패했습니다.", response.status);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !contentType.toLowerCase().includes("text/html")) {
    throw new BrawlaceSkinLookupError("보유 스킨 응답 형식이 올바르지 않습니다.", response.status);
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BRAWLACE_SKINS_HTML_BYTES) {
    throw new BrawlaceSkinLookupError("보유 스킨 응답이 너무 큽니다.", response.status);
  }

  const html = await response.text();
  if (html.length > MAX_BRAWLACE_SKINS_HTML_BYTES) {
    throw new BrawlaceSkinLookupError("보유 스킨 응답이 너무 큽니다.", response.status);
  }

  return html;
}

async function fetchBrawlaceReaderMarkdown(cleanTag: string) {
  const response = await fetch(`${BRAWLACE_READER_BASE_URL}${BRAWLACE_BASE_URL}/players/%2523${cleanTag}/skins`, {
    headers: {
      accept: "text/plain,*/*",
      "user-agent": "Brawl Status KR skin lookup",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new BrawlaceSkinLookupError("보유 스킨 reader 조회에 실패했습니다.", response.status);
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BRAWLACE_SKINS_HTML_BYTES) {
    throw new BrawlaceSkinLookupError("보유 스킨 reader 응답이 너무 큽니다.", response.status);
  }

  const markdown = await response.text();
  if (markdown.length > MAX_BRAWLACE_SKINS_HTML_BYTES) {
    throw new BrawlaceSkinLookupError("보유 스킨 reader 응답이 너무 큽니다.", response.status);
  }

  return markdown;
}

export function parseBrawlaceSkinTable(html: string): PlayerOwnedSkin[] {
  const rows = html.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];
  const skins: PlayerOwnedSkin[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) =>
      normalizeCellText(match[1]),
    );
    if (cells.length < 2) continue;

    const brawlerName = cells[0];
    const skinName = cells[1];
    if (!brawlerName || !skinName) continue;

    const key = `${normalizeLookupKey(brawlerName)}:${normalizeLookupKey(skinName)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    skins.push({
      brawlerName,
      name: skinName,
      source: "brawlace",
    });
  }

  return skins.sort(
    (left, right) =>
      left.brawlerName.localeCompare(right.brawlerName, "en") ||
      left.name.localeCompare(right.name, "en"),
  );
}

export function groupSkinsByBrawler(skins: PlayerOwnedSkin[]) {
  const result: Record<string, PlayerOwnedSkin[]> = {};

  for (const skin of skins) {
    const key = normalizeLookupKey(skin.brawlerName);
    result[key] ??= [];
    result[key].push(skin);
  }

  return result;
}

export function parseBrawlaceSkinMarkdown(markdown: string): PlayerOwnedSkin[] {
  const skins: PlayerOwnedSkin[] = [];
  const seen = new Set<string>();

  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) continue;

    const cells = trimmed
      .slice(1, -1)
      .split("|")
      .map((cell) => normalizeMarkdownCell(cell));
    if (cells.length < 2) continue;

    const [brawlerName, skinName] = cells;
    if (
      !brawlerName ||
      !skinName ||
      /^-+$/.test(brawlerName) ||
      /^brawlers$/i.test(brawlerName) ||
      /^skins$/i.test(skinName)
    ) {
      continue;
    }

    const key = `${normalizeLookupKey(brawlerName)}:${normalizeLookupKey(skinName)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    skins.push({
      brawlerName,
      name: skinName,
      source: "brawlace",
    });
  }

  return skins.sort(
    (left, right) =>
      left.brawlerName.localeCompare(right.brawlerName, "en") ||
      left.name.localeCompare(right.name, "en"),
  );
}

export function normalizeLookupKey(value: string) {
  return decodeHtmlEntities(value)
    .toUpperCase()
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9]+/g, "");
}

function normalizeCellText(html: string) {
  return decodeHtmlEntities(stripTags(html))
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMarkdownCell(markdown: string) {
  return decodeHtmlEntities(markdown)
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/\\([\\`*_{}\[\]()#+\-.!|])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(html: string) {
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ");
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code: string) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function getLookupLog(error: unknown) {
  if (error instanceof BrawlaceSkinLookupError) {
    return { message: error.message, status: error.status };
  }

  if (error instanceof Error) {
    return { message: error.message, name: error.name };
  }

  return { message: String(error) };
}
