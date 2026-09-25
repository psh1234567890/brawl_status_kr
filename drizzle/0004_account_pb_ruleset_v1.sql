DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.minigame_personal_bests
    WHERE ruleset_version <> 1
  ) THEN
    RAISE EXCEPTION 'Account PB rows use an unsupported ruleset version; review them before applying 0004_account_pb_ruleset_v1.';
  END IF;
END $$;

ALTER TABLE public.minigame_personal_bests
  ADD CONSTRAINT minigame_personal_bests_ruleset_v1
  CHECK (ruleset_version = 1);
