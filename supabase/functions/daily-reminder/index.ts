// Sends a friendly reminder DM to all users who have notifications enabled.
// Scheduled to run 3x per day via pg_cron. Includes "Earn Bunny" mini-app button.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const MINI_APP_URL = 'https://t.me/Bunnyearnbot/bunnytoken';
const BUNNY_BOT_TOKEN = Deno.env.get('BUNNY_BOT_TOKEN');

const MESSAGES = [
  '☀️ <b>Good morning, Bunny!</b> 🐰\n\nFresh ad slots have reset — log in now, watch ads, finish tasks & top-up your 🐰 balance!',
  '🌙 <b>Don\'t forget tonight\'s claim!</b> ✨\n\nA few minutes of tapping = more Bunny. Open the mini app before the day ends and grab today\'s rewards!',
];

async function tg(method: string, body: any) {
  if (!BUNNY_BOT_TOKEN) return { ok: false };
  try {
    const r = await fetch(`https://api.telegram.org/bot${BUNNY_BOT_TOKEN}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return r.json();
  } catch { return { ok: false }; }
}

function pickMessage(): string {
  // Two notifications per day target — pick morning vs evening.
  const hour = new Date().getUTCHours();
  return hour < 12 ? MESSAGES[0] : MESSAGES[1];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: users, error } = await supabase
    .from('users')
    .select('telegram_id')
    .eq('notifications_enabled', true)
    .eq('banned', false);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

  const text = pickMessage();
  const reply_markup = { inline_keyboard: [[{ text: '🐰 Earn Bunny', url: MINI_APP_URL }]] };

  let sent = 0, failed = 0;
  for (const u of users || []) {
    if (!u.telegram_id) continue;
    const res = await tg('sendMessage', { chat_id: u.telegram_id, text, parse_mode: 'HTML', reply_markup });
    if (res?.ok) sent++; else failed++;
    // small throttle to respect 30 msg/sec global limit
    await new Promise((r) => setTimeout(r, 50));
  }

  return new Response(JSON.stringify({ ok: true, sent, failed, total: users?.length || 0 }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
