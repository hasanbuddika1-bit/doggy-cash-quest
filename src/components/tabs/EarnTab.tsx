import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GuideButton } from "@/components/GuideButton";

interface EarnTabProps { userId: string; telegramId: number; }


export function EarnTab({ userId, telegramId }: EarnTabProps) {

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center justify-between mb-3">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-bunny-pink/20 to-bunny-lavender/20 rounded-2xl px-4 py-3 border border-bunny-pink/30 flex-1 mr-2"
        >
          <p className="font-display font-bold text-3d-gold text-sm">👥 Refer & Earn</p>
          <p className="text-[11px] text-muted-foreground">Invite friends • Sponsor clicks</p>
        </motion.div>
        <GuideButton title="Earn Guide" steps={[
          "👥 Refer: Join reward 150 🐰, Day 1 ten ads +500 🐰, Day 2 ten ads +700 🐰.",
          "⏳ Day 1 + Day 2 must be finished within 48 hours or the referral expires.",
          "👆 Visit Site rewards moved to the Ads tab.",
          "🎁 Reward Codes are now on the Home tab.",
        ]} />
      </div>

      <ReferSection userId={userId} telegramId={telegramId} />
    </div>
  );
}

function ReferSection({ userId, telegramId }: { userId: string; telegramId: number }) {
  const [referrals, setReferrals] = useState<any[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from("referrals").select("*").eq("referrer_id", userId).order("created_at", { ascending: false });
    const ids = (data || []).map(r => r.referee_id);
    let umap: Record<string, any> = {};
    if (ids.length) {
      const { data: us } = await supabase.from("users").select("id, username, first_name, telegram_id").in("id", ids);
      (us || []).forEach((u: any) => { umap[u.id] = u; });
    }
    setReferrals((data || []).map(r => ({ ...r, referred_user: umap[r.referee_id] })));
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const referLink = `https://t.me/Bunnyearnbot/bunnytoken?startapp=ref_${telegramId}`;
  const day1 = referrals.filter(r => r.main_reward_paid || r.status === 'day1_complete' || r.status === 'active').length;
  const day2 = referrals.filter(r => r.partner_reward_paid || r.status === 'active').length;

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-bunny-pink/25 via-card to-bunny-lavender/15 rounded-2xl p-5 border border-bunny-pink/30 text-center"
      >
        <motion.span animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="text-4xl inline-block">👥</motion.span>
        <p className="text-xs text-muted-foreground mb-1 mt-2">Total: {referrals.length} • Day 1: {day1} • Day 2: {day2}</p>
        <p className="text-2xl font-display font-bold text-3d-gold">150 + 500 + 700 = 1350 🐰</p>
        <p className="text-[11px] text-muted-foreground mt-1">Join +150 🐰 • Day 1 ten ads +500 🐰 • Day 2 ten ads +700 🐰</p>
        <p className="text-[10px] text-destructive mt-1 font-semibold">Must complete within 2 days, otherwise fake referral reward is rejected.</p>
      </motion.div>

      <div className="bg-card rounded-xl p-3 border border-bunny-pink/20">
        <p className="text-xs text-muted-foreground mb-2 font-bold">🔗 Your Referral Link</p>
        <div className="flex gap-2">
          <Input value={referLink} readOnly className="text-xs h-9 bg-muted" />
          <Button size="sm" className="h-9 bg-gradient-bunny text-primary-foreground border-0" onClick={() => {
            navigator.clipboard.writeText(referLink); toast.success("📋 Link copied!");
          }}>
            <Copy className="w-3 h-3 mr-1" /> Copy
          </Button>
        </div>
      </div>

      <div className="bg-destructive/10 rounded-xl p-3 border border-destructive/30">
        <p className="text-xs text-destructive font-semibold">⚠️ Warning</p>
        <p className="text-xs text-destructive/80 mt-1">Multiple accounts & VPN usage = auto-ban!</p>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-2 font-bold">📊 Referral History ({referrals.length})</p>
        {referrals.length === 0 && (
          <div className="text-center py-8">
            <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="text-4xl">🐇</motion.div>
            <p className="text-xs text-muted-foreground mt-2">No referrals yet. Share your link!</p>
          </div>
        )}
        {referrals.map((r) => {
          const statusBadge =
            r.status === 'active'      ? { label: '✅ Completed 1350', cls: 'bg-bunny-green/20 text-bunny-green' } :
            r.status === 'day1_complete' ? { label: '⚡ Day 1 Done',    cls: 'bg-bunny-gold/20 text-bunny-gold-soft' } :
            r.status === 'expired'     ? { label: '❌ Expired',       cls: 'bg-destructive/20 text-destructive' } :
                                         { label: '⏳ Joined +150',    cls: 'bg-bunny-pink/20 text-bunny-pink-light' };
          return (
            <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between bg-card rounded-xl p-3 border border-bunny-pink/15 mb-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">@{r.referred_user?.username || r.referred_user?.first_name || r.referred_user?.telegram_id || 'Unknown'}</p>
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${statusBadge.cls}`}>{statusBadge.label}</span>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Earned</p>
                <p className="text-xs font-bold text-gradient-bunny">{(Number(r.reward_amount || 0) + Number(r.commission_earned || 0)).toFixed(0)} 🐰</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
