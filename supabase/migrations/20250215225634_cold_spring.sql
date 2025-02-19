-- Drop existing triggers if they exist
DO $$ BEGIN
  DROP TRIGGER IF EXISTS normalize_client_phone_trigger ON clients;
  DROP FUNCTION IF EXISTS normalize_client_phone();
END $$;

-- Drop existing constraints if they exist
DO $$ BEGIN
  -- Drop check constraint if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.check_constraints 
    WHERE constraint_name = 'clients_telephone_check'
  ) THEN
    ALTER TABLE clients DROP CONSTRAINT clients_telephone_check;
  END IF;
END $$;

-- Add check constraint for phone format if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.check_constraints 
    WHERE constraint_name = 'clients_telephone_check'
  ) THEN
    ALTER TABLE clients
      ADD CONSTRAINT clients_telephone_check 
      CHECK (telephone ~* '^\+?[0-9]{8,}$');
  END IF;
END $$;

-- Create function to normalize phone number
CREATE OR REPLACE FUNCTION normalize_client_phone()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove spaces and format phone number
  IF NEW.telephone IS NOT NULL THEN
    NEW.telephone := regexp_replace(NEW.telephone, '[^0-9+]', '', 'g');
    -- Ensure Gabon format if starts with 0
    IF NEW.telephone ~ '^0' THEN
      NEW.telephone := '+241' || substring(NEW.telephone from 2);
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
COMMENT ON CONSTRAINT clients_telephone_check ON clients IS 'Validates phone number format';
COMMENT ON FUNCTION normalize_client_phone IS 'Normalizes phone number format before save';