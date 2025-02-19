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
JOIN auth.users au ON up.user_id = au.id
WHERE (
  -- User can see their own profile
  up.user_id = auth.uid() 
  OR 
  -- Or user has admin role
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
);

-- Grant access to the view
GRANT SELECT ON user_profiles_view TO authenticated;

-- Create function to check user access
CREATE OR REPLACE FUNCTION public.check_user_profile_access(profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE id = profile_id
    AND (
      user_id = auth.uid()
      OR 
      EXISTS (
        SELECT 1 
        FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role = 'administrateur'
      )
    )
  );
END;
$$;

-- Revoke all on the function
REVOKE ALL ON FUNCTION public.check_user_profile_access(uuid) FROM PUBLIC;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_user_profile_access(uuid) TO authenticated;

-- Add helpful comments
COMMENT ON VIEW user_profiles_view IS 'View combining user profiles with auth user data';
COMMENT ON FUNCTION check_user_profile_access IS 'Security definer function to check user profile access permissions';