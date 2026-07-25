import { describe, expect, it } from "vitest";
import { resolveBrawlApiBaseUrl, UpstreamApiError } from "./upstream";

describe("resolveBrawlApiBaseUrl", () => {
  it("requires an explicit base URL", () => {
    expect(() => resolveBrawlApiBaseUrl(undefined)).toThrow(UpstreamApiError);
    expect(() => resolveBrawlApiBaseUrl("   ")).toThrow("서버 API 연결 설정이 없습니다.");
  });

  it("accepts HTTPS and removes the trailing slash", () => {
    expect(resolveBrawlApiBaseUrl(" https://proxy.example/v1/ ")).toBe(
      "https://proxy.example/v1",
    );
  });

  it("rejects insecure or credential-bearing URLs", () => {
    expect(() => resolveBrawlApiBaseUrl("http://proxy.example/v1")).toThrow(
      "HTTPS URL",
    );
    expect(() => resolveBrawlApiBaseUrl("https://user:pass@proxy.example/v1")).toThrow(
      "HTTPS URL",
    );
  });

  it("rejects malformed URLs", () => {
    expect(() => resolveBrawlApiBaseUrl("not-a-url")).toThrow(
      "연결 주소가 올바르지 않습니다.",
    );
  });
});
