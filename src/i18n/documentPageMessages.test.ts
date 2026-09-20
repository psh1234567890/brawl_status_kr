import { describe, expect, it } from "vitest";
import { locales } from "./config";
import { getDocumentPageMessages } from "./documentPageMessages";

describe("document page messages", () => {
  it("contains the same pages and section/block structure in every locale", () => {
    const ko = getDocumentPageMessages("ko");
    const pageKeys = Object.keys(ko) as Array<keyof typeof ko>;

    for (const locale of locales) {
      const copy = getDocumentPageMessages(locale);
      expect(Object.keys(copy)).toEqual(Object.keys(ko));

      for (const key of pageKeys) {
        expect(copy[key].metadata.title).toBeTruthy();
        expect(copy[key].metadata.description).toBeTruthy();
        expect(copy[key].sections).toHaveLength(ko[key].sections.length);
        expect(copy[key].sections.map((section) => section.blocks.map((block) => block.type))).toEqual(
          ko[key].sections.map((section) => section.blocks.map((block) => block.type)),
        );
      }
    }
  });

  it("preserves the privacy effective date in every locale", () => {
    for (const locale of locales) {
      expect(getDocumentPageMessages(locale).privacy.effectiveDate).toContain("2026");
    }
  });
});
