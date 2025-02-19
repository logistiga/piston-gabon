-- Drop existing policies if they exist
DO $$ 
DECLARE
  pol record;
BEGIN
  -- Drop user_profiles policies
  FOR pol IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'user_profiles'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', pol.policyname);
  END LOOP;

  -- Drop settings policies
  FOR pol IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'settings'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON settings', pol.policyname);
  END LOOP;
END $$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS refresh_admin_users_trigger ON user_profiles;
DROP FUNCTION IF EXISTS refresh_admin_users();

-- Create materialized view for admin users if it doesn't exist
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_users AS
SELECT DISTINCT user_id
FROM user_profiles
WHERE role = 'administrateur';

-- Create index for better performance
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_user_id_idx ON admin_users (user_id);

-- Create function to refresh admin users
CREATE OR REPLACE FUNCTION refresh_admin_users()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY admin_users;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for admin users refresh
CREATE TRIGGER refresh_admin_users_trigger
AFTER INSERT OR UPDATE OR DELETE ON user_profiles
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_admin_users();

-- Create user profile policies
CREATE POLICY "policy_view_user_profiles_v8"
ON user_profiles
FOR SELECT 
TO authenticated
USING (
  -- User can view their own profile
  user_id = auth.uid()
  OR 
  -- Or user is an admin
  EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "policy_update_own_profile_v8"
ON user_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "policy_admin_manage_profiles_v8"
ON user_profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Create settings policies
CREATE POLICY "policy_admin_manage_settings_v8"
ON settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "policy_read_settings_v8"
ON settings
FOR SELECT
TO authenticated
USING (true);

-- Create view for user profiles with auth data
CREATE OR REPLACE VIEW user_profiles_view AS
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

-- Grant access to the view
GRANT SELECT ON user_profiles_view TO authenticated;

-- Add helpful comments
COMMENT ON MATERIALIZED VIEW admin_users IS 'Cached list of admin users to prevent policy recursion';
COMMENT ON POLICY "policy_view_user_profiles_v8" ON user_profiles IS 'Allows users to view their own profile and admins to view all';
COMMENT ON POLICY "policy_update_own_profile_v8" ON user_profiles IS 'Allows users to update their own profile';
COMMENT ON POLICY "policy_admin_manage_profiles_v8" ON user_profiles IS 'Allows administrators to manage all profiles';
COMMENT ON VIEW user_profiles_view IS 'View combining user profiles with auth user data';