-- Drop existing policies if they exist
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

-- Create single unified policy for administrators
CREATE POLICY "admin_full_access_policy_v3"
ON user_profiles
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
);

-- Create policy for users to view their own profile
CREATE POLICY "user_view_own_policy_v3"
ON user_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create policy for users to update their own profile
CREATE POLICY "user_update_own_policy_v3"
ON user_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create policy for new user creation by admins
CREATE POLICY "admin_insert_policy_v3"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
);

-- Create policy for initial user profile creation
CREATE POLICY "initial_profile_insert_policy_v3"
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
COMMENT ON VIEW user_profiles_view IS 'View combining user profiles with auth user data';
COMMENT ON POLICY "admin_full_access_policy_v3" ON user_profiles IS 'Gives administrators full access to all profiles';
COMMENT ON POLICY "user_view_own_policy_v3" ON user_profiles IS 'Allows users to view their own profile';
COMMENT ON POLICY "user_update_own_policy_v3" ON user_profiles IS 'Allows users to update their own profile';
COMMENT ON POLICY "admin_insert_policy_v3" ON user_profiles IS 'Allows administrators to create new user profiles';
COMMENT ON POLICY "initial_profile_insert_policy_v3" ON user_profiles IS 'Allows users to create their initial profile';