create extension if not exists pgcrypto with schema extensions;

-- Add intercom_hash column to profiles table with default empty string
ALTER TABLE profiles 
ADD COLUMN intercom_hash TEXT NOT NULL DEFAULT '' CHECK (char_length(intercom_hash) <= 1000);

-- Create function to automatically generate intercom hash on user creation/update
CREATE OR REPLACE FUNCTION generate_intercom_hash()
RETURNS TRIGGER AS $$
DECLARE
  hmac_key TEXT;
BEGIN
  -- Get the HMAC key from secrets
  hmac_key := current_setting('app.settings.intercom_secret_key', TRUE);
  
  -- Only generate hash if secret key is available
  IF hmac_key IS NOT NULL THEN
    -- Generate HMAC using SHA256
    NEW.intercom_hash := encode(
      extensions.hmac(
        NEW.user_id::text, 
        hmac_key, 
        'sha256'
      ),
      'hex'
    );
  ELSE
    -- Set empty string if no key available
    NEW.intercom_hash := '';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update hash on insert/update
CREATE TRIGGER update_intercom_hash
  BEFORE INSERT OR UPDATE OF user_id
  ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_intercom_hash();

-- Set up secret for intercom
SELECT set_config('app.settings.intercom_secret_key', '', FALSE);

-- Update existing records by triggering the function
UPDATE profiles 
SET user_id = user_id;