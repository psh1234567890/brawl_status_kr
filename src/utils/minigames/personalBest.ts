export type PersonalBestGameId =
  | "brawler-quiz"
  | "silhouette-quiz"
  | "map-quiz"
  | "ability-quiz";

export type PersonalBestCandidate = {
  gameId: PersonalBestGameId;
  mode: string;
  rulesetVersion: number;
  score: number;
  total: number;
  clientRecordedAt: string | null;
};

export type PersonalBestRecord = PersonalBestCandidate & {
  source: "legacy_import" | "client_play";
  revision: number;
  createdAt: string;
  updatedAt: string;
};

const slots: Record<PersonalBestGameId, readonly string[]> = {
  "brawler-quiz": ["3m", "5m", "10m", "practice"],
  "silhouette-quiz": ["base"],
  "map-quiz": ["standard"],
  "ability-quiz": ["mixed", "gadget", "star-power"],
};

const allowedCandidateKeys = new Set([
  "gameId",
  "mode",
  "rulesetVersion",
  "score",
  "total",
  "clientRecordedAt",
]);

export class PersonalBestValidationError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

export function normalizeClientRecordedAt(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 128) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString();
}

export function parsePersonalBestCandidate(
  value: unknown,
): PersonalBestCandidate {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PersonalBestValidationError("INVALID_CANDIDATE");
  }
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !allowedCandidateKeys.has(key))) {
    throw new PersonalBestValidationError("UNKNOWN_FIELD");
  }

  const gameId = input.gameId;
  const mode = input.mode;
  const rulesetVersion = input.rulesetVersion;
  const score = input.score;
  const total = input.total;
  if (
    typeof gameId !== "string" ||
    !Object.hasOwn(slots, gameId) ||
    typeof mode !== "string" ||
    !slots[gameId as PersonalBestGameId].includes(mode)
  ) {
    throw new PersonalBestValidationError("INVALID_SLOT");
  }
  if (
    !Number.isSafeInteger(rulesetVersion) ||
    rulesetVersion !== 1 ||
    !Number.isSafeInteger(score) ||
    !Number.isSafeInteger(total) ||
    Number(total) < 1 ||
    Number(total) > 10_000 ||
    Number(score) < 0 ||
    Number(score) > Number(total)
  ) {
    throw new PersonalBestValidationError(
      Number.isSafeInteger(rulesetVersion) && rulesetVersion !== 1
        ? "INVALID_RULESET_VERSION"
        : "INVALID_SCORE",
    );
  }
  if (gameId !== "brawler-quiz" && total !== 10) {
    throw new PersonalBestValidationError("INVALID_TOTAL");
  }

  return {
    gameId: gameId as PersonalBestGameId,
    mode,
    rulesetVersion: Number(rulesetVersion),
    score: Number(score),
    total: Number(total),
    clientRecordedAt: normalizeClientRecordedAt(input.clientRecordedAt),
  };
}

export function comparePersonalBest(
  candidate: Pick<PersonalBestCandidate, "score" | "total">,
  existing: Pick<PersonalBestCandidate, "score" | "total">,
) {
  const candidateRatio = BigInt(candidate.score) * BigInt(existing.total);
  const existingRatio = BigInt(existing.score) * BigInt(candidate.total);
  if (candidateRatio > existingRatio) return 1;
  if (candidateRatio < existingRatio) return -1;
  if (candidate.score > existing.score) return 1;
  if (candidate.score < existing.score) return -1;
  return 0;
}

export function personalBestSlotKey(
  candidate: Pick<
    PersonalBestCandidate,
    "gameId" | "mode" | "rulesetVersion"
  >,
) {
  return [
    candidate.gameId,
    candidate.mode,
    String(candidate.rulesetVersion),
  ].join(":");
}

export function mergePersonalBestRecords(
  records: readonly PersonalBestRecord[],
  candidate: PersonalBestCandidate,
  source: PersonalBestRecord["source"],
  now = new Date().toISOString(),
) {
  const key = personalBestSlotKey(candidate);
  const index = records.findIndex((record) => personalBestSlotKey(record) === key);
  if (index < 0) {
    return [
      ...records,
      {
        ...candidate,
        source,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  const existing = records[index];
  if (comparePersonalBest(candidate, existing) <= 0) return records;
  const next = [...records];
  next[index] = {
    ...candidate,
    source,
    revision: existing.revision + 1,
    createdAt: existing.createdAt,
    updatedAt: now,
  };
  return next;
}

export function sortPersonalBestRecords(records: readonly PersonalBestRecord[]) {
  return [...records].sort((left, right) =>
    personalBestSlotKey(left).localeCompare(personalBestSlotKey(right)),
  );
}
