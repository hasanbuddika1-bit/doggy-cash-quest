import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
const BUNNY_BOT_TOKEN = Deno.env.get('BUNNY_BOT_TOKEN');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { user_id, channel_username, telegram_id } = await req.json();
    const normalized = String(channel_username || '').replace(/^@/, '').trim();

    if (!user_id || !normalized || !telegram_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields', verified: false, reason: 'invalid_request' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prefer direct Telegram API via BUNNY_BOT_TOKEN
    let response: Response;
    if (BUNNY_BOT_TOKEN) {
      response = await fetch(`https://api.telegram.org/bot${BUNNY_BOT_TOKEN}/getChatMember`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: `@${normalized}`, user_id: telegram_id }),
      });
    } else {
      response = await fetch(`${GATEWAY_URL}/getChatMember`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': TELEGRAM_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chat_id: `@${normalized}`, user_id: telegram_id }),
      });
    }

    const rawResponse = await response.text();
    let data: Record<string, any> = {};
    try { data = rawResponse ? JSON.parse(rawResponse) : {}; } catch { data = { raw: rawResponse }; }

    if (!response.ok || data.ok === false) {
      const description = data.description || data.error || rawResponse || 'Telegram API error';
      const lowered = String(description).toLowerCase();
      const reason = lowered.includes('chat not found') || lowered.includes('not enough rights') || lowered.includes('member list is inaccessible')
        ? 'bot_missing_channel_access' : 'telegram_api_error';
      console.error('verify-channel telegram error:', description);
      return new Response(JSON.stringify({ verified: false, status: null, reason, error: description }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const status = data.result?.status;
    const isMember = ['member', 'administrator', 'creator'].includes(status);

    if (isMember) {
      const { data: channel } = await supabase.from('channels').select('id').eq('telegram_username', normalized).maybeSingle();
      if (channel) {
        await supabase.from('channel_verifications').upsert({
          user_id, channel_id: channel.id, verified: true, verified_at: new Date().toISOString(),
        }, { onConflict: 'user_id,channel_id' });
      }
    }

    return new Response(JSON.stringify({ verified: isMember, status, reason: isMember ? 'verified' : 'not_member' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('verify-channel error:', msg);
    return new Response(JSON.stringify({ error: msg, verified: false }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
