import { describe, expect, it } from "vitest";
import { getAccountMigrationChecksums } from "../../scripts/account-migration-checksum.mjs";

describe("account migration checksums", () => {
  it("canonicalizes LF, CRLF, and bare CR newlines to one checksum", () => {
    const lf = "CREATE TABLE sample (id integer);\nALTER TABLE sample ADD value text;\n";
    const crlf = lf.replace(/\n/g, "\r\n");
    const cr = lf.replace(/\n/g, "\r");
    const checksums = [lf, crlf, cr].map(getAccountMigrationChecksums);
    expect(new Set(checksums.map((result) => result.checksum)).size).toBe(1);
    expect(checksums[1].acceptedLegacyChecksums.has(
      getAccountMigrationChecksums(crlf).checksum,
    )).toBe(true);
  });

  it("retains legacy raw LF and CRLF checksums for ledger compatibility", () => {
    const lf = "CREATE TABLE sample (id integer);\n";
    const crlf = lf.replace(/\n/g, "\r\n");
    const expected = getAccountMigrationChecksums(lf);
    const windows = getAccountMigrationChecksums(crlf);
    for (const accepted of expected.acceptedLegacyChecksums) {
      expect(windows.acceptedLegacyChecksums.has(accepted)).toBe(true);
    }
    expect(windows.checksum).toBe(expected.checksum);
  });
});
