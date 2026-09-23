import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  buildCounterStatsQuery,
  buildMapMetaStatsQuery,
  buildTeamCompStatsQuery,
  buildTeamMapsQuery,
  META_WINDOW_DAYS,
} from "./metaStats";

const dialect = new PgDialect();

function render(query: ReturnType<typeof buildMapMetaStatsQuery>) {
  return dialect.sqlToQuery(query);
}

describe("meta SQL contracts", () => {
  it("uses normalized two-team participants and keeps perspective-only modes from battle logs", () => {
    const { sql, params } = render(buildMapMetaStatsQuery(5));

    expect(sql).toContain("FROM battle_team_participants");
    expect(sql).toContain("UNION ALL");
    expect(sql).toContain("FROM battle_logs");
    expect(sql).toContain("meta_perspective_only = true");
    expect(sql).toContain("battle_timestamp >= now() -");
    expect(sql).not.toContain("battle_detail_json");
    expect(sql).not.toContain("jsonb_array_elements");
    expect(params).toContain(5);
    expect(params).toContain(META_WINDOW_DAYS);
  });

  it("derives counters entirely from normalized participant rows", () => {
    const { sql, params } = dialect.sqlToQuery(buildCounterStatsQuery("SHELLY"));

    expect(sql).toContain("target_teams");
    expect(sql).toContain("battle_team_participants");
    expect(sql).toContain("target_teams.battle_fingerprint = participants.battle_fingerprint");
    expect(sql).toContain("target_teams.team_index <> participants.team_index");
    expect(sql).toContain("battle_timestamp >= now() -");
    expect(sql).not.toContain("battle_detail_json");
    expect(sql).not.toContain("jsonb_array_elements");
    expect(params).toContain("SHELLY");
    expect(params).toContain(META_WINDOW_DAYS);
    expect(sql).not.toContain("SHELLY");
  });

  it("aggregates team compositions from normalized participant rows", () => {
    const { sql, params } = dialect.sqlToQuery(buildTeamCompStatsQuery("Sneaky Fields"));

    expect(sql).toContain("FROM battle_team_participants");
    expect(sql).toContain("string_agg(brawler_name");
    expect(sql).toContain("GROUP BY battle_fingerprint, map, team_index, result");
    expect(sql).toContain("battle_timestamp >= now() -");
    expect(params).toContain(META_WINDOW_DAYS);
    expect(params).toContain("Sneaky Fields");
    expect(sql).not.toContain("battle_detail_json");
  });

  it("uses recent normalized team data for the map selector", () => {
    const { sql, params } = dialect.sqlToQuery(buildTeamMapsQuery());

    expect(sql).toContain("SELECT DISTINCT map");
    expect(sql).toContain("FROM battle_team_participants");
    expect(sql).toContain("battle_timestamp >= now() -");
    expect(sql).not.toContain("battle_detail_json");
    expect(params).toContain(META_WINDOW_DAYS);
  });
});
