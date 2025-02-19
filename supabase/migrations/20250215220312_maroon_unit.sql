-- Drop existing triggers and functions
DO $$ BEGIN
  DROP TRIGGER IF EXISTS normalize_client_contact_trigger ON clients;
  DROP FUNCTION IF EXISTS normalize_client_contact();
END $$;

-- Remove existing constraints if they exist
ALTER TABLE clients 
  DROP CONSTRAINT IF EXISTS clients_email_unique,
  DROP CONSTRAINT IF EXISTS clients_telephone_unique,
  DROP CONSTRAINT IF EXISTS clients_email_check,
  DROP CONSTRAINT IF EXISTS clients_telephone_check;

-- Add client_id column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE clients ADD COLUMN client_id text UNIQUE;
  END IF;
END $$;

-- Create function to generate client ID
CREATE OR REPLACE FUNCTION generate_client_id()
RETURNS text AS $$
DECLARE
  new_id text;
  counter integer := 1;
BEGIN
  LOOP
    new_id := 'CL-' || LPAD(counter::text, 4, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 
      FROM clients 
      WHERE client_id = new_id
    );
    counter := counter + 1;
  END LOOP;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to normalize contact info
CREATE OR REPLACE FUNCTION normalize_client_contact()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate client_id if not provided
  IF NEW.client_id IS NULL THEN
    NEW.client_id := generate_client_id();
  END IF;

  -- Normalize email to lowercase if provided
  IF NEW.email IS NOT NULL THEN
    NEW.email := lower(trim(NEW.email));
  END IF;

  -- Clean phone number if provided
  IF NEW.telephone IS NOT NULL THEN
    -- Remove all non-digit characters except +
    NEW.telephone := regexp_replace(NEW.telephone, '[^0-9+]', '', 'g');
    -- Add Gabon country code if starts with 0
    IF NEW.telephone ~ '^0' THEN
      NEW.telephone := '+241' || substring(NEW.telephone from 2);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for contact normalization
CREATE TRIGGER normalize_client_contact_trigger
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION normalize_client_contact();

-- Update existing clients with client_id
UPDATE clients 
SET client_id = generate_client_id() 
WHERE client_id IS NULL;

-- Make client_id NOT NULL after updating existing records
ALTER TABLE clients 
  ALTER COLUMN client_id SET NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN clients.client_id IS 'Unique client identifier in format CL-XXXX';
COMMENT ON FUNCTION generate_client_id IS 'Generates a unique client ID in format CL-XXXX';
COMMENT ON FUNCTION normalize_client_contact IS 'Normalizes client contact information and generates client_id';