-- Add withdraw unlock flag for admin to fill requirements per user
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS withdraw_unlocked boolean NOT NULL DEFAULT false;

-- Weekly challenge claims (resets every Sunday 00:00 UTC)
CREATE TABLE IF NOT EXISTS public.weekly_challenge_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_key text NOT NULL,
  week_start timestamp with time zone NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_key, week_start)
);

ALTER TABLE public.weekly_challenge_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view weekly claims"
  ON public.weekly_challenge_claims FOR SELECT USING (true);

CREATE POLICY "Service role can manage weekly claims"
  ON public.weekly_challenge_claims FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_weekly_claims_user_week
  ON public.weekly_challenge_claims(user_id, week_start);
