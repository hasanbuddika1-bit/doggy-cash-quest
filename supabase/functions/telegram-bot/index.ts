import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
const ADMIN_CHAT_ID = '5419054691';

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

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'get_or_create_user') {
      const { telegram_id, username, first_name, photo_url, referrer_id } = body;
      
      let { data: user } = await supabase.from('users').select('*').eq('telegram_id', telegram_id).single();
      
      if (!user) {
        const insertData: any = { telegram_id, username, first_name, photo_url };
        if (referrer_id) insertData.referrer_id = referrer_id;
        
        const { data: newUser, error } = await supabase.from('users').insert(insertData).select().single();
        if (error) throw error;
        user = newUser;

        if (referrer_id) {
          await supabase.from('referrals').insert({
            referrer_id,
            referee_id: user.id,
            verified: false,
          });
        }

        // Notify admin about new user
        await notifyAdmin(
          `👤 <b>New User Joined!</b>\n\nName: ${first_name || 'N/A'}\nUsername: @${username || 'N/A'}\nTelegram ID: <code>${telegram_id}</code>${referrer_id ? '\n📎 Referred by: ' + referrer_id : ''}`,
          LOVABLE_API_KEY, TELEGRAM_API_KEY
        );
      } else {
        await supabase.from('users').update({ username, first_name, photo_url }).eq('id', user.id);
      }

      return new Response(JSON.stringify({ user }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'claim_welcome_bonus') {
      const { user_id, telegram_id } = body;
      
      const { data: user } = await supabase.from('users').select('*').eq('id', user_id).single();
      if (!user) throw new Error('User not found');
      if (user.welcome_bonus_claimed) throw new Error('Already claimed');

      const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'welcome_bonus').single();
      const bonusAmount = Number(setting?.value || 50);

      await supabase.from('users').update({
        balance: Number(user.balance) + bonusAmount,
        welcome_bonus_claimed: true,
        access_tasks_completed: true,
      }).eq('id', user_id);

      await sendTelegram('sendMessage', {
        chat_id: telegram_id,
        text: `🎉 <b>Welcome to Doggy Cash!</b> 🐶💰\n\nYou've earned <b>${bonusAmount} Doggy</b> as a welcome bonus!\n\n🦴 Earn more by completing tasks, clicking links, and referring friends!\n💰 100 Doggy = 0.01 USDT\n\nStart earning now! 🚀`,
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
            text: `✅ Your referral has been verified! Claim your reward in the app. 🎁`,
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

      // Notify admin about task submission
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
      const { withdrawal_id } = body;
      const { data: w } = await supabase.from('withdrawals').select('*, users(telegram_id, balance, username)').eq('id', withdrawal_id).single();
      if (!w) throw new Error('Not found');

      await supabase.from('withdrawals').update({ status: 'approved' }).eq('id', withdrawal_id);
      await supabase.from('users').update({ balance: Number((w.users as any)?.balance || 0) - Number(w.amount) }).eq('id', w.user_id);

      if ((w.users as any)?.telegram_id) {
        await sendTelegram('sendMessage', {
          chat_id: (w.users as any).telegram_id,
          text: `✅ Your withdrawal of ${w.amount} Doggy ($${Number(w.usdt_amount).toFixed(4)} USDT) has been approved! 💰`,
          reply_markup: JSON.stringify({
            inline_keyboard: [[{ text: '💳 Payment Channel', url: 'https://t.me/bluetonpayment' }]],
          }),
        }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      }

      // Post to admin about approved withdrawal
      await notifyAdmin(
        `💸 <b>Withdrawal Approved</b>\n\nUser: @${(w.users as any)?.username || 'unknown'}\nAmount: ${w.amount} Doggy\nUSDT: $${Number(w.usdt_amount).toFixed(4)}\nWallet: <code>${w.wallet_address}</code>\nStatus: ✅ Approved`,
        LOVABLE_API_KEY, TELEGRAM_API_KEY
      );

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
          reply_markup: JSON.stringify({
            inline_keyboard: [[{ text: '🔄 Try Again', web_app: { url: `https://doggy-cash-quest.lovable.app` } }]],
          }),
        }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'admin_ban_user') {
      const { target_user_id } = body;
      const { data: user } = await supabase.from('users').select('telegram_id, username, first_name').eq('id', target_user_id).single();
      
      await supabase.from('users').update({ banned: true }).eq('id', target_user_id);

      // Notify admin
      await notifyAdmin(
        `🚫 <b>Account Suspended</b>\n\nUser: ${user?.first_name || 'N/A'} (@${user?.username || 'N/A'})\nID: <code>${target_user_id}</code>`,
        LOVABLE_API_KEY, TELEGRAM_API_KEY
      );

      // Notify user
      if (user?.telegram_id) {
        await sendTelegram('sendMessage', {
          chat_id: user.telegram_id,
          text: `🚫 Your Doggy Cash account has been suspended. Contact support if you believe this is an error.`,
        }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'admin_broadcast') {
      const { text, image_url, button_text, button_url } = body;
      const { data: users } = await supabase.from('users').select('telegram_id').eq('banned', false);
      
      let sent = 0;
      for (const u of (users || [])) {
        try {
          const msgBody: any = { chat_id: u.telegram_id, parse_mode: 'HTML' };
          
          if (image_url) {
            msgBody.photo = image_url;
            msgBody.caption = text;
            if (button_text && button_url) {
              msgBody.reply_markup = JSON.stringify({ inline_keyboard: [[{ text: button_text, url: button_url }]] });
            }
            await sendTelegram('sendPhoto', msgBody, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          } else {
            msgBody.text = text;
            if (button_text && button_url) {
              msgBody.reply_markup = JSON.stringify({ inline_keyboard: [[{ text: button_text, url: button_url }]] });
            }
            await sendTelegram('sendMessage', msgBody, LOVABLE_API_KEY, TELEGRAM_API_KEY);
          }
          sent++;
        } catch { /* skip failed */ }
      }

      return new Response(JSON.stringify({ success: true, sent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('telegram-bot error:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
