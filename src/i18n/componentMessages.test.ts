import { describe, expect, it } from "vitest";
import { locales } from "./config";
import { getComponentMessages } from "./componentMessages";

function collectLeafPaths(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    collectLeafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("component-localized copy", () => {
  it("keeps every locale structurally aligned with Korean", () => {
    const expected = collectLeafPaths(getComponentMessages("ko")).sort();
    for (const locale of locales) {
      expect(collectLeafPaths(getComponentMessages(locale)).sort()).toEqual(expected);
    }
  });
});
