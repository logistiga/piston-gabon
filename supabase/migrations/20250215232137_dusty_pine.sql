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

-- Create policy for viewing clients (all authenticated users)
CREATE POLICY "policy_view_clients_final"
ON clients
FOR SELECT 
TO authenticated
USING (true);

-- Create policy for creating clients (all authenticated users)
CREATE POLICY "policy_create_clients_final"
ON clients
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy for updating clients (staff and owners)
CREATE POLICY "policy_update_clients_final"
ON clients
FOR UPDATE
TO authenticated
USING (
  -- Staff members can update any client
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('administrateur', 'commercial', 'caisse')
  )
)
WITH CHECK (
  -- Staff members can update any client
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('administrateur', 'commercial', 'caisse')
  )
);

-- Create policy for deleting clients (admin only)
CREATE POLICY "policy_delete_clients_final"
ON clients
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
);

-- Add helpful comments
COMMENT ON POLICY "policy_view_clients_final" ON clients IS 'Allows all authenticated users to view clients';
COMMENT ON POLICY "policy_create_clients_final" ON clients IS 'Allows all authenticated users to create clients';
COMMENT ON POLICY "policy_update_clients_final" ON clients IS 'Allows staff members to update any client';
COMMENT ON POLICY "policy_delete_clients_final" ON clients IS 'Allows only administrators to delete clients';