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
END $$;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = user_uid 
    AND role = 'administrateur'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle missing profiles
CREATE OR REPLACE FUNCTION get_or_create_profile(user_uid uuid)
RETURNS uuid AS $$
DECLARE
  profile_id uuid;
BEGIN
  -- Try to get existing profile
  SELECT id INTO profile_id
  FROM user_profiles
  WHERE user_id = user_uid;
  
  -- Create profile if it doesn't exist
  IF profile_id IS NULL THEN
    INSERT INTO user_profiles (
      user_id,
      username,
      role,
      is_active
    )
    SELECT 
      user_uid,
      split_part(email, '@', 1),
      COALESCE(raw_user_meta_data->>'role', 'user'),
      true
    FROM auth.users
    WHERE id = user_uid
    RETURNING id INTO profile_id;
  END IF;
  
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create basic policies without recursion
CREATE POLICY "policy_view_own_profile"
ON user_profiles
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() OR
  (
    SELECT get_or_create_profile(auth.uid()) IS NOT NULL
  )
);

CREATE POLICY "policy_view_all_profiles"
ON user_profiles
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "policy_update_own_profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "policy_admin_manage_profiles"
ON user_profiles
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- Create view for user profiles with auth data
CREATE OR REPLACE VIEW user_profiles_view AS
SELECT 
  up.id,
  up.user_id,
  up.user_number,
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
COMMENT ON FUNCTION is_admin IS 'Checks if a user has admin role';
COMMENT ON FUNCTION get_or_create_profile IS 'Gets or creates a user profile if it does not exist';
COMMENT ON POLICY "policy_view_own_profile" ON user_profiles IS 'Allows users to view their own profile';
COMMENT ON POLICY "policy_view_all_profiles" ON user_profiles IS 'Allows administrators to view all profiles';
COMMENT ON POLICY "policy_update_own_profile" ON user_profiles IS 'Allows users to update their own profile';
COMMENT ON POLICY "policy_admin_manage_profiles" ON user_profiles IS 'Allows administrators to manage all profiles';
COMMENT ON VIEW user_profiles_view IS 'View combining user profiles with auth user data';