
-- Add IP address tracking to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ip_address text;

-- Add task type support
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_type text NOT NULL DEFAULT 'admin_approve';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS telegram_channel text;

-- Add withdrawal fee columns to withdrawals
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS fee_usdt numeric NOT NULL DEFAULT 0;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS net_usdt numeric NOT NULL DEFAULT 0;

-- Insert new app settings
INSERT INTO public.app_settings (key, value, description) VALUES
  ('ad_reward_1', '20', 'Ad slot 1 reward'),
  ('ad_reward_2', '20', 'Ad slot 2 reward'),
  ('ad_reward_3', '20', 'Ad slot 3 reward'),
  ('ad_reward_4', '20', 'Ad slot 4 reward'),
  ('ad_reward_5', '20', 'Ad slot 5 reward'),
  ('ad_reward_6', '20', 'Ad slot 6 reward'),
  ('ad_reward_7', '20', 'Ad slot 7 reward'),
  ('ad_reward_8', '20', 'Ad slot 8 reward'),
  ('ad_reward_9', '20', 'Ad slot 9 reward'),
  ('ad_reward_10', '20', 'Ad slot 10 reward'),
  ('withdraw_fee_fixed', '0.01', 'Fixed withdrawal fee in USDT'),
  ('withdraw_fee_percent', '2', 'Withdrawal fee percentage'),
  ('max_withdraw_usdt', '0.1', 'Maximum withdrawal in USDT'),
  ('withdraw_ads_required', '2', 'Ads to watch before withdraw'),
  ('daily_reset_hour', '0', 'Daily reset hour (0-23, UTC)')
ON CONFLICT (key) DO NOTHING;
