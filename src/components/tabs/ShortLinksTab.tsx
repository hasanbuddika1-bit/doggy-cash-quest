import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Gift, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { claimShortLink, getShortLinks, startShortLink } from "@/lib/api";
import { getStartParam, getTelegramWebApp } from "@/lib/telegram";
import { toast } from "sonner";
import { RewardPopup } from "@/components/RewardPopup";

interface Props { userId: string }

export function ShortLinksTab({ userId }: Props) {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [reward, setReward] = useState({ show: false, amount: 0 });

  const load = useCallback(async () => {
    const r = await getShortLinks(userId);
    setLinks(r.links || []);
  }, [userId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const start = getStartParam();
    if (!start?.startsWith("sl_")) return;
    const [, linkId, token] = start.match(/^sl_([^_]+)_(.+)$/) || [];
    if (!linkId || !token) return;
    (async () => {
      try {
        const r = await claimShortLink(userId, linkId, token);
        if (r.success) { setReward({ show: true, amount: Number(r.amount || 0) }); load(); }
        else toast.error(r.message || "Reward claim failed");
      } catch (e: any) { toast.error(e?.message || "Reward claim failed"); }
    })();
  }, [userId, load]);

  async function handleStart(link: any) {
    setLoading(link.id);
    try {
      const r = await startShortLink(userId, link.id);
      if (!r.success) throw new Error(r.message || "Try again later");
      const wa = getTelegramWebApp();
      if (wa) wa.openLink(r.short_url); else window.open(r.short_url, "_blank");
      toast.success("Open the final reward link to claim 🐰");
    } catch (e: any) { toast.error(e?.message || "Short link failed"); }
    setLoading(null);
  }

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      <RewardPopup show={reward.show} amount={reward.amount} message="SHORT LINK REWARD!" onClose={() => setReward({ show: false, amount: 0 })} />
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-bunny-pink/20 to-bunny-lavender/20 rounded-2xl px-4 py-3 border border-bunny-pink/30"
      >
        <p className="font-display font-bold text-gradient-bunny text-sm">🔗 Short Links</p>
        <p className="text-[11px] text-muted-foreground">Start link → finish sponsor page → get reward</p>
      </motion.div>

      {links.length === 0 && <div className="text-center py-10 text-sm text-muted-foreground">No short links available.</div>}
      {links.map((link, i) => {
        const nextAt = link.claim?.next_available_at ? new Date(link.claim.next_available_at).getTime() : 0;
        const locked = nextAt > Date.now();
        return (
          <motion.div key={link.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="bg-gradient-to-br from-card to-bunny-pink/10 rounded-2xl p-4 border border-bunny-pink/20"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display font-bold text-sm">{link.title}</p>
                <p className="text-xs text-gradient-bunny font-bold">+{Number(link.reward_amount || 0).toFixed(0)} 🐰</p>
                {locked && <p className="text-[10px] text-muted-foreground mt-1">Next: {new Date(nextAt).toLocaleString()}</p>}
              </div>
              <Button onClick={() => handleStart(link)} disabled={loading === link.id || locked}
                className="h-10 px-3 rounded-2xl bg-gradient-bunny text-primary-foreground font-bold text-xs"
              >
                {loading === link.id ? <Loader2 className="w-4 h-4 animate-spin" /> : locked ? <RotateCcw className="w-4 h-4 mr-1" /> : <Gift className="w-4 h-4 mr-1" />}
                {locked ? "24h" : "Reward Start"}
                {!locked && <ExternalLink className="w-3 h-3 ml-1" />}
              </Button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}