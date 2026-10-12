import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("competition migration and backup constraints", () => {
  const source = readFileSync("drizzle/0017_verified_comparison_rankings.sql", "utf8");
  const runner = readFileSync("scripts/migrate-accounts.mjs", "utf8");
  const backup = readFileSync("scripts/account-snapshot-config.mjs", "utf8");
  const accountRateLimit = readFileSync("src/server/accountRateLimit.ts", "utf8");
  it("reaches isolated account migrations and encrypted account backups", () => {
    expect(runner).toContain("0017_verified_comparison_rankings.sql");
    expect(runner).toContain("0016_comparison_game_personal_best_slots.sql");
    for (const table of ["competitive_rounds", "competitive_results", "competitive_aliases"]) {
      expect(source).toContain("public." + table);
      expect(backup).toContain('"' + table + '"');
    }
  });
  it("allows only server-controlled scores and private opt-in aliases with cascade account erasure", () => {
    expect(source).toContain("ON DELETE CASCADE");
    expect(source).toContain("ENABLE ROW LEVEL SECURITY");
    expect(source).toContain("REVOKE ALL");
    expect(source).toContain("CONSTRAINT competitive_rounds_one_per_game UNIQUE");
    expect(source).not.toContain("minigame_personal_bests");
    for (const scope of ["competitive-start-user-hour", "competitive-answer-user-minute", "competitive-withdraw-user-hour"]) {
      expect(accountRateLimit).toContain('"' + scope + '"');
    }
    const cron = readFileSync("drizzle/0018_competitive_round_expiration.sql", "utf8");
    expect(cron).toContain("brawl-competitive-expire-rounds");
    expect(cron).toContain("DELETE FROM public.competitive_rounds");
  });
});
