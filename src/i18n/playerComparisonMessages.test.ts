import { describe, expect, it } from "vitest";
import { localizedLocales, numberLocales } from "./config";
import { getComparisonMessages } from "./playerComparisonMessages";

describe("translated comparison feature", () => {
  it("provides complete labels and locale-specific search metadata in all supported languages", () => {
    const english = getComparisonMessages("en");
    const keys = Object.keys(english).sort();
    for (const locale of localizedLocales) {
      const copy = getComparisonMessages(locale);
      expect(Object.keys(copy).sort()).toEqual(keys);
      expect(copy.title.length).toBeGreaterThan(3);
      expect(copy.description.length).toBeGreaterThan(25);
      expect(numberLocales[locale]).toBeTruthy();
      if (locale !== "en") {
        expect(copy.title).not.toBe(english.title);
        expect(copy.description).not.toBe(english.description);
        expect(copy.invalid).not.toBe(english.invalid);
      }
    }
    expect(getComparisonMessages("ru").title).toBe("Сравнение игроков");
  });
});
