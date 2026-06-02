import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, Loader2, Tv, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { processAdReward } from "@/lib/api";
import { RewardPopup } from "@/components/RewardPopup";
import { GuideButton } from "@/components/GuideButton";
import { toast } from "sonner";
import adsgramLogo from "@/assets/logo-adsgram.png";
import monetagLogo from "@/assets/logo-monetag.png";
import adexiumLogo from "@/assets/logo-adexium.png";

interface Props { userId: string }

const COOLDOWN_HOURS = 24;
const REWARD_PER_AD = 5;

const NETWORKS = [
  { key: "adsgram",  name: "Adsgram AI",   slots: 20, logo: adsgramLogo, blockId: "",    color: "from-cyan-500/30 to-blue-500/15", border: "border-cyan-400/40" },
  { key: "monetag",  name: "Monetag",      slots: 15, logo: monetagLogo, blockId: "",    color: "from-green-500/30 to-emerald-500/15", border: "border-green-400/40" },
  { key: "adexium",  name: "Adexium",      slots: 5,  logo: adexiumLogo, blockId: "",    color: "from-fuchsia-500/30 to-purple-500/15", border: "border-fuchsia-400/40" },
] as const;

type Network = typeof NETWORKS[number];

export function WatchAdsTab({ userId }: Props) {
  const [selected, setSelected] = useState<Network | null>(null);

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-bunny-pink/20 to-bunny-lavender/20 rounded-2xl px-4 py-3 border border-bunny-pink/30 flex-1 mr-2"
        >
          <p className="font-display font-bold text-gradient-bunny text-sm">📺 Watch Ads & Earn</p>
          <p className="text-[11px] text-muted-foreground">Pick a network → watch ads → earn 🐰</p>
        </motion.div>
        <GuideButton
          title="Watch Ads Guide"
          steps={[
            "Tap an ad network card (Adsgram / Monetag / Adexium).",
            `Watch each ad slot — earn ${REWARD_PER_AD} 🐰 per ad.`,
            `Each slot resets every ${COOLDOWN_HOURS} hours.`,
            "Daily 40 ad views are required to withdraw.",
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        {!selected ? (
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid grid-cols-1 gap-3"
          >
            {NETWORKS.map((n, i) => (
              <motion.button key={n.key}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.01 }}
                onClick={() => setSelected(n)}
                className={`bg-gradient-to-br ${n.color} rounded-2xl p-5 border-2 ${n.border} text-left relative overflow-hidden`}
              >
                <div className="absolute inset-0 shimmer opacity-30 pointer-events-none" />
                <div className="flex items-center gap-4 relative">
                  <div className="w-16 h-16 rounded-2xl bg-white/95 flex items-center justify-center p-2 shadow-lg flex-none">
                    <img src={n.logo} alt={n.name} loading="lazy" width={64} height={64} className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1">
                    <p className="font-display font-bold text-lg">{n.name}</p>
                    <p className="text-xs text-muted-foreground">{n.slots} ads • {REWARD_PER_AD} 🐰 each</p>
                    <p className="text-[10px] text-bunny-gold-soft mt-0.5">↻ {COOLDOWN_HOURS}h cooldown per ad</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Max</p>
                    <p className="text-xl font-display font-bold text-gradient-gold">{n.slots * REWARD_PER_AD} 🐰</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <NetworkAds key={selected.key} network={selected} userId={userId} onBack={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function NetworkAds({ network, userId, onBack }: { network: Network; userId: string; onBack: () => void }) {
  const [watched, setWatched] = useState<Record<number, number>>({});
  const [watchingAd, setWatchingAd] = useState<number | null>(null);
  const [reward, setReward] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 });
  const [showAdError, setShowAdError] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("ad_watches")
      .select("ad_index, created_at, network")
      .eq("user_id", userId)
      .eq("network", network.key)
      .order("created_at", { ascending: false });
    const map: Record<number, number> = {};
    (data || []).forEach((w: any) => {
      if (!map[w.ad_index]) map[w.ad_index] = new Date(w.created_at).getTime();
    });
    setWatched(map);
  }, [userId, network.key]);

  useEffect(() => { load(); }, [load]);

  function canWatch(i: number) {
    const last = watched[i];
    if (!last) return true;
    return Date.now() - last >= COOLDOWN_HOURS * 3600 * 1000;
  }
  function cooldownSec(i: number) {
    const last = watched[i];
    if (!last) return 0;
    return Math.max(0, COOLDOWN_HOURS * 3600 - Math.floor((Date.now() - last) / 1000));
  }

  async function handleWatch(adIndex: number) {
    if (!canWatch(adIndex)) { toast.error("Wait until cooldown ends!"); return; }
    setWatchingAd(adIndex);

    // Network is placeholder — auto-grant reward after short delay for now
    if (!network.blockId) {
      setTimeout(async () => {
        await grantReward(adIndex);
      }, 1500);
      return;
    }

    try {
      const Adsgram = (window as any).Adsgram;
      const ctrl = Adsgram?.init?.({ blockId: network.blockId, debug: false });
      if (!ctrl) { setShowAdError(true); setWatchingAd(null); return; }
      const start = Date.now();
      try { await ctrl.show(); } catch { /* user closed early */ }
      const secs = (Date.now() - start) / 1000;
      if (secs < 25) { setShowAdError(true); setWatchingAd(null); return; }
      await grantReward(adIndex, secs);
    } catch {
      toast.error("Failed to load ad");
      setWatchingAd(null);
    }
  }

  async function grantReward(adIndex: number, secs = 30) {
    try {
      await processAdReward(userId, adIndex, REWARD_PER_AD, secs, network.key);
      setReward({ show: true, amount: REWARD_PER_AD });
      load();
    } catch {
      toast.error("Failed to credit reward");
    }
    setWatchingAd(null);
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <RewardPopup show={reward.show} amount={reward.amount} message="AD REWARD!" onClose={() => setReward({ show: false, amount: 0 })} />

      {showAdError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAdError(false)}>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-7 mx-6 text-center max-w-sm border-4 border-bunny-pink"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No Carrots Found!</h3>
            <p className="text-sm text-gray-600 mb-4">👆 Tap the ad shown, start the advertised bot, then come back! 🥕</p>
            <Button onClick={() => setShowAdError(false)}
              className="w-full h-11 rounded-2xl bg-gradient-bunny text-primary-foreground font-bold">
              TRY AGAIN
            </Button>
          </motion.div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-3">
        <Button size="sm" variant="outline" onClick={onBack} className="h-9 border-bunny-pink/30">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <img src={network.logo} alt={network.name} className="w-9 h-9 rounded-xl bg-white/95 p-1" />
          <p className="font-display font-bold text-gradient-bunny">{network.name}</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {Array.from({ length: network.slots }).map((_, idx) => {
          const adIndex = idx + 1;
          const available = canWatch(adIndex);
          const cd = cooldownSec(adIndex);
          const watching = watchingAd === adIndex;
          return (
            <motion.div key={adIndex}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
              className={`bg-gradient-to-r from-card to-card/80 rounded-2xl border overflow-hidden ${
                !available ? 'border-border opacity-70' : 'border-bunny-pink/25'
              }`}
            >
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-bunny flex items-center justify-center text-primary-foreground font-bold text-xs">
                    AD
                  </div>
                  <div>
                    <p className="font-display font-bold text-sm">Ad #{adIndex}</p>
                    <p className="text-xs font-bold text-gradient-bunny">🐰 {REWARD_PER_AD}</p>
                  </div>
                </div>
                {!available ? (
                  <CooldownTimer key={`cd-${adIndex}-${cd}`} seconds={cd} onComplete={load} />
                ) : (
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={() => handleWatch(adIndex)}
                      disabled={watching || watchingAd !== null}
                      className="h-9 px-5 rounded-2xl bg-gradient-bunny text-primary-foreground font-bold text-sm border-0 shadow-md"
                    >
                      {watching ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Tv className="w-4 h-4 mr-1" />}
                      Watch
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function CooldownTimer({ seconds: initial, onComplete }: { seconds: number; onComplete: () => void }) {
  const [secs, setSecs] = useState(initial);
  useEffect(() => {
    if (secs <= 0) { onComplete(); return; }
    const t = setInterval(() => setSecs(s => { if (s <= 1) { clearInterval(t); onComplete(); return 0; } return s - 1; }), 1000);
    return () => clearInterval(t);
  }, [secs, onComplete]);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return (
    <div className="flex items-center gap-1.5 bg-muted/40 rounded-xl px-3 py-2">
      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-xs font-mono font-bold text-muted-foreground">
        {h > 0 ? `${h}h ${m}m` : `${m}:${String(s).padStart(2, '0')}`}
      </span>
    </div>
  );
}
