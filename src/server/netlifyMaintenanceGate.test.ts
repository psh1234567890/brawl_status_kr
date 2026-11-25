import { describe, expect, it } from "vitest";
import { canRunNetlifyAccountMaintenance } from "./netlifyMaintenanceGate";

const approved = {
  SITE_ID: "synthetic-site",
  BRAWLOOP_NETLIFY_RELEASE_APPROVED: "1",
  BRAWLOOP_NETLIFY_PRODUCTION: "1",
  NEXT_PUBLIC_BRAWLOOP_STAGING: "0",
  NETLIFY_ACCOUNT_MAINTENANCE: "1",
};

describe("Netlify scheduled maintenance gate", () => {
  it("allows only the explicitly approved production configuration", () => {
    expect(canRunNetlifyAccountMaintenance(approved)).toBe(true);
    expect(canRunNetlifyAccountMaintenance({})).toBe(false);
  });
  it.each(Object.keys(approved))("blocks when %s is missing or changed", (key) => {
    expect(canRunNetlifyAccountMaintenance({ ...approved, [key]: undefined })).toBe(false);
    expect(canRunNetlifyAccountMaintenance({ ...approved, [key]: "" })).toBe(false);
    expect(canRunNetlifyAccountMaintenance({ ...approved, [key]: key === "NEXT_PUBLIC_BRAWLOOP_STAGING" ? "1" : "0", ...(key === "SITE_ID" ? { SITE_ID: " " } : {}) })).toBe(false);
  });
  it("does not use build-only context as runtime authorization", () => {
    expect(canRunNetlifyAccountMaintenance({ NETLIFY: "true", CONTEXT: "production", BRANCH: "main", NETLIFY_ACCOUNT_MAINTENANCE: "1" })).toBe(false);
  });
});
