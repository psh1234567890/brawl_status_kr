"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import BrawlImage from "../../components/BrawlImage";

import {
  generatedSkinCatalog,
  type GeneratedSkinCatalogItem,
} from "../../constants/generatedSkinCatalog";

const PAGE_SIZE = 120;
const ALL = "ALL";

type SaleStatus = "ALL" | "CATALOG" | "UNAVAILABLE" | "DEFAULT" | "PAID";
type SortMode = "RARITY" | "NEWEST" | "NAME" | "BRAWLER" | "PRICE_DESC" | "PRICE_ASC";

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

const saleStatusLabels: Record<SaleStatus, string> = {
  ALL: "전체 판매 상태",
  CATALOG: "카탈로그 판매",
  UNAVAILABLE: "현재 미판매",
  DEFAULT: "기본 스킨",
  PAID: "유료 스킨",
};

const sortLabels: Record<SortMode, string> = {
  RARITY: "희귀도 높은순",
  NEWEST: "신규 ID순",
  NAME: "스킨 이름순",
  BRAWLER: "브롤러 이름순",
  PRICE_DESC: "가격 높은순",
  PRICE_ASC: "가격 낮은순",
};

const rarityWeight: Record<string, number> = {
  DEFAULT: 0,
  RARE: 1,
  SUPER_RARE: 2,
  EPIC: 3,
  MYTHIC: 4,
  COLLECTORS: 4,
  RANKED_PASS: 4,
  HYPERCHARGE: 5,
  LEGENDARY: 5,
};

function formatPrice(skin: GeneratedSkinCatalogItem) {
  if (skin.isDefault) return "기본 제공";
  if (skin.gems > 0 && skin.bling > 0) return `${skin.gems} 보석 / ${skin.bling} 블링`;
  if (skin.gems > 0) return `${skin.gems} 보석`;
  if (skin.bling > 0) return `${skin.bling} 블링`;
  if (skin.coins > 0) return `${skin.coins} 코인`;
  return skin.isCatalogReleased ? "획득 경로 확인 필요" : "현재 카탈로그 미판매";
}

function getPriceValue(skin: GeneratedSkinCatalogItem) {
  if (skin.gems > 0) return skin.gems * 10_000;
  if (skin.bling > 0) return skin.bling;
  if (skin.coins > 0) return skin.coins / 5;
  return 0;
}

function getRarityWeight(skin: GeneratedSkinCatalogItem) {
  return rarityWeight[skin.rarity] ?? 0;
}

function isPaidSkin(skin: GeneratedSkinCatalogItem) {
  return skin.gems > 0 || skin.bling > 0 || skin.coins > 0;
}

function getSaleLabel(skin: GeneratedSkinCatalogItem) {
  if (skin.isDefault) return "기본";
  if (skin.isCatalogReleased) return "판매 중";
  return "미판매";
}

function matchesSaleStatus(skin: GeneratedSkinCatalogItem, status: SaleStatus) {
  if (status === "ALL") return true;
  if (status === "CATALOG") return skin.isCatalogReleased && !skin.isDefault;
  if (status === "UNAVAILABLE") return !skin.isCatalogReleased;
  if (status === "DEFAULT") return skin.isDefault;
  return isPaidSkin(skin);
}

function compareSkins(left: GeneratedSkinCatalogItem, right: GeneratedSkinCatalogItem, sortMode: SortMode) {
  if (sortMode === "NAME") {
    return left.name.localeCompare(right.name, "ko") || left.id - right.id;
  }

  if (sortMode === "BRAWLER") {
    return (
      left.brawlerNameKo.localeCompare(right.brawlerNameKo, "ko") ||
      left.name.localeCompare(right.name, "ko") ||
      left.id - right.id
    );
  }

  if (sortMode === "PRICE_DESC") {
    return getPriceValue(right) - getPriceValue(left) || right.id - left.id;
  }

  if (sortMode === "PRICE_ASC") {
    return getPriceValue(left) - getPriceValue(right) || left.id - right.id;
  }

  if (sortMode === "NEWEST") {
    return right.id - left.id;
  }

  return getRarityWeight(right) - getRarityWeight(left) || right.id - left.id;
}

export default function SkinCatalogPage() {
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState(ALL);
  const [brawlerId, setBrawlerId] = useState(ALL);
  const [saleStatus, setSaleStatus] = useState<SaleStatus>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("RARITY");
  const [hideDefaults, setHideDefaults] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const brawlers = useMemo(() => {
    const byId = new Map<number, string>();
    for (const skin of generatedSkinCatalog) byId.set(skin.brawlerId, skin.brawlerNameKo);
    return [...byId.entries()].sort(([, left], [, right]) => left.localeCompare(right, "ko"));
  }, []);

  const rarities = useMemo(
    () =>
      [...new Set(generatedSkinCatalog.map((skin) => skin.rarity))].sort(
        (left, right) => (rarityWeight[right] ?? 0) - (rarityWeight[left] ?? 0),
      ),
    [],
  );

  const filteredSkins = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    return generatedSkinCatalog
      .filter((skin) => {
        const matchesQuery =
          cleanQuery === "" ||
          skin.name.toLowerCase().includes(cleanQuery) ||
          skin.brawlerName.toLowerCase().includes(cleanQuery) ||
          skin.brawlerNameKo.toLowerCase().includes(cleanQuery);
        const matchesRarity = rarity === ALL || skin.rarity === rarity;
        const matchesBrawler = brawlerId === ALL || String(skin.brawlerId) === brawlerId;
        const matchesStatus = matchesSaleStatus(skin, saleStatus);
        const matchesDefaultVisibility = !hideDefaults || !skin.isDefault;
        return matchesQuery && matchesRarity && matchesBrawler && matchesStatus && matchesDefaultVisibility;
      })
      .sort((left, right) => compareSkins(left, right, sortMode));
  }, [brawlerId, hideDefaults, query, rarity, saleStatus, sortMode]);

  const summary = useMemo(() => {
    let catalog = 0;
    let unavailable = 0;
    let defaults = 0;
    let paid = 0;

    for (const skin of filteredSkins) {
      if (skin.isCatalogReleased && !skin.isDefault) catalog += 1;
      if (!skin.isCatalogReleased) unavailable += 1;
      if (skin.isDefault) defaults += 1;
      if (isPaidSkin(skin)) paid += 1;
    }

    return {
      catalog,
      defaults,
      paid,
      total: filteredSkins.length,
      unavailable,
    };
  }, [filteredSkins]);

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

        <section className="mb-5 rounded-lg border border-indigo-100 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
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
                <option key={id} value={id}>
                  {name}
                </option>
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
                <option key={value} value={value}>
                  {rarityLabels[value] ?? value}
                </option>
              ))}
            </select>
            <select
              value={saleStatus}
              onChange={(event) => {
                setSaleStatus(event.target.value as SaleStatus);
                resetVisibleCount();
              }}
              className="min-w-0 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:border-indigo-400"
            >
              {(Object.keys(saleStatusLabels) as SaleStatus[]).map((value) => (
                <option key={value} value={value}>
                  {saleStatusLabels[value]}
                </option>
              ))}
            </select>
            <select
              value={sortMode}
              onChange={(event) => {
                setSortMode(event.target.value as SortMode);
                resetVisibleCount();
              }}
              className="min-w-0 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:border-indigo-400"
            >
              {(Object.keys(sortLabels) as SortMode[]).map((value) => (
                <option key={value} value={value}>
                  {sortLabels[value]}
                </option>
              ))}
            </select>
          </div>

          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-black text-indigo-950">
            <input
              type="checkbox"
              checked={hideDefaults}
              onChange={(event) => {
                setHideDefaults(event.target.checked);
                resetVisibleCount();
              }}
              className="h-4 w-4 accent-indigo-600"
            />
            기본 스킨 숨기기
          </label>
        </section>

        <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatChip label="검색 결과" value={summary.total} />
          <StatChip label="판매 중" value={summary.catalog} />
          <StatChip label="현재 미판매" value={summary.unavailable} />
          <StatChip label="유료 스킨" value={summary.paid} />
          <StatChip label="기본 스킨" value={summary.defaults} />
        </section>

        <p className="mb-4 text-sm font-bold text-gray-600">
          {visibleSkins.length.toLocaleString("ko-KR")}종 표시 중
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleSkins.map((skin) => (
            <article
              key={skin.id}
              className="min-w-0 overflow-hidden rounded-lg border border-white bg-white shadow-sm"
            >
              <div className="relative flex h-32 items-center justify-center bg-indigo-50">
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[11px] font-black text-indigo-700">
                  #{skin.id}
                </span>
                <BrawlImage
                  src={`https://cdn.brawlify.com/brawlers/borders/${skin.brawlerId}.png`}
                  alt={skin.brawlerNameKo}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-md object-contain"
                  title="스킨 전용 이미지가 없어 브롤러 기본 이미지를 표시합니다."
                />
              </div>
              <div className="p-4">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-indigo-100 px-2 py-1 text-[11px] font-black text-indigo-700">
                    {rarityLabels[skin.rarity] ?? skin.rarity}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-black ${
                      skin.isCatalogReleased
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {getSaleLabel(skin)}
                  </span>
                </div>
                <h2 className="truncate text-sm font-black text-gray-900" title={skin.name}>
                  {skin.name}
                </h2>
                <p className="mt-1 truncate text-xs font-bold text-indigo-700">{skin.brawlerNameKo}</p>
                <p className="mt-3 text-sm font-black text-gray-800">{formatPrice(skin)}</p>
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

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-indigo-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-black text-indigo-600">{label}</p>
      <p className="mt-1 text-2xl font-black text-indigo-950">{value.toLocaleString("ko-KR")}</p>
    </div>
  );
}
