-- Add client_id column to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS client_id text UNIQUE;

-- Create function to generate client ID
CREATE OR REPLACE FUNCTION generate_client_id()
RETURNS text AS $$
DECLARE
  new_id text;
  counter integer := 1;
BEGIN
  -- Generate ID in format CL-XXXX where X is a number
  LOOP
    new_id := 'CL-' || LPAD(counter::text, 4, '0');
    
    -- Exit loop if ID is unique
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

-- Create trigger to auto-generate client ID
CREATE OR REPLACE FUNCTION set_client_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_id IS NULL THEN
    NEW.client_id := generate_client_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER set_client_id_trigger
  BEFORE INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION set_client_id();

-- Update existing clients with IDs
DO $$
DECLARE
  client_record RECORD;
BEGIN
  FOR client_record IN SELECT id FROM clients WHERE client_id IS NULL
  LOOP
    UPDATE clients 
    SET client_id = generate_client_id() 
    WHERE id = client_record.id;
  END LOOP;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_clients_client_id ON clients(client_id);

-- Add helpful comments
COMMENT ON COLUMN clients.client_id IS 'Unique client identifier in format CL-XXXX';
COMMENT ON FUNCTION generate_client_id IS 'Generates a unique client ID in format CL-XXXX';