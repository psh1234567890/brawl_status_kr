CREATE SCHEMA IF NOT EXISTS account_safety;
REVOKE ALL ON SCHEMA account_safety FROM PUBLIC;

CREATE TABLE IF NOT EXISTS account_safety.deletion_ledger (
  user_id uuid PRIMARY KEY,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  policy_version text NOT NULL,
  CONSTRAINT account_deletion_safety_expiry_after_deletion
    CHECK (expires_at > deleted_at),
  CONSTRAINT account_deletion_safety_policy_version_valid
    CHECK (policy_version ~ '^[a-zA-Z0-9._-]{1,64}$')
);
CREATE INDEX IF NOT EXISTS account_deletion_safety_expires_at_idx
  ON account_safety.deletion_ledger (expires_at);
ALTER TABLE account_safety.deletion_ledger ENABLE ROW LEVEL SECURITY;

INSERT INTO account_safety.deletion_ledger (
  user_id,
  deleted_at,
  expires_at,
  policy_version
)
SELECT
  user_id,
  deleted_at,
  expires_at,
  'migration-0005'
FROM public.account_deletion_tombstones
WHERE expires_at > now()
ON CONFLICT (user_id) DO UPDATE
SET
  deleted_at = LEAST(account_safety.deletion_ledger.deleted_at, EXCLUDED.deleted_at),
  expires_at = GREATEST(account_safety.deletion_ledger.expires_at, EXCLUDED.expires_at);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON SCHEMA account_safety FROM anon';
    EXECUTE 'REVOKE ALL ON TABLE account_safety.deletion_ledger FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON SCHEMA account_safety FROM authenticated';
    EXECUTE 'REVOKE ALL ON TABLE account_safety.deletion_ledger FROM authenticated';
  END IF;
END $$;
