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

-- Create policy for staff to view and manage clients
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

-- Create policy for clients to view their own profile
CREATE POLICY "policy_client_view_own"
ON clients
FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid()
);

-- Create policy for clients to update their own profile
CREATE POLICY "policy_client_update_own"
ON clients
FOR UPDATE
TO authenticated
USING (
  auth_user_id = auth.uid()
);

-- Create policy for client registration
CREATE POLICY "policy_client_create"
ON clients
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add helpful comments
COMMENT ON POLICY "policy_staff_manage_clients" ON clients IS 'Allows staff members to manage client information';
COMMENT ON POLICY "policy_client_view_own" ON clients IS 'Allows clients to view their own profile';
COMMENT ON POLICY "policy_client_update_own" ON clients IS 'Allows clients to update their own profile';
COMMENT ON POLICY "policy_client_create" ON clients IS 'Allows client registration';