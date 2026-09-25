"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mergeRoundBest, readRoundBests, roundRecordStorageKey, type RoundBest, type RoundBests, type RoundRecordMode } from "../../utils/minigames/roundRecords";
import { usePersonalBest } from "../../hooks/useAccount";

export function useRoundBest(game: "silhouette" | "map-quiz" | "ability-quiz", mode: RoundRecordMode) {
  const key = useMemo(() => roundRecordStorageKey(game), [game]);
  const [bests, setBests] = useState<RoundBests>({});
  const bestsRef = useRef(bests);
  const { beginRound, recordPersonalBest } = usePersonalBest();

  useEffect(() => {
    bestsRef.current = bests;
  }, [bests]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored = readRoundBests(window.localStorage.getItem(key));
        bestsRef.current = stored;
        setBests(stored);
      } catch {
        // Storage can be unavailable while the round itself remains playable.
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [key]);

  const record = useCallback((score: number, completed: number) => {
    if (completed !== 10) return;
    const recordedAt = new Date().toISOString();
    const gameId = game === "silhouette" ? "silhouette-quiz" : game;
    // Account PBs are scoped independently from the legacy guest record. Let
    // the server compare every completed run with this account's canonical PB.
    void recordPersonalBest(gameId, mode, score, completed, recordedAt);
    let current = bestsRef.current;
    try {
      current = readRoundBests(window.localStorage.getItem(key));
    } catch {
      // Keep the in-memory record if storage is unavailable.
    }
    const next = mergeRoundBest(current, mode, score, completed, recordedAt);
    if (next === current) return;
    bestsRef.current = next;
    setBests(next);
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Personal records are optional when storage is denied or full.
    }
  }, [game, key, mode, recordPersonalBest]);

  return { best: bests[mode] as RoundBest | undefined, beginRound, record };
}
