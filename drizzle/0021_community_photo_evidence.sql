-- Generated with supabase migration new community_photo_evidence.
-- Bytes live in a private Blob store; this database contains access metadata.
ALTER TABLE public.community_posts DROP CONSTRAINT community_posts_evidence_urls_check;
ALTER TABLE public.community_posts ADD CONSTRAINT community_posts_evidence_urls_check
  CHECK (jsonb_typeof(evidence_urls) = 'array' AND jsonb_array_length(evidence_urls) BETWEEN 0 AND 3);
-- This object inventory deliberately has no account FK. It survives account
-- cascades and restore-time deletion manifests so maintenance can remove bytes.
CREATE TABLE public.community_image_objects (
  object_path text PRIMARY KEY CHECK (object_path ~ '^community/[0-9a-f-]{36}\.webp$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.community_images (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES public.auth_users(id) ON DELETE CASCADE,
  object_path text NOT NULL UNIQUE REFERENCES public.community_image_objects(object_path)
    CHECK (object_path = 'community/' || id::text || '.webp'),
  ready boolean NOT NULL DEFAULT false,
  width integer NOT NULL CHECK (width BETWEEN 1 AND 1600),
  height integer NOT NULL CHECK (height BETWEEN 1 AND 1600),
  byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 2097152),
  post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (post_id IS NULL OR comment_id IS NULL)
);
CREATE INDEX community_images_owner_idx ON public.community_images(owner_id);
CREATE INDEX community_images_post_idx ON public.community_images(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX community_images_comment_idx ON public.community_images(comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX community_images_draft_idx ON public.community_images(created_at) WHERE post_id IS NULL AND comment_id IS NULL;
ALTER TABLE public.community_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_image_objects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.community_images, public.community_image_objects FROM PUBLIC;
DO $$
DECLARE target_role text;
BEGIN
  FOREACH target_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = target_role) THEN
      EXECUTE format('REVOKE ALL ON public.community_images, public.community_image_objects FROM %I', target_role);
    END IF;
  END LOOP;
  FOREACH target_role IN ARRAY ARRAY['brawl_production_backup','brawl_staging_backup'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = target_role) THEN
      EXECUTE format('GRANT SELECT ON public.community_images, public.community_image_objects TO %I', target_role);
    END IF;
  END LOOP;
END $$;
