-- Enable auth.users access for authenticated users
CREATE POLICY "Allow users to read auth.users"
ON auth.users FOR SELECT
TO authenticated
USING (true);

-- Add RLS policy for user_profiles
CREATE POLICY "Allow users to read user_profiles"
ON user_profiles FOR SELECT 
TO authenticated
USING (true);

-- Add is_active column to user_profiles if it doesn't exist
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add index for is_active column
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active 
ON user_profiles(is_active);

-- Add helpful comment
COMMENT ON COLUMN user_profiles.is_active IS 'Indicates if the user account is active';