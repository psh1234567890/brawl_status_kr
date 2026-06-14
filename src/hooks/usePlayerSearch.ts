"use client";

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type {
  BattleLogResponse,
  PlayerData,
  PlayerDbStats,
  PlayerHistoryResponse,
  PlayerSkinInventoryResponse,
  PlayerSkinInventoryStatus,
} from "../types/brawl";
import { normalizePlayerTag } from "../utils/playerTag";

const RECENT_TAGS_KEY = "recentTags";
const FAVORITE_TAGS_KEY = "favoriteTags";
const EMPTY_RECENT_TAGS = "[]";
const RECENT_TAGS_CHANGED_EVENT = "recentTagsChanged";
const FAVORITE_TAGS_CHANGED_EVENT = "favoriteTagsChanged";

function getStoredTagsSnapshot(key: string) {
  if (typeof window === "undefined") return EMPTY_RECENT_TAGS;
  return window.localStorage.getItem(key) ?? EMPTY_RECENT_TAGS;
}

function subscribeStoredTags(eventName: string, onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(eventName, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(eventName, onStoreChange);
  };
}

function parseRecentTags(snapshot: string) {
  try {
    const value = JSON.parse(snapshot) as unknown;
    return Array.isArray(value)
      ? value.filter((tag): tag is string => typeof tag === "string")
      : [];
  } catch {
    return [];
  }
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "데이터를 불러오지 못했습니다.");
  }
  return data;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function usePlayerSearch() {
  const [tag, setTag] = useState("");
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [battleLog, setBattleLog] = useState<BattleLogResponse | null>(null);
  const [dbStats, setDbStats] = useState<PlayerDbStats | null>(null);
  const [playerHistory, setPlayerHistory] = useState<PlayerHistoryResponse | null>(null);
  const [skinInventory, setSkinInventory] = useState<PlayerSkinInventoryResponse | null>(null);
  const [skinInventoryStatus, setSkinInventoryStatus] = useState<PlayerSkinInventoryStatus>("idle");
  const [skinInventoryError, setSkinInventoryError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const activeRequest = useRef<AbortController | null>(null);
  const requestSequence = useRef(0);

  const recentSnapshot = useSyncExternalStore(
    (onStoreChange) => subscribeStoredTags(RECENT_TAGS_CHANGED_EVENT, onStoreChange),
    () => getStoredTagsSnapshot(RECENT_TAGS_KEY),
    () => EMPTY_RECENT_TAGS,
  );
  const favoriteSnapshot = useSyncExternalStore(
    (onStoreChange) => subscribeStoredTags(FAVORITE_TAGS_CHANGED_EVENT, onStoreChange),
    () => getStoredTagsSnapshot(FAVORITE_TAGS_KEY),
    () => EMPTY_RECENT_TAGS,
  );
  const recentSearches = useMemo(() => parseRecentTags(recentSnapshot), [recentSnapshot]);
  const favoriteSearches = useMemo(() => parseRecentTags(favoriteSnapshot), [favoriteSnapshot]);

  const handleSearch = useCallback(
    async (searchTag?: string) => {
      const targetTag = normalizePlayerTag(searchTag ?? tag);
      if (!targetTag) {
        setError("플레이어 태그를 입력해주세요.");
        return;
      }

      activeRequest.current?.abort();
      const controller = new AbortController();
      activeRequest.current = controller;
      const sequence = requestSequence.current + 1;
      requestSequence.current = sequence;
      const isCurrent = () => requestSequence.current === sequence;
      const safeTag = encodeURIComponent(targetTag);

      setTag(targetTag);
      setLoading(true);
      setError("");
      setNotice("");
      setPlayerData(null);
      setBattleLog(null);
      setDbStats(null);
      setPlayerHistory(null);
      setSkinInventory(null);
      setSkinInventoryStatus("loading");
      setSkinInventoryError("");

      try {
        const skinInventoryRequest = fetchJson<PlayerSkinInventoryResponse>(`/api/player/skins?tag=${safeTag}`, {
          signal: controller.signal,
        })
          .then((skins) => {
            if (!isCurrent()) return;
            setSkinInventory(skins);
            setSkinInventoryStatus("ready");
          })
          .catch((skinError) => {
            if (isAbortError(skinError) || !isCurrent()) return;
            setSkinInventoryStatus("error");
            setSkinInventoryError(
              skinError instanceof Error
                ? skinError.message
                : "보유 스킨 목록을 불러오지 못했습니다.",
            );
          });

        const [profileResult, battleResult] = await Promise.allSettled([
          fetchJson<PlayerData>(`/api/player?tag=${safeTag}`, {
            signal: controller.signal,
          }),
          fetchJson<BattleLogResponse>(`/api/player/matches?tag=${safeTag}`, {
            method: "POST",
            signal: controller.signal,
          }),
        ]);

        if (!isCurrent()) return;
        if (profileResult.status === "rejected") {
          controller.abort();
          throw profileResult.reason;
        }

        setPlayerData(profileResult.value);
        const updatedRecent = [
          targetTag,
          ...recentSearches.filter((recentTag) => recentTag !== targetTag),
        ].slice(0, 5);
        localStorage.setItem(RECENT_TAGS_KEY, JSON.stringify(updatedRecent));
        window.dispatchEvent(new Event(RECENT_TAGS_CHANGED_EVENT));

        if (battleResult.status === "fulfilled") {
          setBattleLog(battleResult.value);
        } else if (!isAbortError(battleResult.reason)) {
          setNotice("프로필은 불러왔지만 최근 전투 기록은 갱신하지 못했습니다.");
        }

        try {
          const [stats, history] = await Promise.allSettled([
            fetchJson<PlayerDbStats>(`/api/player/db-stats?tag=${safeTag}`, {
              signal: controller.signal,
            }),
            fetchJson<PlayerHistoryResponse>(`/api/player/history?tag=${safeTag}`, {
              signal: controller.signal,
            }),
          ]);
          if (isCurrent()) {
            if (stats.status === "fulfilled") setDbStats(stats.value);
            if (history.status === "fulfilled") setPlayerHistory(history.value);
            if (stats.status === "rejected" || history.status === "rejected") {
              setNotice("프로필은 불러왔지만 누적 통계는 갱신하지 못했습니다.");
            }
          }
          await skinInventoryRequest;
        } catch (statsError) {
          if (!isAbortError(statsError) && isCurrent()) {
            setNotice("프로필은 불러왔지만 누적 통계는 갱신하지 못했습니다.");
          }
        }
      } catch (requestError) {
        if (!isAbortError(requestError) && isCurrent()) {
          setSkinInventoryStatus("idle");
          setSkinInventoryError("");
          setError(
            requestError instanceof Error
              ? requestError.message
              : "서버와 연결할 수 없습니다.",
          );
        }
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [recentSearches, tag],
  );

  const toggleFavorite = useCallback(
    (target?: string) => {
      const targetTag = normalizePlayerTag(target ?? tag);
      if (!targetTag) return;

      const nextFavorites = favoriteSearches.includes(targetTag)
        ? favoriteSearches.filter((favoriteTag) => favoriteTag !== targetTag)
        : [targetTag, ...favoriteSearches.filter((favoriteTag) => favoriteTag !== targetTag)].slice(0, 12);

      localStorage.setItem(FAVORITE_TAGS_KEY, JSON.stringify(nextFavorites));
      window.dispatchEvent(new Event(FAVORITE_TAGS_CHANGED_EVENT));
    },
    [favoriteSearches, tag],
  );

  return {
    tag,
    setTag,
    playerData,
    battleLog,
    dbStats,
    playerHistory,
    skinInventory,
    skinInventoryStatus,
    skinInventoryError,
    loading,
    error,
    notice,
    recentSearches,
    favoriteSearches,
    handleSearch,
    toggleFavorite,
  };
}
