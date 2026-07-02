# Bunny Earn Hub — Next Batch

## 1. Ad Bugs
- **GigaPub + Adsgram overlap**: In `src/lib/ads.ts`, when GigaPub is selected, fully null out `window.Adsgram` AND unload the Adsgram platform check. Force GigaPub-only path (do not fall back to Adsgram inside GigaPub). Add a hard `isAdsgramEnabled` flag when picking network.
- **`showRandomAd()`**: If GigaPub fails, DO NOT fall through to Adsgram (currently opposite). Ensure only one SDK activates per call.
- Fix "Platform App url for blockId = 34573" — this ID isn't in our config. Search codebase for stray `34573` and remove; ensure only `int-35465` / `35464` are referenced.

## 2. Withdraw Flow
- **User side (WithdrawTab)**: Play exactly ONE ad (`showRandomAd`), no timeout, and if ad fails/closes early → still allow the withdraw to proceed (log a warning, don't block).
- **Address input**: Only USDT (BEP20) and GRAM (ex TON). Remove Aptos entirely.
- **DB cleanup migration**: `UPDATE users SET wallet_address = NULL, wallet_method = NULL WHERE wallet_method = 'usdt_aptos' OR wallet_method IS NULL`. Also clear any legacy Aptos-format addresses.
- **Admin approval (Admin.tsx → Withdrawals tab)**: Add a required "Transaction ID (TX Hash)" input before approve. Store in `withdrawals.tx_hash` (add column if missing). Send it back in the approval notification.
- **Notification messages** (`process-withdrawal/index.ts` + telegram-bot): Replace all "USDT" / "Aptos" wording with "USDT (BEP20)". Include TX hash + BscScan link `https://bscscan.com/tx/<hash>` in approval DM and payment channel post.

## 3. Referral Link
- Everywhere refer link is built (HomeTab, EarnTab, telegram-bot welcome), use:
  `https://t.me/Bunnyearnbot/bunnytoken?startapp=ref_<userId>`
  instead of the current `?startapp=home` variant.

## 4. Balance Recompute
- New edge function action `admin_recompute_balances`:
  Sum for each user: `ad_watches.earned` + `task_completions.reward` + `referrals.reward_amount (where reward_claimed)` + `reward_claims.amount` + `game_plays.payout - game_plays.bet` + welcome bonus + weekly challenge claims MINUS `withdrawals (approved/pending).amount`.
  Compare to `users.balance`. Return list of mismatches.
- Admin panel → new "🧮 Balance Audit" tab: shows mismatches, "Fix" button per row calls `admin_fix_balance` which sets balance to computed value (only decreases, never increases — matches user's "wrong nam adu karanna").

## 5. Hive Earn Cross-Promo
- **Popup** on every login (`src/pages/Index.tsx` mount):
  Full-screen modal (Dialog) with:
  - Title "🐝 Our New Mini App — Hive Earn"
  - English description: "Watch ads, complete tasks, refer friends and earn real money on our brand new mini app. Withdraw instantly as USDT (BEP20)."
  - Big "Open Hive Earn" button → `https://t.me/Hiveearnbot/play?startapp=ref_HIVE2HMD5CZ`
  - Close (X) button, auto-close after 20 seconds (countdown shown).
- **Persistent button** in HomeTab: gold/honey styled "🐝 Hive Earn" card that opens same URL via `window.Telegram.WebApp.openTelegramLink()`.

## 6. Theme Redesign
Move away from pink/lavender/gold. New palette:
- Background: deep midnight `#0a0f1e` → `#151b32` gradient
- Primary: electric cyan `#22d3ee`
- Accent: warm amber `#fbbf24`
- Cards: glassmorphism `bg-white/5 backdrop-blur border-white/10`
- Font pair: `Space Grotesk` (headings) + `Inter` (body)
- Update `src/index.css` HSL tokens + `tailwind.config.ts` + Fredoka/Nunito imports.
- Update `.lovable/memory/index.md` core theme line.

## Technical Notes
- Migration needed: add `withdrawals.tx_hash TEXT`, clear Aptos addresses. Grants already in place.
- No changes to auth or RLS schema beyond the wallet cleanup.
- Files to touch: `src/lib/ads.ts`, `src/components/tabs/WithdrawTab.tsx`, `src/components/tabs/HomeTab.tsx`, `src/components/tabs/EarnTab.tsx`, `src/pages/Admin.tsx`, `src/pages/Index.tsx`, `src/index.css`, `tailwind.config.ts`, `supabase/functions/process-withdrawal/index.ts`, `supabase/functions/telegram-bot/index.ts`, new migration.

Approve to proceed?
