-- Account-owned community data. Only the application server may read/write.
-- Generated with `supabase migration new community_posts_comments` and kept
-- with this repository's checksum-verified, account-only migrations.
CREATE TABLE public.community_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.auth_users(id) ON DELETE CASCADE,
  alias varchar(24) NOT NULL UNIQUE CHECK (alias ~ '^Loop-[A-F0-9]{12}$'),
  rules_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY,
  author_id uuid NOT NULL REFERENCES public.community_profiles(user_id) ON DELETE CASCADE,
  locale varchar(5) NOT NULL CHECK (locale IN ('ko','en','ja','pt-br','es','tr','de','fr','it','ru')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 4 AND 100),
  body text NOT NULL CHECK (char_length(body) BETWEEN 20 AND 4000),
  evidence_urls jsonb NOT NULL CHECK (jsonb_typeof(evidence_urls) = 'array' AND jsonb_array_length(evidence_urls) BETWEEN 1 AND 3),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','rejected','hidden','withdrawn')),
  review_revision integer NOT NULL DEFAULT 0,
  moderation_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE INDEX community_posts_feed_idx ON public.community_posts(locale, created_at DESC, id) WHERE status = 'published';
CREATE INDEX community_posts_author_idx ON public.community_posts(author_id, created_at DESC);
CREATE INDEX community_posts_queue_idx ON public.community_posts(created_at) WHERE status = 'pending';
CREATE TABLE public.community_comments (
  id uuid PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.community_profiles(user_id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('opinion','correction')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 2 AND 2000),
  evidence_urls jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(evidence_urls) = 'array' AND jsonb_array_length(evidence_urls) <= 3),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','rejected','hidden','withdrawn')),
  review_revision integer NOT NULL DEFAULT 0,
  moderation_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE INDEX community_comments_post_idx ON public.community_comments(post_id, created_at DESC, id);
CREATE INDEX community_comments_author_idx ON public.community_comments(author_id);
CREATE INDEX community_comments_queue_idx ON public.community_comments(created_at) WHERE status = 'pending';
CREATE TABLE public.community_moderation_log (
  id uuid PRIMARY KEY,
  post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.auth_users(id) ON DELETE SET NULL,
  decision text NOT NULL CHECK (decision IN ('published','rejected','hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((post_id IS NULL) <> (comment_id IS NULL))
);
CREATE INDEX community_moderation_post_idx ON public.community_moderation_log(post_id);
CREATE INDEX community_moderation_comment_idx ON public.community_moderation_log(comment_id);
CREATE INDEX community_moderation_actor_idx ON public.community_moderation_log(actor_id);
REVOKE ALL ON public.community_profiles, public.community_posts, public.community_comments, public.community_moderation_log FROM PUBLIC;
ALTER TABLE public.community_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_moderation_log ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE target_role text;
BEGIN
  FOREACH target_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = target_role) THEN
      EXECUTE format('REVOKE ALL ON public.community_profiles, public.community_posts, public.community_comments, public.community_moderation_log FROM %I', target_role);
    END IF;
  END LOOP;
  FOREACH target_role IN ARRAY ARRAY['brawl_production_backup','brawl_staging_backup'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = target_role) THEN
      EXECUTE format('GRANT SELECT ON public.community_profiles, public.community_posts, public.community_comments, public.community_moderation_log TO %I', target_role);
    END IF;
  END LOOP;
END $$;
