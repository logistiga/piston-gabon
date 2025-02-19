-- Drop existing view if it exists
DROP VIEW IF EXISTS user_profiles_view;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "policy_admin_view_profiles_20250212" ON user_profiles;
DROP POLICY IF EXISTS "policy_user_view_own_profile_20250212" ON user_profiles;
DROP POLICY IF EXISTS "policy_user_update_own_profile_20250212" ON user_profiles;
DROP POLICY IF EXISTS "policy_admin_update_profiles_20250212" ON user_profiles;

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

-- Enable RLS on the base table
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles table
CREATE POLICY "policy_admin_view_profiles_v2"
ON user_profiles
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

CREATE POLICY "policy_user_view_own_profile_v2"
ON user_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "policy_user_update_own_profile_v2"
ON user_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "policy_admin_update_profiles_v2"
ON user_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
);

-- Grant access to the view
GRANT SELECT ON user_profiles_view TO authenticated;

-- Add helpful comments
COMMENT ON VIEW user_profiles_view IS 'View combining user profiles with auth user data';