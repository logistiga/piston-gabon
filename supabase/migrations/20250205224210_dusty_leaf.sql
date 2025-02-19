/*
  # Create Admin User and Profile

  1. Changes
    - Create admin user with required fields
    - Create admin profile
  
  2. Security
    - Set secure password
    - Set admin role
*/

-- Create admin user with all required fields
INSERT INTO auth.users (
  id,
  instance_id,
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
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@piston-gabon.com',
  crypt('Admin@2025', gen_salt('bf')),
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
ON CONFLICT DO NOTHING;

-- Create admin profile
INSERT INTO public.user_profiles (
  user_id,
  first_name,
  last_name,
  username,
  role
)
SELECT 
  id,
  'Admin',
  'System',
  'admin',
  'administrateur'
FROM auth.users
WHERE email = 'admin@piston-gabon.com'
ON CONFLICT DO NOTHING;