import { describe, expect, it } from "vitest";
import { getDatabaseConnectionOptions } from "./connectionOptions";

const ca = "-----BEGIN CERTIFICATE-----\nfixture-ca\n-----END CERTIFICATE-----";
const databaseUrl = "postgresql://fixture:private-password@pooler.example:6543/postgres";

describe("database TLS connection options", () => {
  it("preserves existing configuration when no custom CA is supplied", () => {
    expect(getDatabaseConnectionOptions({ DATABASE_URL: databaseUrl })).toEqual({
      connectionString: databaseUrl,
    });
    expect(getDatabaseConnectionOptions({})).toEqual({ connectionString: undefined });
  });

  it("preserves credentials and unrelated options while preventing URL TLS overrides", () => {
    const options = getDatabaseConnectionOptions({
      DATABASE_URL: databaseUrl + "?sslmode=no-verify&ssl=false&uselibpqcompat=true&application_name=staging",
      DATABASE_SSL_CA: ca,
    });
    expect(options.ssl).toEqual({ ca, rejectUnauthorized: true });
    const url = new URL(options.connectionString!);
    expect(url.password).toBe("private-password");
    expect(url.searchParams.get("application_name")).toBe("staging");
    for (const key of ["ssl", "sslmode", "uselibpqcompat"]) {
      expect(url.searchParams.has(key)).toBe(false);
    }
  });

  it("supports literal newline escapes used by environment variable editors", () => {
    expect(getDatabaseConnectionOptions({
      DATABASE_URL: databaseUrl + "?sslmode=verify-full",
      DATABASE_SSL_CA: ca.replace(/\n/g, "\\n"),
    }).ssl).toEqual({ ca, rejectUnauthorized: true });
  });

  it("fails closed without including credential-bearing invalid input", () => {
    expect(() => getDatabaseConnectionOptions({ DATABASE_SSL_CA: "invalid" })).toThrow("PEM CA certificate");
    expect(() => getDatabaseConnectionOptions({
      DATABASE_URL: "not-a-url-private-password",
      DATABASE_SSL_CA: ca,
    })).toThrow(/^DATABASE_URL must be a PostgreSQL URL when DATABASE_SSL_CA is set\.$/);
    expect(() => getDatabaseConnectionOptions({
      DATABASE_URL: databaseUrl + "?sslrootcert=/unavailable/file",
      DATABASE_SSL_CA: ca,
    })).toThrow("cannot be combined with TLS certificate file parameters");
  });
});
