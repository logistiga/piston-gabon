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

-- Create basic policies
CREATE POLICY "policy_view_own_profile"
ON user_profiles
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "policy_view_all_profiles"
ON user_profiles
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "policy_create_profile"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow users to create their own profile
  user_id = auth.uid() AND
  -- Only if they don't already have one
  NOT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

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

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.user_profiles (
    user_id,
    username,
    role,
    is_active
  )
  VALUES (
    NEW.id,
    split_part(NEW.email, '@', 1),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

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
COMMENT ON FUNCTION handle_new_user IS 'Creates a user profile when a new user is created';
COMMENT ON POLICY "policy_view_own_profile" ON user_profiles IS 'Allows users to view their own profile';
COMMENT ON POLICY "policy_view_all_profiles" ON user_profiles IS 'Allows administrators to view all profiles';
COMMENT ON POLICY "policy_create_profile" ON user_profiles IS 'Allows users to create their own profile if they dont have one';
COMMENT ON POLICY "policy_update_own_profile" ON user_profiles IS 'Allows users to update their own profile';
COMMENT ON POLICY "policy_admin_manage_profiles" ON user_profiles IS 'Allows administrators to manage all profiles';
COMMENT ON VIEW user_profiles_view IS 'View combining user profiles with auth user data';