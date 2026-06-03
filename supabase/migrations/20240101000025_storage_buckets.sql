INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('cv-uploads', 'cv-uploads', false, 10485760, ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('company-logos', 'company-logos', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('generated-docs', 'generated-docs', false, 20971520, ARRAY['application/pdf']),
  ('exports', 'exports', false, 52428800, ARRAY['text/csv','application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO NOTHING;
