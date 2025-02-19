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

-- Create RLS policies for clients table
CREATE POLICY "policy_client_registration_anon"
ON clients
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "policy_client_registration_auth"
ON clients
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "policy_client_view_own"
ON clients
FOR SELECT
TO authenticated
USING (
  email = auth.jwt() ->> 'email' OR
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
);

CREATE POLICY "policy_client_update_own"
ON clients
FOR UPDATE
TO authenticated
USING (
  email = auth.jwt() ->> 'email' OR
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
)
WITH CHECK (
  email = auth.jwt() ->> 'email' OR
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
);

-- Add helpful comments
COMMENT ON POLICY "policy_client_registration_anon" ON clients IS 'Allows anonymous users to register new clients';
COMMENT ON POLICY "policy_client_registration_auth" ON clients IS 'Allows authenticated users to create clients';
COMMENT ON POLICY "policy_client_view_own" ON clients IS 'Allows clients to view their own profile or admins to view all';
COMMENT ON POLICY "policy_client_update_own" ON clients IS 'Allows clients to update their own profile or admins to update any';