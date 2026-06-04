import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function callEdgeFunction(name: string, body?: any) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const err = await res.text(); throw new Error(err); }
  return res.json();
}

export async function getOrCreateUser(telegramId: number, username?: string, firstName?: string, photoUrl?: string, referrerId?: string, country?: string) {
  return callEdgeFunction("telegram-bot", {
    action: "get_or_create_user",
    telegram_id: telegramId, username, first_name: firstName, photo_url: photoUrl, referrer_id: referrerId, country,
  });
}

export async function verifyChannel(userId: string, channelUsername: string, telegramId: number) {
  return callEdgeFunction("verify-channel", { user_id: userId, channel_username: channelUsername, telegram_id: telegramId });
}

export async function claimWelcomeBonus(userId: string, telegramId: number) {
  return callEdgeFunction("telegram-bot", { action: "claim_welcome_bonus", user_id: userId, telegram_id: telegramId });
}

export async function processClick(userId: string) {
  return callEdgeFunction("process-click", { user_id: userId });
}

export async function claimRewardCode(userId: string, code: string) {
  return callEdgeFunction("telegram-bot", { action: "claim_reward_code", user_id: userId, code });
}

export async function submitWithdrawal(userId: string, amount: number, walletAddress: string, method: 'usdt_aptos' | 'ton' = 'usdt_aptos') {
  return callEdgeFunction("process-withdrawal", { user_id: userId, amount, wallet_address: walletAddress, method });
}

export async function getTonPrice(): Promise<number> {
  try { const res = await callEdgeFunction("ton-price"); return Number(res.ton_usdt) || 0; }
  catch { return 0; }
}

export async function detectCountry(): Promise<{ country: string }> {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    return { country: data?.country_name || data?.country || "Unknown" };
  } catch {
    return { country: "Unknown" };
  }
}

export async function processAdReward(userId: string, adIndex: number, earned: number, watchSeconds: number, network: string = 'adsgram') {
  return callEdgeFunction("telegram-bot", { action: "process_ad_reward", user_id: userId, ad_index: adIndex, earned, watch_seconds: watchSeconds, network });
}

export async function updateWallet(userId: string, walletAddress: string, method: 'usdt_aptos' | 'ton' = 'usdt_aptos') {
  return callEdgeFunction("telegram-bot", { action: "update_wallet", user_id: userId, wallet_address: walletAddress, method });
}

export async function claimWeeklyChallenge(userId: string, challengeKey: 'refer' | 'watch_ads', tier: number) {
  return callEdgeFunction("telegram-bot", { action: "claim_weekly_challenge", user_id: userId, challenge_key: challengeKey, tier });
}

// Tasks (Main / Partner / Other) — bot-based verification
export async function verifyTaskCompletion(userId: string, taskId: string, telegramId: number) {
  return callEdgeFunction("telegram-bot", { action: "verify_task", user_id: userId, task_id: taskId, telegram_id: telegramId });
}

export async function playGame(userId: string, game: 'coin' | 'mines' | 'crash', bet: number, choice: any) {
  return callEdgeFunction("telegram-bot", { action: "play_game", user_id: userId, game, bet, choice });
}

export async function adminLogin(username: string, password: string) {
  return callEdgeFunction("telegram-bot", { action: "admin_login", username, password });
}

export async function adminAction(action: string, data: any) {
  const adminToken = sessionStorage.getItem("doggy_admin_token");
  return callEdgeFunction("telegram-bot", { action: `admin_${action}`, admin_token: adminToken, ...data });
}

export { supabase };
