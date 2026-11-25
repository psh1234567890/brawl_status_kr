import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveNetlifyBuildEnvironment } from "./netlify-build.mjs";

const base = { NETLIFY: "true", CONTEXT: "production", BRANCH: "main" };
test("main is staging without explicit approval, even with unsafe inherited flags", () => {
  const env = resolveNetlifyBuildEnvironment({
    ...base, NEXT_PUBLIC_BRAWLOOP_STAGING: "0", BRAWLOOP_NETLIFY_PRODUCTION: "1",
    ACCOUNTS_MODE: "on", ACCOUNT_SYNC_ENABLED: "1", ACCOUNT_DELETION_ONLY: "1",
    NETLIFY_ACCOUNT_MAINTENANCE: "1", NEXT_PUBLIC_ADSENSE_CLIENT_ID: "fixture",
  });
  assert.equal(env.NEXT_PUBLIC_BRAWLOOP_STAGING, "1");
  assert.equal(env.BRAWLOOP_NETLIFY_PRODUCTION, "0");
  assert.equal(env.ACCOUNTS_MODE, "off");
  assert.equal(env.ACCOUNT_SYNC_ENABLED, "0");
  assert.equal(env.ACCOUNT_DELETION_ONLY, "0");
  assert.equal(env.NETLIFY_ACCOUNT_MAINTENANCE, "0");
  assert.equal(env.NEXT_PUBLIC_ADSENSE_CLIENT_ID, "");
});
test("approved main production build can release", () => {
  const env = resolveNetlifyBuildEnvironment({ ...base, BRAWLOOP_NETLIFY_RELEASE_APPROVED: "1", ACCOUNTS_MODE: "pilot" });
  assert.equal(env.NEXT_PUBLIC_BRAWLOOP_STAGING, "0");
  assert.equal(env.BRAWLOOP_NETLIFY_PRODUCTION, "1");
  assert.equal(env.ACCOUNTS_MODE, "pilot");
});
for (const override of [
  { CONTEXT: "deploy-preview" }, { CONTEXT: "branch-deploy" },
  { BRANCH: "codex/netlify-deploy-20261123" }, { NETLIFY: "" }, { CONTEXT: "" },
]) {
  test("reject approval outside production: " + JSON.stringify(override), () => {
    assert.throws(() => resolveNetlifyBuildEnvironment({ ...base, ...override, BRAWLOOP_NETLIFY_RELEASE_APPROVED: "1" }));
  });
  test("stay staging without approval: " + JSON.stringify(override), () => {
    assert.equal(resolveNetlifyBuildEnvironment({ ...base, ...override }).NEXT_PUBLIC_BRAWLOOP_STAGING, "1");
  });
}
