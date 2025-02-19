-- Create storage bucket for company logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname LIKE '%company-logos%'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Allow public access to company logos
CREATE POLICY "policy_public_select_company_logos_v3"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Allow admins to insert company logos
CREATE POLICY "policy_admin_insert_company_logos_v3"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos' AND
  EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Allow admins to update company logos
CREATE POLICY "policy_admin_update_company_logos_v3"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos' AND
  EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'company-logos' AND
  EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Allow admins to delete company logos
CREATE POLICY "policy_admin_delete_company_logos_v3"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos' AND
  EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Add helpful comments
COMMENT ON POLICY "policy_public_select_company_logos_v3" ON storage.objects IS 'Allow anyone to view company logos';
COMMENT ON POLICY "policy_admin_insert_company_logos_v3" ON storage.objects IS 'Allow administrators to upload company logos';
COMMENT ON POLICY "policy_admin_update_company_logos_v3" ON storage.objects IS 'Allow administrators to update company logos';
COMMENT ON POLICY "policy_admin_delete_company_logos_v3" ON storage.objects IS 'Allow administrators to delete company logos';