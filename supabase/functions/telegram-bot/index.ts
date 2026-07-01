import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
const ADMIN_CHAT_ID = '5419054691';
const ADMIN_USERNAME = 'Buddika12';
const ADMIN_PASSWORD = 'Aabbcc.123';
const ADMIN_SESSION_TOKEN = 'bunny_admin_session_2026_06_secure';
const MIN_AD_SECONDS = 15;
const MINI_APP_URL = 'https://doggy-cash-quest.lovable.app';
const BOT_USERNAME = 'Bunnyearnbot';
const COMMUNITY_CHANNEL = '@bunnyearnhub';
const PAYMENT_CHANNEL = '@bunnyearnhubpay';
const REFERRAL_JOIN_REWARD = 30;
const REFERRAL_DAY1_REWARD = 50;
const REFERRAL_DAY2_REWARD = 70;

const BUNNY_BOT_TOKEN = Deno.env.get('BUNNY_BOT_TOKEN');

function escHtml(s: any): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendTelegram(method: string, body: any, lovableKey?: string, telegramKey?: string) {
  // Prefer direct Telegram API using BUNNY_BOT_TOKEN (new @Bunnyearnbot)
  if (BUNNY_BOT_TOKEN) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${BUNNY_BOT_TOKEN}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return r.json();
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }
  // Fallback to connector gateway with old bot
  if (!lovableKey || !telegramKey) return { ok: false, error: 'No bot configured' };
  const res = await fetch(`${GATEWAY_URL}/${method}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': telegramKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function notifyAdmin(text: string, lovableKey?: string, telegramKey?: string) {
  await sendTelegram('sendMessage', { chat_id: ADMIN_CHAT_ID, text, parse_mode: 'HTML' }, lovableKey, telegramKey);
}

function miniAppButton(label = '🐰 Open Mini App') {
  return { text: label, web_app: { url: MINI_APP_URL } };
}

function rewardUrlForShortLink(linkId: string, token: string) {
  return `https://t.me/${BOT_USERNAME}?startapp=sl_${linkId}_${token}`;
}

async function addHistory(supabase: any, userId: string, type: string, amount: number, title: string, description?: string, meta: any = {}) {
  await supabase.from('reward_history').insert({ user_id: userId, type, amount, title, description, meta });
}

async function payReferralReward(supabase: any, referral: any, user: any, amount: number, updates: any, message: string, lovableKey?: string, telegramKey?: string) {
  const { data: ref } = await supabase.from('users').select('id, balance, telegram_id').eq('id', referral.referrer_id).single();
  if (!ref) return;
  const newTotal = Number(referral.reward_amount || 0) + amount;
  await supabase.from('referrals').update({
    ...updates,
    reward_amount: newTotal,
    reward_claimed: true,
    verified: true,
    verified_at: referral.verified_at || new Date().toISOString(),
  }).eq('id', referral.id);
  await supabase.from('users').update({ balance: Number(ref.balance || 0) + amount }).eq('id', ref.id);
  await addHistory(supabase, ref.id, 'referral', amount, '👥 Referral Reward', message, { referee_id: user.id, referral_id: referral.id });
  if (ref.telegram_id) {
    await sendTelegram('sendMessage', {
      chat_id: ref.telegram_id,
      text: `👥🐰 <b>Referral Reward Added!</b>\n\nFriend: @${escHtml(user.username || user.first_name || 'friend')}\n${escHtml(message)}\n\n✅ <b>+${amount} Bunny</b> added.\nTotal referral reward: <b>${newTotal}/150 Bunny</b>\n\nDay 1: 10 ads = +50 🐰\nDay 2: 10 ads = +70 🐰\n⏳ Must be completed within 48 hours to avoid fake referral status.`,
      parse_mode: 'HTML',
      reply_markup: JSON.stringify({ inline_keyboard: [[miniAppButton('🐰 Check Referrals')]] }),
    }, lovableKey, telegramKey);
  }
}

// Referral system: +30 on join, +50 when referee watches 10 ads in first 24h,
// +70 when referee watches 10 ads in the second 24h. Incomplete after 48h => expired/fake.
async function evaluateReferralAdStages(supabase: any, userId: string, lovableKey?: string, telegramKey?: string) {
  const { data: user } = await supabase.from('users').select('id, referrer_id, username, first_name').eq('id', userId).single();
  if (!user?.referrer_id) return;
  const { data: referral } = await supabase.from('referrals').select('*').eq('referrer_id', user.referrer_id).eq('referee_id', userId).maybeSingle();
  if (!referral || referral.status === 'active' || referral.status === 'expired') return;

  const joinedAt = new Date(referral.created_at).getTime();
  const day1End = new Date(joinedAt + 24 * 3600 * 1000).toISOString();
  const day2End = new Date(joinedAt + 48 * 3600 * 1000).toISOString();
  const joinedIso = new Date(joinedAt).toISOString();

  const [day1, day2] = await Promise.all([
    supabase.from('ad_watches').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', joinedIso).lt('created_at', day1End),
    supabase.from('ad_watches').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', day1End).lt('created_at', day2End),
  ]);
  const day1Ads = day1.count || 0;
  const day2Ads = day2.count || 0;
  let current = { ...referral };

  if (!current.main_reward_paid && day1Ads >= 10) {
    await payReferralReward(supabase, current, user, REFERRAL_DAY1_REWARD, { main_reward_paid: true, status: 'day1_complete' }, 'Day 1 completed: 10 ads watched ✅', lovableKey, telegramKey);
    current.main_reward_paid = true;
    current.status = 'day1_complete';
    current.reward_amount = Number(current.reward_amount || 0) + REFERRAL_DAY1_REWARD;
  }

  if (current.main_reward_paid && !current.partner_reward_paid && day2Ads >= 10) {
    await payReferralReward(supabase, current, user, REFERRAL_DAY2_REWARD, { partner_reward_paid: true, status: 'active', activated_at: new Date().toISOString() }, 'Day 2 completed: 10 ads watched ✅ Referral is now real/active!', lovableKey, telegramKey);
    return;
  }

  if (Date.now() > joinedAt + 48 * 3600 * 1000 && !current.partner_reward_paid) {
    await supabase.from('referrals').update({ status: 'expired' }).eq('id', referral.id);
    const { data: ref } = await supabase.from('users').select('telegram_id').eq('id', referral.referrer_id).single();
    if (ref?.telegram_id) {
      await sendTelegram('sendMessage', {
        chat_id: ref.telegram_id,
        text: `⚠️ <b>Referral Expired / Fake Referral</b>\n\n@${escHtml(user.username || user.first_name || 'friend')} did not complete Day 1 + Day 2 ad requirements within 48 hours.\n\nNo more referral rewards will be added for this user.`,
        parse_mode: 'HTML',
        reply_markup: JSON.stringify({ inline_keyboard: [[miniAppButton('👥 Invite Real Friends')]] }),
      }, lovableKey, telegramKey);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') || undefined;
  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY') || undefined;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || 'unknown';

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'admin_login') {
      const { username, password } = body;
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ success: true, token: ADMIN_SESSION_TOKEN }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: false, message: 'Invalid admin login' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (String(action || '').startsWith('admin_') && body.admin_token !== ADMIN_SESSION_TOKEN) {
      return new Response(JSON.stringify({ error: 'Unauthorized admin action' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'get_or_create_user') {
      const { telegram_id, username, first_name, photo_url, referrer_id, country } = body;

      let { data: user } = await supabase.from('users').select('*').eq('telegram_id', telegram_id).single();

      if (!user) {
        let sameIpBlock = false;
        if (clientIp && clientIp !== 'unknown') {
          const { data: existing } = await supabase.from('users').select('id').eq('ip_address', clientIp).limit(5);
          if (existing && existing.length > 0) sameIpBlock = true;
        }

        const insertData: any = { telegram_id, username, first_name, photo_url, ip_address: clientIp };
        if (country) insertData.country = country;
        if (referrer_id && !sameIpBlock) insertData.referrer_id = referrer_id;

        const { data: newUser, error } = await supabase.from('users').insert(insertData).select().single();
        if (error) throw error;
        user = newUser;

        if (sameIpBlock) {
          await supabase.from('users').update({ banned: true, suspension_reason: 'Same IP / multiple accounts detected', suspended_at: new Date().toISOString() }).eq('id', user.id);
          user.banned = true;
          await notifyAdmin(
            `🚫 <b>Auto-Ban: Same IP Detected!</b>\n\nNew: ${escHtml(first_name)} (@${escHtml(username || 'N/A')})\nTG ID: <code>${telegram_id}</code>\nIP: <code>${clientIp}</code>`,
            LOVABLE_API_KEY, TELEGRAM_API_KEY
          );
          await sendTelegram('sendMessage', { chat_id: telegram_id, text: `🚫 Your account has been suspended.\n\nReason: Multiple accounts detected from the same network.` }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
        }

        if (referrer_id && !sameIpBlock) {
          const { data: referral } = await supabase.from('referrals').insert({
            referrer_id,
            referee_id: user.id,
            verified: true,
            verified_at: new Date().toISOString(),
            reward_claimed: true,
            reward_amount: REFERRAL_JOIN_REWARD,
            status: 'joined',
          }).select().single();
          const { data: ref } = await supabase.from('users').select('id, balance, telegram_id').eq('id', referrer_id).single();
          if (ref?.id) {
            await supabase.from('users').update({ balance: Number(ref.balance || 0) + REFERRAL_JOIN_REWARD }).eq('id', ref.id);
            await addHistory(supabase, ref.id, 'referral', REFERRAL_JOIN_REWARD, '👥 Referral Joined', `@${username || first_name || 'friend'} joined`, { referee_id: user.id, referral_id: referral?.id });
          }
          if (ref?.telegram_id) {
            await sendTelegram('sendMessage', {
              chat_id: ref.telegram_id,
              text: `👥🐰 <b>New Referral Joined!</b>\n\nFriend: @${escHtml(username || first_name || 'someone')}\n✅ Join reward: <b>+${REFERRAL_JOIN_REWARD} Bunny</b>\n\nNext rewards:\n📺 Day 1: watch 10 ads = +${REFERRAL_DAY1_REWARD} 🐰\n📺 Day 2: watch 10 ads = +${REFERRAL_DAY2_REWARD} 🐰\n\nTotal possible: <b>150 Bunny</b>\n⏳ Must finish within 48 hours, otherwise marked as fake/expired referral.`,
              parse_mode: 'HTML',
              reply_markup: JSON.stringify({ inline_keyboard: [[miniAppButton('👥 View Referral')]] }),
            }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          }
        }

        await notifyAdmin(
          `👤 <b>New User Joined!</b>\n\nName: ${escHtml(first_name)}\nUsername: @${escHtml(username || 'N/A')}\nTG ID: <code>${telegram_id}</code>\nIP: <code>${clientIp}</code>${referrer_id && !sameIpBlock ? '\n📎 Referred by: ' + referrer_id : ''}`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY
        );
      } else {
        const upd: any = { username, first_name, photo_url, ip_address: clientIp };
        if (country && !user.country) upd.country = country;
        await supabase.from('users').update(upd).eq('id', user.id);
        if (country && !user.country) user.country = country;
      }

      return new Response(JSON.stringify({ user }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'claim_welcome_bonus') {
      const { user_id, telegram_id } = body;
      const { data: user } = await supabase.from('users').select('*').eq('id', user_id).single();
      if (!user) throw new Error('User not found');
      if (user.welcome_bonus_claimed) throw new Error('Already claimed');
      if (user.banned) throw new Error('Account suspended');

      const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'welcome_bonus').maybeSingle();
      const bonusAmount = Number(setting?.value || 50);

      await supabase.from('users').update({
        balance: Number(user.balance) + bonusAmount,
        welcome_bonus_claimed: true,
        access_tasks_completed: true,
      }).eq('id', user_id);

      await sendTelegram('sendMessage', {
        chat_id: telegram_id,
        text: `🎉 <b>Welcome to Bunny Earn Hub, ${escHtml(user.first_name || 'Friend')}!</b> 🐰💸\n\nYou've earned <b>${bonusAmount} Bunny</b> as a welcome bonus!\n\n🥕 Earn more by completing tasks, watching ads, and inviting friends!\n💰 100 Bunny = 0.01 USDT`,
        parse_mode: 'HTML',
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [miniAppButton('🐰 Open Mini App')],
            [{ text: '📢 Community', url: `https://t.me/${COMMUNITY_CHANNEL.replace('@','')}` }],
          ],
        }),
      }, LOVABLE_API_KEY, TELEGRAM_API_KEY);

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'enable_notifications') {
      const { user_id, telegram_id } = body;
      if (!user_id || !telegram_id) {
        return new Response(JSON.stringify({ success: false, message: 'Missing user details' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, telegram_id, first_name')
        .eq('id', user_id)
        .eq('telegram_id', telegram_id)
        .single();
      if (userError || !user) {
        return new Response(JSON.stringify({ success: false, message: 'User not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { error: updateError } = await supabase.from('users').update({ notifications_enabled: true }).eq('id', user_id);
      if (updateError) throw updateError;

      await sendTelegram('sendMessage', {
        chat_id: telegram_id,
        text: `🔔 <b>Notifications enabled!</b>\n\n🐰 You will now receive Bunny Earn Hub reward, referral and payment updates here.`,
        parse_mode: 'HTML',
        reply_markup: JSON.stringify({ inline_keyboard: [[miniAppButton('🐰 Earn Bunny')]] }),
      }, LOVABLE_API_KEY, TELEGRAM_API_KEY);

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'claim_reward_code') {
      const { user_id, code } = body;
      const { data: rewardCode } = await supabase.from('reward_codes').select('*').eq('code', code).eq('active', true).maybeSingle();
      if (!rewardCode) return new Response(JSON.stringify({ success: false, message: 'Invalid or inactive code' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (rewardCode.current_uses >= rewardCode.max_uses) return new Response(JSON.stringify({ success: false, message: 'Code fully used' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data: existing } = await supabase.from('reward_claims').select('id').eq('user_id', user_id).eq('code_id', rewardCode.id).maybeSingle();
      if (existing) return new Response(JSON.stringify({ success: false, message: 'Already claimed' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      await supabase.from('reward_claims').insert({ user_id, code_id: rewardCode.id, amount: rewardCode.value });
      await supabase.from('reward_codes').update({ current_uses: rewardCode.current_uses + 1 }).eq('id', rewardCode.id);
      const { data: user } = await supabase.from('users').select('balance').eq('id', user_id).single();
      await supabase.from('users').update({ balance: Number(user?.balance || 0) + Number(rewardCode.value) }).eq('id', user_id);
      await addHistory(supabase, user_id, 'reward_code', Number(rewardCode.value), '🎁 Reward Code', `Code ${escHtml(code)} claimed`);

      return new Response(JSON.stringify({ success: true, amount: rewardCode.value }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // NEW: Verify task completion (Main/Partner/Other) — bot-checks channels, trust-grants bots
    if (action === 'verify_task') {
      const { user_id, task_id, telegram_id } = body;
      const { data: task } = await supabase.from('tasks').select('*').eq('id', task_id).eq('active', true).maybeSingle();
      if (!task) return new Response(JSON.stringify({ success: false, message: 'Task not found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const { data: already } = await supabase.from('task_completions').select('id').eq('user_id', user_id).eq('task_id', task_id).maybeSingle();
      if (already) return new Response(JSON.stringify({ success: false, message: 'Already verified' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      // Verify via Telegram if it's a channel task
      let verified = true;
      if (task.verify_method === 'telegram_channel' && task.telegram_channel) {
        const channelUser = String(task.telegram_channel).replace(/^@/, '');
        try {
          const r = await sendTelegram('getChatMember', { chat_id: `@${channelUser}`, user_id: telegram_id }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          const status = r?.result?.status;
          verified = ['member', 'administrator', 'creator'].includes(status);
        } catch { verified = false; }
        if (!verified) return new Response(JSON.stringify({ success: false, message: 'Please join the channel first!' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      // For start_bot / telegram_bot / link — trust click

      await supabase.from('task_completions').insert({ user_id, task_id });

      let credited = 0;
      const updates: any = {};

      if (task.gives_reward && Number(task.value) > 0) {
        const { data: u } = await supabase.from('users').select('balance').eq('id', user_id).single();
        credited = Number(task.value);
        updates.balance = Number(u?.balance || 0) + credited;
      }

      // Start Mini Bot task enables notifications
      if (task.verify_method === 'start_bot' || !task.gives_reward) {
        updates.notifications_enabled = true;
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from('users').update(updates).eq('id', user_id);
      }
      if (credited > 0) await addHistory(supabase, user_id, 'task', credited, '📋 Task Reward', task.title || 'Task completed');

      return new Response(JSON.stringify({
        success: true,
        reward: credited,
        message: credited > 0 ? `+${credited} 🐰` : '✅ Notifications enabled!',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'admin_approve_withdrawal') {
      const { withdrawal_id, tx_hash } = body;
      const { data: w } = await supabase.from('withdrawals').select('*, users(telegram_id, balance, username)').eq('id', withdrawal_id).single();
      if (!w) throw new Error('Not found');
      const isTon = w.method === 'ton';
      if (!tx_hash || !String(tx_hash).trim()) {
        return new Response(JSON.stringify({ success: false, message: 'Transaction hash / ID required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      await supabase.from('withdrawals').update({ status: 'approved', tx_hash: String(tx_hash).trim() }).eq('id', withdrawal_id);
      await supabase.from('users').update({ balance: Number((w.users as any)?.balance || 0) - Number(w.amount) }).eq('id', w.user_id);

      const netUsdt = Number(w.net_usdt || w.usdt_amount);
      const tonAmt = Number(w.ton_amount || 0);
      const txClean = String(tx_hash).trim();
      const txExplorer = isTon
        ? `https://tonviewer.com/transaction/${encodeURIComponent(txClean)}`
        : `https://bscscan.com/tx/${encodeURIComponent(txClean)}`;
      const methodLabel = isTon ? '🔵 GRAM (ex TON)' : '🟢 USDT (BEP20)';
      const paidLine = isTon ? `🪙 Paid: <b>${tonAmt} GRAM</b> (~$${netUsdt.toFixed(4)})` : `💵 Paid: <b>$${netUsdt.toFixed(4)} USDT</b>`;
      const safeWallet = escHtml(w.wallet_address);
      const safeTx = escHtml(txClean);
      const safeUname = escHtml((w.users as any)?.username || 'unknown');

      if ((w.users as any)?.telegram_id) {
        await sendTelegram('sendMessage', {
          chat_id: (w.users as any).telegram_id,
          text: `✅🎉 <b>Withdrawal Approved!</b> 💸\n\n💳 Method: ${methodLabel}\n🐰 Amount: <b>${w.amount} Bunny</b>\n${paidLine}\n📤 Wallet: <code>${safeWallet}</code>\n🔗 TX: <code>${safeTx}</code>\n\nThanks for using Bunny Earn Hub! 🐰`,
          parse_mode: 'HTML',
          reply_markup: JSON.stringify({
            inline_keyboard: [
              [{ text: '🔍 View Transaction', url: txExplorer }],
              [{ text: '💳 Payment Channel', url: `https://t.me/${PAYMENT_CHANNEL.replace('@','')}` }],
              [miniAppButton()],
            ],
          }),
        }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      }

      // Public payment channel post (HTML, with plain fallback)
      try {
        const uname = (w.users as any)?.username ? `@${safeUname}` : 'a user';
        const channelText = `✅💸 <b>New Payment Sent!</b> 🎉\n\n👤 User: ${uname}\n💳 Method: ${methodLabel}\n🐰 Amount: <b>${w.amount} Bunny</b>\n${paidLine}\n🔗 TX: <code>${safeTx}</code>\n\n🐰 Earn yours on Bunny Earn Hub!`;
        const replyMarkup = JSON.stringify({
          inline_keyboard: [
            [{ text: '🔍 View Transaction', url: txExplorer }],
            [{ text: '🐰 Open Mini App', url: `https://t.me/${BOT_USERNAME}?startapp` }],
          ],
        });
        let chResp = await sendTelegram('sendMessage', { chat_id: PAYMENT_CHANNEL, text: channelText, parse_mode: 'HTML', reply_markup: replyMarkup }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
        if (!chResp?.ok) {
          const plain = `✅ New Payment Sent!\n\nUser: ${(w.users as any)?.username ? '@' + (w.users as any).username : 'a user'}\nMethod: ${isTon ? 'GRAM (ex TON)' : 'USDT (BEP20)'}\nAmount: ${w.amount} Bunny\n${isTon ? `Paid: ${tonAmt} GRAM (~$${netUsdt.toFixed(4)})` : `Paid: $${netUsdt.toFixed(4)} USDT`}\nTX: ${txClean}\n\nEarn yours on Bunny Earn Hub! 🐰`;
          chResp = await sendTelegram('sendMessage', { chat_id: PAYMENT_CHANNEL, text: plain, reply_markup: replyMarkup, disable_web_page_preview: true }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
        }
        if (!chResp?.ok) {
          await notifyAdmin(`⚠️ Payment channel post FAILED\n${escHtml(JSON.stringify(chResp).slice(0, 500))}`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
        }
      } catch (e) {
        await notifyAdmin(`⚠️ Payment channel error: ${escHtml(String(e).slice(0, 300))}`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      }

      await notifyAdmin(`💸✅ <b>Withdrawal Approved</b>\n\nUser: @${safeUname}\nMethod: ${methodLabel}\nAmount: ${w.amount} Bunny\n${paidLine}\nTX: <code>${safeTx}</code>`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'admin_reject_withdrawal') {
      const { withdrawal_id } = body;
      const { data: w } = await supabase.from('withdrawals').select('*, users(telegram_id)').eq('id', withdrawal_id).single();
      await supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', withdrawal_id);
      if ((w?.users as any)?.telegram_id) {
        await sendTelegram('sendMessage', {
          chat_id: (w.users as any).telegram_id,
          text: `❌ Your withdrawal request was rejected. Please try again.`,
          reply_markup: JSON.stringify({ inline_keyboard: [[miniAppButton('🔄 Try Again')]] }),
        }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'admin_ban_user') {
      const { target_user_id, reason } = body;
      const { data: user } = await supabase.from('users').select('telegram_id, username, first_name').eq('id', target_user_id).single();
      const suspensionReason = String(reason || 'Suspicious activity detected by admin').slice(0, 500);
      await supabase.from('users').update({ banned: true, suspension_reason: suspensionReason, suspended_at: new Date().toISOString() }).eq('id', target_user_id);
      await notifyAdmin(`🚫 <b>Account Suspended</b>\n\nUser: ${escHtml(user?.first_name || 'N/A')} (@${escHtml(user?.username || 'N/A')})\nID: <code>${target_user_id}</code>\nReason: ${escHtml(suspensionReason)}`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      if (user?.telegram_id) {
        await sendTelegram('sendMessage', { chat_id: user.telegram_id, text: `🚫 Your Bunny Earn Hub account has been suspended.\n\nReason: ${suspensionReason}` }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'admin_broadcast') {
      const { text, image_url, button_text, button_url } = body;
      const users: any[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data } = await supabase.from('users').select('telegram_id').eq('banned', false).range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        users.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      const hasEmoji = /[\p{Emoji}]/u.test(String(text || ''));
      const finalText = hasEmoji ? text : `📢 ${text} 🐰💸`;
      const buildBody = (chatId: number | string) => {
        const msgBody: any = { chat_id: chatId, parse_mode: 'HTML' };
        const replyMarkup = button_text && button_url
          ? JSON.stringify({ inline_keyboard: [[{ text: button_text, url: button_url }]] })
          : undefined;
        if (image_url) { msgBody.photo = image_url; msgBody.caption = finalText; if (replyMarkup) msgBody.reply_markup = replyMarkup; }
        else { msgBody.text = finalText; if (replyMarkup) msgBody.reply_markup = replyMarkup; }
        return msgBody;
      };
      const method = image_url ? 'sendPhoto' : 'sendMessage';
      try { await sendTelegram(method, buildBody(COMMUNITY_CHANNEL), LOVABLE_API_KEY, TELEGRAM_API_KEY); } catch {}
      const recipients = (users || []).map(u => u.telegram_id).filter(Boolean);
      const BATCH_SIZE = 25;
      let sent = 0;
      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(batch.map(id => sendTelegram(method, buildBody(id), LOVABLE_API_KEY, TELEGRAM_API_KEY)));
        sent += results.filter(r => r.status === 'fulfilled' && (r.value as any)?.ok !== false).length;
      }
      return new Response(JSON.stringify({ success: true, sent, total: recipients.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Process ad reward (multi-network, 24h cooldown per slot per network)
    if (action === 'process_ad_reward') {
      const { user_id, ad_index, earned, watch_seconds, network } = body;
      const { data: user } = await supabase.from('users').select('balance, banned, referrer_id').eq('id', user_id).single();
      if (!user) throw new Error('User not found');
      if (user.banned) throw new Error('Account suspended');
      const adIndex = Number(ad_index);
      const earnedAmount = Math.max(1, Math.min(100, Number(earned || 5)));
      const netName = ['adsgram', 'monetag', 'monetix', 'adexium', 'gigapub'].includes(String(network)) ? String(network) : 'adsgram';
      const maxSlot = netName === 'adsgram' ? 20 : (netName === 'monetag' || netName === 'monetix') ? 15 : netName === 'gigapub' ? 10 : 5;
      if (!Number.isInteger(adIndex) || adIndex < 1 || adIndex > maxSlot) throw new Error('Invalid ad slot');
      if (Number(watch_seconds || 0) < MIN_AD_SECONDS) throw new Error('Ad was closed early');

      const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data: recent } = await supabase.from('ad_watches').select('id').eq('user_id', user_id).eq('ad_index', adIndex).eq('network', netName).gte('created_at', dayAgo).limit(1);
      if (recent && recent.length > 0) throw new Error('This ad is still on cooldown');

      await supabase.from('ad_watches').insert({ user_id, ad_index: adIndex, earned: earnedAmount, network: netName });
      await supabase.from('users').update({ balance: Number(user.balance) + earnedAmount }).eq('id', user_id);
      await addHistory(supabase, user_id, 'ad', earnedAmount, '📺 Ad Reward', `${netName} ad #${adIndex}`);

      await evaluateReferralAdStages(supabase, user_id, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'update_wallet') {
      const { user_id, wallet_address, method } = body;
      const update: any = {};
      if (method === 'ton' || method === 'gram' || method === 'ton (gram)') update.ton_address = wallet_address;
      else { update.wallet_address = wallet_address; update.aptos_address = null; }
      await supabase.from('users').update(update).eq('id', user_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'admin_unlock_withdraw') {
      const { target_user_id, unlocked } = body;
      const { data: u } = await supabase.from('users').select('telegram_id, withdraw_unlocked').eq('id', target_user_id).single();
      const newVal = typeof unlocked === 'boolean' ? unlocked : !u?.withdraw_unlocked;
      await supabase.from('users').update({ withdraw_unlocked: newVal }).eq('id', target_user_id);
      if (newVal && u?.telegram_id) {
        await sendTelegram('sendMessage', {
          chat_id: u.telegram_id,
          text: `🎉 <b>Withdraw Unlocked!</b>\n\nAn admin has filled all withdraw requirements for you. You can now request a withdrawal directly! 💸`,
          parse_mode: 'HTML',
          reply_markup: JSON.stringify({ inline_keyboard: [[miniAppButton('💸 Withdraw Now')]] }),
        }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      }
      return new Response(JSON.stringify({ success: true, unlocked: newVal }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'claim_weekly_challenge') {
      const { user_id, challenge_key, tier } = body;
      const now = new Date();
      const day = now.getUTCDay();
      const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day, 0, 0, 0));

      const REFER_TIERS: Record<string, number> = { '5': 50, '10': 150, '50': 500, '100': 1000 };
      const ADS_TIERS: Record<string, number> = { '10': 5, '50': 75, '100': 200, '500': 300, '1000': 500 };
      const tiers = challenge_key === 'refer' ? REFER_TIERS : challenge_key === 'watch_ads' ? ADS_TIERS : null;
      if (!tiers || !(String(tier) in tiers)) return new Response(JSON.stringify({ success: false, message: 'Invalid challenge' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const required = Number(tier);
      const reward = tiers[String(tier)];

      let progress = 0;
      if (challenge_key === 'refer') {
        const { count } = await supabase.from('referrals').select('id', { count: 'exact', head: true })
          .eq('referrer_id', user_id).eq('status', 'active').gte('created_at', weekStart.toISOString());
        progress = count || 0;
      } else {
        const { count } = await supabase.from('ad_watches').select('id', { count: 'exact', head: true })
          .eq('user_id', user_id).gte('created_at', weekStart.toISOString());
        progress = count || 0;
      }
      if (progress < required) return new Response(JSON.stringify({ success: false, message: `Need ${required}, have ${progress}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const claimKey = `${challenge_key}_${tier}`;
      const { data: existing } = await supabase.from('weekly_challenge_claims').select('id')
        .eq('user_id', user_id).eq('challenge_key', claimKey).eq('week_start', weekStart.toISOString()).maybeSingle();
      if (existing) return new Response(JSON.stringify({ success: false, message: 'Already claimed this week' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      await supabase.from('weekly_challenge_claims').insert({ user_id, challenge_key: claimKey, week_start: weekStart.toISOString(), amount: reward });
      const { data: u } = await supabase.from('users').select('balance').eq('id', user_id).single();
      await supabase.from('users').update({ balance: Number(u?.balance || 0) + reward }).eq('id', user_id);
      await addHistory(supabase, user_id, 'weekly_challenge', reward, '🏆 Weekly Challenge', `${challenge_key} tier ${tier}`);

      return new Response(JSON.stringify({ success: true, amount: reward }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Admin CRUD (unchanged)
    if (action === 'admin_update_user') {
      const { target_user_id, updates } = body;
      const safeUpdates: Record<string, unknown> = {};
      for (const key of ['banned', 'access_tasks_completed', 'wallet_address', 'aptos_address', 'ton_address', 'suspension_reason'] as const) {
        if (Object.prototype.hasOwnProperty.call(updates || {}, key)) safeUpdates[key] = updates[key];
      }
      if (safeUpdates.banned === false) { safeUpdates.suspension_reason = null; safeUpdates.suspended_at = null; }
      if (safeUpdates.banned === true && !safeUpdates.suspension_reason) {
        safeUpdates.suspension_reason = 'Suspicious activity detected by admin';
        safeUpdates.suspended_at = new Date().toISOString();
      }
      if (Object.keys(safeUpdates).length === 0) throw new Error('No allowed user updates');
      await supabase.from('users').update(safeUpdates).eq('id', target_user_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (action === 'admin_create_task')  { await supabase.from('tasks').insert(body.task_data);                              return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    if (action === 'admin_update_task')  { await supabase.from('tasks').update(body.updates).eq('id', body.task_id);          return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    if (action === 'admin_delete_task')  { await supabase.from('tasks').delete().eq('id', body.task_id);                       return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    if (action === 'admin_create_code')  { await supabase.from('reward_codes').insert(body.code_data);                         return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    if (action === 'admin_update_code')  { await supabase.from('reward_codes').update(body.updates).eq('id', body.code_id);    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    if (action === 'admin_update_channel') { await supabase.from('channels').update(body.updates).eq('id', body.channel_id);   return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    if (action === 'admin_create_channel') { await supabase.from('channels').insert(body.channel_data);                        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    if (action === 'admin_delete_channel') {
      await supabase.from('channel_verifications').delete().eq('channel_id', body.channel_id);
      await supabase.from('channels').delete().eq('id', body.channel_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (action === 'admin_update_settings') {
      await supabase.from('app_settings').upsert({ key: body.key, value: body.value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (action === 'admin_create_short_link') {
      const { title, short_url, reward_amount, active, sort_order } = body.link_data || {};
      if (!title || !short_url) throw new Error('Title and short URL required');
      const { data: link, error } = await supabase.from('short_links').insert({
        title: String(title).trim(),
        short_url: String(short_url).trim(),
        reward_amount: Math.max(0, Number(reward_amount || 0)),
        active: active !== false,
        sort_order: Number(sort_order || 0),
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, reward_url: rewardUrlForShortLink(link.id, link.reward_token) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (action === 'admin_update_short_link') {
      await supabase.from('short_links').update(body.updates).eq('id', body.link_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (action === 'admin_delete_short_link') {
      await supabase.from('short_links').delete().eq('id', body.link_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (action === 'admin_list_short_links') {
      const { data: links } = await supabase.from('short_links').select('*').order('sort_order').order('created_at', { ascending: false });
      return new Response(JSON.stringify({ success: true, links: (links || []).map((l: any) => ({ ...l, reward_url: rewardUrlForShortLink(l.id, l.reward_token) })) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (action === 'get_history') {
      const { user_id } = body;
      const { data: items } = await supabase.from('reward_history').select('*').eq('user_id', user_id).order('created_at', { ascending: false }).limit(100);
      return new Response(JSON.stringify({ success: true, items: items || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (action === 'get_short_links') {
      const { user_id } = body;
      const { data: links } = await supabase.from('short_links').select('id, title, short_url, reward_amount, daily_cooldown_hours, sort_order, created_at').eq('active', true).order('sort_order').order('created_at', { ascending: false });
      const { data: claims } = await supabase.from('short_link_claims').select('short_link_id, claimed_at, next_available_at, status').eq('user_id', user_id).order('started_at', { ascending: false });
      const last: Record<string, any> = {};
      (claims || []).forEach((c: any) => { if (!last[c.short_link_id]) last[c.short_link_id] = c; });
      const items = (links || []).map((l: any) => ({ ...l, claim: last[l.id] || null }));
      return new Response(JSON.stringify({ success: true, links: items }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (action === 'start_short_link') {
      const { user_id, short_link_id } = body;
      const { data: link } = await supabase.from('short_links').select('*').eq('id', short_link_id).eq('active', true).single();
      if (!link) throw new Error('Short link not found');
      const now = new Date();
      const { data: last } = await supabase.from('short_link_claims').select('*').eq('user_id', user_id).eq('short_link_id', short_link_id).order('started_at', { ascending: false }).limit(1).maybeSingle();
      if (last?.next_available_at && new Date(last.next_available_at).getTime() > now.getTime()) {
        return new Response(JSON.stringify({ success: false, message: 'Cooldown active', next_available_at: last.next_available_at }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      await supabase.from('short_link_claims').insert({ user_id, short_link_id, amount: link.reward_amount, reward_token: link.reward_token, status: 'started' });
      return new Response(JSON.stringify({ success: true, short_url: link.short_url }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (action === 'claim_short_link') {
      const { user_id, short_link_id, reward_token } = body;
      const { data: link } = await supabase.from('short_links').select('*').eq('id', short_link_id).eq('reward_token', reward_token).eq('active', true).single();
      if (!link) throw new Error('Invalid reward link');
      const now = new Date();
      const nextAt = new Date(now.getTime() + Number(link.daily_cooldown_hours || 24) * 3600 * 1000).toISOString();
      // Check ANY existing claim (claimed status) for this user+link with cooldown still active
      const { data: anyClaim } = await supabase
        .from('short_link_claims')
        .select('id, next_available_at, claimed_at, status')
        .eq('user_id', user_id)
        .eq('short_link_id', short_link_id)
        .eq('status', 'claimed')
        .order('claimed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (anyClaim?.next_available_at && new Date(anyClaim.next_available_at).getTime() > now.getTime()) {
        return new Response(JSON.stringify({ success: false, message: 'Already claimed. Wait for cooldown.', next_available_at: anyClaim.next_available_at }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const amount = Number(link.reward_amount || 0);
      const { data: u } = await supabase.from('users').select('balance, banned').eq('id', user_id).single();
      if (!u || u.banned) throw new Error('User unavailable');
      await supabase.from('users').update({ balance: Number(u.balance || 0) + amount, updated_at: now.toISOString() }).eq('id', user_id);
      await supabase.from('short_link_claims').insert({ user_id, short_link_id, amount, reward_token, status: 'claimed', claimed_at: now.toISOString(), next_available_at: nextAt });
      await addHistory(supabase, user_id, 'short_link', amount, '🔗 Short Link Reward', link.title || 'Short link completed');
      return new Response(JSON.stringify({ success: true, amount, next_available_at: nextAt }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (action === 'play_game') {
      const { user_id, game, bet, choice } = body;
      const betNum = Math.floor(Number(bet));
      const allowedGames = ['coin', 'mines', 'crash'];
      if (!user_id || !allowedGames.includes(game)) {
        return new Response(JSON.stringify({ success: false, message: 'Invalid game' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!Number.isFinite(betNum) || betNum < 10 || betNum > 10000) {
        return new Response(JSON.stringify({ success: false, message: 'Bet must be 10 - 10000 🐰' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: u } = await supabase.from('users').select('id, balance, banned').eq('id', user_id).single();
      if (!u || u.banned) {
        return new Response(JSON.stringify({ success: false, message: 'User unavailable' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (Number(u.balance) < betNum) {
        return new Response(JSON.stringify({ success: false, message: 'Insufficient balance' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      // Server-side RNG — 25% house-favored win rate, fixed 1.8x payout for all games.
      const MULTIPLIER = 1.8;
      const buf = new Uint32Array(1); crypto.getRandomValues(buf);
      const won = (buf[0] / 0xffffffff) < 0.25;
      const payout = won ? Math.floor(betNum * MULTIPLIER) : 0;
      const meta: any = { multiplier: MULTIPLIER };
      if (game === 'coin') {
        meta.choice = choice;
        meta.reveal = won ? choice : (choice === 'heads' ? 'tails' : 'heads');
      } else if (game === 'mines') {
        const r1 = new Uint32Array(1); crypto.getRandomValues(r1);
        const safeTile = won ? Number(choice) : ((Number(choice) + 1 + (r1[0] % 3)) % 4);
        meta.pick = Number(choice); meta.safe = safeTile;
      } else if (game === 'crash') {
        const r1 = new Uint32Array(1); crypto.getRandomValues(r1);
        const crashPoint = won ? (1.8 + (r1[0] / 0xffffffff) * 5) : (0.3 + (r1[0] / 0xffffffff) * 1.4);
        meta.crashPoint = Number(crashPoint.toFixed(2)); meta.cashOut = MULTIPLIER;
      }
      const newBalance = Number(u.balance) - betNum + payout;
      await supabase.from('users').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('id', user_id);
      await supabase.from('game_plays').insert({ user_id, game, bet: betNum, payout, won, meta });
      await addHistory(supabase, user_id, 'game', payout - betNum, won ? '🎮 Game Win' : '🎮 Game Loss', `${game} ${won ? 'won' : 'lost'}`);
      return new Response(JSON.stringify({ success: true, won, payout, new_balance: newBalance, meta }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('telegram-bot error:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
