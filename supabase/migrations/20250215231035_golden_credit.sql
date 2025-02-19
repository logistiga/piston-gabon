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

-- Create policy for staff to view clients
CREATE POLICY "policy_staff_view_clients"
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

-- Create separate policies for staff to insert, update, and delete clients
CREATE POLICY "policy_staff_insert_clients"
ON clients
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('administrateur', 'commercial', 'caisse')
  )
);

CREATE POLICY "policy_staff_update_clients"
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

CREATE POLICY "policy_staff_delete_clients"
ON clients
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('administrateur', 'commercial', 'caisse')
  )
);

-- Create policy for client registration
CREATE POLICY "policy_client_create"
ON clients
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Create policy for clients to view their own profile
CREATE POLICY "policy_client_view_own"
ON clients
FOR SELECT
TO authenticated
USING (
  email = auth.jwt() ->> 'email'
);

-- Create policy for clients to update their own profile
CREATE POLICY "policy_client_update_own"
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
COMMENT ON POLICY "policy_staff_view_clients" ON clients IS 'Allows staff members to view client information';
COMMENT ON POLICY "policy_staff_insert_clients" ON clients IS 'Allows staff members to create new clients';
COMMENT ON POLICY "policy_staff_update_clients" ON clients IS 'Allows staff members to update clients';
COMMENT ON POLICY "policy_staff_delete_clients" ON clients IS 'Allows staff members to delete clients';
COMMENT ON POLICY "policy_client_create" ON clients IS 'Allows client registration for both anonymous and authenticated users';
COMMENT ON POLICY "policy_client_view_own" ON clients IS 'Allows clients to view their own profile';
COMMENT ON POLICY "policy_client_update_own" ON clients IS 'Allows clients to update their own profile';