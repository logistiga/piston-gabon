-- Drop existing constraints if they exist
ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS clients_email_unique,
  DROP CONSTRAINT IF EXISTS clients_telephone_unique;

-- Add unique constraint on client_id
ALTER TABLE clients
  ADD CONSTRAINT clients_client_id_unique UNIQUE (client_id);

-- Add check constraint for phone format
ALTER TABLE clients
  ADD CONSTRAINT clients_telephone_check 
    CHECK (telephone ~* '^\+?[0-9]{8,}$');

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
COMMENT ON CONSTRAINT clients_client_id_unique ON clients IS 'Ensures unique client IDs';
COMMENT ON CONSTRAINT clients_telephone_check ON clients IS 'Validates phone number format';
COMMENT ON FUNCTION normalize_client_phone IS 'Normalizes phone number format before save';