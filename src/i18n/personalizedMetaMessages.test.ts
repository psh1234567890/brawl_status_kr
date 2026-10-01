import { describe, expect, it } from "vitest";
import { locales } from "./config";
import { personalizedMetaMessages } from "./personalizedMetaMessages";

describe("personalized recommendation messages", () => {
  it("has complete non-empty copy and source labels in every locale", () => {
    const expectedKeys = Object.keys(personalizedMetaMessages.ko).sort();
    for (const locale of locales) {
      const messages = personalizedMetaMessages[locale];
      expect(Object.keys(messages).sort()).toEqual(expectedKeys);
      for (const [key, value] of Object.entries(messages)) {
        if (key === "sourceLabels") {
          expect(Object.values(value).every((label) => label.trim())).toBe(true);
        } else {
          expect(typeof value).toBe("string");
          expect((value as string).trim()).not.toBe("");
        }
      }
      expect(Object.keys(messages.sourceLabels).sort()).toEqual(["default", "recent", "selected"]);
    }
  });
});
