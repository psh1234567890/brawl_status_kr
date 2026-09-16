import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  buildCounterStatsQuery,
  buildMapMetaStatsQuery,
  buildTeamCompStatsQuery,
  buildTeamMapsQuery,
} from "./metaStats";

const dialect = new PgDialect();

function render(query: ReturnType<typeof buildMapMetaStatsQuery>) {
  return dialect.sqlToQuery(query);
}

describe("meta SQL contracts", () => {
  it("expands only two-team battles and keeps showdown as perspective-only data", () => {
    const { sql, params } = render(buildMapMetaStatsQuery(5));

    expect(sql).toContain("jsonb_array_length(battle_detail_json->'battle'->'teams') = 2");
    expect(sql).toContain("mode NOT IN ('duoShowdown', 'trioShowdown')");
    expect(sql).toContain("mode IN ('duoShowdown', 'trioShowdown')");
    expect(sql).toContain("perspective_stats");
    expect(params).toContain(5);
  });

  it("resolves the searched-player team before deriving counter outcomes", () => {
    const { sql, params } = dialect.sqlToQuery(buildCounterStatsQuery("SHELLY"));

    expect(sql).toContain("searched_teams");
    expect(sql).toContain("target_outcomes");
    expect(sql).toContain("target_teams.team_index = searched_teams.team_index");
    expect(sql).toContain("jsonb_array_length(battle_detail_json->'battle'->'teams') = 2");
    expect(sql).toContain("battle_detail_json @>");
    expect(params).toContain("SHELLY");
    expect(sql).not.toContain("SHELLY");
  });

  it("aggregates both teams from a deduplicated two-team battle", () => {
    const { sql } = dialect.sqlToQuery(buildTeamCompStatsQuery("Sneaky Fields"));

    expect(sql).toContain("team_outcomes");
    expect(sql).toContain("string_agg(team_players.brawler_name");
    expect(sql).not.toContain("searched_team_players");
  });

  it("uses the same eligible two-team population for the map selector", () => {
    const { sql } = dialect.sqlToQuery(buildTeamMapsQuery());

    expect(sql).toContain("SELECT DISTINCT map");
    expect(sql).toContain("jsonb_array_length(battle_detail_json->'battle'->'teams') = 2");
    expect(sql).toContain("mode NOT IN ('duoShowdown', 'trioShowdown')");
  });
});
