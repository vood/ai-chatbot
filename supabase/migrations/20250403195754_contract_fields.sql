-- Create contract_fields table
CREATE TABLE contract_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL, -- No foreign key since multiple documents can have same ID
  contact_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_name VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL,
  field_value TEXT,
  placeholder_text TEXT NOT NULL,
  position_in_document JSONB, -- Store position information like page, x, y coordinates
  is_required BOOLEAN DEFAULT false,
  is_filled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(document_id, field_name, contact_id)
);

-- Add index for faster lookups
CREATE INDEX idx_contract_fields_document_id ON contract_fields(document_id);
CREATE INDEX idx_contract_fields_contact_id ON contract_fields(contact_id);

-- Create contacts table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  company VARCHAR(255),
  phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contract_fields_updated_at
BEFORE UPDATE ON contract_fields
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON contacts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Add foreign key constraint for contact_id
ALTER TABLE contract_fields
ADD CONSTRAINT fk_contract_fields_contact_id
FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_fields ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contacts table
CREATE POLICY "Users can view their own contacts"
ON contacts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contacts"
ON contacts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts"
ON contacts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts"
ON contacts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create RLS policies for contract_fields table
CREATE POLICY "Users can view their own contract fields"
ON contract_fields FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contract fields"
ON contract_fields FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contract fields"
ON contract_fields FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contract fields"
ON contract_fields FOR DELETE
TO authenticated
USING (auth.uid() = user_id); 