DROP POLICY IF EXISTS "Anyone can view reward history" ON public.reward_history;
DROP POLICY IF EXISTS "Service role can manage reward history" ON public.reward_history;
DROP POLICY IF EXISTS "Anyone can view short link claims" ON public.short_link_claims;
DROP POLICY IF EXISTS "Service role can manage short link claims" ON public.short_link_claims;
DROP POLICY IF EXISTS "Service role can manage short links" ON public.short_links;

REVOKE SELECT ON public.reward_history FROM anon, authenticated;
REVOKE SELECT ON public.short_link_claims FROM anon, authenticated;

CREATE POLICY "Direct reward history access is blocked" ON public.reward_history FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "Direct short link claims access is blocked" ON public.short_link_claims FOR SELECT TO anon, authenticated USING (false);