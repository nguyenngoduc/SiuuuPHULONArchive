BEGIN;

ALTER TABLE archive_auth.access_requests ADD COLUMN IF NOT EXISTS email text;

CREATE TABLE IF NOT EXISTS archive_auth.access_email_outbox (
  request_id uuid NOT NULL REFERENCES archive_auth.access_requests(id) ON DELETE CASCADE,
  event text NOT NULL CHECK (event IN ('submitted', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  PRIMARY KEY (request_id, event)
);

CREATE INDEX IF NOT EXISTS archive_access_emails_to_send
  ON archive_auth.access_email_outbox (next_attempt_at) WHERE sent_at IS NULL;

CREATE OR REPLACE FUNCTION archive_auth.queue_access_email()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO archive_auth.access_email_outbox (request_id, event)
    VALUES (NEW.id, 'submitted') ON CONFLICT DO NOTHING;
  ELSIF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') AND NEW.email IS NOT NULL THEN
    INSERT INTO archive_auth.access_email_outbox (request_id, event)
    VALUES (NEW.id, NEW.status) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_access_email ON archive_auth.access_requests;
CREATE TRIGGER queue_access_email
AFTER INSERT OR UPDATE OF status ON archive_auth.access_requests
FOR EACH ROW EXECUTE FUNCTION archive_auth.queue_access_email();

INSERT INTO archive_auth.access_email_outbox (request_id, event)
SELECT id, 'submitted' FROM archive_auth.access_requests WHERE status = 'pending'
ON CONFLICT DO NOTHING;

COMMIT;
