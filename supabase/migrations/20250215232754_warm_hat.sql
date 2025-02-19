-- Drop existing triggers and functions
DO $$ BEGIN
  DROP TRIGGER IF EXISTS normalize_client_contact_trigger ON clients;
  DROP FUNCTION IF EXISTS normalize_client_contact();
  DROP SEQUENCE IF EXISTS client_id_seq;
END $$;

-- Create sequence for client IDs
CREATE SEQUENCE IF NOT EXISTS client_id_seq START 1;

-- Create function to generate client ID
CREATE OR REPLACE FUNCTION generate_client_id()
RETURNS text AS $$
DECLARE
  new_id text;
  counter integer;
BEGIN
  -- Get next value from sequence
  SELECT nextval('client_id_seq') INTO counter;
  
  -- Generate new ID
  new_id := 'CL-' || LPAD(counter::text, 4, '0');
  
  -- If ID already exists, try next value
  WHILE EXISTS (
    SELECT 1 
    FROM clients 
    WHERE client_id = new_id
  ) LOOP
    counter := counter + 1;
    new_id := 'CL-' || LPAD(counter::text, 4, '0');
  END LOOP;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to normalize client data
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

  -- Normalize NIF to uppercase if provided
  IF NEW.nif IS NOT NULL THEN
    -- Remove spaces and convert to uppercase
    NEW.nif := upper(regexp_replace(NEW.nif, '\s+', '', 'g'));
  END IF;

  -- Trim address if provided
  IF NEW.adresse IS NOT NULL THEN
    NEW.adresse := trim(NEW.adresse);
  END IF;

  -- Validate email uniqueness only if provided
  IF NEW.email IS NOT NULL AND EXISTS (
    SELECT 1 
    FROM clients 
    WHERE email = NEW.email 
    AND id != COALESCE(NEW.id, uuid_nil())
  ) THEN
    RAISE EXCEPTION 'Un client avec cet email existe déjà';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for client data normalization
CREATE TRIGGER normalize_client_contact_trigger
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION normalize_client_contact();

-- Drop existing unique constraint on email
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_email_unique;

-- Add helpful comments
COMMENT ON FUNCTION generate_client_id IS 'Generates a unique client ID in format CL-XXXX';
COMMENT ON FUNCTION normalize_client_contact IS 'Normalizes and validates client contact information';