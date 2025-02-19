-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS normalize_client_contact_trigger_v2 ON clients;
DROP FUNCTION IF EXISTS normalize_client_contact_v2();

-- Drop existing constraints if they exist
ALTER TABLE clients 
  DROP CONSTRAINT IF EXISTS clients_telephone_check,
  DROP CONSTRAINT IF EXISTS clients_email_unique;

-- Add constraints
ALTER TABLE clients
  ADD CONSTRAINT clients_telephone_check CHECK (telephone ~* '^\+?[0-9]{8,}$'),
  ADD CONSTRAINT clients_email_unique UNIQUE NULLS NOT DISTINCT (email);

-- Create function to normalize contact info
CREATE OR REPLACE FUNCTION normalize_client_contact_v2()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate client_id if not provided
  IF NEW.client_id IS NULL THEN
    NEW.client_id := 'CL-' || LPAD(CAST(nextval('client_id_seq') AS text), 4, '0');
  END IF;

  -- Normalize email to lowercase if provided
  IF NEW.email IS NOT NULL THEN
    NEW.email := lower(trim(NEW.email));
  END IF;

  -- Prevent email modification if already set
  IF OLD IS NOT NULL AND OLD.email IS NOT NULL AND NEW.email != OLD.email THEN
    RAISE EXCEPTION 'Email address cannot be modified once set';
  END IF;

  -- Only normalize if phone number is provided and changed
  IF NEW.telephone IS NOT NULL AND 
     (OLD IS NULL OR NEW.telephone != OLD.telephone) THEN
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

-- Create trigger for contact normalization
CREATE TRIGGER normalize_client_contact_trigger_v2
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION normalize_client_contact_v2();

-- Add helpful comments
COMMENT ON CONSTRAINT clients_telephone_check ON clients IS 'Validates phone number format';
COMMENT ON CONSTRAINT clients_email_unique ON clients IS 'Ensures unique email addresses for clients';
COMMENT ON FUNCTION normalize_client_contact_v2 IS 'Normalizes client contact information and handles client ID generation';