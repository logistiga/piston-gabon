-- Drop existing view if it exists
DROP VIEW IF EXISTS user_profiles_view;

-- Add user_number column to user_profiles if it doesn't exist
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS user_number text UNIQUE;

-- Create sequence for user numbers if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS user_number_seq START 1;

-- Create function to generate user number
CREATE OR REPLACE FUNCTION generate_user_number()
RETURNS text AS $$
DECLARE
  new_number text;
  counter integer;
BEGIN
  -- Get next value from sequence
  SELECT nextval('user_number_seq') INTO counter;
  
  -- Generate new number (U-XXXX)
  new_number := 'U-' || LPAD(counter::text, 4, '0');
  
  -- If number already exists, try next value
  WHILE EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_number = new_number
  ) LOOP
    counter := counter + 1;
    new_number := 'U-' || LPAD(counter::text, 4, '0');
  END LOOP;
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate user number
CREATE OR REPLACE FUNCTION set_user_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_number IS NULL THEN
    NEW.user_number := generate_user_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER set_user_number_trigger
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_user_number();

-- Update existing users with numbers
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM user_profiles WHERE user_number IS NULL
  LOOP
    UPDATE user_profiles 
    SET user_number = generate_user_number() 
    WHERE id = user_record.id;
  END LOOP;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_number ON user_profiles(user_number);

-- Recreate view for user profiles with auth data
CREATE VIEW user_profiles_view AS
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

-- Add helpful comments
COMMENT ON COLUMN user_profiles.user_number IS 'Unique user identifier in format U-XXXX';
COMMENT ON FUNCTION generate_user_number IS 'Generates a unique user number in format U-XXXX';
COMMENT ON FUNCTION set_user_number IS 'Sets user number on new user creation';