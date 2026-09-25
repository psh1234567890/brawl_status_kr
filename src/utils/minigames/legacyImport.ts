import {
  bestStorageKey,
  readQuizBests,
  type QuizMode,
} from "./brawlerQuiz";
import {
  roundRecordStorageKey,
  readRoundBests,
} from "./roundRecords";
import {
  parsePersonalBestCandidate,
  type PersonalBestCandidate,
} from "./personalBest";

export const LEGACY_MINIGAME_BEST_KEYS = [
  bestStorageKey,
  roundRecordStorageKey("silhouette"),
  roundRecordStorageKey("map-quiz"),
  roundRecordStorageKey("ability-quiz"),
] as const;

export type LegacyBestStorage = Pick<Storage, "getItem">;

function candidate(
  gameId: string,
  mode: string,
  score: unknown,
  total: unknown,
  clientRecordedAt: unknown,
): PersonalBestCandidate | null {
  try {
    return parsePersonalBestCandidate({
      gameId,
      mode,
      rulesetVersion: 1,
      score,
      total,
      clientRecordedAt,
    });
  } catch {
    return null;
  }
}

export function readLegacyPersonalBestCandidates(
  storage: LegacyBestStorage,
): PersonalBestCandidate[] {
  const candidates: PersonalBestCandidate[] = [];

  try {
    const quiz = readQuizBests(storage.getItem(bestStorageKey));
    for (const mode of ["3m", "5m", "10m", "practice"] as const satisfies readonly QuizMode[]) {
      const record = quiz[mode];
      if (!record) continue;
      const value = candidate(
        "brawler-quiz",
        mode,
        record.found,
        record.total,
        record.recordedAt,
      );
      if (value) candidates.push(value);
    }
  } catch {
    // A browser may deny storage access while allowing gameplay.
  }

  const roundSources = [
    ["silhouette", "silhouette-quiz", ["base"]],
    ["map-quiz", "map-quiz", ["standard"]],
    ["ability-quiz", "ability-quiz", ["mixed", "gadget", "star-power"]],
  ] as const;
  for (const [legacyGame, gameId, modes] of roundSources) {
    try {
      const records = readRoundBests(
        storage.getItem(roundRecordStorageKey(legacyGame)),
      );
      for (const mode of modes) {
        const record = records[mode];
        if (!record) continue;
        const value = candidate(
          gameId,
          mode,
          record.score,
          record.total,
          record.recordedAt,
        );
        if (value) candidates.push(value);
      }
    } catch {
      // Malformed or unavailable storage is omitted without changing the original key.
    }
  }

  const unique = new Map<string, PersonalBestCandidate>();
  for (const value of candidates) {
    const key = [value.gameId, value.mode, value.rulesetVersion].join(":");
    if (!unique.has(key)) unique.set(key, value);
  }
  return [...unique.values()].sort((left, right) =>
    [left.gameId, left.mode].join(":").localeCompare([right.gameId, right.mode].join(":")),
  );
}
