
-- Add task categorization for Main/Partner/Other tabs and bot-based verification
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'main',
  ADD COLUMN IF NOT EXISTS verify_method text NOT NULL DEFAULT 'telegram_channel',
  ADD COLUMN IF NOT EXISTS telegram_bot_username text,
  ADD COLUMN IF NOT EXISTS gives_reward boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Track per-user completion of telegram-verified tasks (auto-verified, no admin step)
CREATE TABLE IF NOT EXISTS public.task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id uuid NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_id)
);

GRANT SELECT ON public.task_completions TO anon;
GRANT SELECT, INSERT ON public.task_completions TO authenticated;
GRANT ALL ON public.task_completions TO service_role;

ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view completions"
  ON public.task_completions FOR SELECT USING (true);

CREATE POLICY "Service role manages completions"
  ON public.task_completions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Multi-stage referral status
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS main_reward_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_reward_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

-- Multi-network ad watching (24h cooldown per slot per network)
ALTER TABLE public.ad_watches
  ADD COLUMN IF NOT EXISTS network text NOT NULL DEFAULT 'adsgram';

-- User notification preference (set true when "Start Mini Bot" task is done)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aptos_address text;
