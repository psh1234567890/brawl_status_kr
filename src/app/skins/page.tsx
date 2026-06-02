"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  generatedSkinCatalog,
  type GeneratedSkinCatalogItem,
} from "../../constants/generatedSkinCatalog";

const PAGE_SIZE = 120;
const ALL = "ALL";
const rarityLabels: Record<string, string> = {
  ALL: "전체 희귀도",
  DEFAULT: "기본 / 한정",
  RARE: "레어",
  SUPER_RARE: "슈퍼 레어",
  EPIC: "에픽",
  MYTHIC: "신화",
  LEGENDARY: "전설",
  HYPERCHARGE: "하이퍼차지",
  COLLECTORS: "컬렉터",
  RANKED_PASS: "랭크 패스",
};

function formatPrice(skin: GeneratedSkinCatalogItem) {
  if (skin.isDefault) return "기본 제공";
  if (skin.gems > 0 && skin.bling > 0) return `${skin.gems} 보석 / ${skin.bling} 블링`;
  if (skin.gems > 0) return `${skin.gems} 보석`;
  if (skin.bling > 0) return `${skin.bling} 블링`;
  if (skin.coins > 0) return `${skin.coins} 코인`;
  return skin.isCatalogReleased ? "획득 경로 확인 필요" : "현재 카탈로그 미판매";
}

export default function SkinCatalogPage() {
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState(ALL);
  const [brawlerId, setBrawlerId] = useState(ALL);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const brawlers = useMemo(() => {
    const byId = new Map<number, string>();
    for (const skin of generatedSkinCatalog) byId.set(skin.brawlerId, skin.brawlerNameKo);
    return [...byId.entries()].sort(([, left], [, right]) => left.localeCompare(right, "ko"));
  }, []);

  const rarities = useMemo(
    () => [...new Set(generatedSkinCatalog.map((skin) => skin.rarity))],
    [],
  );

  const filteredSkins = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    return generatedSkinCatalog.filter((skin) => {
      const matchesQuery =
        cleanQuery === "" ||
        skin.name.toLowerCase().includes(cleanQuery) ||
        skin.brawlerName.toLowerCase().includes(cleanQuery) ||
        skin.brawlerNameKo.toLowerCase().includes(cleanQuery);
      const matchesRarity = rarity === ALL || skin.rarity === rarity;
      const matchesBrawler = brawlerId === ALL || String(skin.brawlerId) === brawlerId;
      return matchesQuery && matchesRarity && matchesBrawler;
    });
  }, [brawlerId, query, rarity]);

  const visibleSkins = filteredSkins.slice(0, visibleCount);

  function resetVisibleCount() {
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-indigo-950 sm:text-4xl">스킨 카탈로그</h1>
            <p className="mt-2 text-sm font-bold text-indigo-700">
              브롤러 스킨 {generatedSkinCatalog.length.toLocaleString("ko-KR")}종
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-indigo-200 bg-white px-5 py-2 text-sm font-black text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50"
          >
            전적 검색으로 돌아가기
          </Link>
        </div>

        <div className="mb-6 grid gap-3 rounded-lg border border-indigo-100 bg-white p-4 shadow-sm md:grid-cols-3">
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetVisibleCount();
            }}
            placeholder="스킨 또는 브롤러 검색"
            className="min-w-0 rounded-md border border-gray-200 px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:border-indigo-400"
          />
          <select
            value={brawlerId}
            onChange={(event) => {
              setBrawlerId(event.target.value);
              resetVisibleCount();
            }}
            className="min-w-0 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:border-indigo-400"
          >
            <option value={ALL}>전체 브롤러</option>
            {brawlers.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <select
            value={rarity}
            onChange={(event) => {
              setRarity(event.target.value);
              resetVisibleCount();
            }}
            className="min-w-0 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:border-indigo-400"
          >
            <option value={ALL}>{rarityLabels.ALL}</option>
            {rarities.map((value) => (
              <option key={value} value={value}>{rarityLabels[value] ?? value}</option>
            ))}
          </select>
        </div>

        <p className="mb-4 text-sm font-bold text-gray-600">
          검색 결과 {filteredSkins.length.toLocaleString("ko-KR")}종
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleSkins.map((skin) => (
            <article
              key={skin.id}
              className="flex min-w-0 items-center gap-3 rounded-lg border border-white bg-white p-3 shadow-sm"
            >
              <img
                src={`https://cdn.brawlify.com/brawlers/borders/${skin.brawlerId}.png`}
                alt={skin.brawlerNameKo}
                className="h-16 w-16 shrink-0 rounded-md bg-indigo-50"
                title="스킨 전용 이미지가 없어 브롤러 기본 이미지를 표시합니다."
              />
              <div className="min-w-0">
                <h2 className="truncate text-sm font-black text-gray-900" title={skin.name}>
                  {skin.name}
                </h2>
                <p className="mt-1 truncate text-xs font-bold text-indigo-700">{skin.brawlerNameKo}</p>
                <p className="mt-1 text-xs text-gray-500">{rarityLabels[skin.rarity] ?? skin.rarity}</p>
                <p className="mt-1 text-xs font-bold text-gray-700">{formatPrice(skin)}</p>
              </div>
            </article>
          ))}
        </div>

        {filteredSkins.length === 0 ? (
          <p className="rounded-lg border border-indigo-100 bg-white p-8 text-center text-sm font-bold text-gray-500">
            조건에 맞는 스킨이 없습니다.
          </p>
        ) : null}

        {visibleCount < filteredSkins.length ? (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              더 보기
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
