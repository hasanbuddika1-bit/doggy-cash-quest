

# Doggy Cash 🐶💰 - Telegram Mini App

## Overview
A gamified Telegram Mini App where users earn "Doggy" tokens through tasks, clicks, referrals, and reward codes, then withdraw as USDT (APTOS network). Features a playful, game-like UI with animations throughout.

## Design & Theme
- **Game-like aesthetic**: Warm orange/gold/green color palette matching the Doggy Cash logo
- **Animated backgrounds**: Floating coins, sparkles, paw prints
- **Card animations**: Slide-in, bounce, glow effects on all cards
- **Pop notifications**: Animated toasts with emojis for all actions
- **The uploaded logo** will be used as the app branding throughout

---

## Phase 1: Foundation & Loading

### Loading Screen
- Full-screen animated splash with the Doggy Cash logo
- Logo bounces in with coin rain animation and sparkle effects
- Progress bar underneath, transitions to access tasks

### Access Tasks (Onboarding Gate)
Before accessing the app, users must complete these steps in order:

1. **Start Bot** - Auto-verify that user started the bot
2. **Join Channels** - Each channel shows with a "Join" button → opens link → "Verify" button checks membership via bot API:
   - Community (https://t.me/doggycash12)
   - Free TRX Pay (https://t.me/freedogspay)
   - Free Dogs Pay (https://t.me/bluetonearn)
   - Payment (https://t.me/bluetonpayment)
   - Panda Technic (https://t.me/panda_technic) — **shown only to Sri Lankan users** (IP geolocation check)
3. **Claim Welcome Bonus** button appears after all channels verified
   - Triggers a welcome message via bot to user (with image, bot description, "Earn Doggy" and "Community" buttons)
   - Awards **50 Doggy** with animated pop-up celebration
   - Redirects to Home

---

## Phase 2: Main App (4 Bottom Tabs)

### Tab 1: 🏠 Home
- **User profile**: Telegram profile photo + username (top)
- **Doggy Balance**: Large animated counter + USDT equivalent (100 Doggy = 0.01 USDT)
- **User Stats Cards**: Total Earn, Total Withdraw, Total Ads, Total Clicks
- **App Statistics Cards**: Total Users, Online Users, Today Joins, Total Paid Doggy

### Tab 2: 💰 Earn Doggy
Sub-tabs:

**Watch Ads** — "Coming Soon" badge with animated lock icon

**Tasks** — Admin-created tasks list:
- Task title + value + "Start" button
- Start → expands description → "Open" button (opens task link) → Image upload for proof
- Admin approves/rejects from admin panel
- On approve: balance updates, bot notification with "Open Mini App" button
- On reject: bot notification with retry option

**Clicks** — Link clicking earnings:
- Click button opens random link from the 3 provided URLs
- Must view for 10 seconds to earn 5 Doggy
- Max 2 clicks per hour, 1-minute cooldown between clicks
- Timer/countdown UI

**Refer** — Referral system:
- Refer balance display + claim button
- 100 Doggy per verified referral + 5% commission on referral earnings
- Referral verifies only after completing access tasks
- Refer history with Not Verified / Verified status
- Warning about multi-account/VPN = auto-ban
- Bot notifications for referral status changes

**Reward Code** — Code redemption:
- Input field to enter code + Claim button
- "Get codes from Community" button → opens community channel
- Redemption history
- Codes managed from admin panel (code, value, user count, active/deactive)

### Tab 3: 💸 Withdraw
- Available balance display (Doggy + USDT equivalent)
- Wallet address input (USDT APTOS network) — saves & auto-fills
- Amount input + Withdraw button
- **Requirements check** (shown clearly):
  - Daily watch ads: 10
  - Daily clicks: 3
  - Total referrals: 2
  - Minimum: 500 Doggy
  - No pending withdrawal allowed
- Withdraw history with status
- Notifications: user gets bot notification, admin gets notification
- On approve: user notified with Payment channel button, bot posts to Payment channel
- On reject: user notified with "Try Again" button → opens mini app

### Tab 4: 👤 Profile
- Profile photo, username, user ID (with copy button)
- Join date
- User statistics summary
- Wallet address (editable)

---

## Phase 3: Admin Panel (/admin route)

Password-protected admin dashboard:

- **User Management**: View all users, search, leaderboard, ban users
- **Task Management**: Create/edit/delete tasks (title, description, link, value, image requirement), approve/reject submissions
- **Reward Codes**: Create codes with value, usage limit, activate/deactivate
- **Withdraw Management**: View requests, approve/reject, history
- **Broadcast**: Send message to all users (text + image + buttons with links)
- **Channel Management**: Edit required channels
- **Settings**: Edit withdraw requirements, click rewards, referral rewards
- **App Stats Dashboard**: Overview of all metrics

---

## Phase 4: Backend (Lovable Cloud)

### Database Tables
- `users` — telegram_id, username, photo, balance, wallet_address, join_date, banned, country
- `channel_verifications` — user/channel join status
- `tasks` — admin-created tasks
- `task_submissions` — user submissions with image + status
- `clicks` — click tracking with timestamps
- `referrals` — referrer/referee + status + commission
- `reward_codes` — codes + values + limits
- `reward_claims` — redemption history
- `withdrawals` — amount, status, wallet, timestamps
- `app_settings` — configurable settings
- `user_roles` — admin role management

### Edge Functions
- `telegram-bot` — Handle bot commands, send notifications, verify channel membership
- `verify-channel` — Check if user joined a channel via Telegram Bot API
- `geo-detect` — IP-based country detection for Sri Lanka filtering
- `process-click` — Validate click timing, cooldowns, award Doggy
- `process-withdrawal` — Validate requirements, create request
- `admin-broadcast` — Send bulk notifications

### Telegram Bot Integration
- Using the provided bot token via Telegram connector gateway
- Bot sends welcome messages, task notifications, withdrawal updates
- Channel membership verification via getChatMember API

