"use client";

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type {
  BattleLogResponse,
  PlayerData,
  PlayerDbStats,
  PlayerHistoryResponse,
} from "../types/brawl";
import { normalizePlayerTag } from "../utils/playerTag";

const RECENT_TAGS_KEY = "recentTags";
const EMPTY_RECENT_TAGS = "[]";
const RECENT_TAGS_CHANGED_EVENT = "recentTagsChanged";

function getRecentTagsSnapshot() {
  if (typeof window === "undefined") return EMPTY_RECENT_TAGS;
  return window.localStorage.getItem(RECENT_TAGS_KEY) ?? EMPTY_RECENT_TAGS;
}

function subscribeRecentTags(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(RECENT_TAGS_CHANGED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(RECENT_TAGS_CHANGED_EVENT, onStoreChange);
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const activeRequest = useRef<AbortController | null>(null);
  const requestSequence = useRef(0);

  const recentSnapshot = useSyncExternalStore(
    subscribeRecentTags,
    getRecentTagsSnapshot,
    () => EMPTY_RECENT_TAGS,
  );
  const recentSearches = useMemo(() => parseRecentTags(recentSnapshot), [recentSnapshot]);

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

      try {
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
        if (profileResult.status === "rejected") throw profileResult.reason;

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
          const [stats, history] = await Promise.all([
            fetchJson<PlayerDbStats>(`/api/player/db-stats?tag=${safeTag}`, {
              signal: controller.signal,
            }),
            fetchJson<PlayerHistoryResponse>(`/api/player/history?tag=${safeTag}`, {
              signal: controller.signal,
            }),
          ]);
          if (isCurrent()) {
            setDbStats(stats);
            setPlayerHistory(history);
          }
        } catch (statsError) {
          if (!isAbortError(statsError) && isCurrent()) {
            setNotice("프로필은 불러왔지만 누적 통계는 갱신하지 못했습니다.");
          }
        }
      } catch (requestError) {
        if (!isAbortError(requestError) && isCurrent()) {
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

  return {
    tag,
    setTag,
    playerData,
    battleLog,
    dbStats,
    playerHistory,
    loading,
    error,
    notice,
    recentSearches,
    handleSearch,
  };
}
