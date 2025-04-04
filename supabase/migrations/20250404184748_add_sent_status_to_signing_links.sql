-- Add 'sent' status to signing_links table
-- This migration adds documentation for the 'sent' status used when sending email invitations

COMMENT ON TABLE signing_links IS 'Links for document signing, with statuses: pending, viewed, completed, expired, sent';
COMMENT ON COLUMN signing_links.status IS 'Current status of the signing link: pending, viewed, completed, expired, sent (when email was sent)';

-- Note: No schema change needed since status is VARCHAR(50) and not an enum type
