import { describe, expect, it } from "vitest";
import { buildAdsTxtLine, getAdsensePublisherId } from "./adsense";

describe("AdSense helpers", () => {
  it("derives the public publisher id from a valid AdSense client id", () => {
    expect(getAdsensePublisherId("ca-pub-1234567890123456")).toBe("pub-1234567890123456");
  });

  it("rejects missing or malformed client ids", () => {
    expect(getAdsensePublisherId(undefined)).toBeNull();
    expect(getAdsensePublisherId("pub-1234567890123456")).toBeNull();
    expect(getAdsensePublisherId("ca-pub-123")).toBeNull();
  });

  it("builds the Google ads.txt authorization line", () => {
    expect(buildAdsTxtLine("ca-pub-1234567890123456")).toBe(
      "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0",
    );
  });
});
