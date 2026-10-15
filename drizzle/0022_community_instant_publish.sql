-- Created with supabase migration new; stored with the account migration ledger.
-- Existing moderation decisions and pending submissions keep their visibility.
ALTER TABLE public.community_posts DROP CONSTRAINT community_posts_title_check;
ALTER TABLE public.community_posts DROP CONSTRAINT community_posts_body_check;
ALTER TABLE public.community_comments DROP CONSTRAINT community_comments_body_check;

ALTER TABLE public.community_posts ADD CONSTRAINT community_posts_title_check CHECK (btrim(title) <> '');
ALTER TABLE public.community_posts ADD CONSTRAINT community_posts_body_check CHECK (btrim(body) <> '');
ALTER TABLE public.community_comments ADD CONSTRAINT community_comments_body_check CHECK (btrim(body) <> '');
-- The new application explicitly inserts published rows. Keep legacy defaults
-- for older deployments so this additive rollout also supports an app rollback.
