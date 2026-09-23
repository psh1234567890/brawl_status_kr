import { describe, expect, it } from "vitest";
import { locales } from "./config";
import { getMinigameMessages } from "./minigameMessages";

describe("mini game translations", () => {
  it("provides every UI message and interpolation in all supported locales", () => {
    const korean = getMinigameMessages("ko");
    const keys = Object.keys(korean).sort();
    for (const locale of locales) {
      const copy = getMinigameMessages(locale);
      expect(Object.keys(copy).sort(), locale).toEqual(keys);
      for (const key of keys) {
        expect(copy[key as keyof typeof copy].trim().length, `${locale}.${key}`).toBeGreaterThan(0);
        expect(copy[key as keyof typeof copy].match(/\{\w+\}/g)?.sort() ?? [], `${locale}.${key}`).toEqual(
          korean[key as keyof typeof korean].match(/\{\w+\}/g)?.sort() ?? [],
        );
      }
    }
  });
});
