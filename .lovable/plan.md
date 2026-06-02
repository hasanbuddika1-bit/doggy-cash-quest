# 🐰 Bunny Earn Hub — Full Rebrand & Restructure

## 1. Brand & Design
- Rename app to **Bunny Earn Hub** (💸🐰 Bunny Earn Hub 🏆✨) everywhere (title, manifest, loading, header, bot welcome, channel messages)
- Upload provided logo as Lovable Asset, use across LoadingScreen, HomeTab header, RewardPopup
- New color palette (matching logo): pastel pink `#F9A8D4`, lavender `#C084FC`, gold `#F59E0B`, deep purple `#581C87`
- Update `index.css` semantic tokens, `tailwind.config.ts`, Fredoka heading kept, bunny-themed gradients
- Currency rename: 🦴 Doggy → 🐰 Bunny (display only; conversion 100 Bunny = 0.01 USDT preserved)
- New background (soft purple/pink gradient with sparkles), animated bunny accents

## 2. New Database (fresh schema)
Create a completely new schema (drop+rebuild via migration) with rebranded tables:
- `users` (telegram_id, username, balance, ton_address, aptos_address, withdraw_unlocked, banned, ip, joined_at)
- `tasks` (id, category: `main`|`partner`|`other`, title, url, bot_username, reward, active, verify_method)
- `task_completions` (user_id, task_id, completed_at)
- `referrals` (referrer_id, referred_id, status: `pending`|`half_active`|`active`, joined_at, activated_at)
  - pending = just joined
  - half_active = referred completed all main tasks → referrer gets 50 🐰
  - active = referred completed all main+partner → referrer gets +100 🐰 and 10% commission unlocked
- `ad_watches` (user_id, network: `adsgram`|`monetag`|`adexium`, slot_index, watched_at) — one slot per 24h
- `withdrawals` (user_id, amount_bunny, usdt, network, address, status, tx_hash, fee)
- `weekly_challenge_claims` (user_id, challenge_key, week_start)
- `app_settings` (key/value for ad rewards, mins, channel ids)
- `reward_codes`, `code_redemptions`

GRANTs + RLS on every table.

## 3. Tabs Restructure
Bottom nav: **Home · Tasks · Earn · Withdraw · Profile** (remove "Other Mini Apps", remove "App Stats")

### Tasks Tab (NEW)
Sub-tabs: **Main Tasks** · **Partner Tasks** · **Other Tasks**
- Main & Partner: Telegram-based, verified through the bot (`getChatMember` for channels, deep-link join verify for bots)
- "Other" assessment task = ONLY `Start Mini Bot` task, **no reward**, just enables notifications (deep-link to bot start)
- Each task: open link → "Verify" → bot checks membership → marks complete

### Earn Tab
- Click-to-earn (kept)
- Reward code redemption (kept)
- Weekly Challenges (kept, but referrals use **active** count)
- Remove task list from here

### Watch Ads Tab (NEW LAYOUT)
3 network cards (with network logos):
1. **Adsgram AI** → 20 ad slots × 5 🐰 (24h cooldown each)
2. **Monetag** → 15 ad slots × 5 🐰 (placeholder block id)
3. **Adexium** → 5 ad slots × 5 🐰 (placeholder block id)
- Tap card → opens slot grid → Watch button per slot
- Remove existing Adsgram block IDs (placeholder constants), auto-ad Monetag → placeholder
- Show network logo on each card

### Profile Tab (kept, dual wallet kept)

## 4. Referral System (rewritten)
- Join via referral link → `status=pending` (shows in history as "Pending")
- Referred user completes ALL main tasks → status=`half_active`, referrer +50 🐰
- Referred user completes ALL main+partner tasks → status=`active`, referrer +100 🐰, 10% commission begins
- Refer history: shows Pending / Half-Active / Active badge per row

## 5. Withdraw Requirements (updated)
- Min 500 🐰
- **Daily 40 ads watched**
- **2+ half_active or active referrals**
- All main tasks completed
- All partner tasks completed
- Owner can unlock per-user (existing `withdraw_unlocked` flag)
- Weekly challenge "refers" counter uses active+half_active

## 6. Bot & Channels
- New bot: `@Bunnyearnbot`, token `8292003406:AAEszzLXg0bEU86LXFO4DgU_BJW2f54gpfo` → store as `TELEGRAM_BOT_TOKEN` secret (replace existing)
- Community channel: `https://t.me/bunnyearnhub`
- Payment channel: `https://t.me/bunnyearnhubpay` (replace `@bluetonpayment` in withdrawal posts)
- Bot verifies channel join + bot start for Main/Partner tasks
- Bot sends notifications when user starts via "Start Mini Bot" task

## 7. Per-tab Guide
Add a small `?` Guide button (top-right) on every tab → opens dialog with Sinhala instructions for that tab.

## 8. Admin Panel
- Update branding only (keep all existing user activity / balance audit / withdraw approve / unlock features)
- Update channel ID in approve flow

## 9. Files Affected (high-level)
- New: `src/assets/bunny-logo.png.asset.json`, `src/assets/networks/{adsgram,monetag,adexium}.png.asset.json`
- New: `src/components/tabs/TasksTab.tsx`, `src/components/GuideButton.tsx`
- Rewritten: `WatchAdsTab.tsx`, `EarnTab.tsx`, `BottomNav.tsx`, `HomeTab.tsx`, `LoadingScreen.tsx`, `AnimatedBackground.tsx`, `Index.tsx`, `index.css`, `tailwind.config.ts`, `index.html`
- New migration: full fresh schema (drops old tables)
- Edge functions updated: `telegram-bot`, `process-withdrawal`, `verify-channel`, `process-click`

## ⚠️ Confirm before I start
1. **Drop all existing user data** (balances, withdrawals, referrals) for the fresh DB? Or migrate existing users to new schema?
2. Old bot `@Doggycash1bot` — disable webhook / leave as-is?
3. Watch-ads cooldown: confirm **24h per slot** (current is 1h per slot in old build)
4. "Start Mini Bot" task — should it be **one-time** (disappears after click) or always visible?

This is ~15–20 file changes + 1 large migration + secret update. Once you confirm the 4 questions, I'll ship it all in one go.