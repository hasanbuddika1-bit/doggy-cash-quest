TRUNCATE TABLE
  public.users,
  public.ad_watches,
  public.clicks,
  public.referrals,
  public.task_completions,
  public.task_submissions,
  public.channel_verifications,
  public.reward_claims,
  public.weekly_challenge_claims,
  public.withdrawals
RESTART IDENTITY CASCADE;

UPDATE public.telegram_bot_state SET update_offset = 0, updated_at = now() WHERE id = 1;