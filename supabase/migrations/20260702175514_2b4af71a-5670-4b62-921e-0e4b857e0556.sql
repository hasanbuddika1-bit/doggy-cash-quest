-- Clear all legacy USDT Aptos wallet data
UPDATE public.users SET aptos_address = NULL WHERE aptos_address IS NOT NULL;

-- Wipe any wallet addresses that look like Aptos (0x + 64 hex chars) so users must re-save a BEP20 (0x + 40 hex) address.
UPDATE public.users
SET wallet_address = NULL
WHERE wallet_address IS NOT NULL
  AND wallet_address ~ '^0x[a-fA-F0-9]{64}$';

-- Update setting labels & disable aptos toggle
UPDATE public.app_settings SET value = 'false' WHERE key = 'aptos_enabled';
INSERT INTO public.app_settings (key, value, description)
VALUES ('bep20_enabled', 'true', 'Enable USDT (BEP20) withdrawal method')
ON CONFLICT (key) DO NOTHING;