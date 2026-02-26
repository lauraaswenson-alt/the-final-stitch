-- Create private storage bucket for canvas photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('canvas-photos', 'canvas-photos', false);

-- Users can upload to their own folder: canvas-photos/{user_id}/...
CREATE POLICY "Users can upload own photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'canvas-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'canvas-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'canvas-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
