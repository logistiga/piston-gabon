-- Enable RLS on clients table
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "Clients can view their own profile"
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

CREATE POLICY "Clients can update their own profile"
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

CREATE POLICY "Allow client registration"
ON clients
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add helpful comments
COMMENT ON POLICY "Clients can view their own profile" ON clients IS 'Allows clients to view their own profile or admins to view all';
COMMENT ON POLICY "Clients can update their own profile" ON clients IS 'Allows clients to update their own profile or admins to update any';
COMMENT ON POLICY "Allow client registration" ON clients IS 'Allows new client registration';