ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS suspension_reason text,
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone;

DROP POLICY IF EXISTS "Service can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Service role can manage tasks" ON public.tasks;
CREATE POLICY "Service role can manage tasks"
ON public.tasks
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ad_watches_user_ad_created ON public.ad_watches(user_id, ad_index, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_task_status ON public.task_submissions(user_id, task_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_referee ON public.referrals(referrer_id, referee_id);