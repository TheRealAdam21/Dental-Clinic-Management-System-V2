
-- Create storage bucket for X-ray images
INSERT INTO storage.buckets (id, name, public)
VALUES ('xrays', 'xrays', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for X-ray images
DROP POLICY IF EXISTS "Authenticated users can upload X-rays" ON storage.objects;
CREATE POLICY "Authenticated users can upload X-rays" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'xrays' AND
  auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated users can view X-rays" ON storage.objects;
CREATE POLICY "Authenticated users can view X-rays" ON storage.objects
FOR SELECT USING (
  bucket_id = 'xrays' AND
  auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated users can delete X-rays" ON storage.objects;
CREATE POLICY "Authenticated users can delete X-rays" ON storage.objects
FOR DELETE USING (
  bucket_id = 'xrays' AND
  auth.role() = 'authenticated'
);

-- Add X-ray images column to visits table
ALTER TABLE visits ADD COLUMN IF NOT EXISTS xray_images TEXT[];
