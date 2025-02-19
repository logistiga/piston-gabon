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

-- Create unified CRUD policy for administrators
CREATE POLICY "admin_clients_policy_final"
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

-- Create policy for staff to view and create clients
CREATE POLICY "staff_view_clients_policy_final"
ON clients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('commercial', 'caisse')
  )
);

CREATE POLICY "staff_create_clients_policy_final"
ON clients
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('commercial', 'caisse', 'administrateur')
  )
);

-- Create policy for clients to view and update their own profile
CREATE POLICY "client_view_own_policy_final"
ON clients
FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid()
);

CREATE POLICY "client_update_own_policy_final"
ON clients
FOR UPDATE
TO authenticated
USING (
  auth_user_id = auth.uid()
)
WITH CHECK (
  auth_user_id = auth.uid()
);

-- Create policy for anonymous client registration
CREATE POLICY "anon_client_registration_policy_final"
ON clients
FOR INSERT
TO anon
WITH CHECK (true);

-- Add helpful comments
COMMENT ON POLICY "admin_clients_policy_final" ON clients IS 'Allows administrators full access to all clients';
COMMENT ON POLICY "staff_view_clients_policy_final" ON clients IS 'Allows staff members to view client information';
COMMENT ON POLICY "staff_create_clients_policy_final" ON clients IS 'Allows staff members to create new clients';
COMMENT ON POLICY "client_view_own_policy_final" ON clients IS 'Allows clients to view their own profile';
COMMENT ON POLICY "client_update_own_policy_final" ON clients IS 'Allows clients to update their own profile';
COMMENT ON POLICY "anon_client_registration_policy_final" ON clients IS 'Allows anonymous users to register as clients';