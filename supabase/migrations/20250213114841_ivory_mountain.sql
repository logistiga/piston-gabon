-- Create storage bucket for company logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to company logos
CREATE POLICY "Give public access to company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Allow authenticated users to upload company logos
CREATE POLICY "Allow authenticated users to upload company logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos' AND
  auth.role() = 'authenticated'
);

-- Allow users to update company logos
CREATE POLICY "Allow users to update company logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company-logos')
WITH CHECK (bucket_id = 'company-logos');

-- Allow users to delete company logos
CREATE POLICY "Allow users to delete company logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company-logos');

-- Add helpful comments
COMMENT ON POLICY "Give public access to company logos" ON storage.objects IS 'Allow anyone to view company logos';
COMMENT ON POLICY "Allow authenticated users to upload company logos" ON storage.objects IS 'Allow authenticated users to upload company logos';
COMMENT ON POLICY "Allow users to update company logos" ON storage.objects IS 'Allow authenticated users to update company logos';
COMMENT ON POLICY "Allow users to delete company logos" ON storage.objects IS 'Allow authenticated users to delete company logos';