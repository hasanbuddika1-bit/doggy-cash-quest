
-- Drop all overly permissive INSERT/UPDATE/DELETE/ALL policies and replace with service_role only

-- users table
DROP POLICY IF EXISTS "Service can insert users" ON public.users;
DROP POLICY IF EXISTS "Service can update users" ON public.users;
CREATE POLICY "Service role can insert users" ON public.users FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update users" ON public.users FOR UPDATE TO service_role USING (true);

-- ad_watches table
DROP POLICY IF EXISTS "Users can insert their own ad watches" ON public.ad_watches;
CREATE POLICY "Service role can insert ad watches" ON public.ad_watches FOR INSERT TO service_role WITH CHECK (true);

-- clicks table
DROP POLICY IF EXISTS "Service can insert clicks" ON public.clicks;
CREATE POLICY "Service role can insert clicks" ON public.clicks FOR INSERT TO service_role WITH CHECK (true);

-- reward_claims table
DROP POLICY IF EXISTS "Service can insert claims" ON public.reward_claims;
CREATE POLICY "Service role can insert claims" ON public.reward_claims FOR INSERT TO service_role WITH CHECK (true);

-- task_submissions table
DROP POLICY IF EXISTS "Service can insert submissions" ON public.task_submissions;
DROP POLICY IF EXISTS "Service can update submissions" ON public.task_submissions;
CREATE POLICY "Service role can insert submissions" ON public.task_submissions FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update submissions" ON public.task_submissions FOR UPDATE TO service_role USING (true);

-- withdrawals table
DROP POLICY IF EXISTS "Service can insert withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Service can update withdrawals" ON public.withdrawals;
CREATE POLICY "Service role can insert withdrawals" ON public.withdrawals FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update withdrawals" ON public.withdrawals FOR UPDATE TO service_role USING (true);

-- channels table
DROP POLICY IF EXISTS "Service can manage channels" ON public.channels;
CREATE POLICY "Service role can manage channels" ON public.channels FOR ALL TO service_role USING (true) WITH CHECK (true);

-- channel_verifications table
DROP POLICY IF EXISTS "Service can manage verifications" ON public.channel_verifications;
CREATE POLICY "Service role can manage verifications" ON public.channel_verifications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- app_settings table
DROP POLICY IF EXISTS "Service can manage settings" ON public.app_settings;
CREATE POLICY "Service role can manage settings" ON public.app_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- reward_codes table
DROP POLICY IF EXISTS "Service can manage codes" ON public.reward_codes;
CREATE POLICY "Service role can manage codes" ON public.reward_codes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- referrals table
DROP POLICY IF EXISTS "Service can manage referrals" ON public.referrals;
CREATE POLICY "Service role can manage referrals" ON public.referrals FOR ALL TO service_role USING (true) WITH CHECK (true);
