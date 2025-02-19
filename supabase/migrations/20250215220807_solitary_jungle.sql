-- Drop existing trigger if it exists
DO $$ BEGIN
  DROP TRIGGER IF EXISTS normalize_client_phone_trigger ON clients;
  DROP FUNCTION IF EXISTS normalize_client_phone();
END $$;

-- Create function to normalize phone number
CREATE OR REPLACE FUNCTION normalize_client_phone()
RETURNS TRIGGER AS $$
BEGIN
  -- Only normalize if phone number is provided and changed
  IF NEW.telephone IS NOT NULL AND 
     (OLD.telephone IS NULL OR NEW.telephone != OLD.telephone) THEN
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
DROP TRIGGER IF EXISTS normalize_client_phone_trigger ON clients;
CREATE TRIGGER normalize_client_phone_trigger
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION normalize_client_phone();

-- Add helpful comments
COMMENT ON FUNCTION normalize_client_phone IS 'Normalizes phone number format before save';