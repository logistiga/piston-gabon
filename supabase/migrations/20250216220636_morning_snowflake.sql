-- Drop existing trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;

-- Drop existing admin user if exists
DO $$ 
BEGIN
  -- Delete user profile first
  DELETE FROM user_profiles 
  WHERE username LIKE 'omar_admin%';

  -- Delete auth user
  DELETE FROM auth.users 
  WHERE email = 'omar@piston-gabon.com';
END $$;

-- Create admin user with proper UUID
WITH new_auth_user AS (
  INSERT INTO auth.users (
    instance_id,
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    aud,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'omar@piston-gabon.com',
    crypt('Open4meplz', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"administrateur"}'::jsonb,
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    ''
  )
  RETURNING id
)
-- Create admin profile with unique username
INSERT INTO public.user_profiles (
  user_id,
  first_name,
  last_name,
  username,
  role,
  is_active
)
SELECT 
  id,
  'Omar',
  'Admin',
  'omar_admin_' || substring(id::text, 1, 8),
  'administrateur',
  true
FROM new_auth_user;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, username, role)
  VALUES (NEW.id, split_part(NEW.email, '@', 1), 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();