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

  it("creates and protects the normalized meta participant table", () => {
    const root = process.cwd();
    const participantMigration = readFileSync(
      resolve(root, "drizzle/0001_add_meta_participants.sql"),
      "utf8",
    );
    const migrationScript = readFileSync(resolve(root, "scripts/migrate-db.mjs"), "utf8");

    expect(participantMigration).toContain("CREATE TABLE IF NOT EXISTS battle_team_participants");
    expect(participantMigration).toContain(
      "battle_team_participants_battle_team_player_unique",
    );
    expect(participantMigration).toContain(
      "ALTER TABLE battle_team_participants ENABLE ROW LEVEL SECURITY",
    );
    expect(migrationScript).toContain("0001_add_meta_participants.sql");

    const teamIndexBackfill = migrationScript.indexOf("SET player_team_index =");
    const participantBackfill = migrationScript.indexOf(
      "INSERT INTO battle_team_participants",
    );
    expect(teamIndexBackfill).toBeGreaterThan(-1);
    expect(participantBackfill).toBeGreaterThan(teamIndexBackfill);
  });

  it("precomputes the perspective-only meta flag after legacy JSON backfill", () => {
    const root = process.cwd();
    const flagMigration = readFileSync(
      resolve(root, "drizzle/0002_add_meta_perspective_flag.sql"),
      "utf8",
    );
    const migrationScript = readFileSync(resolve(root, "scripts/migrate-db.mjs"), "utf8");

    expect(flagMigration).toContain("ADD COLUMN IF NOT EXISTS meta_perspective_only boolean");
    expect(flagMigration).toContain("battle_logs_meta_perspective_timestamp_idx");
    expect(migrationScript).toContain("0002_add_meta_perspective_flag.sql");

    const legacyJsonBackfill = migrationScript.indexOf("battle_detail_json = $6::jsonb");
    const flagBackfill = migrationScript.indexOf("SET meta_perspective_only =");
    const notNull = migrationScript.indexOf(
      "ALTER COLUMN meta_perspective_only SET NOT NULL",
    );
    expect(flagBackfill).toBeGreaterThan(legacyJsonBackfill);
    expect(notNull).toBeGreaterThan(flagBackfill);
  });
});
