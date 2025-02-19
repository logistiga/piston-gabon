-- Drop existing triggers if they exist
DO $$ BEGIN
  DROP TRIGGER IF EXISTS normalize_client_contact_trigger ON clients;
  DROP FUNCTION IF EXISTS normalize_client_contact();
END $$;

-- Create sequence for client IDs if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS client_id_seq START 1;

-- Create function to normalize contact info and handle client ID
CREATE OR REPLACE FUNCTION normalize_client_contact()
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
CREATE TRIGGER normalize_client_contact_trigger
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION normalize_client_contact();

-- Add helpful comments
COMMENT ON FUNCTION normalize_client_contact IS 'Normalizes client contact information and handles client ID generation';
COMMENT ON SEQUENCE client_id_seq IS 'Sequence for generating unique client IDs';