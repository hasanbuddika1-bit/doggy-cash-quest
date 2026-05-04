import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY')!;
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
    const dailyAdsReq = Number(s.daily_ads_required || 10);
    const dailyClicksReq = Number(s.daily_clicks_required || 3);
    const totalRefReq = Number(s.total_referrals_required || 2);
    const withdrawAdsReq = Number(s.withdraw_ads_required || 2);
    const rate = Number(s.doggy_to_usdt_rate || 0.0001);

    // Method-specific settings
    const isTon = method === 'ton';
    if (isTon && s.ton_enabled !== 'true') {
      return new Response(JSON.stringify({ success: false, message: 'TON withdrawals are disabled' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!isTon && s.aptos_enabled !== 'true') {
      return new Response(JSON.stringify({ success: false, message: 'USDT (Aptos) withdrawals are disabled' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const feeFixed = isTon ? Number(s.ton_fee_fixed || 0.005) : Number(s.withdraw_fee_fixed || 0.01);
    const feePercent = isTon ? Number(s.ton_fee_percent || 2) : Number(s.withdraw_fee_percent || 2);
    const maxWithdrawUsdt = isTon ? Number(s.ton_max_usdt || 0.1) : Number(s.max_withdraw_usdt || 0.1);

    if (amount < minAmount) {
      return new Response(JSON.stringify({ success: false, message: `Minimum ${minAmount} Doggy` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (Number(user.balance) < amount) {
      return new Response(JSON.stringify({ success: false, message: 'Insufficient balance' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const grossUsdt = amount * rate;
    if (grossUsdt > maxWithdrawUsdt) {
      return new Response(JSON.stringify({ success: false, message: `Maximum ${maxWithdrawUsdt} USDT per withdrawal` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: pending } = await supabase.from('withdrawals').select('id').eq('user_id', user_id).eq('status', 'pending');
    if (pending && pending.length > 0) {
      return new Response(JSON.stringify({ success: false, message: 'You have a pending withdrawal' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { count: dailyAds } = await supabase.from('ad_watches').select('*', { count: 'exact', head: true }).eq('user_id', user_id).gte('created_at', todayISO);
    if ((dailyAds || 0) < withdrawAdsReq) return new Response(JSON.stringify({ success: false, message: `Watch at least ${withdrawAdsReq} ads before withdrawing` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if ((dailyAds || 0) < dailyAdsReq) return new Response(JSON.stringify({ success: false, message: `Need ${dailyAdsReq} daily ads watched` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { count: dailyClicks } = await supabase.from('clicks').select('*', { count: 'exact', head: true }).eq('user_id', user_id).gte('created_at', todayISO);
    if ((dailyClicks || 0) < dailyClicksReq) return new Response(JSON.stringify({ success: false, message: `Need ${dailyClicksReq} daily clicks` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { count: refCount } = await supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', user_id).eq('verified', true);
    if ((refCount || 0) < totalRefReq) return new Response(JSON.stringify({ success: false, message: `Need ${totalRefReq} verified referrals` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: telegramTasks } = await supabase.from('tasks').select('id').eq('active', true).eq('task_type', 'one_click');
    const tIds = (telegramTasks || []).map((t: any) => t.id);
    if (tIds.length > 0) {
      const { count: done } = await supabase.from('task_submissions').select('*', { count: 'exact', head: true }).eq('user_id', user_id).in('task_id', tIds).eq('status', 'approved');
      if ((done || 0) < tIds.length) return new Response(JSON.stringify({ success: false, message: 'Complete all Telegram tasks before withdrawing' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const fee = feeFixed + (grossUsdt * feePercent / 100);
    const netUsdt = Math.max(0, grossUsdt - fee);

    // For TON, fetch live price and compute TON amount
    let tonAmount: number | null = null;
    if (isTon) {
      try {
        const r = await fetch(`${supabaseUrl}/functions/v1/ton-price`, { headers: { 'Authorization': `Bearer ${supabaseKey}` } });
        const j = await r.json();
        const tonUsd = Number(j?.ton_usdt);
        if (tonUsd > 0) tonAmount = Number((netUsdt / tonUsd).toFixed(6));
      } catch (_e) { /* ignore */ }
    }

    await supabase.from('withdrawals').insert({
      user_id, amount, usdt_amount: grossUsdt, fee_usdt: fee, net_usdt: netUsdt,
      wallet_address, method, ton_amount: tonAmount, status: 'pending',
    });

    // Save the address to the appropriate field
    const update: any = isTon ? { ton_address: wallet_address } : { wallet_address };
    await supabase.from('users').update(update).eq('id', user_id);

    const ADMIN_CHAT_ID = '5419054691';
    const methodLabel = isTon ? '🔵 TON' : '🟢 USDT (Aptos)';
    const amountLine = isTon && tonAmount ? `🪙 TON: <b>${tonAmount} TON</b> (~$${netUsdt.toFixed(4)})` : `💵 Net: <b>$${netUsdt.toFixed(4)} USDT</b>`;

    await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': TELEGRAM_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: `📤💰 <b>New Withdrawal Request!</b> 🐶\n\n👤 User: @${user.username || 'unknown'}\n💳 Method: ${methodLabel}\n🦴 Amount: <b>${amount} Doggy</b>\n💵 Gross: $${grossUsdt.toFixed(4)} USDT\n💸 Fee: $${fee.toFixed(4)}\n${amountLine}\n📤 Wallet: <code>${wallet_address}</code>`,
        parse_mode: 'HTML',
      }),
    });

    await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': TELEGRAM_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: user.telegram_id,
        text: `📤✨ <b>Withdrawal Submitted!</b> 🐶\n\n💳 Method: ${methodLabel}\n🦴 Amount: <b>${amount} Doggy</b>\n💸 Fee: $${fee.toFixed(4)}\n${amountLine}\n\n⏳ Please wait for admin approval.`,
        parse_mode: 'HTML',
        reply_markup: JSON.stringify({
          inline_keyboard: [[{ text: '🐶 Open Mini App', web_app: { url: 'https://doggy-cash-quest.lovable.app' } }]],
        }),
      }),
    });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('process-withdrawal error:', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
