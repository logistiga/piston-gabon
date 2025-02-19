-- Drop ALL existing policies
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'user_profiles'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', pol.policyname);
  END LOOP;
END $$;

-- Drop existing view if it exists
DROP VIEW IF EXISTS user_profiles_view;

-- Create view for user profiles with auth data
CREATE VIEW user_profiles_view AS
SELECT 
  up.id,
  up.user_id,
  up.first_name,
  up.last_name,
  up.username,
  up.role,
  up.is_active,
  up.created_at,
  up.updated_at,
  au.email,
  au.confirmed_at,
  au.last_sign_in_at
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create materialized admin check to prevent recursion
CREATE MATERIALIZED VIEW admin_users AS
SELECT DISTINCT user_id
FROM user_profiles
WHERE role = 'administrateur';

-- Create index for better performance
CREATE UNIQUE INDEX admin_users_user_id_idx ON admin_users (user_id);

-- Create function to refresh admin users
CREATE OR REPLACE FUNCTION refresh_admin_users()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY admin_users;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh admin users
CREATE TRIGGER refresh_admin_users_trigger
AFTER INSERT OR UPDATE OR DELETE ON user_profiles
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_admin_users();

-- Create optimized RLS policies
CREATE POLICY "policy_admin_view_all_v2"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "policy_user_view_own_v2"
ON user_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "policy_admin_update_all_v2"
ON user_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "policy_user_update_own_v2"
ON user_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "policy_admin_insert_v2"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "policy_new_user_insert_v2"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Grant access to the view
GRANT SELECT ON user_profiles_view TO authenticated;

-- Add helpful comments
COMMENT ON MATERIALIZED VIEW admin_users IS 'Cached list of admin users to prevent policy recursion';
COMMENT ON VIEW user_profiles_view IS 'View combining user profiles with auth user data';
COMMENT ON POLICY "policy_admin_view_all_v2" ON user_profiles IS 'Allows administrators to view all profiles';
COMMENT ON POLICY "policy_user_view_own_v2" ON user_profiles IS 'Allows users to view their own profile';
COMMENT ON POLICY "policy_admin_update_all_v2" ON user_profiles IS 'Allows administrators to update all profiles';
COMMENT ON POLICY "policy_user_update_own_v2" ON user_profiles IS 'Allows users to update their own profile';
COMMENT ON POLICY "policy_admin_insert_v2" ON user_profiles IS 'Allows administrators to create new profiles';
COMMENT ON POLICY "policy_new_user_insert_v2" ON user_profiles IS 'Allows new users to create their first profile';