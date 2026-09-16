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
});
