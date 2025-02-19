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

-- Create unified CRUD policy for administrators
CREATE POLICY "admin_clients_policy"
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

-- Create policy for staff to view clients
CREATE POLICY "staff_view_clients_policy"
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

-- Create policy for clients to view and update their own profile
CREATE POLICY "client_manage_own_policy"
ON clients
FOR SELECT
TO authenticated
USING (
  email = auth.jwt() ->> 'email'
);

CREATE POLICY "client_update_own_policy"
ON clients
FOR UPDATE
TO authenticated
USING (
  email = auth.jwt() ->> 'email'
)
WITH CHECK (
  email = auth.jwt() ->> 'email'
);

-- Create policy for client registration
CREATE POLICY "client_registration_policy"
ON clients
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_nom ON clients(nom);
CREATE INDEX IF NOT EXISTS idx_clients_entreprise ON clients(entreprise);

-- Add helpful comments
COMMENT ON POLICY "admin_clients_policy" ON clients IS 'Allows administrators full access to all clients';
COMMENT ON POLICY "staff_view_clients_policy" ON clients IS 'Allows staff members to view client information';
COMMENT ON POLICY "client_manage_own_policy" ON clients IS 'Allows clients to view their own profile';
COMMENT ON POLICY "client_update_own_policy" ON clients IS 'Allows clients to update their own profile';
COMMENT ON POLICY "client_registration_policy" ON clients IS 'Allows new client registration';