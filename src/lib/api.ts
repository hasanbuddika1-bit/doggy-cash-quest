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
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  return res.json();
}

// User operations
export async function getOrCreateUser(telegramId: number, username?: string, firstName?: string, photoUrl?: string, referrerId?: string) {
  return callEdgeFunction("telegram-bot", {
    action: "get_or_create_user",
    telegram_id: telegramId,
    username,
    first_name: firstName,
    photo_url: photoUrl,
    referrer_id: referrerId,
  });
}

export async function verifyChannel(userId: string, channelUsername: string, telegramId: number) {
  return callEdgeFunction("verify-channel", {
    user_id: userId,
    channel_username: channelUsername,
    telegram_id: telegramId,
  });
}

export async function claimWelcomeBonus(userId: string, telegramId: number) {
  return callEdgeFunction("telegram-bot", {
    action: "claim_welcome_bonus",
    user_id: userId,
    telegram_id: telegramId,
  });
}

export async function processClick(userId: string) {
  return callEdgeFunction("process-click", { user_id: userId });
}

export async function claimRewardCode(userId: string, code: string) {
  return callEdgeFunction("telegram-bot", {
    action: "claim_reward_code",
    user_id: userId,
    code,
  });
}

export async function claimReferralReward(userId: string, referralId: string) {
  return callEdgeFunction("telegram-bot", {
    action: "claim_referral_reward",
    user_id: userId,
    referral_id: referralId,
  });
}

export async function submitWithdrawal(userId: string, amount: number, walletAddress: string, method: 'usdt_aptos' | 'ton' = 'usdt_aptos') {
  return callEdgeFunction("process-withdrawal", {
    user_id: userId,
    amount,
    wallet_address: walletAddress,
    method,
  });
}

export async function getTonPrice(): Promise<number> {
  try {
    const res = await callEdgeFunction("ton-price");
    return Number(res.ton_usdt) || 0;
  } catch { return 0; }
}

export async function submitTask(userId: string, taskId: string, imageUrl: string) {
  return callEdgeFunction("telegram-bot", {
    action: "submit_task",
    user_id: userId,
    task_id: taskId,
    image_url: imageUrl,
  });
}

export async function detectCountry() {
  return callEdgeFunction("geo-detect", {});
}

// Ad reward
export async function processAdReward(userId: string, adIndex: number, earned: number, watchSeconds: number) {
  return callEdgeFunction("telegram-bot", { action: "process_ad_reward", user_id: userId, ad_index: adIndex, earned, watch_seconds: watchSeconds });
}

// Wallet
export async function updateWallet(userId: string, walletAddress: string, method: 'usdt_aptos' | 'ton' = 'usdt_aptos') {
  return callEdgeFunction("telegram-bot", { action: "update_wallet", user_id: userId, wallet_address: walletAddress, method });
}

// Telegram task
export async function processTelegramTask(userId: string, taskId: string, taskValue: number) {
  return callEdgeFunction("telegram-bot", { action: "process_telegram_task", user_id: userId, task_id: taskId, task_value: taskValue });
}

// Admin operations
export async function adminLogin(username: string, password: string) {
  return callEdgeFunction("telegram-bot", { action: "admin_login", username, password });
}

export async function adminAction(action: string, data: any) {
  const adminToken = sessionStorage.getItem("doggy_admin_token");
  return callEdgeFunction("telegram-bot", { action: `admin_${action}`, admin_token: adminToken, ...data });
}

// Read operations via supabase client
export { supabase };
