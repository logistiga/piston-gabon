-- Drop existing policies if they exist
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'clients'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON clients', pol.policyname);
  END LOOP;
END $$;

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create sequence for client IDs if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS client_id_seq START 1;

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

-- Create function to handle client registration
CREATE OR REPLACE FUNCTION handle_client_registration()
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

  -- Normalize phone number if provided
  IF NEW.telephone IS NOT NULL THEN
    -- Remove all non-digit characters except +
    NEW.telephone := regexp_replace(NEW.telephone, '[^0-9+]', '', 'g');
    
    -- Add Gabon country code if starts with 0
    IF NEW.telephone ~ '^0' THEN
      NEW.telephone := '+241' || substring(NEW.telephone from 2);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for client registration
CREATE TRIGGER handle_client_registration_trigger
  BEFORE INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION handle_client_registration();

-- Create policy for client registration (both anonymous and authenticated)
CREATE POLICY "policy_client_registration_final"
ON clients
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Create policy for staff to view clients
CREATE POLICY "policy_staff_view_clients_final"
ON clients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('administrateur', 'commercial', 'caisse')
  )
);

-- Create policy for clients to view their own profile
CREATE POLICY "policy_client_view_own_final"
ON clients
FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid()
);

-- Create policy for clients to update their own profile
CREATE POLICY "policy_client_update_own_final"
ON clients
FOR UPDATE
TO authenticated
USING (
  auth_user_id = auth.uid()
)
WITH CHECK (
  auth_user_id = auth.uid()
);

-- Create policy for administrators to manage clients
CREATE POLICY "policy_admin_manage_clients_final"
ON clients
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
);

-- Add helpful comments
COMMENT ON SEQUENCE client_id_seq IS 'Sequence for generating unique client IDs';
COMMENT ON FUNCTION generate_client_id IS 'Generates a unique client ID in format CL-XXXX';
COMMENT ON FUNCTION handle_client_registration IS 'Handles client registration process including ID generation and data normalization';
COMMENT ON POLICY "policy_client_registration_final" ON clients IS 'Allows both anonymous and authenticated users to register clients';
COMMENT ON POLICY "policy_staff_view_clients_final" ON clients IS 'Allows staff members to view client information';
COMMENT ON POLICY "policy_client_view_own_final" ON clients IS 'Allows clients to view their own profile';
COMMENT ON POLICY "policy_client_update_own_final" ON clients IS 'Allows clients to update their own profile';
COMMENT ON POLICY "policy_admin_manage_clients_final" ON clients IS 'Allows administrators full access to all clients';