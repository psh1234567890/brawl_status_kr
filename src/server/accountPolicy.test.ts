import { describe, expect, it } from "vitest";
import {
  hasAccountDeletionManifestSecret,
  parseAccountBackupRetentionPolicy,
  parseAccountEligibilityRules,
} from "./accountPolicy";

describe("account policy parsing", () => {
  it("accepts explicit self-attested eligibility rules without collecting DOB/region", () => {
    expect(parseAccountEligibilityRules(JSON.stringify({
      minimumAge: 18,
      regions: ["kr", "US"],
      guardianConsent: "not-supported",
      attestation: "self",
    }))).toEqual({
      minimumAge: 18,
      regions: ["KR", "US"],
      guardianConsent: "not-supported",
      attestation: "self",
    });
  });

  it("fails closed for incomplete or unsupported eligibility rules", () => {
    expect(parseAccountEligibilityRules(JSON.stringify({
      minimumAge: 18,
      regions: "all",
      guardianConsent: "self-attested",
      attestation: "self",
    }))).toBeNull();
    expect(parseAccountEligibilityRules(JSON.stringify({
      minimumAge: 18,
      regions: [],
      guardianConsent: "not-supported",
      attestation: "self",
    }))).toBeNull();
  });

  it("requires deletion manifests to outlive retained backups", () => {
    expect(parseAccountBackupRetentionPolicy({
      ACCOUNT_BACKUP_RETENTION_POLICY_VERSION: "v1",
      ACCOUNT_BACKUP_RETENTION_DAYS: "30",
      ACCOUNT_DELETION_MANIFEST_RETENTION_DAYS: "35",
    })).toEqual({
      version: "v1",
      backupRetentionDays: 30,
      deletionManifestRetentionDays: 35,
    });
    expect(parseAccountBackupRetentionPolicy({
      ACCOUNT_BACKUP_RETENTION_POLICY_VERSION: "v1",
      ACCOUNT_BACKUP_RETENTION_DAYS: "30",
      ACCOUNT_DELETION_MANIFEST_RETENTION_DAYS: "30",
    })).toBeNull();
  });

  it("requires a separate strong deletion-manifest secret", () => {
    expect(hasAccountDeletionManifestSecret({
      ACCOUNT_DELETION_MANIFEST_SECRET: "x".repeat(32),
    })).toBe(true);
    expect(hasAccountDeletionManifestSecret({
      ACCOUNT_DELETION_MANIFEST_SECRET: "short",
    })).toBe(false);
  });
});
