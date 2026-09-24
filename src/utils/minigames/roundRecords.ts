export type RoundRecordMode = "standard" | "base" | "mixed" | "gadget" | "star-power";
export type RoundBest = { mode: RoundRecordMode; score: number; total: 10; percentage: number; recordedAt: string };
export type RoundBests = Partial<Record<RoundRecordMode, RoundBest>>;

export function roundRecordStorageKey(game: "silhouette" | "map-quiz" | "ability-quiz") {
  return "brawl-status:minigames:" + game + ":v1:best";
}

export function readRoundBests(value: string | null): RoundBests {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: RoundBests = {};
    for (const mode of ["standard", "base", "mixed", "gadget", "star-power"] as const) {
      const candidate = (parsed as Record<string, unknown>)[mode];
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
      const record = candidate as Partial<RoundBest>;
      if (record.mode !== mode || record.total !== 10 || !Number.isInteger(record.score) ||
        record.score! < 0 || record.score! > 10 || typeof record.recordedAt !== "string") continue;
      result[mode] = { mode, score: record.score!, total: 10, percentage: record.score! * 10, recordedAt: record.recordedAt };
    }
    return result;
  } catch {
    return {};
  }
}

export function mergeRoundBest(previous: RoundBests, mode: RoundRecordMode, score: number, completed: number, recordedAt: string): RoundBests {
  if (completed !== 10 || !Number.isInteger(score) || score < 0 || score > 10) return previous;
  const existing = previous[mode];
  if (existing && score <= existing.score) return previous;
  return { ...previous, [mode]: { mode, score, total: 10, percentage: score * 10, recordedAt } };
}
