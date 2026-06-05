CREATE TABLE IF NOT EXISTS public.reward_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  title text NOT NULL,
  description text,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reward_history TO anon, authenticated;
GRANT ALL ON public.reward_history TO service_role;
ALTER TABLE public.reward_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reward history" ON public.reward_history FOR SELECT USING (true);
CREATE POLICY "Service role can manage reward history" ON public.reward_history FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.short_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  short_url text NOT NULL,
  reward_amount numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  daily_cooldown_hours integer NOT NULL DEFAULT 24,
  max_claims_per_user integer NOT NULL DEFAULT 1,
  reward_token text NOT NULL DEFAULT encode(gen_random_bytes(18), 'hex'),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.short_links TO anon, authenticated;
GRANT ALL ON public.short_links TO service_role;
ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active short links" ON public.short_links FOR SELECT USING (active = true);
CREATE POLICY "Service role can manage short links" ON public.short_links FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.short_link_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  short_link_id uuid NOT NULL REFERENCES public.short_links(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  reward_token text NOT NULL,
  status text NOT NULL DEFAULT 'started',
  started_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  next_available_at timestamptz,
  UNIQUE (user_id, short_link_id, reward_token)
);
GRANT SELECT ON public.short_link_claims TO anon, authenticated;
GRANT ALL ON public.short_link_claims TO service_role;
ALTER TABLE public.short_link_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view short link claims" ON public.short_link_claims FOR SELECT USING (true);
CREATE POLICY "Service role can manage short link claims" ON public.short_link_claims FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_reward_history_user_created ON public.reward_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_short_links_active_order ON public.short_links(active, sort_order, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_short_link_claims_user_link ON public.short_link_claims(user_id, short_link_id, claimed_at DESC);

CREATE TRIGGER update_short_links_updated_at
BEFORE UPDATE ON public.short_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();