-- Drop existing triggers if they exist
DO $$ BEGIN
  DROP TRIGGER IF EXISTS normalize_client_phone_trigger ON clients;
  DROP FUNCTION IF EXISTS normalize_client_phone();
END $$;

-- Create function to normalize phone number and handle client ID
CREATE OR REPLACE FUNCTION normalize_client_contact()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate client_id if not provided
  IF NEW.client_id IS NULL THEN
    NEW.client_id := 'CL-' || LPAD(CAST(nextval('client_id_seq') AS text), 4, '0');
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

  -- Prevent email modification if already set
  IF OLD IS NOT NULL AND OLD.email IS NOT NULL AND NEW.email != OLD.email THEN
    RAISE EXCEPTION 'Email address cannot be modified once set';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for client IDs if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS client_id_seq START 1;

-- Create trigger for contact normalization
CREATE TRIGGER normalize_client_contact_trigger
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION normalize_client_contact();

-- Add unique constraint on client_id if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE table_name = 'clients' 
    AND constraint_name = 'clients_client_id_key'
  ) THEN
    ALTER TABLE clients ADD CONSTRAINT clients_client_id_key UNIQUE (client_id);
  END IF;
END $$;

-- Add helpful comments
COMMENT ON FUNCTION normalize_client_contact IS 'Normalizes client contact information and handles client ID generation';
COMMENT ON SEQUENCE client_id_seq IS 'Sequence for generating unique client IDs';