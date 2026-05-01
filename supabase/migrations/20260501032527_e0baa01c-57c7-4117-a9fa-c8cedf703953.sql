REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated;

DROP POLICY IF EXISTS "Anyone can view task images" ON storage.objects;
CREATE POLICY "Anyone can view task image files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'task-images' AND name IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can upload task images" ON storage.objects;
CREATE POLICY "Anyone can upload task image files"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'task-images' AND name IS NOT NULL);