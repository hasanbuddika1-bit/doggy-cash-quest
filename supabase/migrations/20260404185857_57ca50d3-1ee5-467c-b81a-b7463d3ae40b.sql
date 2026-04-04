
-- Create enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.task_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.withdraw_status AS ENUM ('pending', 'approved', 'rejected');

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Users table
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id BIGINT NOT NULL UNIQUE,
  username TEXT,
  first_name TEXT,
  photo_url TEXT,
  balance NUMERIC NOT NULL DEFAULT 0,
  wallet_address TEXT,
  country TEXT,
  banned BOOLEAN NOT NULL DEFAULT false,
  referrer_id UUID REFERENCES public.users(id),
  access_tasks_completed BOOLEAN NOT NULL DEFAULT false,
  welcome_bonus_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Service can insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update users" ON public.users FOR UPDATE USING (true);
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view roles" ON public.user_roles FOR SELECT USING (true);

-- Now create has_role function (after user_roles exists)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Channels table
CREATE TABLE public.channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  link TEXT NOT NULL,
  telegram_username TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT true,
  country_restriction TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view channels" ON public.channels FOR SELECT USING (true);
CREATE POLICY "Service can manage channels" ON public.channels FOR ALL USING (true);

-- Channel verifications
CREATE TABLE public.channel_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  UNIQUE (user_id, channel_id)
);
ALTER TABLE public.channel_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view verifications" ON public.channel_verifications FOR SELECT USING (true);
CREATE POLICY "Service can manage verifications" ON public.channel_verifications FOR ALL USING (true);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  link TEXT,
  value NUMERIC NOT NULL DEFAULT 0,
  requires_image BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Service can manage tasks" ON public.tasks FOR ALL USING (true);
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Task submissions
CREATE TABLE public.task_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT,
  status task_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view submissions" ON public.task_submissions FOR SELECT USING (true);
CREATE POLICY "Service can insert submissions" ON public.task_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update submissions" ON public.task_submissions FOR UPDATE USING (true);
CREATE TRIGGER update_task_submissions_updated_at BEFORE UPDATE ON public.task_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Clicks table
CREATE TABLE public.clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  link_url TEXT NOT NULL,
  earned NUMERIC NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view clicks" ON public.clicks FOR SELECT USING (true);
CREATE POLICY "Service can insert clicks" ON public.clicks FOR INSERT WITH CHECK (true);

-- Referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  referee_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  reward_amount NUMERIC NOT NULL DEFAULT 100,
  commission_earned NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  UNIQUE (referrer_id, referee_id)
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view referrals" ON public.referrals FOR SELECT USING (true);
CREATE POLICY "Service can manage referrals" ON public.referrals FOR ALL USING (true);

-- Reward codes
CREATE TABLE public.reward_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  value NUMERIC NOT NULL DEFAULT 0,
  max_uses INT NOT NULL DEFAULT 1,
  current_uses INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reward_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view codes" ON public.reward_codes FOR SELECT USING (true);
CREATE POLICY "Service can manage codes" ON public.reward_codes FOR ALL USING (true);

-- Reward claims
CREATE TABLE public.reward_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  code_id UUID REFERENCES public.reward_codes(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, code_id)
);
ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view claims" ON public.reward_claims FOR SELECT USING (true);
CREATE POLICY "Service can insert claims" ON public.reward_claims FOR INSERT WITH CHECK (true);

-- Withdrawals
CREATE TABLE public.withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  usdt_amount NUMERIC NOT NULL,
  wallet_address TEXT NOT NULL,
  status withdraw_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view withdrawals" ON public.withdrawals FOR SELECT USING (true);
CREATE POLICY "Service can insert withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update withdrawals" ON public.withdrawals FOR UPDATE USING (true);
CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- App settings
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Service can manage settings" ON public.app_settings FOR ALL USING (true);

-- Storage bucket for task images
INSERT INTO storage.buckets (id, name, public) VALUES ('task-images', 'task-images', true);
CREATE POLICY "Anyone can view task images" ON storage.objects FOR SELECT USING (bucket_id = 'task-images');
CREATE POLICY "Anyone can upload task images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'task-images');
