import { describe, expect, it } from "vitest";
import { locales } from "./config";
import { messages } from "./messages";

function collectLeafPaths(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    collectLeafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("localized message dictionaries", () => {
  it("keeps every locale structurally aligned with Korean", () => {
    const expected = collectLeafPaths(messages.ko).sort();
    for (const locale of locales) {
      expect(collectLeafPaths(messages[locale]).sort()).toEqual(expected);
    }
  });
});
