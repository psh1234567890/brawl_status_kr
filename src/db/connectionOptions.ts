import type { PoolConfig } from "pg";

/** Server-only connection configuration; never include these options in logs. */
export function getDatabaseConnectionOptions(
  env: Record<string, string | undefined> = process.env,
): PoolConfig {
  const connectionString = env.DATABASE_URL;
  const configuredCa = env.DATABASE_SSL_CA?.trim();
  if (!configuredCa) return { connectionString };

  const ca = configuredCa.replace(/\\n/g, "\n");
  if (!ca.startsWith("-----BEGIN CERTIFICATE-----") ||
      !ca.endsWith("-----END CERTIFICATE-----")) {
    throw new Error("DATABASE_SSL_CA must contain a PEM CA certificate.");
  }

  let url: URL;
  try {
    url = new URL(connectionString ?? "");
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error();
  } catch {
    // URL parser errors may include the password-bearing input.
    throw new Error("DATABASE_URL must be a PostgreSQL URL when DATABASE_SSL_CA is set.");
  }
  if (["sslcert", "sslkey", "sslrootcert"].some((key) => url.searchParams.has(key))) {
    throw new Error("DATABASE_SSL_CA cannot be combined with TLS certificate file parameters.");
  }
  // pg parses URL SSL options after PoolConfig and would replace the explicit CA.
  // Remove only those overrides and always verify both the chain and hostname.
  for (const key of ["ssl", "sslmode", "uselibpqcompat"]) url.searchParams.delete(key);
  return {
    connectionString: url.toString(),
    ssl: { ca, rejectUnauthorized: true },
  };
}
