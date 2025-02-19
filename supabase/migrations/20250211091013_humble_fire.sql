-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-images', 'article-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to article images
CREATE POLICY "Give public access to article images"
ON storage.objects FOR SELECT
USING (bucket_id = 'article-images');

-- Allow authenticated users to upload article images
CREATE POLICY "Allow authenticated users to upload article images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'article-images' AND
  auth.role() = 'authenticated'
);

-- Allow users to update their own article images
CREATE POLICY "Allow users to update their own article images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'article-images')
WITH CHECK (bucket_id = 'article-images');

-- Allow users to delete their own article images
CREATE POLICY "Allow users to delete their own article images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'article-images');