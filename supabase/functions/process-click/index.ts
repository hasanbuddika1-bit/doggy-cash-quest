import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { user_id } = await req.json();

    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const oneHourAgo = new Date(now.getTime() - 3600000);

    const { data: lastClick } = await supabase.from('clicks').select('created_at')
      .eq('user_id', user_id)
      .gte('created_at', oneMinuteAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (lastClick && lastClick.length > 0) {
      return new Response(JSON.stringify({ success: false, message: 'Wait 1 minute between clicks' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { count } = await supabase.from('clicks').select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .gte('created_at', oneHourAgo.toISOString());

    if ((count || 0) >= 2) {
      return new Response(JSON.stringify({ success: false, message: 'Max 2 clicks per hour reached' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'click_reward').single();
    const reward = Number(setting?.value || 5);

    const links = [
      'https://omg10.com/4/10176898',
      'https://omg10.com/4/10339385',
    ];
    const link = links[Math.floor(Math.random() * links.length)];

    await supabase.from('clicks').insert({ user_id, link_url: link, earned: reward });

    const { data: user } = await supabase.from('users').select('balance').eq('id', user_id).single();
    await supabase.from('users').update({ balance: Number(user?.balance || 0) + reward }).eq('id', user_id);

    const { data: userData } = await supabase.from('users').select('referrer_id').eq('id', user_id).single();
    if (userData?.referrer_id) {
      const commission = reward * 0.05;
      const { data: referrer } = await supabase.from('users').select('balance').eq('id', userData.referrer_id).single();
      if (referrer) {
        await supabase.from('users').update({ balance: Number(referrer.balance) + commission }).eq('id', userData.referrer_id);
        const { data: refRecord } = await supabase.from('referrals').select('id, commission_earned')
          .eq('referrer_id', userData.referrer_id).eq('referee_id', user_id).single();
        if (refRecord) {
          await supabase.from('referrals').update({ commission_earned: Number(refRecord.commission_earned) + commission }).eq('id', refRecord.id);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, earned: reward }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('process-click error:', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
