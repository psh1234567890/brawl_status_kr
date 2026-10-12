import { describe, expect, it } from "vitest";
import { detailSeoDescription, detailSocialMetadata } from "./detailSeo";

describe("catalog detail SEO", () => {
  it("produces a concise unique description, normalizing whitespace and markup", () => {
    expect(detailSeoDescription("Shelly", "   Starting   brawler <b>with</b> shotgun  ", "Fallback")).toBe(
      "Shelly: Starting brawler with shotgun",
    );
    expect(detailSeoDescription("Shelly", "Shelly's basic attack", "Fallback")).toBe(
      "Shelly's basic attack",
    );
    expect(detailSeoDescription("Shelly", "", "Details unavailable")).toBe("Shelly: Details unavailable");
    expect(detailSeoDescription("Shelly", "a".repeat(300), "Fallback").length).toBeLessThanOrEqual(180);
  });

  it("uses language-specific social metadata and localized URLs", () => {
    const english = detailSocialMetadata("en", "Shelly Brawler", "Unique description", "/brawlers/16000000");
    expect(english.openGraph).toMatchObject({
      locale: "en_US",
      url: "/en/brawlers/16000000",
      description: "Unique description",
    });
    expect(english.twitter).toMatchObject({ card: "summary", description: "Unique description" });
    expect(detailSocialMetadata("ko", "쉘리", "상세 설명", "/brawlers/16000000").openGraph)
      .toMatchObject({ locale: "ko_KR", url: "/brawlers/16000000" });
    expect(detailSocialMetadata("pt-br", "Shelly", "Descrição", "/brawlers/16000000").openGraph)
      .toMatchObject({ locale: "pt_BR", url: "/pt-br/brawlers/16000000" });
  });
});
