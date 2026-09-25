import { createHmac, timingSafeEqual } from "node:crypto";

export const ACCOUNT_DELETION_MANIFEST_FORMAT = "brawl-account-deletions/v1";

function isIsoDate(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isUuid(value) {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function requireSecret(secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("ACCOUNT_DELETION_MANIFEST_SECRET must be at least 32 characters.");
  }
  return secret;
}

function canonicalPayload(manifest) {
  return JSON.stringify({
    format: manifest.format,
    exportedAt: manifest.exportedAt,
    policyVersion: manifest.policyVersion,
    backupRetentionDays: manifest.backupRetentionDays,
    deletionManifestRetentionDays: manifest.deletionManifestRetentionDays,
    entries: manifest.entries,
  });
}

function signPayload(payload, secret) {
  return createHmac("sha256", requireSecret(secret))
    .update(payload, "utf8")
    .digest("hex");
}

export function buildDeletionManifest({ rows, policy, secret, exportedAt = new Date() }) {
  const entries = rows
    .map((row) => ({
      userId: String(row.user_id),
      deletedAt: new Date(row.deleted_at).toISOString(),
      expiresAt: new Date(row.expires_at).toISOString(),
    }))
    .sort((left, right) =>
      left.deletedAt.localeCompare(right.deletedAt) || left.userId.localeCompare(right.userId),
    );
  const manifest = {
    format: ACCOUNT_DELETION_MANIFEST_FORMAT,
    exportedAt: new Date(exportedAt).toISOString(),
    policyVersion: policy.version,
    backupRetentionDays: policy.backupRetentionDays,
    deletionManifestRetentionDays: policy.deletionManifestRetentionDays,
    entries,
  };
  return {
    ...manifest,
    hmacSha256: signPayload(canonicalPayload(manifest), secret),
  };
}

export function verifyDeletionManifest(manifest, secret) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("Deletion manifest is not an object.");
  }
  if (manifest.format !== ACCOUNT_DELETION_MANIFEST_FORMAT) {
    throw new Error("Unsupported deletion manifest format.");
  }
  if (!isIsoDate(manifest.exportedAt)) throw new Error("Deletion manifest exportedAt is invalid.");
  if (
    typeof manifest.policyVersion !== "string" ||
    !/^[a-zA-Z0-9._-]{1,64}$/.test(manifest.policyVersion)
  ) {
    throw new Error("Deletion manifest policy version is invalid.");
  }
  if (
    !Number.isSafeInteger(manifest.backupRetentionDays) ||
    manifest.backupRetentionDays < 1 ||
    !Number.isSafeInteger(manifest.deletionManifestRetentionDays) ||
    manifest.deletionManifestRetentionDays <= manifest.backupRetentionDays
  ) {
    throw new Error("Deletion manifest retention policy is invalid.");
  }
  if (!Array.isArray(manifest.entries) || manifest.entries.length > 1_000_000) {
    throw new Error("Deletion manifest entries are invalid.");
  }
  for (const entry of manifest.entries) {
    if (
      !entry || typeof entry !== "object" || Array.isArray(entry) ||
      !isUuid(entry.userId) || !isIsoDate(entry.deletedAt) || !isIsoDate(entry.expiresAt) ||
      Date.parse(entry.expiresAt) <= Date.parse(entry.deletedAt)
    ) {
      throw new Error("Deletion manifest contains an invalid entry.");
    }
  }
  if (typeof manifest.hmacSha256 !== "string" || !/^[0-9a-f]{64}$/.test(manifest.hmacSha256)) {
    throw new Error("Deletion manifest signature is invalid.");
  }
  const expected = Buffer.from(signPayload(canonicalPayload(manifest), secret), "hex");
  const actual = Buffer.from(manifest.hmacSha256, "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error("Deletion manifest signature mismatch.");
  }
  return manifest;
}

export async function readActiveDeletionRows(client) {
  const safety = await client.query(
    "SELECT to_regclass('account_safety.deletion_ledger') IS NOT NULL AS available",
  );
  if (safety.rows[0]?.available) {
    const result = await client.query(
      "SELECT user_id, deleted_at, expires_at FROM account_safety.deletion_ledger WHERE expires_at > now() ORDER BY deleted_at, user_id",
    );
    return result.rows;
  }
  const available = await client.query(
    "SELECT to_regclass('public.account_deletion_tombstones') IS NOT NULL AS available",
  );
  if (!available.rows[0]?.available) return [];
  const result = await client.query(
    "SELECT user_id, deleted_at, expires_at FROM public.account_deletion_tombstones WHERE expires_at > now() ORDER BY deleted_at, user_id",
  );
  return result.rows;
}

export async function applyDeletionManifest(client, manifest, secret, now = new Date()) {
  verifyDeletionManifest(manifest, secret);
  const activeEntries = manifest.entries.filter((entry) => Date.parse(entry.expiresAt) > now.getTime());
  const schema = await client.query(
    "SELECT to_regclass('public.auth_users') IS NOT NULL AS users, to_regclass('public.account_deletion_tombstones') IS NOT NULL AS tombstones, to_regclass('account_safety.deletion_ledger') IS NOT NULL AS safety_ledger",
  );
  if (!schema.rows[0]?.users || !schema.rows[0]?.tombstones || !schema.rows[0]?.safety_ledger) {
    throw new Error("Account schema is not installed in the restore target.");
  }

  await client.query("BEGIN");
  try {
    let deletedUsers = 0;
    for (const entry of activeEntries) {
      const deleted = await client.query(
        "DELETE FROM public.auth_users WHERE id = $1",
        [entry.userId],
      );
      deletedUsers += deleted.rowCount ?? 0;
      await client.query(
        "INSERT INTO public.account_deletion_tombstones (user_id, deleted_at, expires_at) VALUES ($1, $2::timestamptz, $3::timestamptz) ON CONFLICT (user_id) DO UPDATE SET deleted_at = LEAST(public.account_deletion_tombstones.deleted_at, EXCLUDED.deleted_at), expires_at = GREATEST(public.account_deletion_tombstones.expires_at, EXCLUDED.expires_at)",
        [entry.userId, entry.deletedAt, entry.expiresAt],
      );
      await client.query(
        "INSERT INTO account_safety.deletion_ledger (user_id, deleted_at, expires_at, policy_version) VALUES ($1, $2::timestamptz, $3::timestamptz, $4) ON CONFLICT (user_id) DO UPDATE SET deleted_at = LEAST(account_safety.deletion_ledger.deleted_at, EXCLUDED.deleted_at), expires_at = GREATEST(account_safety.deletion_ledger.expires_at, EXCLUDED.expires_at), policy_version = EXCLUDED.policy_version",
        [entry.userId, entry.deletedAt, entry.expiresAt, manifest.policyVersion],
      );
    }
    await client.query("COMMIT");
    return {
      manifestEntries: manifest.entries.length,
      activeEntries: activeEntries.length,
      expiredEntries: manifest.entries.length - activeEntries.length,
      deletedUsers,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
}
