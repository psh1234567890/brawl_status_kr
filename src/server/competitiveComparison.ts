import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import { db } from "../db";
import { AccountError } from "./account";
import { loadComparisonEntries } from "./comparisonGames";
import { buildComparisonDeck, COMPARISON_QUESTION_COUNT, type ComparisonQuestion } from "../utils/minigames/comparisonQuiz";

export const competitiveGames = ["higher-lower", "release-order"] as const;
export type CompetitiveGame = (typeof competitiveGames)[number];
export type RankingPeriod = "today" | "week" | "all";

export function parseCompetitiveGame(value: unknown): CompetitiveGame {
  if (value === "higher-lower" || value === "release-order") return value;
  throw new AccountError(400, "INVALID_GAME");
}
export function parseRankingPeriod(value: unknown): RankingPeriod {
  if (value === "today" || value === "week" || value === "all") return value;
  throw new AccountError(400, "INVALID_PERIOD");
}

type PublicOption = Pick<ComparisonQuestion["first"], "id" | "displayName" | "imageUrl">;
export type PublicQuestion = { index: number; first: PublicOption; second: PublicOption };
export function exposeQuestion(question: ComparisonQuestion, index: number): PublicQuestion {
  const expose = (x: ComparisonQuestion["first"]) => ({
    id: x.id, displayName: x.displayName, imageUrl: x.imageUrl,
  });
  return { index, first: expose(question.first), second: expose(question.second) };
}

// A public alias never incorporates account nickname, game tag, e-mail or IP.
function generateAlias() {
  return "Player-" + randomBytes(5).toString("hex").toUpperCase();
}

export async function startCompetitiveRound(userId: string, gameId: CompetitiveGame) {
  const entries = await loadComparisonEntries(gameId, "en");
  const deck = buildComparisonDeck(entries, gameId === "higher-lower" ? "higher" : "earlier");
  if (deck.length !== COMPARISON_QUESTION_COUNT) throw new AccountError(503, "QUESTIONS_UNAVAILABLE");

  const roundId = randomUUID();
  const client = await db.$client.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT id FROM public.auth_users WHERE id = $1 FOR UPDATE", [userId]);
    // Opt-in enrollment creates a public, pseudonymous alias, never the account nickname.
    await client.query(
      "INSERT INTO public.competitive_aliases (user_id, public_alias) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING",
      [userId, generateAlias()],
    );
    // Only a single pending challenge per account/game. An old challenge
    // cannot be replayed after a new one is started.
    await client.query(
      "DELETE FROM public.competitive_rounds WHERE user_id = $1 AND game_id = $2",
      [userId, gameId],
    );
    await client.query(
      "INSERT INTO public.competitive_rounds (id, user_id, game_id, question_set, expires_at) VALUES ($1, $2, $3, $4::jsonb, now() + interval '20 minutes')",
      [roundId, userId, gameId, JSON.stringify(deck)],
    );
    await client.query("COMMIT");
    return { roundId, gameId, question: exposeQuestion(deck[0], 0), questionCount: COMPARISON_QUESTION_COUNT };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

type StoredRound = {
  user_id: string;
  game_id: CompetitiveGame;
  next_index: number;
  score: number;
  expires_at: Date | string;
  question_set: ComparisonQuestion[];
};

export async function submitCompetitiveAnswer(userId: string, roundId: string, index: number, pickedId: number) {
  if (!Number.isInteger(index) || index < 0 || index >= COMPARISON_QUESTION_COUNT ||
      !Number.isSafeInteger(pickedId) || pickedId <= 0) throw new AccountError(400, "INVALID_ANSWER");
  const client = await db.$client.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<StoredRound>(
      "SELECT user_id, game_id, next_index, score, expires_at, question_set FROM public.competitive_rounds WHERE id = $1 FOR UPDATE",
      [roundId],
    );
    const record = result.rows[0];
    if (!record || record.user_id !== userId) throw new AccountError(404, "ROUND_NOT_FOUND");
    if (new Date(record.expires_at).getTime() <= Date.now()) throw new AccountError(410, "ROUND_EXPIRED");
    if (Number(record.next_index) !== index) throw new AccountError(409, "ROUND_STEP_CONFLICT");
    const question = record.question_set[index];
    if (!question || (pickedId !== question.first.id && pickedId !== question.second.id)) {
      throw new AccountError(400, "INVALID_ANSWER");
    }
    const correct = pickedId === question.correctId;
    const score = Number(record.score) + Number(correct);
    const finished = index + 1 === COMPARISON_QUESTION_COUNT;
    if (finished) {
      // The score and time come only from the server-side challenge state.
      // No client-reported PB or submitted score can enter this table.
      await client.query(
        "INSERT INTO public.competitive_results (round_id, user_id, game_id, score) VALUES ($1, $2, $3, $4) ON CONFLICT (round_id) DO NOTHING",
        [roundId, userId, record.game_id, score],
      );
      await client.query("DELETE FROM public.competitive_rounds WHERE id = $1", [roundId]);
    } else {
      await client.query(
        "UPDATE public.competitive_rounds SET next_index = $2, score = $3 WHERE id = $1",
        [roundId, index + 1, score],
      );
    }
    await client.query("COMMIT");
    return {
      correct,
      correctId: question.correctId,
      firstValue: question.first.value,
      secondValue: question.second.value,
      score,
      finished,
      nextQuestion: finished ? null : exposeQuestion(record.question_set[index + 1], index + 1),
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function readCompetitiveLeaderboard(gameId: CompetitiveGame, period: RankingPeriod) {
  // Only known literal fragments may be injected into the query (not user strings).
  const startBound = period === "today"
    ? "AND r.completed_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'"
    : period === "week"
      ? "AND r.completed_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') - interval '6 days') AT TIME ZONE 'Asia/Seoul'"
      : "";
  const results = await db.$client.query<{ alias: string; score: number; completed_at: Date | string }>(
    `WITH best AS (
      SELECT DISTINCT ON (r.user_id)
        r.user_id, r.score, r.completed_at
      FROM public.competitive_results r
      WHERE r.game_id = $1 AND r.ruleset_version = 1 ${startBound}
      ORDER BY r.user_id, r.score DESC, r.completed_at ASC
    )
    SELECT a.public_alias AS alias, b.score, b.completed_at
    FROM best b
    JOIN public.competitive_aliases a ON a.user_id = b.user_id
    ORDER BY b.score DESC, b.completed_at ASC, a.public_alias ASC
    LIMIT 50`,
    [gameId],
  );
  return results.rows.map((row, index) => ({
    rank: index + 1, alias: row.alias, score: Number(row.score), total: 10,
  }));
}

export async function withdrawCompetitiveResults(userId: string) {
  const client = await db.$client.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT id FROM public.auth_users WHERE id = $1 FOR UPDATE", [userId]);
    await client.query("DELETE FROM public.competitive_results WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM public.competitive_rounds WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM public.competitive_aliases WHERE user_id = $1", [userId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
