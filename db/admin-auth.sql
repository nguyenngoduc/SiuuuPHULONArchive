BEGIN;

CREATE SCHEMA IF NOT EXISTS archive_auth;

CREATE TABLE IF NOT EXISTS archive_auth.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9][a-z0-9_.-]{2,39}$'),
  password_hash text NOT NULL CHECK (password_hash ~ '^scrypt-v1:[a-f0-9]{32}:[a-f0-9]{64}$'),
  enabled boolean NOT NULL DEFAULT true,
  session_version uuid NOT NULL DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS archive_auth.login_limits (
  bucket text PRIMARY KEY,
  attempts integer NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS archive_login_limits_expiration ON archive_auth.login_limits (expires_at);

CREATE OR REPLACE FUNCTION archive_auth.invalidate_changed_sessions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.username, NEW.password_hash, NEW.enabled)
    IS DISTINCT FROM (OLD.username, OLD.password_hash, OLD.enabled) THEN
    NEW.session_version := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invalidate_changed_sessions ON archive_auth.admin_users;
CREATE TRIGGER invalidate_changed_sessions
BEFORE UPDATE ON archive_auth.admin_users
FOR EACH ROW EXECUTE FUNCTION archive_auth.invalidate_changed_sessions();

COMMIT;
