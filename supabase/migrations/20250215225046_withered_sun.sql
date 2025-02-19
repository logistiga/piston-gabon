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

-- Create policy for client registration (both anonymous and authenticated)
CREATE POLICY "policy_client_registration_final"
ON clients
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Create policy for staff to view and manage clients
CREATE POLICY "policy_staff_manage_clients_final"
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

-- Create policy for clients to view their own profile
CREATE POLICY "policy_client_view_own_final"
ON clients
FOR SELECT
TO authenticated
USING (
  email = auth.jwt() ->> 'email'
);

-- Create policy for clients to update their own profile
CREATE POLICY "policy_client_update_own_final"
ON clients
FOR UPDATE
TO authenticated
USING (
  email = auth.jwt() ->> 'email'
)
WITH CHECK (
  email = auth.jwt() ->> 'email'
);

-- Add helpful comments
COMMENT ON POLICY "policy_client_registration_final" ON clients IS 'Allows both anonymous and authenticated users to register clients';
COMMENT ON POLICY "policy_staff_manage_clients_final" ON clients IS 'Allows staff members to manage client information';
COMMENT ON POLICY "policy_client_view_own_final" ON clients IS 'Allows clients to view their own profile';
COMMENT ON POLICY "policy_client_update_own_final" ON clients IS 'Allows clients to update their own profile';