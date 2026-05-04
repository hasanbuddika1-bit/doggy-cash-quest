import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
const ADMIN_CHAT_ID = '5419054691';
const ADMIN_USERNAME = 'Buddika12';
const ADMIN_PASSWORD = 'Aabbcc.123';
const ADMIN_SESSION_TOKEN = 'doggy_admin_session_2026_05_secure';
const MIN_AD_SECONDS = 33;

async function sendTelegram(method: string, body: any, lovableKey: string, telegramKey: string) {
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

async function notifyAdmin(text: string, lovableKey: string, telegramKey: string) {
  await sendTelegram('sendMessage', {
    chat_id: ADMIN_CHAT_ID,
    text,
    parse_mode: 'HTML',
  }, lovableKey, telegramKey);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
  if (!TELEGRAM_API_KEY) return new Response(JSON.stringify({ error: 'TELEGRAM_API_KEY not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get client IP
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || req.headers.get('x-real-ip') 
    || req.headers.get('cf-connecting-ip') 
    || 'unknown';

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
      const { telegram_id, username, first_name, photo_url, referrer_id } = body;
      
      let { data: user } = await supabase.from('users').select('*').eq('telegram_id', telegram_id).single();
      
      if (!user) {
        // Check for same IP — fraud detection
        let sameIpReferralBlock = false;
        if (clientIp && clientIp !== 'unknown') {
          const { data: existingUsers } = await supabase.from('users').select('id, telegram_id, banned').eq('ip_address', clientIp).limit(5);
          
          if (existingUsers && existingUsers.length > 0) {
            // Same IP already has accounts — block referral bonus and auto-ban new account
            sameIpReferralBlock = true;
            
            // Check if it looks like VPN (multiple different telegram_ids from same IP)
            if (existingUsers.length >= 2) {
              // Auto-ban new account after creation
            }
          }
        }

        const insertData: any = { telegram_id, username, first_name, photo_url, ip_address: clientIp };
        if (referrer_id && !sameIpReferralBlock) insertData.referrer_id = referrer_id;
        
        const { data: newUser, error } = await supabase.from('users').insert(insertData).select().single();
        if (error) throw error;
        user = newUser;

        // If same IP has existing accounts, auto-ban this one
        if (sameIpReferralBlock) {
          const { data: existingUsers } = await supabase.from('users').select('id').eq('ip_address', clientIp).neq('id', user.id);
          if (existingUsers && existingUsers.length > 0) {
            await supabase.from('users').update({ banned: true, suspension_reason: 'Same IP / multiple accounts detected', suspended_at: new Date().toISOString() }).eq('id', user.id);
            user.banned = true;
            user.suspension_reason = 'Same IP / multiple accounts detected';
            
            await notifyAdmin(
              `🚫 <b>Auto-Ban: Same IP Detected!</b>\n\nNew: ${first_name || 'N/A'} (@${username || 'N/A'})\nTelegram ID: <code>${telegram_id}</code>\nIP: <code>${clientIp}</code>\nExisting accounts on this IP: ${existingUsers.length}\n\n⚠️ Referral bonus blocked, account banned.`,
              LOVABLE_API_KEY, TELEGRAM_API_KEY
            );

            await sendTelegram('sendMessage', {
              chat_id: telegram_id,
              text: `🚫 Your account has been suspended.\n\nReason: Multiple accounts detected from the same network.\n\nPlease disable VPN and use only one account.`,
            }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          }
        }

        if (referrer_id && !sameIpReferralBlock) {
          await supabase.from('referrals').insert({
            referrer_id,
            referee_id: user.id,
            verified: false,
          });
        }

        // Notify admin about new user
        await notifyAdmin(
          `👤 <b>New User Joined!</b>\n\nName: ${first_name || 'N/A'}\nUsername: @${username || 'N/A'}\nTelegram ID: <code>${telegram_id}</code>\nIP: <code>${clientIp}</code>${referrer_id && !sameIpReferralBlock ? '\n📎 Referred by: ' + referrer_id : ''}${sameIpReferralBlock ? '\n⚠️ Same IP - Referral blocked' : ''}`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY
        );
      } else {
        // Update existing user IP
        await supabase.from('users').update({ username, first_name, photo_url, ip_address: clientIp }).eq('id', user.id);
      }

      return new Response(JSON.stringify({ user }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'claim_welcome_bonus') {
      const { user_id, telegram_id } = body;
      
      const { data: user } = await supabase.from('users').select('*').eq('id', user_id).single();
      if (!user) throw new Error('User not found');
      if (user.welcome_bonus_claimed) throw new Error('Already claimed');
      if (user.banned) throw new Error('Account suspended');

      const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'welcome_bonus').single();
      const bonusAmount = Number(setting?.value || 50);

      await supabase.from('users').update({
        balance: Number(user.balance) + bonusAmount,
        welcome_bonus_claimed: true,
        access_tasks_completed: true,
      }).eq('id', user_id);

      await sendTelegram('sendMessage', {
        chat_id: telegram_id,
        text: `🎉 <b>Welcome to Doggy Cash, ${user.first_name || 'Friend'}!</b> 🐶💰\n\nYou've earned <b>${bonusAmount} Doggy</b> as a welcome bonus!\n\n🦴 Earn more by completing tasks, clicking links, and referring friends!\n💰 100 Doggy = 0.01 USDT\n\nStart earning now! 🚀`,
        parse_mode: 'HTML',
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [{ text: '💰 Earn Doggy', web_app: { url: `https://doggy-cash-quest.lovable.app` } }],
            [{ text: '📢 Community', url: 'https://t.me/doggycash12' }],
          ],
        }),
      }, LOVABLE_API_KEY, TELEGRAM_API_KEY);

      // Verify referral if this user was referred
      if (user.referrer_id) {
        await supabase.from('referrals').update({ verified: true, verified_at: new Date().toISOString() })
          .eq('referee_id', user_id).eq('referrer_id', user.referrer_id);
        
        const { data: referrer } = await supabase.from('users').select('telegram_id').eq('id', user.referrer_id).single();
        if (referrer) {
          await sendTelegram('sendMessage', {
            chat_id: referrer.telegram_id,
            text: `✅ Your referral <b>${user.first_name || 'someone'}</b> has been verified! Claim your reward in the app. 🎁`,
            parse_mode: 'HTML',
          }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
        }
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'claim_reward_code') {
      const { user_id, code } = body;

      const { data: rewardCode } = await supabase.from('reward_codes').select('*').eq('code', code).eq('active', true).single();
      if (!rewardCode) return new Response(JSON.stringify({ success: false, message: 'Invalid or inactive code' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (rewardCode.current_uses >= rewardCode.max_uses) return new Response(JSON.stringify({ success: false, message: 'Code fully used' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const { data: existing } = await supabase.from('reward_claims').select('id').eq('user_id', user_id).eq('code_id', rewardCode.id).single();
      if (existing) return new Response(JSON.stringify({ success: false, message: 'Already claimed' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      await supabase.from('reward_claims').insert({ user_id, code_id: rewardCode.id, amount: rewardCode.value });
      await supabase.from('reward_codes').update({ current_uses: rewardCode.current_uses + 1 }).eq('id', rewardCode.id);
      
      const { data: user } = await supabase.from('users').select('balance').eq('id', user_id).single();
      await supabase.from('users').update({ balance: Number(user?.balance || 0) + Number(rewardCode.value) }).eq('id', user_id);

      return new Response(JSON.stringify({ success: true, amount: rewardCode.value }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'claim_referral_reward') {
      const { user_id, referral_id } = body;

      const { data: referral } = await supabase.from('referrals').select('*').eq('id', referral_id).eq('referrer_id', user_id).single();
      if (!referral) throw new Error('Referral not found');
      if (!referral.verified) throw new Error('Not verified yet');
      if (referral.reward_claimed) throw new Error('Already claimed');

      await supabase.from('referrals').update({ reward_claimed: true }).eq('id', referral_id);
      const { data: user } = await supabase.from('users').select('balance').eq('id', user_id).single();
      await supabase.from('users').update({ balance: Number(user?.balance || 0) + Number(referral.reward_amount) }).eq('id', user_id);

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'submit_task') {
      const { user_id, task_id, image_url } = body;
      
      const { data: existing } = await supabase.from('task_submissions').select('id, status').eq('user_id', user_id).eq('task_id', task_id).single();
      if (existing && existing.status === 'approved') throw new Error('Already approved');
      if (existing && existing.status === 'pending') throw new Error('Already pending');

      if (existing) {
        await supabase.from('task_submissions').update({ image_url, status: 'pending' }).eq('id', existing.id);
      } else {
        await supabase.from('task_submissions').insert({ user_id, task_id, image_url, status: 'pending' });
      }

      const { data: task } = await supabase.from('tasks').select('title, value').eq('id', task_id).single();
      const { data: submitter } = await supabase.from('users').select('username, first_name').eq('id', user_id).single();
      await notifyAdmin(
        `📝 <b>New Task Submission!</b>\n\nUser: ${submitter?.first_name || 'N/A'} (@${submitter?.username || 'N/A'})\nTask: ${task?.title || 'Unknown'}\nValue: ${task?.value || 0} Doggy\n\n⏳ Waiting for review`,
        LOVABLE_API_KEY, TELEGRAM_API_KEY
      );

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Admin actions
    if (action === 'admin_approve_task') {
      const { submission_id } = body;
      const { data: sub } = await supabase.from('task_submissions').select('*, tasks(value)').eq('id', submission_id).single();
      if (!sub) throw new Error('Submission not found');

      await supabase.from('task_submissions').update({ status: 'approved' }).eq('id', submission_id);
      const { data: user } = await supabase.from('users').select('balance, telegram_id').eq('id', sub.user_id).single();
      const taskValue = Number((sub.tasks as any)?.value || 0);
      await supabase.from('users').update({ balance: Number(user?.balance || 0) + taskValue }).eq('id', sub.user_id);

      if (user?.telegram_id) {
        await sendTelegram('sendMessage', {
          chat_id: user.telegram_id,
          text: `✅ Your task has been approved! +${taskValue} Doggy 🦴`,
          reply_markup: JSON.stringify({
            inline_keyboard: [[{ text: '💰 Open Mini App', web_app: { url: `https://doggy-cash-quest.lovable.app` } }]],
          }),
        }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'admin_reject_task') {
      const { submission_id } = body;
      const { data: sub } = await supabase.from('task_submissions').select('*, users(telegram_id)').eq('id', submission_id).single();
      await supabase.from('task_submissions').update({ status: 'rejected' }).eq('id', submission_id);

      if ((sub?.users as any)?.telegram_id) {
        await sendTelegram('sendMessage', {
          chat_id: (sub.users as any).telegram_id,
          text: `❌ Your task submission was rejected. Try again!`,
          reply_markup: JSON.stringify({
            inline_keyboard: [[{ text: '🔄 Try Again', web_app: { url: `https://doggy-cash-quest.lovable.app` } }]],
          }),
        }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      const txExplorer = isTon
        ? `https://tonviewer.com/transaction/${encodeURIComponent(String(tx_hash).trim())}`
        : `https://explorer.aptoslabs.com/txn/${encodeURIComponent(String(tx_hash).trim())}?network=mainnet`;
      const methodLabel = isTon ? '🔵 TON' : '🟢 USDT (Aptos)';
      const paidLine = isTon
        ? `🪙 Paid: <b>${tonAmt} TON</b> (~$${netUsdt.toFixed(4)})`
        : `💵 Paid: <b>$${netUsdt.toFixed(4)} USDT</b>`;

      if ((w.users as any)?.telegram_id) {
        await sendTelegram('sendMessage', {
          chat_id: (w.users as any).telegram_id,
          text: `✅🎉 <b>Withdrawal Approved!</b> 💰\n\n💳 Method: ${methodLabel}\n🦴 Amount: <b>${w.amount} Doggy</b>\n${paidLine}\n📤 Wallet: <code>${w.wallet_address}</code>\n🔗 TX: <code>${tx_hash}</code>\n\nThanks for using Doggy Cash! 🐶`,
          parse_mode: 'HTML',
          reply_markup: JSON.stringify({
            inline_keyboard: [
              [{ text: '🔍 View Transaction', url: txExplorer }],
              [{ text: '💳 Payment Channel', url: 'https://t.me/bluetonpayment' }],
              [{ text: '🐶 Open Mini App', web_app: { url: 'https://doggy-cash-quest.lovable.app' } }],
            ],
          }),
        }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      }

      // Public payment channel post with tx link
      try {
        const uname = (w.users as any)?.username ? `@${(w.users as any).username}` : 'a user';
        const channelResp = await sendTelegram('sendMessage', {
          chat_id: '@bluetonpayment',
          text: `✅💸 <b>New Payment Sent!</b> 🎉\n\n👤 User: ${uname}\n💳 Method: ${methodLabel}\n🦴 Amount: <b>${w.amount} Doggy</b>\n${paidLine}\n🔗 TX: <code>${tx_hash}</code>\n\n🐶 Earn yours on Doggy Cash!`,
          parse_mode: 'HTML',
          reply_markup: JSON.stringify({
            inline_keyboard: [
              [{ text: '🔍 View Transaction', url: txExplorer }],
              [{ text: '🐶 Open Mini App', url: 'https://t.me/Doggycash1bot?startapp' }],
            ],
          }),
        }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
        if (!channelResp?.ok) {
          await notifyAdmin(`⚠️ Payment channel post FAILED\n${JSON.stringify(channelResp).slice(0, 500)}`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
        }
      } catch (e) {
        await notifyAdmin(`⚠️ Payment channel error: ${String(e).slice(0, 300)}`, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      }

      await notifyAdmin(
        `💸✅ <b>Withdrawal Approved</b>\n\nUser: @${(w.users as any)?.username || 'unknown'}\nMethod: ${methodLabel}\nAmount: ${w.amount} Doggy\n${paidLine}\nTX: <code>${tx_hash}</code>`,
        LOVABLE_API_KEY, TELEGRAM_API_KEY
      );

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
      const { withdrawal_id } = body;
      const { data: w } = await supabase.from('withdrawals').select('*, users(telegram_id)').eq('id', withdrawal_id).single();
      await supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', withdrawal_id);

      if ((w?.users as any)?.telegram_id) {
        await sendTelegram('sendMessage', {
          chat_id: (w.users as any).telegram_id,
          text: `❌ Your withdrawal request was rejected. Please try again.`,
          reply_markup: JSON.stringify({
            inline_keyboard: [[{ text: '🔄 Try Again', web_app: { url: `https://doggy-cash-quest.lovable.app` } }]],
          }),
        }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'admin_ban_user') {
      const { target_user_id, reason } = body;
      const { data: user } = await supabase.from('users').select('telegram_id, username, first_name').eq('id', target_user_id).single();
      
      const suspensionReason = String(reason || 'Suspicious activity detected by admin').slice(0, 500);
      await supabase.from('users').update({ banned: true, suspension_reason: suspensionReason, suspended_at: new Date().toISOString() }).eq('id', target_user_id);

      await notifyAdmin(
        `🚫 <b>Account Suspended</b>\n\nUser: ${user?.first_name || 'N/A'} (@${user?.username || 'N/A'})\nID: <code>${target_user_id}</code>\nReason: ${suspensionReason}`,
        LOVABLE_API_KEY, TELEGRAM_API_KEY
      );

      if (user?.telegram_id) {
        await sendTelegram('sendMessage', {
          chat_id: user.telegram_id,
          text: `🚫 Your Doggy Cash account has been suspended.\n\nReason: ${suspensionReason}\n\nContact support if you believe this is an error.`,
        }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'admin_broadcast') {
      const { text, image_url, button_text, button_url } = body;
      const { data: users } = await supabase.from('users').select('telegram_id').eq('banned', false);

      // Add emojis if message has none
      const hasEmoji = /[\p{Emoji}]/u.test(String(text || ''));
      const finalText = hasEmoji ? text : `📢 ${text} 🐶💰`;

      const buildBody = (chatId: number | string) => {
        const msgBody: any = { chat_id: chatId, parse_mode: 'HTML' };
        const replyMarkup = button_text && button_url
          ? JSON.stringify({ inline_keyboard: [[{ text: button_text, url: button_url }]] })
          : undefined;
        if (image_url) {
          msgBody.photo = image_url;
          msgBody.caption = finalText;
          if (replyMarkup) msgBody.reply_markup = replyMarkup;
        } else {
          msgBody.text = finalText;
          if (replyMarkup) msgBody.reply_markup = replyMarkup;
        }
        return msgBody;
      };
      const method = image_url ? 'sendPhoto' : 'sendMessage';

      // Send to community channel first (best-effort)
      try {
        await sendTelegram(method, buildBody('@doggycash12'), LOVABLE_API_KEY, TELEGRAM_API_KEY);
      } catch { /* optional */ }

      // Send to all members in parallel batches for speed
      const recipients = (users || []).map(u => u.telegram_id);
      const BATCH_SIZE = 25;
      let sent = 0;
      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(id => sendTelegram(method, buildBody(id), LOVABLE_API_KEY, TELEGRAM_API_KEY))
        );
        sent += results.filter(r => r.status === 'fulfilled').length;
      }

      return new Response(JSON.stringify({ success: true, sent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Process ad reward (from WatchAdsTab)
    if (action === 'process_ad_reward') {
      const { user_id, ad_index, earned, watch_seconds } = body;
      const { data: user } = await supabase.from('users').select('balance, banned').eq('id', user_id).single();
      if (!user) throw new Error('User not found');
      if (user.banned) throw new Error('Account suspended');
      const adIndex = Number(ad_index);
      const earnedAmount = Math.max(1, Math.min(100, Number(earned || 20)));
      if (!Number.isInteger(adIndex) || adIndex < 1 || adIndex > 10) throw new Error('Invalid ad slot');
      if (Number(watch_seconds || 0) < MIN_AD_SECONDS) throw new Error('Ad was closed early');

      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const { data: recent } = await supabase.from('ad_watches').select('id').eq('user_id', user_id).eq('ad_index', adIndex).gte('created_at', oneHourAgo).limit(1);
      if (recent && recent.length > 0) throw new Error('This ad is still on cooldown');

      await supabase.from('ad_watches').insert({ user_id, ad_index: adIndex, earned: earnedAmount });
      await supabase.from('users').update({ balance: Number(user.balance) + earnedAmount }).eq('id', user_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Update wallet address
    if (action === 'update_wallet') {
      const { user_id, wallet_address, ton_address, method } = body;
      const update: any = {};
      if (method === 'ton' || ton_address !== undefined) {
        if (ton_address !== undefined) update.ton_address = ton_address;
        else update.ton_address = wallet_address;
      } else {
        update.wallet_address = wallet_address;
      }
      await supabase.from('users').update(update).eq('id', user_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Process telegram task (one-click)
    if (action === 'process_telegram_task') {
      const { user_id, task_id, task_value } = body;
      const { data: task } = await supabase.from('tasks').select('value, task_type, active').eq('id', task_id).single();
      if (!task || task.task_type !== 'one_click' || !task.active) throw new Error('Invalid Telegram task');
      const { data: existing } = await supabase.from('task_submissions').select('id').eq('user_id', user_id).eq('task_id', task_id).single();
      if (existing) return new Response(JSON.stringify({ success: false, message: 'Already completed' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      
      await supabase.from('task_submissions').insert({ user_id, task_id, status: 'approved' });
      const { data: user } = await supabase.from('users').select('balance').eq('id', user_id).single();
      await supabase.from('users').update({ balance: Number(user?.balance || 0) + Number(task.value || task_value || 0) }).eq('id', user_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Admin CRUD operations
    if (action === 'admin_update_user') {
      const { target_user_id, updates } = body;
      const safeUpdates: Record<string, unknown> = {};
      for (const key of ['banned', 'access_tasks_completed', 'wallet_address', 'suspension_reason'] as const) {
        if (Object.prototype.hasOwnProperty.call(updates || {}, key)) safeUpdates[key] = updates[key];
      }
      if (safeUpdates.banned === false) {
        safeUpdates.suspension_reason = null;
        safeUpdates.suspended_at = null;
      }
      if (safeUpdates.banned === true && !safeUpdates.suspension_reason) {
        safeUpdates.suspension_reason = 'Suspicious activity detected by admin';
        safeUpdates.suspended_at = new Date().toISOString();
      }
      if (Object.keys(safeUpdates).length === 0) throw new Error('No allowed user updates');
      await supabase.from('users').update(safeUpdates).eq('id', target_user_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'admin_create_task') {
      const { task_data } = body;
      await supabase.from('tasks').insert(task_data);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'admin_update_task') {
      const { task_id, updates } = body;
      await supabase.from('tasks').update(updates).eq('id', task_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'admin_delete_task') {
      const { task_id } = body;
      await supabase.from('tasks').delete().eq('id', task_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'admin_create_code') {
      const { code_data } = body;
      await supabase.from('reward_codes').insert(code_data);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'admin_update_code') {
      const { code_id, updates } = body;
      await supabase.from('reward_codes').update(updates).eq('id', code_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'admin_update_channel') {
      const { channel_id, updates } = body;
      await supabase.from('channels').update(updates).eq('id', channel_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'admin_create_channel') {
      const { channel_data } = body;
      await supabase.from('channels').insert(channel_data);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'admin_delete_channel') {
      const { channel_id } = body;
      await supabase.from('channel_verifications').delete().eq('channel_id', channel_id);
      await supabase.from('channels').delete().eq('id', channel_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'admin_update_settings') {
      const { key, value } = body;
      await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('telegram-bot error:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
