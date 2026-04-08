import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
  if (!TELEGRAM_API_KEY) return new Response(JSON.stringify({ error: 'TELEGRAM_API_KEY not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { user_id, amount, wallet_address } = await req.json();

    // Get user
    const { data: user } = await supabase.from('users').select('*').eq('id', user_id).single();
    if (!user) throw new Error('User not found');
    if (user.banned) throw new Error('Account suspended');

    // Get settings
    const { data: settings } = await supabase.from('app_settings').select('key, value');
    const settingsMap: Record<string, string> = {};
    (settings || []).forEach(s => { settingsMap[s.key] = s.value; });

    const minAmount = Number(settingsMap.min_withdraw || 500);
    const dailyAdsReq = Number(settingsMap.daily_ads_required || 10);
    const dailyClicksReq = Number(settingsMap.daily_clicks_required || 3);
    const totalRefReq = Number(settingsMap.total_referrals_required || 2);
    const withdrawAdsReq = Number(settingsMap.withdraw_ads_required || 2);
    const rate = Number(settingsMap.doggy_to_usdt_rate || 0.0001);
    const feeFixed = Number(settingsMap.withdraw_fee_fixed || 0.01);
    const feePercent = Number(settingsMap.withdraw_fee_percent || 2);
    const maxWithdrawUsdt = Number(settingsMap.max_withdraw_usdt || 0.1);

    // Validations
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

    // Check pending withdrawals
    const { data: pending } = await supabase.from('withdrawals').select('id').eq('user_id', user_id).eq('status', 'pending');
    if (pending && pending.length > 0) {
      return new Response(JSON.stringify({ success: false, message: 'You have a pending withdrawal' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check daily ads requirement
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { count: dailyAds } = await supabase.from('ad_watches').select('*', { count: 'exact', head: true }).eq('user_id', user_id).gte('created_at', todayISO);
    if ((dailyAds || 0) < withdrawAdsReq) {
      return new Response(JSON.stringify({ success: false, message: `Watch at least ${withdrawAdsReq} ads before withdrawing` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if ((dailyAds || 0) < dailyAdsReq) {
      return new Response(JSON.stringify({ success: false, message: `Need ${dailyAdsReq} daily ads watched` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check daily clicks
    const { count: dailyClicks } = await supabase.from('clicks').select('*', { count: 'exact', head: true }).eq('user_id', user_id).gte('created_at', todayISO);
    if ((dailyClicks || 0) < dailyClicksReq) {
      return new Response(JSON.stringify({ success: false, message: `Need ${dailyClicksReq} daily clicks` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check referral requirement
    const { count: refCount } = await supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', user_id).eq('verified', true);
    if ((refCount || 0) < totalRefReq) {
      return new Response(JSON.stringify({ success: false, message: `Need ${totalRefReq} verified referrals` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Calculate fees
    const fee = feeFixed + (grossUsdt * feePercent / 100);
    const netUsdt = Math.max(0, grossUsdt - fee);

    // Create withdrawal
    await supabase.from('withdrawals').insert({
      user_id,
      amount,
      usdt_amount: grossUsdt,
      fee_usdt: fee,
      net_usdt: netUsdt,
      wallet_address,
      status: 'pending',
    });

    // Save wallet address
    await supabase.from('users').update({ wallet_address }).eq('id', user_id);

    // Notify admin
    const ADMIN_CHAT_ID = '5419054691';
    await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': TELEGRAM_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: `📤 <b>New Withdrawal Request</b>\n\nUser: @${user.username || 'unknown'}\nAmount: ${amount} Doggy\nGross: $${grossUsdt.toFixed(4)} USDT\nFee: $${fee.toFixed(4)}\nNet: $${netUsdt.toFixed(4)} USDT\nWallet: <code>${wallet_address}</code>`,
        parse_mode: 'HTML',
      }),
    });

    // Notify user
    await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': TELEGRAM_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: user.telegram_id,
        text: `📤 Withdrawal request submitted!\n\nAmount: ${amount} Doggy\nFee: $${fee.toFixed(4)}\nYou'll receive: $${netUsdt.toFixed(4)} USDT\n\nPlease wait for approval.`,
      }),
    });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('process-withdrawal error:', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
