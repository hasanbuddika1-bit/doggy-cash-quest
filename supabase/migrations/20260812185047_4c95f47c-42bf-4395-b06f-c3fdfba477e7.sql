-- Drop unused feature tables
DROP TABLE IF EXISTS public.game_plays CASCADE;
DROP TABLE IF EXISTS public.short_link_claims CASCADE;
DROP TABLE IF EXISTS public.short_links CASCADE;
DROP TABLE IF EXISTS public.weekly_challenge_claims CASCADE;

-- Full data reset for V2
TRUNCATE TABLE
  public.reward_claims,
  public.reward_history,
  public.task_submissions,
  public.task_completions,
  public.channel_verifications,
  public.ad_watches,
  public.clicks,
  public.withdrawals,
  public.referrals,
  public.user_roles,
  public.users
CASCADE;

-- Mining sessions
CREATE TABLE public.mining_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  amount numeric NOT NULL DEFAULT 100,
  claimed boolean NOT NULL DEFAULT false,
  claimed_at timestamptz,
  notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mining_sessions TO anon, authenticated;
GRANT ALL ON public.mining_sessions TO service_role;

ALTER TABLE public.mining_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mining sessions"
  ON public.mining_sessions FOR SELECT USING (true);
CREATE POLICY "Service role manages mining sessions"
  ON public.mining_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_mining_sessions_user ON public.mining_sessions(user_id, claimed);

CREATE TRIGGER update_mining_sessions_updated_at
  BEFORE UPDATE ON public.mining_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();