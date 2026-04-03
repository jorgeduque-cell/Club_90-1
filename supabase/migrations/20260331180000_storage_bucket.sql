-- ============================================
-- CLUB 90 — Storage Bucket for Team Assets
-- ============================================
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================

-- Create public bucket for team logos and player photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-assets',
  'team-assets',
  true,
  5242880, -- 5MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Team assets: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'team-assets');

-- Allow service role (Edge Functions) to upload
CREATE POLICY "Team assets: service upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'team-assets');

-- Allow service role to update (upsert)
CREATE POLICY "Team assets: service update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'team-assets');

SELECT '✅ Storage bucket team-assets created!' AS status;
