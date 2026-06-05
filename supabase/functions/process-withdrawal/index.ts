import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
const ADMIN_CHAT_ID = '5419054691';
const MINI_APP_URL = 'https://doggy-cash-quest.lovable.app';
const PAYMENT_CHANNEL = '@bunnyearnhubpay';
const BUNNY_BOT_TOKEN = Deno.env.get('BUNNY_BOT_TOKEN');

async function sendTelegram(method: string, body: any, lovableKey?: string, telegramKey?: string) {
  if (BUNNY_BOT_TOKEN) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${BUNNY_BOT_TOKEN}/${method}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      return r.json();
    } catch (e) { return { ok: false, error: String(e) }; }
  }
  if (!lovableKey || !telegramKey) return { ok: false };
  const res = await fetch(`${GATEWAY_URL}/${method}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${lovableKey}`, 'X-Connection-Api-Key': telegramKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function addHistory(supabase: any, userId: string, type: string, amount: number, title: string, description?: string, meta: any = {}) {
  await supabase.from('reward_history').insert({ user_id: userId, type, amount, title, description, meta });
}

async function estimateEarned(supabase: any, userId: string) {
  const [ads, clicks, codes, weekly, games, shorts, refs] = await Promise.all([
    supabase.from('ad_watches').select('earned').eq('user_id', userId),
    supabase.from('clicks').select('earned').eq('user_id', userId),
    supabase.from('reward_claims').select('amount').eq('user_id', userId),
    supabase.from('weekly_challenge_claims').select('amount').eq('user_id', userId),
    supabase.from('game_plays').select('bet, payout').eq('user_id', userId),
    supabase.from('short_link_claims').select('amount').eq('user_id', userId).eq('status', 'claimed'),
    supabase.from('referrals').select('commission_earned, main_reward_paid, partner_reward_paid').eq('referrer_id', userId),
  ]);
  let earned = 0;
  (ads.data || []).forEach((r: any) => earned += Number(r.earned || 0));
  (clicks.data || []).forEach((r: any) => earned += Number(r.earned || 0));
  (codes.data || []).forEach((r: any) => earned += Number(r.amount || 0));
  (weekly.data || []).forEach((r: any) => earned += Number(r.amount || 0));
  (shorts.data || []).forEach((r: any) => earned += Number(r.amount || 0));
  (games.data || []).forEach((r: any) => earned += Number(r.payout || 0) - Number(r.bet || 0));
  (refs.data || []).forEach((r: any) => earned += Number(r.commission_earned || 0) + (r.main_reward_paid ? 50 : 0) + (r.partner_reward_paid ? 100 : 0));
  return earned;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { user_id, amount, wallet_address, method = 'usdt_aptos' } = await req.json();

    const { data: user } = await supabase.from('users').select('*').eq('id', user_id).single();
    if (!user) throw new Error('User not found');
    if (user.banned) throw new Error('Account suspended');

    const { data: settings } = await supabase.from('app_settings').select('key, value');
    const s: Record<string, string> = {};
    (settings || []).forEach((x: any) => { s[x.key] = x.value; });

    const minAmount = Number(s.min_withdraw || 500);
    const dailyAdsReq = Number(s.daily_ads_required || 40);
    const totalRefReq = Number(s.total_referrals_required || 2);
    const rate = Number(s.doggy_to_usdt_rate || 0.0001);

    const isTon = method === 'ton';
    if (isTon && s.ton_enabled === 'false') return new Response(JSON.stringify({ success: false, message: 'TON withdrawals disabled' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (!isTon && s.aptos_enabled === 'false') return new Response(JSON.stringify({ success: false, message: 'USDT (Aptos) withdrawals disabled' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const feeFixed = isTon ? Number(s.ton_fee_fixed || 0.005) : Number(s.withdraw_fee_fixed || 0.01);
    const feePercent = isTon ? Number(s.ton_fee_percent || 2) : Number(s.withdraw_fee_percent || 2);
    const maxWithdrawUsdt = isTon ? Number(s.ton_max_usdt || 0.1) : Number(s.max_withdraw_usdt || 0.1);

    if (amount < minAmount) return new Response(JSON.stringify({ success: false, message: `Minimum ${minAmount} Bunny` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (Number(user.balance) < amount) return new Response(JSON.stringify({ success: false, message: 'Insufficient balance' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const earnedEstimate = await estimateEarned(supabase, user_id);
    if (earnedEstimate > 0 && Number(user.balance) > earnedEstimate + 1000) {
      const reason = `Auto-suspend: suspicious balance (${Number(user.balance).toFixed(0)} > earned ${earnedEstimate.toFixed(0)})`;
      await supabase.from('users').update({ banned: true, suspension_reason: reason, suspended_at: new Date().toISOString() }).eq('id', user_id);
      await sendTelegram('sendMessage', { chat_id: ADMIN_CHAT_ID, text: `🚫 <b>Auto-Suspend on Withdraw</b>\n\nUser: @${user.username || 'unknown'}\nTG ID: <code>${user.telegram_id}</code>\nReason: ${reason}`, parse_mode: 'HTML' }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      await sendTelegram('sendMessage', { chat_id: user.telegram_id, text: `🚫 Your account has been suspended.\n\nReason: Suspicious balance activity detected.` }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      return new Response(JSON.stringify({ success: false, message: 'Account suspended for review' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const grossUsdt = amount * rate;
    if (grossUsdt > maxWithdrawUsdt) return new Response(JSON.stringify({ success: false, message: `Maximum ${maxWithdrawUsdt} USDT per withdrawal` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: pending } = await supabase.from('withdrawals').select('id').eq('user_id', user_id).eq('status', 'pending');
    if (pending && pending.length > 0) return new Response(JSON.stringify({ success: false, message: 'You have a pending withdrawal' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    if (!user.withdraw_unlocked) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const { count: dailyAds } = await supabase.from('ad_watches').select('*', { count: 'exact', head: true }).eq('user_id', user_id).gte('created_at', todayISO);
      if ((dailyAds || 0) < dailyAdsReq) return new Response(JSON.stringify({ success: false, message: `Need ${dailyAdsReq} daily ads watched` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const { count: refCount } = await supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', user_id).in('status', ['half_active', 'active']);
      if ((refCount || 0) < totalRefReq) return new Response(JSON.stringify({ success: false, message: `Need ${totalRefReq} half-active/active referrals` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const [mainRes, partnerRes, completionsRes] = await Promise.all([
        supabase.from('tasks').select('id').eq('active', true).eq('category', 'main').eq('gives_reward', true),
        supabase.from('tasks').select('id').eq('active', true).eq('category', 'partner').eq('gives_reward', true),
        supabase.from('task_completions').select('task_id').eq('user_id', user_id),
      ]);
      const done = new Set((completionsRes.data || []).map((c: any) => c.task_id));
      const mainIds = (mainRes.data || []).map((t: any) => t.id);
      const partnerIds = (partnerRes.data || []).map((t: any) => t.id);
      if (mainIds.length > 0 && !mainIds.every(id => done.has(id))) return new Response(JSON.stringify({ success: false, message: 'Complete all Main tasks first' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (partnerIds.length > 0 && !partnerIds.every(id => done.has(id))) return new Response(JSON.stringify({ success: false, message: 'Complete all Partner tasks first' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const fee = feeFixed + (grossUsdt * feePercent / 100);
    const netUsdt = Math.max(0, grossUsdt - fee);

    let tonAmount: number | null = null;
    if (isTon) {
      try {
        const r = await fetch(`${supabaseUrl}/functions/v1/ton-price`, { headers: { 'Authorization': `Bearer ${supabaseKey}` } });
        const j = await r.json();
        const tonUsd = Number(j?.ton_usdt);
        if (tonUsd > 0) tonAmount = Number((netUsdt / tonUsd).toFixed(6));
      } catch {}
    }

    await supabase.from('withdrawals').insert({
      user_id, amount, usdt_amount: grossUsdt, fee_usdt: fee, net_usdt: netUsdt,
      wallet_address, method, ton_amount: tonAmount, status: 'pending',
    });
    await addHistory(supabase, user_id, 'withdrawal_pending', -Number(amount), '💸 Withdrawal Requested', `${methodLabel} pending approval`);

    const update: any = isTon ? { ton_address: wallet_address } : { wallet_address, aptos_address: wallet_address };
    await supabase.from('users').update(update).eq('id', user_id);

    const methodLabel = isTon ? '🔵 TON' : '🟢 USDT (Aptos)';
    const amountLine = isTon && tonAmount ? `🪙 TON: <b>${tonAmount} TON</b> (~$${netUsdt.toFixed(4)})` : `💵 Net: <b>$${netUsdt.toFixed(4)} USDT</b>`;

    await sendTelegram('sendMessage', {
      chat_id: ADMIN_CHAT_ID,
      text: `📤💰 <b>New Withdrawal Request!</b> 🐰\n\n👤 User: @${user.username || 'unknown'}\n💳 Method: ${methodLabel}\n🐰 Amount: <b>${amount} Bunny</b>\n💵 Gross: $${grossUsdt.toFixed(4)} USDT\n💸 Fee: $${fee.toFixed(4)}\n${amountLine}\n📤 Wallet: <code>${wallet_address}</code>`,
      parse_mode: 'HTML',
    }, LOVABLE_API_KEY, TELEGRAM_API_KEY);

    await sendTelegram('sendMessage', {
      chat_id: user.telegram_id,
      text: `📤✨ <b>Withdrawal Submitted!</b> 🐰\n\n💳 Method: ${methodLabel}\n🐰 Amount: <b>${amount} Bunny</b>\n💸 Fee: $${fee.toFixed(4)}\n${amountLine}\n\n⏳ Please wait for admin approval.`,
      parse_mode: 'HTML',
      reply_markup: JSON.stringify({
        inline_keyboard: [[{ text: '🐰 Open Mini App', web_app: { url: MINI_APP_URL } }]],
      }),
    }, LOVABLE_API_KEY, TELEGRAM_API_KEY);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('process-withdrawal error:', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
