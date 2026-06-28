
-- Add X-ray images column to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS xray_images TEXT[];
