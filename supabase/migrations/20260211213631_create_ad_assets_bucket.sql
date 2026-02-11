-- Create the ad-assets bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-assets', 'ad-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to the bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'ad-assets' );

-- Allow public inserts to the bucket
CREATE POLICY "Public Insert"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'ad-assets' );

-- Allow generic public access to all buckets for select (often needed for public URL generation)
-- CREATE POLICY "Give public access to all for select" ON storage.objects FOR SELECT USING (true);
