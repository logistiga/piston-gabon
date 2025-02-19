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
USING (true);

CREATE POLICY "policy_client_update"
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
COMMENT ON POLICY "policy_client_registration" ON clients IS 'Allows client registration for both anonymous and authenticated users';
COMMENT ON POLICY "policy_client_view" ON clients IS 'Allows authenticated users to view clients';
COMMENT ON POLICY "policy_client_update" ON clients IS 'Allows clients to update their own profile or admins to update any';