ALTER TABLE pack_viewers
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS pack_viewers_auth_user_id_idx
  ON pack_viewers(auth_user_id);
