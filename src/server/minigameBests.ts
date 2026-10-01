import "server-only";

import { createHash } from "node:crypto";
import { db } from "../db";
import { AccountError, type AuthenticatedAccount } from "./account";
import {
  parsePersonalBestCandidate,
  sortPersonalBestRecords,
  type PersonalBestCandidate,
  type PersonalBestRecord,
} from "../utils/minigames/personalBest";

export const MAX_PERSONAL_BEST_SLOTS = 9;

function canonicalPayload(
  source: "legacy_import" | "client_play",
  candidates: readonly PersonalBestCandidate[],
) {
  const sorted = [...candidates].sort((left, right) =>
    compareCodePoints(
      [
        left.gameId,
        left.mode,
        String(left.rulesetVersion),
      ].join(":"),
      [
        right.gameId,
        right.mode,
        String(right.rulesetVersion),
      ].join(":"),
    ),
  );
  return {
    source,
    candidates: sorted.map((candidate) => ({
      gameId: candidate.gameId,
      mode: candidate.mode,
      rulesetVersion: candidate.rulesetVersion,
      score: candidate.score,
      total: candidate.total,
      clientRecordedAt: candidate.clientRecordedAt,
    })),
  };
}

function compareCodePoints(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function hashPersonalBestPayload(
  source: "legacy_import" | "client_play",
  candidates: readonly PersonalBestCandidate[],
) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalPayload(source, candidates)))
    .digest("hex");
}

export function parsePersonalBestCandidates(
  input: unknown,
  allowEmpty = false,
) {
  if (!Array.isArray(input) || input.length > MAX_PERSONAL_BEST_SLOTS) {
    throw new AccountError(400, "INVALID_CANDIDATES");
  }
  if (!allowEmpty && input.length === 0) {
    throw new AccountError(400, "INVALID_CANDIDATES");
  }

  let candidates: PersonalBestCandidate[];
  try {
    candidates = input.map(parsePersonalBestCandidate);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      throw new AccountError(400, String(error.code));
    }
    throw new AccountError(400, "INVALID_CANDIDATE");
  }

  const slots = new Set<string>();
  for (const candidate of candidates) {
    const key = [
      candidate.gameId,
      candidate.mode,
      candidate.rulesetVersion,
    ].join(":");
    if (slots.has(key)) throw new AccountError(400, "DUPLICATE_SLOT");
    slots.add(key);
  }
  return candidates;
}

type DbRecord = {
  game_id: PersonalBestRecord["gameId"];
  mode: string;
  ruleset_version: number;
  score: number;
  total: number;
  source: PersonalBestRecord["source"];
  client_recorded_at: Date | string | null;
  revision: number;
  created_at: Date | string;
  updated_at: Date | string;
};

function toRecord(row: DbRecord): PersonalBestRecord {
  return {
    gameId: row.game_id,
    mode: row.mode,
    rulesetVersion: Number(row.ruleset_version),
    score: Number(row.score),
    total: Number(row.total),
    source: row.source,
    clientRecordedAt: row.client_recorded_at
      ? new Date(row.client_recorded_at).toISOString()
      : null,
    revision: Number(row.revision),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function selectAll(client: {
  query: <T = unknown>(text: string, values?: unknown[]) => Promise<{ rows: T[] }>;
}, userId: string) {
  const result = await client.query<DbRecord>(
    "SELECT game_id, mode, ruleset_version, score, total, source, client_recorded_at, revision, created_at, updated_at FROM public.minigame_personal_bests WHERE user_id = $1",
    [userId],
  );
  return sortPersonalBestRecords(result.rows.map(toRecord));
}

export async function readPersonalBests(userId: string) {
  return selectAll(db.$client, userId);
}

export async function mergePersonalBests(
  account: AuthenticatedAccount,
  operationId: string,
  source: "legacy_import" | "client_play",
  candidates: readonly PersonalBestCandidate[],
) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId)) {
    throw new AccountError(400, "INVALID_OPERATION_ID");
  }
  if (candidates.length > MAX_PERSONAL_BEST_SLOTS) {
    throw new AccountError(400, "INVALID_CANDIDATES");
  }

  const payloadHash = hashPersonalBestPayload(source, candidates);
  const client = await db.$client.connect();
  try {
    await client.query("BEGIN");
    const owner = await client.query(
      "SELECT id FROM public.auth_users WHERE id = $1 FOR UPDATE",
      [account.userId],
    );
    if (!owner.rowCount) throw new AccountError(401, "LOGIN_REQUIRED");

    await client.query(
      "DELETE FROM public.account_sync_receipts WHERE user_id = $1 AND operation_id = $2 AND expires_at <= now()",
      [account.userId, operationId],
    );
    const inserted = await client.query<{ payload_hash: string }>(
      "INSERT INTO public.account_sync_receipts (user_id, operation_id, payload_hash, expires_at) VALUES ($1, $2, $3, now() + interval '7 days') ON CONFLICT (user_id, operation_id) DO NOTHING RETURNING payload_hash",
      [account.userId, operationId, payloadHash],
    );

    if (!inserted.rowCount) {
      const existing = await client.query<{ payload_hash: string }>(
        "SELECT payload_hash FROM public.account_sync_receipts WHERE user_id = $1 AND operation_id = $2",
        [account.userId, operationId],
      );
      if (existing.rows[0]?.payload_hash !== payloadHash) {
        throw new AccountError(409, "IDEMPOTENCY_CONFLICT");
      }
      const current = await selectAll(client, account.userId);
      await client.query("COMMIT");
      return current;
    }

    for (const candidate of candidates) {
      await client.query(
        "INSERT INTO public.minigame_personal_bests (user_id, game_id, mode, ruleset_version, score, total, source, client_recorded_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (user_id, game_id, mode, ruleset_version) DO UPDATE SET score = EXCLUDED.score, total = EXCLUDED.total, source = EXCLUDED.source, client_recorded_at = EXCLUDED.client_recorded_at, revision = public.minigame_personal_bests.revision + 1, updated_at = now() WHERE EXCLUDED.score::bigint * public.minigame_personal_bests.total::bigint > public.minigame_personal_bests.score::bigint * EXCLUDED.total::bigint OR (EXCLUDED.score::bigint * public.minigame_personal_bests.total::bigint = public.minigame_personal_bests.score::bigint * EXCLUDED.total::bigint AND EXCLUDED.score > public.minigame_personal_bests.score)",
        [
          account.userId,
          candidate.gameId,
          candidate.mode,
          candidate.rulesetVersion,
          candidate.score,
          candidate.total,
          source,
          candidate.clientRecordedAt,
        ],
      );
    }

    const current = await selectAll(client, account.userId);
    await client.query("COMMIT");
    return current;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
