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

-- Create policy for users to view their own profile
CREATE POLICY "user_view_own_policy_v5"
ON user_profiles
FOR SELECT
USING (user_id = auth.uid());

-- Create policy for users to update their own profile
CREATE POLICY "user_update_own_policy_v5"
ON user_profiles
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create policy for new user creation
CREATE POLICY "new_user_insert_policy_v5"
ON user_profiles
FOR INSERT
WITH CHECK (true);

-- Create policy for administrators to view all profiles
CREATE POLICY "admin_view_all_policy_v5"
ON user_profiles
FOR SELECT
USING (
  (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'administrateur'
);

-- Create policy for administrators to update all profiles
CREATE POLICY "admin_update_all_policy_v5"
ON user_profiles
FOR UPDATE
USING (
  (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'administrateur'
)
WITH CHECK (
  (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'administrateur'
);

-- Grant access to the view
GRANT SELECT ON user_profiles_view TO authenticated;

-- Add helpful comments
COMMENT ON VIEW user_profiles_view IS 'View combining user profiles with auth user data';
COMMENT ON POLICY "user_view_own_policy_v5" ON user_profiles IS 'Allows users to view their own profile';
COMMENT ON POLICY "user_update_own_policy_v5" ON user_profiles IS 'Allows users to update their own profile';
COMMENT ON POLICY "new_user_insert_policy_v5" ON user_profiles IS 'Allows creation of new user profiles';
COMMENT ON POLICY "admin_view_all_policy_v5" ON user_profiles IS 'Allows administrators to view all profiles';
COMMENT ON POLICY "admin_update_all_policy_v5" ON user_profiles IS 'Allows administrators to update all profiles';