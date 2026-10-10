import { describe, expect, it } from "vitest";
import { locales } from "./config";
import { getComponentMessages } from "./componentMessages";
import { getMessages } from "./messages";

describe("outage notices in all supported languages", () => {
  it.each(locales)("has explicit search/status messages for %s", (locale) => {
    const search = getComponentMessages(locale).searchErrors;
    const status = getMessages(locale).status;
    for (const text of [search.staleNotice, search.saveNotice, status.cacheNotice, status.snapshotAt, status.unavailable]) {
      expect(text.trim().length).toBeGreaterThan(0);
    }
    if (locale !== "en") {
      expect(search.staleNotice).not.toBe(getComponentMessages("en").searchErrors.staleNotice);
      expect(status.unavailable).not.toBe(getMessages("en").status.unavailable);
    }
  });
});
