-- Drop existing policies if they exist
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'audit_logs'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON audit_logs', pol.policyname);
  END LOOP;
END $$;

-- Drop existing view if it exists
DROP VIEW IF EXISTS audit_logs_view;

-- Create view for audit logs with user data
CREATE VIEW audit_logs_view AS
SELECT 
  al.id,
  al.operation_date,
  al.user_id,
  al.table_name,
  al.operation_type,
  al.ip_address,
  al.source,
  al.computer_name,
  al.old_data,
  al.new_data,
  al.created_at,
  up.username as user_name,
  au.email as user_email
FROM audit_logs al
LEFT JOIN user_profiles up ON al.user_id = up.user_id
LEFT JOIN auth.users au ON al.user_id = au.id;

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for administrators to view all logs
CREATE POLICY "admin_view_audit_logs_policy"
ON audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
);

-- Grant access to the view
GRANT SELECT ON audit_logs_view TO authenticated;

-- Add helpful comments
COMMENT ON VIEW audit_logs_view IS 'View combining audit logs with user data';
COMMENT ON POLICY "admin_view_audit_logs_policy" ON audit_logs IS 'Allows administrators to view all audit logs';