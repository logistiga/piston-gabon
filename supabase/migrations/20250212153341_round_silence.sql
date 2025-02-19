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

-- Create single unified policy for administrators
CREATE POLICY "admin_full_access_policy"
ON user_profiles
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

-- Create policy for users to view their own profile
CREATE POLICY "user_view_own_policy"
ON user_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create policy for users to update their own profile
CREATE POLICY "user_update_own_policy"
ON user_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create policy for new user creation
CREATE POLICY "new_user_insert_policy"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Grant access to the view
GRANT SELECT ON user_profiles_view TO authenticated;

-- Add helpful comments
COMMENT ON VIEW user_profiles_view IS 'View combining user profiles with auth user data';
COMMENT ON POLICY "admin_full_access_policy" ON user_profiles IS 'Gives administrators full access to all profiles';
COMMENT ON POLICY "user_view_own_policy" ON user_profiles IS 'Allows users to view their own profile';
COMMENT ON POLICY "user_update_own_policy" ON user_profiles IS 'Allows users to update their own profile';
COMMENT ON POLICY "new_user_insert_policy" ON user_profiles IS 'Allows creation of new user profiles';