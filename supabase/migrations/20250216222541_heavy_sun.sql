-- Drop existing trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, username, role)
  VALUES (NEW.id, split_part(NEW.email, '@', 1), 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if admin user exists
DO $$ 
DECLARE
  admin_exists boolean;
  admin_id uuid;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@piston-gabon.com'
  ) INTO admin_exists;

  -- Only create admin if they don't exist
  IF NOT admin_exists THEN
    -- Create admin user with proper UUID
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
      recovery_token,
      is_super_admin,
      confirmed_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'admin@piston-gabon.com',
      crypt('Admin@2025', gen_salt('bf')),
      now(),
      jsonb_build_object(
        'provider', 'email',
        'providers', array['email']
      ),
      jsonb_build_object(
        'role', 'administrateur',
        'first_name', 'Admin',
        'last_name', 'System'
      ),
      now(),
      now(),
      'service_role',
      'authenticated',
      '',
      '',
      '',
      '',
      true,
      now()
    )
    RETURNING id INTO admin_id;

    -- Create admin profile
    INSERT INTO public.user_profiles (
      user_id,
      first_name,
      last_name,
      username,
      role,
      is_active
    )
    VALUES (
      admin_id,
      'Admin',
      'System',
      'admin',
      'administrateur',
      true
    );

    -- Refresh admin users materialized view
    REFRESH MATERIALIZED VIEW admin_users;
  END IF;
END $$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();