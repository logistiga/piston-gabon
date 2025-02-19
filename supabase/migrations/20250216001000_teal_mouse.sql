-- Drop existing policies
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

-- Create policy for viewing clients (all authenticated users)
CREATE POLICY "policy_view_clients"
ON clients
FOR SELECT 
TO authenticated
USING (true);

-- Create policy for creating clients (all authenticated users)
CREATE POLICY "policy_create_clients"
ON clients
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy for updating clients (staff only)
CREATE POLICY "policy_update_clients"
ON clients
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('administrateur', 'commercial', 'caisse')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('administrateur', 'commercial', 'caisse')
  )
);

-- Create policy for deleting clients (admin only)
CREATE POLICY "policy_delete_clients"
ON clients
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
);

-- Create function to handle client data validation
CREATE OR REPLACE FUNCTION validate_client_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate required fields
  IF NEW.nom IS NULL OR trim(NEW.nom) = '' THEN
    RAISE EXCEPTION 'Le nom est requis';
  END IF;

  -- Normalize email
  IF NEW.email IS NOT NULL THEN
    NEW.email := lower(trim(NEW.email));
  END IF;

  -- Normalize phone
  IF NEW.telephone IS NOT NULL THEN
    NEW.telephone := regexp_replace(NEW.telephone, '[^0-9+]', '', 'g');
    IF NEW.telephone ~ '^0' THEN
      NEW.telephone := '+241' || substring(NEW.telephone from 2);
    END IF;
  END IF;

  -- Normalize NIF
  IF NEW.nif IS NOT NULL THEN
    NEW.nif := upper(regexp_replace(NEW.nif, '\s+', '', 'g'));
  END IF;

  -- Validate credit limit
  IF NEW.limite_credit < 0 THEN
    RAISE EXCEPTION 'La limite de crédit ne peut pas être négative';
  END IF;

  -- Generate client_id if not provided
  IF NEW.client_id IS NULL THEN
    NEW.client_id := 'CL-' || LPAD(CAST(nextval('client_id_seq') AS text), 4, '0');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for data validation
DROP TRIGGER IF EXISTS validate_client_data_trigger ON clients;
CREATE TRIGGER validate_client_data_trigger
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION validate_client_data();

-- Add helpful comments
COMMENT ON POLICY "policy_view_clients" ON clients IS 'Allows all authenticated users to view clients';
COMMENT ON POLICY "policy_create_clients" ON clients IS 'Allows all authenticated users to create clients';
COMMENT ON POLICY "policy_update_clients" ON clients IS 'Allows staff members to update clients';
COMMENT ON POLICY "policy_delete_clients" ON clients IS 'Allows only administrators to delete clients';
COMMENT ON FUNCTION validate_client_data IS 'Validates and normalizes client data before save';