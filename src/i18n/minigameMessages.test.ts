import { describe, expect, it } from "vitest";
import { locales } from "./config";
import { getMinigameMessages } from "./minigameMessages";

describe("mini game translations", () => {
  function flatten(value: unknown, prefix = ""): Record<string, string> {
    if (typeof value === "string") return { [prefix]: value };
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.entries(value).reduce<Record<string, string>>((all, [key, child]) => ({
      ...all,
      ...flatten(child, prefix ? prefix + "." + key : key),
    }), {});
  }

  it("provides every UI message and interpolation in all supported locales", () => {
    const korean = getMinigameMessages("ko");
    const original = flatten(korean);
    const keys = Object.keys(original).sort();
    for (const locale of locales) {
      const copy = getMinigameMessages(locale);
      expect(Object.keys(copy).sort(), locale).toEqual(Object.keys(korean).sort());
      const translated = flatten(copy);
      expect(Object.keys(translated).sort(), locale).toEqual(keys);
      for (const key of keys) {
        expect(translated[key].trim().length, `${locale}.${key}`).toBeGreaterThan(0);
        expect(translated[key].match(/\{\w+\}/g)?.sort() ?? [], `${locale}.${key}`).toEqual(
          original[key].match(/\{\w+\}/g)?.sort() ?? [],
        );
      }
    }
  });
});
