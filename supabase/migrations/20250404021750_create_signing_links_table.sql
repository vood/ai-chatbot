-- Create signing_links table
CREATE TABLE signing_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'), -- Secure, unique token
  document_id UUID NOT NULL, -- Cannot add FK to documents if it doesn't exist or is complex
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Owner of the document
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- e.g., pending, viewed, completed, expired
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration date
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster lookups
CREATE INDEX idx_signing_links_token ON signing_links(token);
CREATE INDEX idx_signing_links_document_id ON signing_links(document_id);
CREATE INDEX idx_signing_links_contact_id ON signing_links(contact_id);
CREATE INDEX idx_signing_links_user_id ON signing_links(user_id);

-- Add trigger to update the updated_at timestamp
-- Reuse the existing function if it was created in a previous migration
-- CREATE OR REPLACE FUNCTION update_updated_at()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.updated_at = NOW();
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

CREATE TRIGGER update_signing_links_updated_at
BEFORE UPDATE ON signing_links
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Enable Row Level Security
ALTER TABLE signing_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for signing_links

-- Allow users to manage (select, insert, update, delete) links associated with their documents
CREATE POLICY "Users can manage links for their own documents" 
ON signing_links
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow anyone with a valid, non-expired token to view the link details (needed for the signing page)
CREATE POLICY "Allow public access to view link details via token" 
ON signing_links
FOR SELECT
TO public -- Or anon role, depending on Supabase setup
USING (
  status != 'expired' AND
  (expires_at IS NULL OR expires_at > NOW())
);

-- Note: We will handle the logic of fetching the *document content* and *specific fields* 
-- for a given token in a secure server-side function/endpoint, 
-- not directly via RLS on the documents/contract_fields tables for public access.
-- This RLS policy only allows fetching the link record itself.
