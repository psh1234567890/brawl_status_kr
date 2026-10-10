-- Keep administrator authorization in an unexposed Postgres schema.
-- Only store explicitly approved account UUIDs, not session tokens, emails, or game tags.
CREATE TABLE IF NOT EXISTS analytics_private.usage_admin_allowlist (
  user_id uuid PRIMARY KEY,
  granted_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON analytics_private.usage_admin_allowlist FROM PUBLIC, anon, authenticated;
COMMENT ON TABLE analytics_private.usage_admin_allowlist IS
  'Explicit server-only UUID allowlist for private analytics, subject to Better Auth session verification.';
