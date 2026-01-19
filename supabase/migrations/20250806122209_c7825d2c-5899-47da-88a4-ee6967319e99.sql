
-- Create storage bucket for X-ray images
INSERT INTO storage.buckets (id, name, public)
VALUES ('xrays', 'xrays', true);

-- Create storage policies for X-ray images
CREATE POLICY "Authenticated users can upload X-rays" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'xrays' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can view X-rays" ON storage.objects
FOR SELECT USING (
  bucket_id = 'xrays' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete X-rays" ON storage.objects
FOR DELETE USING (
  bucket_id = 'xrays' AND
  auth.role() = 'authenticated'
);

-- Add X-ray images column to visits table
ALTER TABLE visits ADD COLUMN xray_images TEXT[];
