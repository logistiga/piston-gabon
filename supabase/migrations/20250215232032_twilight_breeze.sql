-- Add NIF and address columns to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS nif text,
  ADD COLUMN IF NOT EXISTS adresse text;

-- Add check constraint for NIF format (alphanumeric)
ALTER TABLE clients
  ADD CONSTRAINT clients_nif_check 
  CHECK (nif ~* '^[A-Z0-9]+$');

-- Create index for NIF field
CREATE INDEX IF NOT EXISTS idx_clients_nif ON clients(nif);

-- Update normalize_client_contact function to handle NIF
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON COLUMN clients.nif IS 'Numéro d''identification fiscale (alphanumeric)';
COMMENT ON COLUMN clients.adresse IS 'Adresse physique du client';
COMMENT ON CONSTRAINT clients_nif_check ON clients IS 'Ensures NIF contains only letters and numbers';