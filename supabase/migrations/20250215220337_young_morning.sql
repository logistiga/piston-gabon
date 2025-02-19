-- Drop existing triggers and functions
DO $$ BEGIN
  DROP TRIGGER IF EXISTS normalize_client_contact_trigger ON clients;
  DROP FUNCTION IF EXISTS normalize_client_contact();
END $$;

-- Remove existing constraints if they exist
ALTER TABLE clients 
  DROP CONSTRAINT IF EXISTS clients_email_unique,
  DROP CONSTRAINT IF EXISTS clients_telephone_unique;

-- Add unique constraint on client_id
ALTER TABLE clients
  ADD CONSTRAINT clients_client_id_unique UNIQUE (client_id);

-- Create function to normalize phone number
CREATE OR REPLACE FUNCTION normalize_client_phone()
RETURNS TRIGGER AS $$
BEGIN
  -- Only normalize if phone number is provided
  IF NEW.telephone IS NOT NULL THEN
    -- Remove all non-digit characters except +
    NEW.telephone := regexp_replace(NEW.telephone, '[^0-9+]', '', 'g');
    
    -- Add Gabon country code if starts with 0
    IF NEW.telephone ~ '^0' THEN
      NEW.telephone := '+241' || substring(NEW.telephone from 2);
    END IF;
    
    -- Validate minimum length after normalization
    IF length(regexp_replace(NEW.telephone, '[^0-9]', '', 'g')) < 8 THEN
      NEW.telephone := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for phone normalization
CREATE TRIGGER normalize_client_phone_trigger
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION normalize_client_phone();

-- Add helpful comments
COMMENT ON CONSTRAINT clients_client_id_unique ON clients IS 'Ensures unique client IDs';
COMMENT ON FUNCTION normalize_client_phone IS 'Normalizes phone number format before save';