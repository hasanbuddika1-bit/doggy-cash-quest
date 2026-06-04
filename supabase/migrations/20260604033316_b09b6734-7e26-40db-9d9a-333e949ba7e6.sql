CREATE TABLE public.game_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game text NOT NULL,
  bet numeric NOT NULL,
  payout numeric NOT NULL DEFAULT 0,
  won boolean NOT NULL DEFAULT false,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.game_plays TO anon, authenticated;
GRANT ALL ON public.game_plays TO service_role;
ALTER TABLE public.game_plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view game plays" ON public.game_plays FOR SELECT USING (true);
CREATE POLICY "Service role manages game plays" ON public.game_plays FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX game_plays_user_idx ON public.game_plays(user_id, created_at DESC);