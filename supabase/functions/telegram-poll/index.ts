import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;
const MINI_APP_URL = 'https://t.me/Bunnyearnbot?startapp=home';
const COMMUNITY_URL = 'https://t.me/bunnyearnhub';
const BUNNY_BOT_TOKEN = Deno.env.get('BUNNY_BOT_TOKEN');

async function tg(method: string, body: any, lovableKey: string, tgKey: string) {
  if (BUNNY_BOT_TOKEN) {
    const r = await fetch(`https://api.telegram.org/bot${BUNNY_BOT_TOKEN}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const json = await r.json();
    if (!json?.ok) console.error(`[tg ${method}] failed:`, JSON.stringify(json));
    return json;
  }
  const res = await fetch(`${GATEWAY_URL}/${method}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${lovableKey}`, 'X-Connection-Api-Key': tgKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json?.ok) console.error(`[tg ${method}] failed:`, JSON.stringify(json));
  return json;
}

async function handleStart(chatId: number, firstName: string, lovableKey: string, tgKey: string) {
  const caption = `🐰 <b>Welcome to Bunny Earn Hub, ${firstName || 'Friend'}!</b> 💸\n\n🥕 Earn Bunny by watching ads, completing tasks & referring friends.\n💵 100 Bunny = 0.01 USDT\n\n👇 Tap below to start earning!`;
  const reply_markup = {
    inline_keyboard: [
      [{ text: '🐰 Open Mini App', url: MINI_APP_URL }],
      [{ text: '📢 Community', url: COMMUNITY_URL }],
    ],
  };
  await tg('sendMessage', { chat_id: chatId, text: caption, parse_mode: 'HTML', reply_markup }, lovableKey, tgKey);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const startTime = Date.now();
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') || '';
  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY') || '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: state, error: stateErr } = await supabase.from('telegram_bot_state').select('update_offset').eq('id', 1).single();
  if (stateErr) return new Response(JSON.stringify({ error: stateErr.message }), { status: 500, headers: corsHeaders });
  let currentOffset: number = state.update_offset;
  let totalProcessed = 0;

  while (true) {
    const remaining = MAX_RUNTIME_MS - (Date.now() - startTime);
    if (remaining < MIN_REMAINING_MS) break;
    const timeout = Math.min(50, Math.floor(remaining / 1000) - 5);
    if (timeout < 1) break;

    const resp = await tg('getUpdates', { offset: currentOffset, timeout, allowed_updates: ['message'] }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
    const updates = resp?.result ?? [];
    if (!updates.length) continue;

    for (const u of updates) {
      const msg = u.message;
      if (!msg) continue;
      const text = msg.text || '';
      const chatId = msg.chat?.id;
      const firstName = msg.from?.first_name || '';
      if (text.startsWith('/start') && chatId) {
        try { await handleStart(chatId, firstName, LOVABLE_API_KEY, TELEGRAM_API_KEY); }
        catch (e) { console.error('handleStart error', e); }
      }
    }

    totalProcessed += updates.length;
    const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
    await supabase.from('telegram_bot_state').update({ update_offset: newOffset, updated_at: new Date().toISOString() }).eq('id', 1);
    currentOffset = newOffset;
  }

  return new Response(JSON.stringify({ ok: true, processed: totalProcessed, offset: currentOffset }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
