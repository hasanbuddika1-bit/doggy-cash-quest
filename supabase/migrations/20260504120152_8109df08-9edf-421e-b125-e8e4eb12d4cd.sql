
-- Add new columns to withdrawals
ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS method text NOT NULL DEFAULT 'usdt_aptos',
  ADD COLUMN IF NOT EXISTS ton_amount numeric,
  ADD COLUMN IF NOT EXISTS tx_hash text;

-- Add ton_address to users (wallet_address remains the Aptos address)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ton_address text;

-- Seed new settings
INSERT INTO public.app_settings (key, value, description) VALUES
  ('aptos_enabled', 'true', 'Enable USDT (Aptos) withdrawal method'),
  ('ton_enabled', 'true', 'Enable TON withdrawal method'),
  ('ton_min_usdt', '0.05', 'TON: minimum equivalent USDT per withdrawal'),
  ('ton_max_usdt', '0.1', 'TON: maximum equivalent USDT per withdrawal'),
  ('ton_fee_fixed', '0.005', 'TON: fixed fee in USDT equivalent'),
  ('ton_fee_percent', '2', 'TON: percentage fee')
ON CONFLICT (key) DO NOTHING;
