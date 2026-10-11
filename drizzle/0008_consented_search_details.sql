-- Optional, clearly disclosed search diagnostics. This does not alter battle data.
-- Full IPs, emails, passwords, sessions, and searched account owner identities
-- must never be written to this table.
CREATE TABLE IF NOT EXISTS analytics_private.consented_search_details (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  searched_at timestamptz NOT NULL DEFAULT now(),
  player_tag varchar(20) NOT NULL,
  masked_ip_range varchar(64),
  authenticated_account_id uuid REFERENCES public.auth_users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS consented_search_details_searched_at_idx
  ON analytics_private.consented_search_details (searched_at DESC);
REVOKE ALL ON analytics_private.consented_search_details FROM PUBLIC, anon, authenticated;
COMMENT ON TABLE analytics_private.consented_search_details IS
  'Opted-in successful search: public player tag, masked IP prefix, and optional consenting signed-in account. No raw IP, email or login credentials.';
