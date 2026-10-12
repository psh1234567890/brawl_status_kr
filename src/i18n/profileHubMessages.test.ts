import { describe, expect, it } from "vitest";
import { locales } from "./config";
import { profileHubMessages } from "./profileHubMessages";

describe("profile hub actions", () => {
  it("provides all profile actions in every supported locale", () => {
    const keys = Object.keys(profileHubMessages.ko).sort();
    for (const locale of locales) {
      const copy = profileHubMessages[locale];
      expect(Object.keys(copy).sort()).toEqual(keys);
      for (const message of Object.values(copy)) {
        expect(message.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
