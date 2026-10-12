import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  query: vi.fn(), connect: vi.fn(), release: vi.fn(), entries: vi.fn(),
}));
vi.mock("../db", () => ({ db: { $client: { query: mocks.query, connect: mocks.connect } } }));
vi.mock("./comparisonGames", () => ({ loadComparisonEntries: mocks.entries }));
import {
  exposeQuestion, parseCompetitiveGame, parseRankingPeriod,
  startCompetitiveRound, submitCompetitiveAnswer, readCompetitiveLeaderboard, withdrawCompetitiveResults,
} from "./competitiveComparison";
import type { ComparisonQuestion } from "../utils/minigames/comparisonQuiz";

const A = { id: 11, displayName: "A", imageUrl: "", value: 2000 };
const B = { id: 12, displayName: "B", imageUrl: "", value: 3500 };
const deck: ComparisonQuestion[] = Array.from({ length: 10 }, () => ({
  first: A, second: B, correctId: B.id,
}));
const baseRound = {
  user_id: "account-1", game_id: "higher-lower", next_index: 0, score: 0,
  expires_at: new Date(Date.now() + 120_000).toISOString(), question_set: deck,
};

describe("server-owned competitive comparisons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.mockResolvedValue({ rows: [] });
    mocks.connect.mockResolvedValue({ query: mocks.query, release: mocks.release });
    mocks.entries.mockResolvedValue(Array.from({ length: 35 }, (_, i) => ({
      id: 100 + i, displayName: "Game " + i, imageUrl: "", value: 1000 + i * 100,
    })));
  });

  it("exposes only public options, never answers or hidden statistic values", () => {
    const exposed = exposeQuestion(deck[0], 0);
    expect(exposed).toEqual({
      index: 0, first: { id: 11, displayName: "A", imageUrl: "" },
      second: { id: 12, displayName: "B", imageUrl: "" },
    });
    expect(JSON.stringify(exposed)).not.toMatch(/correctId|value/);
  });

  it("rejects unknown games and arbitrary ranking periods", () => {
    expect(() => parseCompetitiveGame("map-quiz")).toThrow("INVALID_GAME");
    expect(() => parseRankingPeriod("today';DROP TABLE")).toThrow("INVALID_PERIOD");
    expect(parseRankingPeriod("week")).toBe("week");
  });

  it("stores all answers server-side before starting and only returns the first public question", async () => {
    const started = await startCompetitiveRound("account-1", "higher-lower");
    expect(started.questionCount).toBe(10);
    expect(started.question).not.toHaveProperty("correctId");
    const insert = mocks.query.mock.calls.find(([text]) => String(text).includes("INSERT INTO public.competitive_rounds"));
    expect(insert).toBeTruthy();
    const hiddenDeck = JSON.parse(insert![1][3]);
    expect(hiddenDeck).toHaveLength(10);
    expect(hiddenDeck[0]).toHaveProperty("correctId");
    expect(hiddenDeck[0].first).toHaveProperty("value");
    expect(mocks.query.mock.calls.some(([text]) => String(text).includes("INSERT INTO public.competitive_results"))).toBe(false);
    expect(mocks.query.mock.calls.at(-1)?.[0]).toBe("COMMIT");
    expect(mocks.release).toHaveBeenCalledOnce();
  });

  it("scores from a locked server round, increments once, and does not accept a client score", async () => {
    mocks.query.mockImplementation(async (sql: string) =>
      sql.includes("SELECT user_id") ? { rows: [baseRound] } : { rows: [] });
    const answer = await submitCompetitiveAnswer("account-1", "a8b65eb8-9cc9-4d1d-ae6e-1cac65ef9b06", 0, B.id);
    expect(answer).toMatchObject({ correct: true, score: 1, finished: false, correctId: B.id, nextQuestion: { index: 1 } });
    const update = mocks.query.mock.calls.find(([sql]) => String(sql).includes("UPDATE public.competitive_rounds"));
    expect(update?.[1]).toEqual(["a8b65eb8-9cc9-4d1d-ae6e-1cac65ef9b06", 1, 1]);
    expect(mocks.query.mock.calls.some(([sql]) => String(sql).includes("INSERT INTO public.competitive_results"))).toBe(false);
  });

  it("rejects a replayed index, unauthorized account, and invalid answer option", async () => {
    mocks.query.mockImplementation(async (sql: string) =>
      sql.includes("SELECT user_id") ? { rows: [{ ...baseRound, next_index: 1 }] } : { rows: [] });
    await expect(submitCompetitiveAnswer("account-1", "test", 0, 11)).rejects.toMatchObject({ status: 409 });
    mocks.query.mockImplementation(async (sql: string) =>
      sql.includes("SELECT user_id") ? { rows: [baseRound] } : { rows: [] });
    await expect(submitCompetitiveAnswer("other", "test", 0, 11)).rejects.toMatchObject({ status: 404 });
    await expect(submitCompetitiveAnswer("account-1", "test", 0, 999)).rejects.toMatchObject({ status: 400 });
    expect(mocks.query.mock.calls.some(([sql]) => String(sql).includes("INSERT INTO public.competitive_results"))).toBe(false);
  });

  it("finalizes the tenth answer with server-calculated score, then destroys the round", async () => {
    mocks.query.mockImplementation(async (sql: string) =>
      sql.includes("SELECT user_id") ? { rows: [{ ...baseRound, next_index: 9, score: 8 }] } : { rows: [] });
    const answer = await submitCompetitiveAnswer("account-1", "test", 9, B.id);
    expect(answer).toMatchObject({ finished: true, score: 9, nextQuestion: null });
    const insert = mocks.query.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO public.competitive_results"));
    expect(insert?.[1]).toEqual(["test", "account-1", "higher-lower", 9]);
    expect(mocks.query.mock.calls.some(([sql]) => String(sql).includes("DELETE FROM public.competitive_rounds WHERE id"))).toBe(true);
  });

  it("returns public aliases, omits user IDs, and limits each game to 50 verified accounts", async () => {
    mocks.query.mockResolvedValue({ rows: [
      { alias: "Player-1234567890", score: 9, completed_at: "2026-10-12T00:00:00Z" },
    ] });
    const ranks = await readCompetitiveLeaderboard("release-order", "today");
    expect(ranks).toMatchObject([{ rank: 1, alias: "Player-1234567890", score: 9, total: 10 }]);
    expect(ranks[0]).not.toHaveProperty("userId");
    expect(ranks[0]).not.toHaveProperty("completedAt");
    const sql = String(mocks.query.mock.calls[0][0]);
    expect(sql).toContain("DISTINCT ON (r.user_id)");
    expect(sql).toContain("LIMIT 50");
    expect(sql).toContain("Asia/Seoul");
    expect(sql).not.toContain("minigame_personal_bests");
    expect(mocks.query.mock.calls[0][1]).toEqual(["release-order"]);
  });

  it("withdraws ranked alias, rounds and results without deleting private personal bests", async () => {
    await withdrawCompetitiveResults("account-1");
    const queries = mocks.query.mock.calls.map(([sql]) => String(sql));
    expect(queries).toEqual([
      "BEGIN",
      "SELECT id FROM public.auth_users WHERE id = $1 FOR UPDATE",
      "DELETE FROM public.competitive_results WHERE user_id = $1",
      "DELETE FROM public.competitive_rounds WHERE user_id = $1",
      "DELETE FROM public.competitive_aliases WHERE user_id = $1",
      "COMMIT",
    ]);
  });
});
