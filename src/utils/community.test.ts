import { describe, expect, it } from "vitest";
import { communityEvidence, communityPage, isCommunityId, redactCommunityText, validateCommunityComment, validateCommunityPost } from "./community";
import { communityMessagesComplete, getCommunityMessages } from "../i18n/communityMessages";
import { locales, localizedHref } from "../i18n/config";
import { getCommunityImageMessages } from "../i18n/communityImageMessages";

const post = { title: "Synthetic match report", body: "Synthetic evidence context for an isolated test.", locale: "en", evidenceUrls: ["https://youtu.be/abcdefghijk"], acceptRules: true, confirmIntent: true };
describe("community input and public copy", () => {
  it("requires intent confirmation, rules consent and evidence for a post", () => {
    expect(validateCommunityPost(post).locale).toBe("en");
    for (const change of [{ acceptRules: false }, { confirmIntent: false }, { evidenceUrls: [] }, { locale: "xx" }]) {
      expect(() => validateCommunityPost({ ...post, ...change })).toThrow();
    }
  });
  it("accepts an evidence-free correction but rejects unknown comment kinds", () => {
    expect(validateCommunityComment({ kind: "correction", body: "The clip omits the previous action.", acceptRules: true })).toMatchObject({ kind: "correction", evidenceUrls: [] });
    expect(() => validateCommunityComment({ kind: "troll", body: "test", acceptRules: true })).toThrow();
    expect(() => validateCommunityComment({ kind: "opinion", body: "test", acceptRules: false })).toThrow();
  });
  it("accepts photo-only evidence and bounds the combined attachment count", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    expect(validateCommunityPost({ ...post, evidenceUrls: [], imageIds: [id] })).toMatchObject({ evidenceUrls: [], imageIds: [id] });
    for (const imageIds of [[id, id], ["../private"], ["00000000-0000-1000-8000-000000000001"]]) expect(() => validateCommunityPost({ ...post, imageIds })).toThrow();
    expect(() => validateCommunityPost({ ...post, imageIds: [id, id.slice(0, -1) + "2", id.slice(0, -1) + "3"] })).toThrow("TOO_MANY_EVIDENCE");
  });
  it("removes tracking parameters and deduplicates supported evidence links", () => {
    expect(communityEvidence(["https://www.youtube.com/watch?v=abcdefghijk&redirect=https://example.com#track", "https://www.youtube.com/watch?v=abcdefghijk"], true)).toEqual(["https://www.youtube.com/watch?v=abcdefghijk"]);
    expect(communityEvidence(["https://i.imgur.com/AbC12.png?tracking=1"], true)).toEqual(["https://i.imgur.com/AbC12.png"]);
  });
  it.each(["javascript:alert(1)", "http://youtu.be/abcdefghijk", "https://youtu.be.evil.example/abcdefghijk", "https://user:pass@youtu.be/abcdefghijk", "https://youtu.be:444/abcdefghijk", "https://youtube.com/redirect?q=https://example.com", "https://127.0.0.1/a.png", "https://youtu.be/short"]) ("rejects unsafe or unsupported link %s", link => {
    expect(() => communityEvidence([link], true)).toThrow();
  });
  it("bounds text and rejects invisible controls after normalization", () => {
    expect(validateCommunityPost({ ...post, title: "  Ｔｅｓｔ title  " }).title).toBe("Test title");
    for (const title of ["abc", "a".repeat(101), "Title\u200b", "Title\u0001"]) expect(() => validateCommunityPost({ ...post, title })).toThrow();
    expect(() => validateCommunityComment({ kind: "opinion", body: "x".repeat(2001), acceptRules: true })).toThrow();
  });
  it("masks common profanity while preserving benign Korean words", () => {
    expect(redactCommunityText("씨.발 fuck 시발점 출발")).toBe("••• ••• 시발점 출발");
  });
  it("bounds IDs and pagination and supplies every supported language", () => {
    expect(isCommunityId("00000000-0000-4000-8000-000000000001")).toBe(true);
    expect(isCommunityId("../admin")).toBe(false);
    expect(communityPage(null)).toBe(1);
    for (const page of ["0", "-1", "1.5", "1000"]) expect(() => communityPage(page)).toThrow();
    expect(communityMessagesComplete()).toBe(true);
    for (const locale of locales) {
      expect(Object.values(getCommunityMessages(locale)).every(value => typeof value === "string" && value.length > 0)).toBe(true);
      expect(Object.values(getCommunityImageMessages(locale)).every(value => value.length > 0)).toBe(true);
      expect(localizedHref(locale, "/community/new")).toBe(locale === "ko" ? "/community/new" : `/${locale}/community/new`);
    }
  });
});
