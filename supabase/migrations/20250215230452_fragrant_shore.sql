-- Drop existing triggers and functions
DO $$ BEGIN
  DROP TRIGGER IF EXISTS normalize_client_contact_trigger ON clients;
  DROP TRIGGER IF EXISTS normalize_client_phone_trigger ON clients;
  DROP FUNCTION IF EXISTS normalize_client_contact();
  DROP FUNCTION IF EXISTS normalize_client_phone();
END $$;

-- Drop existing table and dependencies
DROP TABLE IF EXISTS client_account_audit CASCADE;
DROP TABLE IF EXISTS client_account_transactions CASCADE;
DROP TABLE IF EXISTS client_accounts CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- Create sequence for client IDs
CREATE SEQUENCE IF NOT EXISTS client_id_seq START 1;

-- Create clients table
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text UNIQUE NOT NULL,
  nom text NOT NULL,
  entreprise text,
  email text,
  telephone text,
  limite_credit decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT clients_telephone_check CHECK (telephone ~* '^\+?[0-9]{8,}$')
);

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

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "policy_staff_manage_clients"
ON clients
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('administrateur', 'commercial', 'caisse')
  )
);

CREATE POLICY "policy_client_create"
ON clients
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_clients_client_id ON clients(client_id);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_nom ON clients(nom);
CREATE INDEX idx_clients_entreprise ON clients(entreprise);

-- Add helpful comments
COMMENT ON TABLE clients IS 'Stores basic client information';
COMMENT ON COLUMN clients.client_id IS 'Unique client identifier in format CL-XXXX';
COMMENT ON COLUMN clients.nom IS 'Client name';
COMMENT ON COLUMN clients.entreprise IS 'Company name (optional)';
COMMENT ON COLUMN clients.email IS 'Client email address';
COMMENT ON COLUMN clients.telephone IS 'Client phone number';
COMMENT ON COLUMN clients.limite_credit IS 'Client credit limit';
COMMENT ON FUNCTION generate_client_id IS 'Generates a unique client ID in format CL-XXXX';
COMMENT ON FUNCTION normalize_client_contact IS 'Normalizes client contact information';