-- Create function to check admin role
CREATE OR REPLACE FUNCTION check_admin_role_v5(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = $1 
    AND role = 'administrateur'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create user profile policies
CREATE POLICY "policy_view_user_profiles_v5"
ON user_profiles
FOR SELECT 
TO authenticated
USING (
  -- User can view their own profile
  user_id = auth.uid()
  OR 
  -- Or user is an admin
  check_admin_role_v5(auth.uid())
);

CREATE POLICY "policy_update_own_profile_v5"
ON user_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "policy_admin_manage_profiles_v5"
ON user_profiles
FOR ALL
TO authenticated
USING (check_admin_role_v5(auth.uid()));

-- Create settings policies
CREATE POLICY "policy_admin_manage_settings_v5"
ON settings
FOR ALL
TO authenticated
USING (check_admin_role_v5(auth.uid()));

CREATE POLICY "policy_read_settings_v5"
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
COMMENT ON FUNCTION check_admin_role_v5 IS 'Function to check if a user has admin role';
COMMENT ON POLICY "policy_view_user_profiles_v5" ON user_profiles IS 'Allows users to view their own profile and admins to view all';
COMMENT ON POLICY "policy_update_own_profile_v5" ON user_profiles IS 'Allows users to update their own profile';
COMMENT ON POLICY "policy_admin_manage_profiles_v5" ON user_profiles IS 'Allows administrators to manage all profiles';
COMMENT ON VIEW user_profiles_view IS 'View combining user profiles with auth user data';