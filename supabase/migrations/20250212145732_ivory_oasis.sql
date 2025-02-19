-- Create view for user profiles with auth data
CREATE OR REPLACE VIEW user_profiles_view AS
SELECT 
  up.*,
  u.email,
  u.confirmed_at,
  u.last_sign_in_at,
  u.raw_app_meta_data,
  u.raw_user_meta_data
FROM user_profiles up
JOIN auth.users u ON up.user_id = u.id;

-- Grant access to the view
GRANT SELECT ON user_profiles_view TO authenticated;

-- Add helpful comment
COMMENT ON VIEW user_profiles_view IS 'View combining user profiles with auth user data';