
-- Create storage bucket for nut images
INSERT INTO storage.buckets (id, name, public) VALUES ('nut-images', 'nut-images', true);

-- Allow anyone to view nut images
CREATE POLICY "Nut images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'nut-images');

-- Allow authenticated users (admins) to upload nut images
CREATE POLICY "Authenticated users can upload nut images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'nut-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to update nut images
CREATE POLICY "Authenticated users can update nut images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'nut-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete nut images
CREATE POLICY "Authenticated users can delete nut images"
ON storage.objects FOR DELETE
USING (bucket_id = 'nut-images' AND auth.role() = 'authenticated');
