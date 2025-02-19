-- Drop existing policies
DROP POLICY IF EXISTS "Allow users to read user_profiles" ON user_profiles;

-- Recreate user_profiles table with proper foreign key
CREATE TABLE IF NOT EXISTS user_profiles_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  username text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'user',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Copy data if table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    INSERT INTO user_profiles_new (
      id, user_id, first_name, last_name, username, role, is_active, created_at, updated_at
    )
    SELECT 
      id, user_id, first_name, last_name, username, role, is_active, created_at, updated_at
    FROM user_profiles;
  END IF;
END $$;

-- Drop old table and rename new one
DROP TABLE IF EXISTS user_profiles CASCADE;
ALTER TABLE user_profiles_new RENAME TO user_profiles;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow users to read user_profiles"
ON user_profiles FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Allow users to update their own profile"
ON user_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add helpful comments
COMMENT ON TABLE user_profiles IS 'Stores extended user profile information';
COMMENT ON COLUMN user_profiles.user_id IS 'References auth.users(id)';
COMMENT ON COLUMN user_profiles.is_active IS 'Indicates if the user account is active';