import { pathToFileURL } from "node:url";

// Only the approved production build can consume its own writer credential.
// Do not log connection strings, server error messages, or account data.
export function resolveWriterPreflight(env) {
  if (env.NETLIFY !== "true" || env.CONTEXT !== "production" ||
      env.BRANCH !== "main" || env.BRAWLOOP_NETLIFY_RELEASE_APPROVED !== "1" ||
      env.BRAWLOOP_NETLIFY_PRODUCTION !== "1" ||
      env.NEXT_PUBLIC_BRAWLOOP_STAGING !== "0") {
    throw new Error("Writer preflight requires an approved production build");
  }
  let url;
  try { url = new URL(env.DATABASE_URL ?? ""); } catch {
    throw new Error("Writer preflight: invalid connection configuration");
  }
  const username = "brawl_netlify_writer.vzsxfanekkaoiwnpscih";
  if (!["postgres:", "postgresql:"].includes(url.protocol) ||
      url.username !== username || !url.password ||
      url.hostname !== "aws-1-ap-southeast-1.pooler.supabase.com" ||
      url.port !== "5432" || url.pathname !== "/postgres" || url.hash ||
      [...url.searchParams.keys()].some(key => key !== "sslmode") ||
      url.searchParams.getAll("sslmode").some(value => value !== "verify-full")) {
    throw new Error("Writer preflight: unexpected database target or TLS options");
  }
  const ca = (env.DATABASE_SSL_CA ?? "").replace(/\\r\\n|\\n|\\r/g, "\n").replace(/\r\n?/g, "\n").trim();
  if (!ca.startsWith("-----BEGIN CERTIFICATE-----") || !ca.endsWith("-----END CERTIFICATE-----")) {
    throw new Error("Writer preflight: CA missing or malformed");
  }
  url.searchParams.delete("sslmode");
  return { connectionString: url.toString(), ssl: { ca, rejectUnauthorized: true },
    connectionTimeoutMillis: 5000, query_timeout: 5000 };
}

export async function verifyWriterConnection(env, Client) {
  const client = new Client(resolveWriterPreflight(env));
  try {
    await client.connect();
    if (client.connection?.stream?.encrypted !== true || client.connection?.stream?.authorized !== true) {
      throw new Error("TLS verification failed");
    }
    await client.query("BEGIN READ ONLY");
    try {
      const result = await client.query(`SELECT current_user AS role,
        session_user AS session_role, current_database() AS db,
        current_setting('transaction_read_only') AS read_only,
        r.rolcanlogin AND NOT (r.rolsuper OR r.rolbypassrls OR r.rolcreatedb OR
          r.rolcreaterole OR r.rolreplication OR r.rolinherit) AS restricted,
        has_table_privilege(current_user,'public.auth_users','SELECT') AS can_read,
        has_table_privilege(current_user,'public.auth_users','TRUNCATE') AS can_truncate
        FROM pg_roles r WHERE r.rolname=current_user`);
      const row = result.rows[0];
      if (result.rows.length !== 1 || row.role !== "brawl_netlify_writer" ||
          row.session_role !== row.role || row.db !== "postgres" ||
          row.read_only !== "on" || row.restricted !== true ||
          row.can_read !== true || row.can_truncate !== false) throw new Error("Unexpected writer identity or permissions");
    } finally { await client.query("ROLLBACK"); }
  } finally { await client.end(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { default: pg } = await import("pg");
    await verifyWriterConnection(process.env, pg.Client);
    console.log("Netlify writer preflight passed: identity, verified TLS, restricted role and read-only transaction");
  } catch {
    console.error("Netlify writer preflight failed; check the protected production database configuration");
    process.exitCode = 1;
  }
}
