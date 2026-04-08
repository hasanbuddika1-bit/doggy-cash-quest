
# Doggy Cash Major Update Plan

## Phase 1: Core Systems
1. **Adsgram Ad Integration** — Integrate Adsgram SDK (blocks 27102 for auto-play, 27106 for Watch Ads tab). Auto-play ad 3s after app open, then every 25-50s. Watch Ads: if ad closed before 30-34s, show error popup (like screenshot), no reward.
2. **Per-Ad Reward Values** — Each of the 10 ad slots gets its own configurable reward value (admin panel setting).
3. **Daily Reset at 12:00:00** — All daily counters (ads watched, clicks) reset at midnight.

## Phase 2: Fraud Prevention
4. **IP-based Duplicate Detection** — Store user IP on registration. If same IP creates another account, auto-ban the new one, keep the first. Send Telegram notify to admin. Show ban reason to user.
5. **VPN Detection** — If VPN detected during registration, show warning to turn off VPN.
6. **Same-IP Referral Block** — Don't give referral bonus if same IP.
7. **Banned User Lockout** — Banned users see error screen with reason, can't do anything.

## Phase 3: Task System Split
8. **Two Task Types** — Split tasks into "Admin Approve" (current system with image proof) and "One-Click Telegram Tasks" (join channel → verify via bot → auto reward).
9. **Admin Panel** — Separate task creation for both types.

## Phase 4: Withdrawal Updates
10. **Withdrawal Requirements** — Must actually check: daily ads watched (10), daily clicks (3), total referrals (2). These must work with real data.
11. **Watch 2 Ads Before Withdraw** — Require watching 2 ads before submitting withdrawal request.
12. **Max Withdraw 0.1 USDT** — Cap withdrawal at 0.1 USDT equivalent.
13. **Withdrawal Fee** — 0.01 USDT + 2% fee. Show fee-deducted amount in history and notifications.
14. **Withdraw History** — Show complete history with fees.

## Phase 5: Referral Fix
15. **Direct Mini App Open** — Refer link opens mini app directly, detect referrer from start param.

## Phase 6: UI Additions
16. **Stats Counting** — Show real counts for refers, ads, clicks, tasks on home/profile.
17. **"Our Other Mini Apps"** section on Home — Free Dogs Pay + Free TRX Pay links.

## Database Changes Needed
- Add `ip_address` column to `users` table
- Add `reward_value` column to `ad_watches` or use per-slot settings
- Add task type column (`admin_approve` / `one_click`) to `tasks` table
- Add `telegram_task_channel` column to `tasks` for one-click tasks
- Add withdrawal fee settings to `app_settings`
