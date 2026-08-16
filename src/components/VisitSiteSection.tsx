import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Clock, Loader2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { processClick } from "@/lib/api";
import { getTelegramWebApp } from "@/lib/telegram";
import { RewardPopup } from "@/components/RewardPopup";
import { toast } from "sonner";

const VISIT_LINKS = [
  "https://omg10.com/4/10176898",
  "https://omg10.com/4/10339385",
];

/** 🌐 Visit Site — open a sponsor link for 10s and earn 5 🐰 (max 2/hour). */
export function VisitSiteSection({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [canClick, setCanClick] = useState(true);
  const [reward, setReward] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 });

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("clicks").select("created_at").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(20);
    if (data && data.length > 0) {
      const diff = 60 - Math.floor((Date.now() - new Date(data[0].created_at).getTime()) / 1000);
      if (diff > 0) { setTimer(diff); setCanClick(false); }
      const hourAgo = Date.now() - 3600000;
      if (data.filter(c => new Date(c.created_at).getTime() > hourAgo).length >= 2) setCanClick(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (timer > 0) {
      const i = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(i);
    }
    setCanClick(true);
  }, [timer]);

  async function handleVisit() {
    setLoading(true);
    const link = VISIT_LINKS[Math.floor(Math.random() * VISIT_LINKS.length)];
    const wa = getTelegramWebApp();
    if (wa) wa.openLink(link); else window.open(link, "_blank");
    setTimer(10);
    setTimeout(async () => {
      try {
        const r = await processClick(userId);
        if (r.success) { setReward({ show: true, amount: r.earned }); setTimer(60); setCanClick(false); load(); }
        else toast.error(r.message || "Visit failed");
      } catch { toast.error("Visit failed"); }
      setLoading(false);
    }, 10000);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-bunny-green/25 to-emerald-500/10 rounded-2xl p-5 border-2 border-bunny-green/40"
    >
      <RewardPopup show={reward.show} amount={reward.amount} message="VISIT REWARD!" onClose={() => setReward({ show: false, amount: 0 })} />
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/95 flex items-center justify-center flex-none shadow-lg">
          <Globe className="w-8 h-8 text-emerald-600" />
        </div>
        <div className="flex-1">
          <p className="font-display font-bold text-lg">🌐 Visit Site</p>
          <p className="text-xs text-muted-foreground">Stay 10s on the site • 5 🐰 each</p>
          <p className="text-[10px] text-bunny-gold-soft mt-0.5">Max 2 visits per hour</p>
        </div>
      </div>

      <div className="mt-4">
        {timer > 0 ? (
          <div className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-background/40 border border-bunny-green/25">
            <Clock className="w-4 h-4 text-bunny-green" />
            <span className="font-display font-bold text-bunny-green">{timer}s</span>
            <span className="text-xs text-muted-foreground">{loading ? "⏳ Visiting..." : "Cooldown"}</span>
          </div>
        ) : (
          <Button onClick={handleVisit} disabled={!canClick || loading}
            className="w-full h-12 btn-3d border-0 font-bold"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Globe className="w-5 h-5 mr-2" />}
            Visit Site & Earn
          </Button>
        )}
      </div>
    </motion.div>
  );
}
