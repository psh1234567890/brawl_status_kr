import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { decryptAccountArtifact, encryptAccountArtifact } from "./account-artifact.mjs";
import { ACCOUNT_SNAPSHOT_TABLES, readAccountSnapshotConfig } from "./account-snapshot-config.mjs";
import { artifactDeadline, isExpiredAccountArtifact } from "./account-artifact-retention.mjs";

const key = "11".repeat(32);
const context = { kind: "backup", target: "test", projectRef: "isolated-test" };
const directories = [];
afterEach(async () => { for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true }); });

async function fixture(contents = "private synthetic email and records") {
  const directory = await mkdtemp(path.join(os.tmpdir(), "brawl-artifact-test-"));
  directories.push(directory);
  const source = path.join(directory, "source");
  const encrypted = path.join(directory, "encrypted");
  const restored = path.join(directory, "restored");
  await writeFile(source, contents);
  await encryptAccountArtifact(source, encrypted, key, context);
  return { directory, source, encrypted, restored };
}

describe("encrypted account artifacts", () => {
  it.each(["", "private synthetic email and records"])("round trips authenticated content, including empty files (%s)", async (contents) => {
    const files = await fixture(contents);
    await decryptAccountArtifact(files.encrypted, files.restored, key, context);
    expect(await readFile(files.restored, "utf8")).toBe(contents);
    if (contents) expect((await readFile(files.encrypted)).includes(Buffer.from(contents))).toBe(false);
  });
  it("uses a fresh nonce and never overwrites a destination", async () => {
    const files = await fixture();
    const second = path.join(files.directory, "second");
    await encryptAccountArtifact(files.source, second, key, context);
    expect(await readFile(second)).not.toEqual(await readFile(files.encrypted));
    const original = await readFile(files.encrypted);
    await expect(encryptAccountArtifact(files.source, files.encrypted, key, context)).rejects.toThrow();
    expect(await readFile(files.encrypted)).toEqual(original);
  });
  it.each(["ciphertext", "tag", "header", "truncated"])("rejects tampered %s and leaves no plaintext output", async (kind) => {
    const files = await fixture();
    let bytes = await readFile(files.encrypted);
    if (kind === "truncated") bytes = bytes.subarray(0, 15);
    else bytes[kind === "header" ? 1 : kind === "tag" ? bytes.length - 1 : bytes.length - 20] ^= 1;
    await writeFile(files.encrypted, bytes);
    await expect(decryptAccountArtifact(files.encrypted, files.restored, key, context)).rejects.toThrow();
    expect(await readdir(files.directory)).not.toContain("restored");
    expect((await readdir(files.directory)).some((name) => name.endsWith(".partial"))).toBe(false);
  });
  it("rejects wrong key, environment and kind", async () => {
    const files = await fixture();
    await expect(decryptAccountArtifact(files.encrypted, files.restored, "22".repeat(32), context)).rejects.toThrow();
    await expect(decryptAccountArtifact(files.encrypted, files.restored, key, { ...context, target: "production" })).rejects.toThrow();
    await expect(decryptAccountArtifact(files.encrypted, files.restored, key, { ...context, kind: "manifest" })).rejects.toThrow();
    await expect(decryptAccountArtifact(files.encrypted, files.restored, "short", context)).rejects.toThrow();
  });
});

function configEnv(overrides = {}) {
  return {
    ACCOUNT_SNAPSHOT_ENABLED: "1", ACCOUNT_SNAPSHOT_TARGET: "test", ACCOUNT_SNAPSHOT_PROJECT_REF: "isolated-test",
    ACCOUNT_SNAPSHOT_DATABASE_URL: "postgresql://fixture:fixture@127.0.0.1:5432/isolated_test",
    ACCOUNT_SNAPSHOT_OUTPUT_DIR: os.tmpdir(), ACCOUNT_BACKUP_ENCRYPTION_KEY: key,
    ACCOUNT_BACKUP_RETENTION_POLICY_VERSION: "test-v1", ACCOUNT_BACKUP_RETENTION_DAYS: "7",
    ACCOUNT_DELETION_MANIFEST_RETENTION_DAYS: "14", ACCOUNT_DELETION_MANIFEST_SECRET: "fixture-only-manifest-secret-12345678",
    ...overrides,
  };
}

describe("account snapshot boundaries", () => {
  it("does not reset deletion retention when a manifest is exported again", () => {
    const expiresAt = "2026-10-01T00:00:00Z";
    expect(artifactDeadline({ exportedAt: "2026-09-30T12:00:00Z", deletionManifestRetentionDays: 14, entries: [{ expiresAt }] })).toBe(Date.parse(expiresAt) / 1000);
    expect(artifactDeadline({ exportedAt: "2026-09-30T13:00:00Z", deletionManifestRetentionDays: 14, entries: [{ expiresAt }] })).toBe(Date.parse(expiresAt) / 1000);
  });
  it("prunes only expired, named account artifacts in the chosen environment", () => {
    const artifact = { id: 1, name: "account-manifest-staging-until1790812800-1234-1" };
    expect(isExpiredAccountArtifact(artifact, "staging", 1790812800)).toBe(true);
    expect(isExpiredAccountArtifact(artifact, "staging", 1790812799)).toBe(false);
    expect(isExpiredAccountArtifact(artifact, "production", 1790812800)).toBe(false);
    expect(isExpiredAccountArtifact({ ...artifact, name: "playwright-report" }, "staging", 1790812800)).toBe(false);
    expect(isExpiredAccountArtifact({ ...artifact, id: "../other" }, "staging", 1790812800)).toBe(false);
  });
  it("accepts explicit 7/14 retention and only the nine account tables", () => {
    expect(readAccountSnapshotConfig(configEnv()).policy).toMatchObject({ backupRetentionDays: 7, deletionManifestRetentionDays: 14 });
    expect(ACCOUNT_SNAPSHOT_TABLES).toHaveLength(9);
    expect(ACCOUNT_SNAPSHOT_TABLES).not.toContain("students");
    expect(ACCOUNT_SNAPSHOT_TABLES).not.toContain("battle_logs");
    expect(ACCOUNT_SNAPSHOT_TABLES).not.toContain("deletion_ledger");
  });
  it("is disabled by default and never falls back to app credentials", () => {
    expect(() => readAccountSnapshotConfig(configEnv({ ACCOUNT_SNAPSHOT_ENABLED: undefined }))).toThrow(/disabled/i);
    expect(() => readAccountSnapshotConfig(configEnv({ ACCOUNT_SNAPSHOT_DATABASE_URL: undefined, DATABASE_URL: "postgresql://unused" }))).toThrow(/explicit/i);
  });
  it("rejects remote test targets and output inside the repo", () => {
    expect(() => readAccountSnapshotConfig(configEnv({ ACCOUNT_SNAPSHOT_DATABASE_URL: "postgresql://fixture:fixture@db.example/isolated_test" }))).toThrow(/loopback/i);
    expect(() => readAccountSnapshotConfig(configEnv({ ACCOUNT_SNAPSHOT_OUTPUT_DIR: process.cwd() }))).toThrow(/outside/i);
  });
  it("enforces staging project, session pooler and production opt-in", () => {
    const staging = configEnv({ ACCOUNT_SNAPSHOT_TARGET: "staging", ACCOUNT_SNAPSHOT_PROJECT_REF: "yxukggorpqsrwurbamxv", ACCOUNT_SNAPSHOT_DATABASE_URL: "postgresql://fixture.yxukggorpqsrwurbamxv:fixture@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=no-verify" });
    expect(readAccountSnapshotConfig(staging).connection.search).toBe("");
    expect(() => readAccountSnapshotConfig({ ...staging, ACCOUNT_SNAPSHOT_DATABASE_URL: staging.ACCOUNT_SNAPSHOT_DATABASE_URL.replace(":5432", ":6543") })).toThrow(/mismatch/i);
    expect(() => readAccountSnapshotConfig({ ...staging, ACCOUNT_SNAPSHOT_PROJECT_REF: "vzsxfanekkaoiwnpscih" })).toThrow(/mismatch/i);
    expect(() => readAccountSnapshotConfig(configEnv({ ACCOUNT_SNAPSHOT_TARGET: "production", ACCOUNT_SNAPSHOT_PROJECT_REF: "vzsxfanekkaoiwnpscih", ACCOUNT_SNAPSHOT_DATABASE_URL: "postgresql://fixture:fixture@db.vzsxfanekkaoiwnpscih.supabase.co:5432/postgres" }))).toThrow(/activation/i);
  });
  it("rejects equal retention and weak secrets", () => {
    expect(() => readAccountSnapshotConfig(configEnv({ ACCOUNT_DELETION_MANIFEST_RETENTION_DAYS: "7" }))).toThrow(/retention/i);
    expect(() => readAccountSnapshotConfig(configEnv({ ACCOUNT_BACKUP_ENCRYPTION_KEY: "weak" }))).toThrow(/secrets/i);
    expect(() => readAccountSnapshotConfig(configEnv({ ACCOUNT_DELETION_MANIFEST_SECRET: "weak" }))).toThrow(/secrets/i);
  });
});
