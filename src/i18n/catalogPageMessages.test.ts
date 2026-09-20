import { describe, expect, it } from "vitest";
import { locales } from "./config";
import { getCatalogPageMessages } from "./catalogPageMessages";

function collectShape(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectShape(item, `${prefix}[${index}]`));
  }
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    collectShape(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("catalog page messages", () => {
  it("keeps all ten locales structurally aligned with Korean", () => {
    const expected = collectShape(getCatalogPageMessages("ko")).sort();
    for (const locale of locales) {
      expect(collectShape(getCatalogPageMessages(locale)).sort()).toEqual(expected);
    }
  });
});
