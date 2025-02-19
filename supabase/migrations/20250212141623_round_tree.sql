-- Add is_active column to user_profiles if it doesn't exist
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add index for is_active column
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active 
ON user_profiles(is_active);

-- Add helpful comment
COMMENT ON COLUMN user_profiles.is_active IS 'Indicates if the user account is active';