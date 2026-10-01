import { describe, expect, it } from "vitest";
import {
  buildDeletionManifest,
  verifyDeletionManifest,
} from "./account-deletion-manifest.mjs";

const secret = "test-only-deletion-manifest-secret-123456";
const policy = {
  version: "test-v1",
  backupRetentionDays: 30,
  deletionManifestRetentionDays: 35,
};

describe("account deletion manifest", () => {
  it("signs, sorts and verifies entries deterministically", () => {
    const manifest = buildDeletionManifest({
      rows: [
        {
          user_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          deleted_at: new Date("2026-09-25T02:00:00Z"),
          expires_at: new Date("2026-10-30T02:00:00Z"),
        },
        {
          user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          deleted_at: new Date("2026-09-25T01:00:00Z"),
          expires_at: new Date("2026-10-30T01:00:00Z"),
        },
      ],
      policy,
      secret,
      exportedAt: new Date("2026-09-25T03:00:00Z"),
    });
    expect(manifest.entries.map((entry) => entry.userId)).toEqual([
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    ]);
    expect(() => verifyDeletionManifest(manifest, secret)).not.toThrow();
  });

  it("rejects tampering", () => {
    const manifest = buildDeletionManifest({
      rows: [{
        user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        deleted_at: new Date("2026-09-25T01:00:00Z"),
        expires_at: new Date("2026-10-30T01:00:00Z"),
      }],
      policy,
      secret,
    });
    const tampered = structuredClone(manifest);
    tampered.entries[0].expiresAt = "2026-11-01T01:00:00.000Z";
    expect(() => verifyDeletionManifest(tampered, secret)).toThrow(/signature mismatch/i);
  });
});
