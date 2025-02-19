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
USING (true);

-- Create policy for staff to manage clients
CREATE POLICY "policy_staff_manage_clients"
ON clients
FOR INSERT
TO authenticated
WITH CHECK (true);

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
    AND role = 'administrateur'
  )
);

-- Add helpful comments
COMMENT ON POLICY "policy_staff_view_clients" ON clients IS 'Allows all authenticated users to view clients';
COMMENT ON POLICY "policy_staff_manage_clients" ON clients IS 'Allows all authenticated users to create clients';
COMMENT ON POLICY "policy_staff_update_clients" ON clients IS 'Allows staff members to update clients';
COMMENT ON POLICY "policy_staff_delete_clients" ON clients IS 'Allows only administrators to delete clients';