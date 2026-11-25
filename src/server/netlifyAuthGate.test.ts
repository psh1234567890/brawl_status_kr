import { describe, expect, it } from "vitest";
import { canUseNetlifyAccountFlows } from "./netlifyAuthGate";

const approved = {
  SITE_ID: "test-site",
  BRAWLOOP_NETLIFY_PRODUCTION: "1",
  NEXT_PUBLIC_BRAWLOOP_STAGING: "0",
  BRAWLOOP_NETLIFY_RELEASE_APPROVED: "1",
};
describe("Netlify account release gate", () => {
  it("preserves existing Vercel/local operation", () => {
    expect(canUseNetlifyAccountFlows({ BRAWLOOP_NETLIFY_PRODUCTION: "0" })).toBe(true);
    expect(canUseNetlifyAccountFlows({})).toBe(true);
  });
  it("requires explicit production build and runtime approval", () => {
    expect(canUseNetlifyAccountFlows(approved)).toBe(true);
    for (const key of Object.keys(approved)) {
      for (const value of [undefined, "", " ", "invalid"]) {
        expect(canUseNetlifyAccountFlows({ ...approved, [key]: value })).toBe(key === "SITE_ID" && value === "invalid");
      }
    }
    expect(canUseNetlifyAccountFlows({ ...approved, NEXT_PUBLIC_BRAWLOOP_STAGING: "1" })).toBe(false);
    expect(canUseNetlifyAccountFlows({ ...approved, BRAWLOOP_NETLIFY_PRODUCTION: "0" })).toBe(false);
    expect(canUseNetlifyAccountFlows({ ...approved, BRAWLOOP_NETLIFY_RELEASE_APPROVED: "0" })).toBe(false);
  });
});
