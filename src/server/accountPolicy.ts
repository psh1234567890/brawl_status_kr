import { locales, type Locale } from "../i18n/config";

export type AccountEligibilityRules = {
  minimumAge: number;
  regions: "all" | string[];
  guardianConsent: "not-supported";
  attestation: "self";
};

export type AccountBackupRetentionPolicy = {
  version: string;
  backupRetentionDays: number;
  deletionManifestRetentionDays: number;
};

function exactKeys(record: Record<string, unknown>, keys: readonly string[]) {
  const expected = new Set(keys);
  return Object.keys(record).length === expected.size &&
    Object.keys(record).every((key) => expected.has(key));
}

export function parseAccountEligibilityRules(
  encoded: string | undefined,
): AccountEligibilityRules | null {
  if (!encoded || encoded.length > 16_000) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(encoded);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  if (!exactKeys(record, ["minimumAge", "regions", "guardianConsent", "attestation"])) {
    return null;
  }

  if (!Number.isSafeInteger(record.minimumAge) || Number(record.minimumAge) < 1 || Number(record.minimumAge) > 120) {
    return null;
  }
  if (record.guardianConsent !== "not-supported" || record.attestation !== "self") {
    return null;
  }

  let regions: "all" | string[];
  if (record.regions === "all") {
    regions = "all";
  } else if (Array.isArray(record.regions)) {
    if (record.regions.length < 1 || record.regions.length > 249) return null;
    const normalized = record.regions.map((value) =>
      typeof value === "string" ? value.trim().toUpperCase() : "",
    );
    if (normalized.some((value) => !/^[A-Z]{2}$/.test(value))) return null;
    if (new Set(normalized).size !== normalized.length) return null;
    regions = normalized;
  } else {
    return null;
  }

  return {
    minimumAge: Number(record.minimumAge),
    regions,
    guardianConsent: "not-supported",
    attestation: "self",
  };
}

export function parseAccountEligibilityTexts(
  encoded: string | undefined,
): Record<Locale, string> | null {
  if (!encoded || encoded.length > 48_000) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(encoded);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  if (Object.keys(record).length !== locales.length) return null;
  for (const locale of locales) {
    const text = record[locale];
    if (typeof text !== "string" || !text.trim() || text.length > 4_000) return null;
  }
  return Object.fromEntries(
    locales.map((locale) => [locale, (record[locale] as string).trim()]),
  ) as Record<Locale, string>;
}

function parseRetentionDays(value: string | undefined) {
  if (!value || !/^\d{1,4}$/.test(value)) return null;
  const days = Number(value);
  return Number.isSafeInteger(days) && days >= 1 && days <= 3650 ? days : null;
}

export function parseAccountBackupRetentionPolicy(
  env: Record<string, string | undefined> = process.env,
): AccountBackupRetentionPolicy | null {
  const version = env.ACCOUNT_BACKUP_RETENTION_POLICY_VERSION?.trim();
  if (!version || !/^[a-zA-Z0-9._-]{1,64}$/.test(version)) return null;
  const backupRetentionDays = parseRetentionDays(env.ACCOUNT_BACKUP_RETENTION_DAYS);
  const deletionManifestRetentionDays = parseRetentionDays(
    env.ACCOUNT_DELETION_MANIFEST_RETENTION_DAYS,
  );
  if (
    backupRetentionDays === null ||
    deletionManifestRetentionDays === null ||
    deletionManifestRetentionDays <= backupRetentionDays
  ) {
    return null;
  }
  return { version, backupRetentionDays, deletionManifestRetentionDays };
}

export function hasAccountDeletionManifestSecret(
  env: Record<string, string | undefined> = process.env,
) {
  return (env.ACCOUNT_DELETION_MANIFEST_SECRET?.length ?? 0) >= 32;
}
