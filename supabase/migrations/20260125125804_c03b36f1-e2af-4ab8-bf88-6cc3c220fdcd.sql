-- Create storage bucket for event images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Allow anyone to view images (public bucket)
CREATE POLICY "Public can view event images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'event-images');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload event images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'event-images' 
  AND auth.role() = 'authenticated'
);

-- Allow admins to delete images
CREATE POLICY "Admins can delete event images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'event-images'
  AND public.has_role(auth.uid(), 'admin')
);