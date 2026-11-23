BEGIN;

ALTER TABLE archive_auth.admin_users
  ADD COLUMN IF NOT EXISTS can_approve boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS archive_auth.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('github', 'credentials')),
  identity text NOT NULL,
  username text NOT NULL,
  password_hash text CHECK (password_hash ~ '^scrypt-v1:[a-f0-9]{32}:[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE (provider, identity),
  CHECK ((password_hash IS NOT NULL) = (provider = 'credentials' AND status = 'pending'))
);

CREATE INDEX IF NOT EXISTS archive_pending_requests
  ON archive_auth.access_requests (requested_at) WHERE status = 'pending';

COMMIT;
