import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("legacy migration ordering", () => {
  it("creates unique indexes only after legacy duplicate cleanup", () => {
    const root = process.cwd();
    const migrationSql = readFileSync(
      resolve(root, "drizzle/0000_harden_battle_logs.sql"),
      "utf8",
    );
    const migrationScript = readFileSync(resolve(root, "scripts/migrate-db.mjs"), "utf8");

    expect(migrationSql).not.toContain("CREATE UNIQUE INDEX");

    const dedupePosition = migrationScript.indexOf("DELETE FROM battle_logs");
    const normalizePosition = migrationScript.indexOf("UPDATE battle_logs");
    const uniquePosition = migrationScript.indexOf("CREATE UNIQUE INDEX");

    expect(dedupePosition).toBeGreaterThan(-1);
    expect(normalizePosition).toBeGreaterThan(dedupePosition);
    expect(uniquePosition).toBeGreaterThan(normalizePosition);
  });

  it("removes the legacy player/time uniqueness rule whether it is a constraint or standalone index", () => {
    const migrationScript = readFileSync(
      resolve(process.cwd(), "scripts/migrate-db.mjs"),
      "utf8",
    );

    const dropConstraintPosition = migrationScript.indexOf(
      "DROP CONSTRAINT IF EXISTS battle_logs_player_tag_battle_time_unique",
    );
    const dropIndexPosition = migrationScript.indexOf(
      "DROP INDEX IF EXISTS battle_logs_player_tag_battle_time_unique",
    );

    expect(dropConstraintPosition).toBeGreaterThan(-1);
    expect(dropIndexPosition).toBeGreaterThan(dropConstraintPosition);
  });

  it("enables row level security after structural migration work", () => {
    const migrationScript = readFileSync(
      resolve(process.cwd(), "scripts/migrate-db.mjs"),
      "utf8",
    );

    const uniquePosition = migrationScript.indexOf("CREATE UNIQUE INDEX");
    const rlsPosition = migrationScript.indexOf(
      "ALTER TABLE battle_logs ENABLE ROW LEVEL SECURITY",
    );

    expect(rlsPosition).toBeGreaterThan(uniquePosition);
    expect(migrationScript).not.toContain("CREATE POLICY");
  });
});
