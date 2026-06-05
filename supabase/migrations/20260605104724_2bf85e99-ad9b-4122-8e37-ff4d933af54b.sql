DROP POLICY IF EXISTS "Anyone can view active short links" ON public.short_links;
REVOKE SELECT ON public.short_links FROM anon, authenticated;
CREATE POLICY "Direct short link access is blocked" ON public.short_links FOR SELECT TO anon, authenticated USING (false);