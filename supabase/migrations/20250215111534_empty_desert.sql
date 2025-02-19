-- Drop existing policies if any
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

-- Create RLS policies for clients table
CREATE POLICY "policy_client_registration"
ON clients
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "policy_client_view"
ON clients
FOR SELECT
TO authenticated
USING (
  -- Allow viewing if:
  -- 1. Client viewing their own profile
  email = auth.jwt() ->> 'email'
  OR
  -- 2. Admin viewing any profile
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
  OR
  -- 3. Staff member viewing client info
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('commercial', 'caisse')
  )
);

CREATE POLICY "policy_client_update"
ON clients
FOR UPDATE
TO authenticated
USING (
  -- Allow updating if:
  -- 1. Client updating their own profile
  email = auth.jwt() ->> 'email'
  OR
  -- 2. Admin updating any profile
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
)
WITH CHECK (
  -- Same conditions for the actual update
  email = auth.jwt() ->> 'email'
  OR
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
);

CREATE POLICY "policy_client_delete"
ON clients
FOR DELETE
TO authenticated
USING (
  -- Only admins can delete clients
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_nom ON clients(nom);
CREATE INDEX IF NOT EXISTS idx_clients_entreprise ON clients(entreprise);

-- Add helpful comments
COMMENT ON POLICY "policy_client_registration" ON clients IS 'Allows client registration for both anonymous and authenticated users';
COMMENT ON POLICY "policy_client_view" ON clients IS 'Allows clients to view their own profile and staff to view all';
COMMENT ON POLICY "policy_client_update" ON clients IS 'Allows clients to update their own profile and admins to update any';
COMMENT ON POLICY "policy_client_delete" ON clients IS 'Allows only administrators to delete clients';