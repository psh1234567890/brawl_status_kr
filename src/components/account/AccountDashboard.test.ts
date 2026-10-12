import { describe, expect, it } from "vitest";
import { parseLocalRecentTags } from "./AccountDashboard";

describe("dashboard device-only recent searches", () => {
  it("deduplicates normalized tags and drops invalid values", () => {
    expect(parseLocalRecentTags(JSON.stringify(["#2py", "2PY", "##BOGUS", "#P0Y", 123, "#2PY", "#89QL", "#JCU", "#LVQ", "#GRO"])))
      .toEqual(["2PY", "P0Y", "89QL", "JCU", "LVQ"]);
  });
  it("handles inaccessible or corrupted browser storage without crashing", () => {
    expect(parseLocalRecentTags("not-json")).toEqual([]);
    expect(parseLocalRecentTags(JSON.stringify({ playerTag: "#2PY" }))).toEqual([]);
  });
});
