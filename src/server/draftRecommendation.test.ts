import { describe, expect, it } from "vitest";
import { getDraftOptions, parseDraftInput, predictDraftWinProbability, recommendDraft } from "./draftRecommendation";

const context = { map: "Belle's Rock", mode: "knockout", allies: ["GROM", "STU"], opponents: ["BROCK", "LEON", "MEEPLE"] };

describe("exported season 55 recommendation model", () => {
  it("matches independently saved sklearn probabilities", () => {
    for (const [b, p] of [["8-BIT", 0.462110229907593], ["ALLI", 0.4290722504821694], ["AMBER", 0.4581689742420976]] as const) {
      expect(predictDraftWinProbability(context.map, context.mode, [...context.allies, b], context.opponents)).toBeCloseTo(p, 12);
    }
  });
  it("is invariant to team slot order and complementary when teams switch", () => {
    const team = [...context.allies, "TARA"];
    const p = predictDraftWinProbability(context.map, context.mode, team, context.opponents);
    expect(predictDraftWinProbability(context.map, context.mode, [...team].reverse(), [...context.opponents].reverse())).toBeCloseTo(p, 14);
    expect(p + predictDraftWinProbability(context.map, context.mode, context.opponents, team)).toBeCloseTo(1, 14);
  });
  it("filters both ranking methods to the same available candidate pool", () => {
    const r = recommendDraft(parseDraftInput({ ...context, banned: ["TARA"], candidates: ["TARA", "AMBER", "ASH", "GROM"] }));
    expect(r.candidateCount).toBe(2);
    expect(r.modelRecommendations.map((x) => x.brawler).sort()).toEqual(["AMBER", "ASH"]);
    expect(r.baselineRecommendations.map((x) => x.brawler).sort()).toEqual(["AMBER", "ASH"]);
  });
  it("keeps training metadata and coefficients on the server", () => {
    const options = getDraftOptions();
    expect(options.trainingSets).toBe(2695474);
    expect(options.mapModes).toHaveLength(32);
    expect(options).not.toHaveProperty("weights");
  });
  it.each([
    { ...context, allies: ["STU"] },
    { ...context, opponents: ["BROCK", "LEON", "STU"] },
    { ...context, allies: ["GROM", "NOT_A_BRAWLER"] },
    { ...context, mode: "gemGrab" },
    { ...context, topK: 1000 },
    { ...context, candidates: [] },
  ])("rejects unsupported input or an empty eligible pool", (raw) => {
    expect(() => recommendDraft(parseDraftInput(raw))).toThrow();
  });
});
