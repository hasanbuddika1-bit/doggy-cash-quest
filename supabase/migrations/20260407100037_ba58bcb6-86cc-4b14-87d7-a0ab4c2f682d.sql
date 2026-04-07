CREATE TABLE public.ad_watches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ad_index INTEGER NOT NULL,
  earned INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_watches_user_id ON public.ad_watches(user_id);
CREATE INDEX idx_ad_watches_user_ad ON public.ad_watches(user_id, ad_index);

ALTER TABLE public.ad_watches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ad watches"
ON public.ad_watches FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own ad watches"
ON public.ad_watches FOR INSERT
WITH CHECK (true);