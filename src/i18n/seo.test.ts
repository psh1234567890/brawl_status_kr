import { describe, expect, it } from "vitest";
import { localizedLocales } from "./config";
import { getLocalizedSiteSeo, getLocalizedSocialMetadata } from "./seo";

describe("localized SEO metadata", () => {
  it("defines localized copy and Open Graph locale for every localized route prefix", () => {
    for (const locale of localizedLocales) {
      const seo = getLocalizedSiteSeo(locale);
      expect(seo.title).toBeTruthy();
      expect(seo.description).toBeTruthy();
      expect(seo.openGraphLocale).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
    }
  });

  it("builds locale-correct Open Graph and Twitter defaults", () => {
    const metadata = getLocalizedSocialMetadata("en");

    expect(metadata.openGraph).toMatchObject({
      locale: "en_US",
      siteName: "Brawl Status KR",
      type: "website",
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary",
    });
    expect(metadata.openGraph?.description).toContain("Brawl Stars");
    expect(metadata.twitter?.description).toContain("Brawl Stars");
  });
});
