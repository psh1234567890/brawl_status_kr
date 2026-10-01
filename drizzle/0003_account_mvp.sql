CREATE TABLE IF NOT EXISTS public.auth_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  default_player_tag text,
  profile_revision integer NOT NULL DEFAULT 1,
  onboarding_completed_at timestamptz,
  terms_version text,
  privacy_notice_version text,
  eligibility_policy_version text,
  CONSTRAINT auth_users_email_unique UNIQUE (email),
  CONSTRAINT auth_users_name_valid CHECK (
    char_length(btrim(name)) BETWEEN 1 AND 32
    AND octet_length(name) <= 128
    AND name = btrim(name)
    AND name !~ '[[:cntrl:]]'
  ),
  CONSTRAINT auth_users_profile_revision_positive CHECK (profile_revision >= 1),
  CONSTRAINT auth_users_default_player_tag_valid CHECK (
    default_player_tag IS NULL
    OR default_player_tag ~ '^[0289PYLQGRJCUV]{3,15}$'
  ),
  CONSTRAINT auth_users_onboarding_policy_versions CHECK (
    onboarding_completed_at IS NULL
    OR (
      terms_version IS NOT NULL
      AND privacy_notice_version IS NOT NULL
      AND eligibility_policy_version IS NOT NULL
    )
  )
);

CREATE TABLE IF NOT EXISTS public.auth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider_id text NOT NULL,
  account_id text NOT NULL,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_accounts_user_id_auth_users_id_fk
    FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT auth_accounts_provider_account_unique UNIQUE (provider_id, account_id),
  CONSTRAINT auth_accounts_user_provider_unique UNIQUE (user_id, provider_id),
  CONSTRAINT auth_accounts_google_only CHECK (provider_id = 'google'),
  CONSTRAINT auth_accounts_token_fields_empty CHECK (
    access_token IS NULL
    AND refresh_token IS NULL
    AND id_token IS NULL
    AND access_token_expires_at IS NULL
    AND refresh_token_expires_at IS NULL
    AND scope IS NULL
    AND password IS NULL
  )
);
CREATE INDEX IF NOT EXISTS auth_accounts_user_id_idx
  ON public.auth_accounts (user_id);

CREATE TABLE IF NOT EXISTS public.auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_sessions_user_id_auth_users_id_fk
    FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT auth_sessions_token_unique UNIQUE (token),
  CONSTRAINT auth_sessions_expiry_after_creation CHECK (expires_at > created_at),
  CONSTRAINT auth_sessions_request_metadata_empty CHECK (
    ip_address IS NULL AND user_agent IS NULL
  )
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx
  ON public.auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx
  ON public.auth_sessions (expires_at);

CREATE TABLE IF NOT EXISTS public.auth_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_verifications_identifier_idx
  ON public.auth_verifications (identifier);
CREATE INDEX IF NOT EXISTS auth_verifications_expires_at_idx
  ON public.auth_verifications (expires_at);

CREATE TABLE IF NOT EXISTS public.minigame_personal_bests (
  user_id uuid NOT NULL,
  game_id text NOT NULL,
  mode text NOT NULL,
  ruleset_version smallint NOT NULL DEFAULT 1,
  score integer NOT NULL,
  total integer NOT NULL,
  source text NOT NULL,
  client_recorded_at timestamptz,
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT minigame_personal_bests_pk
    PRIMARY KEY (user_id, game_id, mode, ruleset_version),
  CONSTRAINT minigame_personal_bests_user_id_auth_users_id_fk
    FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT minigame_personal_bests_slot_valid CHECK (
    (game_id = 'brawler-quiz' AND mode IN ('3m', '5m', '10m', 'practice'))
    OR (game_id = 'silhouette-quiz' AND mode = 'base')
    OR (game_id = 'map-quiz' AND mode = 'standard')
    OR (game_id = 'ability-quiz' AND mode IN ('mixed', 'gadget', 'star-power'))
  ),
  CONSTRAINT minigame_personal_bests_score_valid CHECK (
    score >= 0 AND score <= total AND total BETWEEN 1 AND 10000
  ),
  CONSTRAINT minigame_personal_bests_fixed_total CHECK (
    game_id = 'brawler-quiz' OR total = 10
  ),
  CONSTRAINT minigame_personal_bests_ruleset_positive CHECK (ruleset_version > 0),
  CONSTRAINT minigame_personal_bests_source_valid
    CHECK (source IN ('legacy_import', 'client_play')),
  CONSTRAINT minigame_personal_bests_revision_positive CHECK (revision > 0)
);

CREATE TABLE IF NOT EXISTS public.account_sync_receipts (
  user_id uuid NOT NULL,
  operation_id uuid NOT NULL,
  payload_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT account_sync_receipts_pk PRIMARY KEY (user_id, operation_id),
  CONSTRAINT account_sync_receipts_user_id_auth_users_id_fk
    FOREIGN KEY (user_id) REFERENCES public.auth_users(id)
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT account_sync_receipts_payload_hash_valid
    CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT account_sync_receipts_expiry_after_creation
    CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS account_sync_receipts_expires_at_idx
  ON public.account_sync_receipts (expires_at);

CREATE TABLE IF NOT EXISTS public.account_rate_limits (
  scope text NOT NULL,
  subject_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL,
  expires_at timestamptz NOT NULL,
  CONSTRAINT account_rate_limits_pk
    PRIMARY KEY (scope, subject_hash, window_start),
  CONSTRAINT account_rate_limits_count_positive CHECK (request_count >= 1)
);
CREATE INDEX IF NOT EXISTS account_rate_limits_expires_at_idx
  ON public.account_rate_limits (expires_at);

CREATE TABLE IF NOT EXISTS public.account_deletion_tombstones (
  user_id uuid PRIMARY KEY,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS account_deletion_tombstones_expires_at_idx
  ON public.account_deletion_tombstones (expires_at);

CREATE TABLE IF NOT EXISTS public.account_schema_migrations (
  version text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_schema_migrations_checksum_valid
    CHECK (checksum ~ '^[0-9a-f]{64}$')
);

ALTER TABLE public.auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minigame_personal_bests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_sync_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deletion_tombstones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_schema_migrations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.auth_users,
  public.auth_accounts,
  public.auth_sessions,
  public.auth_verifications,
  public.minigame_personal_bests,
  public.account_sync_receipts,
  public.account_rate_limits,
  public.account_deletion_tombstones,
  public.account_schema_migrations
FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.auth_users, public.auth_accounts, public.auth_sessions, public.auth_verifications, public.minigame_personal_bests, public.account_sync_receipts, public.account_rate_limits, public.account_deletion_tombstones, public.account_schema_migrations FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.auth_users, public.auth_accounts, public.auth_sessions, public.auth_verifications, public.minigame_personal_bests, public.account_sync_receipts, public.account_rate_limits, public.account_deletion_tombstones, public.account_schema_migrations FROM authenticated';
  END IF;
END
$$;
