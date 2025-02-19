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

-- Create policy for client registration
CREATE POLICY "policy_client_registration"
ON clients
FOR INSERT
WITH CHECK (true);

-- Create policy for viewing clients
CREATE POLICY "policy_client_view"
ON clients
FOR SELECT
TO authenticated
USING (
  -- Client viewing their own profile
  email = auth.jwt() ->> 'email'
  OR
  -- Admin viewing any profile
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
  OR
  -- Staff viewing client info
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('commercial', 'caisse')
  )
);

-- Create policy for updating clients
CREATE POLICY "policy_client_update"
ON clients
FOR UPDATE
TO authenticated
USING (
  -- Client updating their own profile
  email = auth.jwt() ->> 'email'
  OR
  -- Admin updating any profile
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

-- Create policy for deleting clients
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

-- Add helpful comments
COMMENT ON POLICY "policy_client_registration" ON clients IS 'Allows client registration';
COMMENT ON POLICY "policy_client_view" ON clients IS 'Allows clients to view their own profile and staff to view all';
COMMENT ON POLICY "policy_client_update" ON clients IS 'Allows clients to update their own profile and admins to update any';
COMMENT ON POLICY "policy_client_delete" ON clients IS 'Allows only administrators to delete clients';