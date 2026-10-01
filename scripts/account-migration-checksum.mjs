import { createHash } from "node:crypto";

export function canonicalizeAccountMigrationSql(sql) {
  return sql.replace(/\r\n?/g, "\n");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function getAccountMigrationChecksums(sql) {
  const canonicalSql = canonicalizeAccountMigrationSql(sql);
  const windowsSql = canonicalSql.replace(/\n/g, "\r\n");
  return {
    canonicalSql,
    checksum: sha256(canonicalSql),
    acceptedLegacyChecksums: new Set([
      sha256(sql),
      sha256(canonicalSql),
      sha256(windowsSql),
    ]),
  };
}
