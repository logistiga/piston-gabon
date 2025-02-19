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

-- Create optimized RLS policies
CREATE POLICY "policy_admin_access_v1"
ON user_profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles up2
    WHERE up2.user_id = auth.uid() 
    AND up2.role = 'administrateur'
    AND up2.id != user_profiles.id -- Prevent recursion
  )
);

CREATE POLICY "policy_user_access_v1"
ON user_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "policy_user_update_v1"
ON user_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "policy_new_user_insert_v1"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow new users to create their first profile
  NOT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
  OR
  -- Or allow admins to create profiles
  EXISTS (
    SELECT 1 
    FROM user_profiles up2
    WHERE up2.user_id = auth.uid() 
    AND up2.role = 'administrateur'
    AND up2.id != user_profiles.id -- Prevent recursion
  )
);

-- Grant access to the view
GRANT SELECT ON user_profiles_view TO authenticated;

-- Add helpful comments
COMMENT ON VIEW user_profiles_view IS 'View combining user profiles with auth user data';
COMMENT ON POLICY "policy_admin_access_v1" ON user_profiles IS 'Allows administrators full access to all profiles except their own';
COMMENT ON POLICY "policy_user_access_v1" ON user_profiles IS 'Allows users to view their own profile';
COMMENT ON POLICY "policy_user_update_v1" ON user_profiles IS 'Allows users to update their own profile';
COMMENT ON POLICY "policy_new_user_insert_v1" ON user_profiles IS 'Allows new users to create their first profile or admins to create profiles';