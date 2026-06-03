import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Loader2, Check, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { claimWeeklyChallenge } from "@/lib/api";
import { showRandomAd } from "@/lib/ads";
import { toast } from "sonner";
import { RewardPopup } from "@/components/RewardPopup";

interface Props { userId: string }

const REFER_TIERS = [
  { tier: 5, reward: 50 },
  { tier: 10, reward: 150 },
  { tier: 50, reward: 500 },
  { tier: 100, reward: 1000 },
];
const ADS_TIERS = [
  { tier: 10, reward: 5 },
  { tier: 50, reward: 75 },
  { tier: 100, reward: 200 },
  { tier: 500, reward: 300 },
  { tier: 1000, reward: 500 },
];

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day, 0, 0, 0));
}
function getNextReset(): Date { return new Date(getWeekStart().getTime() + 7 * 86400000); }

export function ChallengesSection({ userId }: Props) {
  const [refers, setRefers] = useState(0);
  const [ads, setAds] = useState(0);
  const [claims, setClaims] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [reward, setReward] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 });
  const [now, setNow] = useState(Date.now());

  const weekStart = useMemo(() => getWeekStart(), []);
  const nextReset = useMemo(() => getNextReset(), []);

  const load = useCallback(async () => {
    const wsISO = weekStart.toISOString();
    const [refRes, adsRes, claimsRes] = await Promise.all([
      // Count half-active + active referrals created this week
      supabase.from("referrals").select("id", { count: "exact", head: true })
        .eq("referrer_id", userId).in("status", ["half_active", "active"]).gte("created_at", wsISO),
      supabase.from("ad_watches").select("id", { count: "exact", head: true })
        .eq("user_id", userId).gte("created_at", wsISO),
      supabase.from("weekly_challenge_claims").select("challenge_key").eq("user_id", userId).eq("week_start", wsISO),
    ]);
    setRefers(refRes.count || 0);
    setAds(adsRes.count || 0);
    const map: Record<string, boolean> = {};
    (claimsRes.data || []).forEach((c: any) => { map[c.challenge_key] = true; });
    setClaims(map);
  }, [userId, weekStart]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const remainMs = Math.max(0, nextReset.getTime() - now);
  const days = Math.floor(remainMs / 86400000);
  const hours = Math.floor((remainMs % 86400000) / 3600000);
  const mins = Math.floor((remainMs % 3600000) / 60000);
  const secs = Math.floor((remainMs % 60000) / 1000);

  async function handleClaim(ck: 'refer' | 'watch_ads', tier: number, rewardAmt: number) {
    const id = `${ck}_${tier}`;
    setBusy(id);
    try {
      toast.info("📺 Watch a quick ad to claim...");
      await showRandomAd();
      const r = await claimWeeklyChallenge(userId, ck, tier);
      if (r.success) { setReward({ show: true, amount: r.amount || rewardAmt }); load(); }
      else toast.error(r.message || "Claim failed");
    } catch { toast.error("Claim failed"); }
    setBusy(null);
  }

  const Tier = ({ ck, tier, rewardAmt, progress }: { ck: 'refer' | 'watch_ads'; tier: number; rewardAmt: number; progress: number }) => {
    const id = `${ck}_${tier}`;
    const claimed = !!claims[id];
    const eligible = progress >= tier;
    const pct = Math.min(100, (progress / tier) * 100);
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        className={`rounded-xl p-3 border ${claimed ? 'border-bunny-green/40 bg-bunny-green/5'
          : eligible ? 'border-bunny-gold/50 bg-gradient-to-br from-bunny-gold/15 to-bunny-pink/10 animate-pulse'
            : 'border-bunny-pink/15 bg-card'}`}
      >
        <div className="flex justify-between items-center mb-1.5">
          <p className="text-xs font-bold">{ck === 'refer' ? '👥' : '📺'} {tier} {ck === 'refer' ? 'Refers' : 'Ads'}</p>
          <span className="text-xs font-bold text-gradient-bunny">+{rewardAmt} 🐰</span>
        </div>
        <div className="h-1.5 bg-background/50 rounded-full overflow-hidden mb-2">
          <motion.div className="h-full bg-gradient-bunny" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
        </div>
        <div className="flex justify-between items-center">
          <p className="text-[10px] text-muted-foreground">{progress}/{tier}</p>
          {claimed ? (
            <span className="text-[10px] text-bunny-green font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Claimed</span>
          ) : (
            <Button size="sm" disabled={!eligible || busy === id} onClick={() => handleClaim(ck, tier, rewardAmt)}
              className="h-6 text-[10px] bg-gradient-bunny text-primary-foreground border-0 disabled:opacity-50">
              {busy === id ? <Loader2 className="w-3 h-3 animate-spin" /> : eligible ? <Sparkles className="w-3 h-3 mr-1" /> : null}
              {eligible ? 'Claim' : 'Locked'}
            </Button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      <RewardPopup show={reward.show} amount={reward.amount} message="WEEKLY REWARD!" onClose={() => setReward({ show: false, amount: 0 })} />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-bunny-gold/20 via-card to-bunny-pink/10 rounded-2xl p-4 border border-bunny-gold/30"
      >
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-5 h-5 text-bunny-gold" />
          <p className="font-display font-bold text-gradient-bunny">🏆 Weekly Challenges</p>
        </div>
        <p className="text-[11px] text-muted-foreground">Resets every Sunday 24:00 UTC. Watch an ad to claim each reward.</p>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <Clock className="w-3.5 h-3.5 text-bunny-gold" />
          <AnimatePresence mode="wait">
            <motion.span key={`${days}-${hours}-${mins}`}
              initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 3 }}
              className="font-mono font-bold text-bunny-gold-soft"
            >
              {days}d {String(hours).padStart(2, '0')}h {String(mins).padStart(2, '0')}m {String(secs).padStart(2, '0')}s
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.div>

      <div>
        <p className="text-xs font-bold mb-2">👥 Referral Challenge — Active this week: {refers}</p>
        <div className="grid grid-cols-2 gap-2">
          {REFER_TIERS.map(t => <Tier key={t.tier} ck="refer" tier={t.tier} rewardAmt={t.reward} progress={refers} />)}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold mb-2">📺 Watch Ads Challenge — This week: {ads}</p>
        <div className="grid grid-cols-2 gap-2">
          {ADS_TIERS.map(t => <Tier key={t.tier} ck="watch_ads" tier={t.tier} rewardAmt={t.reward} progress={ads} />)}
        </div>
      </div>
    </div>
  );
}
