import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '@supabase/supabase-js/cors';

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

    // Get settings
    const { data: settings } = await supabase.from('app_settings').select('key, value');
    const settingsMap: Record<string, string> = {};
    (settings || []).forEach(s => { settingsMap[s.key] = s.value; });

    const minAmount = Number(settingsMap.min_withdraw || 500);
    const dailyAdsReq = Number(settingsMap.daily_ads_required || 10);
    const dailyClicksReq = Number(settingsMap.daily_clicks_required || 3);
    const totalRefReq = Number(settingsMap.total_referrals_required || 2);
    const rate = Number(settingsMap.doggy_to_usdt_rate || 0.0001);

    // Validations
    if (amount < minAmount) {
      return new Response(JSON.stringify({ success: false, message: `Minimum ${minAmount} Doggy` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (Number(user.balance) < amount) {
      return new Response(JSON.stringify({ success: false, message: 'Insufficient balance' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check pending withdrawals
    const { data: pending } = await supabase.from('withdrawals').select('id').eq('user_id', user_id).eq('status', 'pending');
    if (pending && pending.length > 0) {
      return new Response(JSON.stringify({ success: false, message: 'You have a pending withdrawal' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check referral requirement
    const { count: refCount } = await supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', user_id).eq('verified', true);
    if ((refCount || 0) < totalRefReq) {
      return new Response(JSON.stringify({ success: false, message: `Need ${totalRefReq} verified referrals` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const usdtAmount = amount * rate;

    // Create withdrawal
    await supabase.from('withdrawals').insert({
      user_id,
      amount,
      usdt_amount: usdtAmount,
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
        text: `📤 <b>New Withdrawal Request</b>\n\nUser: @${user.username || 'unknown'}\nAmount: ${amount} Doggy\nUSDT: $${usdtAmount.toFixed(4)}\nWallet: <code>${wallet_address}</code>`,
        parse_mode: 'HTML',
      }),
    });

    // Notify user
    await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': TELEGRAM_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: user.telegram_id,
        text: `📤 Your withdrawal request of ${amount} Doggy ($${usdtAmount.toFixed(4)} USDT) has been submitted. Please wait for approval.`,
      }),
    });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('process-withdrawal error:', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
