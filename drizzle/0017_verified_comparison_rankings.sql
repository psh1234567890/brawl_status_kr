-- Private server-verified competition state, with opt-in pseudonymous leaderboard.
-- Neither browser-reported personal bests nor user nicknames are public inputs.
CREATE TABLE IF NOT EXISTS public.competitive_aliases (
  user_id uuid PRIMARY KEY REFERENCES public.auth_users(id) ON DELETE CASCADE,
  public_alias varchar(24) NOT NULL UNIQUE
    CHECK (public_alias ~ '^Player-[A-Z0-9]{10}$'),
  joined_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.competitive_rounds (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.auth_users(id) ON DELETE CASCADE,
  game_id text NOT NULL CHECK (game_id IN ('higher-lower', 'release-order')),
  CONSTRAINT competitive_rounds_one_per_game UNIQUE (user_id, game_id),
  ruleset_version smallint NOT NULL DEFAULT 1 CHECK (ruleset_version = 1),
  question_set jsonb NOT NULL CHECK (jsonb_typeof(question_set) = 'array' AND jsonb_array_length(question_set) = 10),
  next_index smallint NOT NULL DEFAULT 0 CHECK (next_index BETWEEN 0 AND 10),
  score smallint NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 10),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CHECK (expires_at > started_at)
);
CREATE INDEX IF NOT EXISTS competitive_rounds_owner_idx
  ON public.competitive_rounds (user_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS public.competitive_results (
  round_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.auth_users(id) ON DELETE CASCADE,
  game_id text NOT NULL CHECK (game_id IN ('higher-lower', 'release-order')),
  ruleset_version smallint NOT NULL DEFAULT 1 CHECK (ruleset_version = 1),
  score smallint NOT NULL CHECK (score BETWEEN 0 AND 10),
  total smallint NOT NULL DEFAULT 10 CHECK (total = 10),
  completed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS competitive_results_ranking_idx
  ON public.competitive_results (game_id, completed_at DESC, score DESC);
CREATE INDEX IF NOT EXISTS competitive_results_owner_idx
  ON public.competitive_results (user_id, game_id);

REVOKE ALL ON public.competitive_aliases, public.competitive_rounds,
  public.competitive_results FROM PUBLIC;
-- Vanilla PostgreSQL in isolated CI does not have Supabase's PostgREST roles.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON public.competitive_aliases, public.competitive_rounds, public.competitive_results FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON public.competitive_aliases, public.competitive_rounds, public.competitive_results FROM authenticated';
  END IF;
END $$;
ALTER TABLE public.competitive_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitive_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitive_results ENABLE ROW LEVEL SECURITY;

-- Scoped, read-only account snapshot roles may export these three tables,
-- but never unrelated battle logs or students. Optional in local PostgreSQL.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'brawl_production_backup') THEN
    GRANT SELECT ON public.competitive_aliases, public.competitive_rounds,
      public.competitive_results TO brawl_production_backup;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'brawl_staging_backup') THEN
    GRANT SELECT ON public.competitive_aliases, public.competitive_rounds,
      public.competitive_results TO brawl_staging_backup;
  END IF;
END $$;

COMMENT ON TABLE public.competitive_results IS
  'Server-scored, consented comparison rounds, not client-reported PB. A public alias is stored separately; removing the account removes all records.';

-- Incomplete challenges expire after 20 minutes at query time. Their physical
-- deletion is scheduled by the separate Supabase-only 0018 migration.
-- Finalized results last until withdrawal/account deletion for all-time ranks.
