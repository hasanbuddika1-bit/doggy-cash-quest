import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Clock, Loader2, Tv, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { RewardPopup } from "@/components/RewardPopup";
import { toast } from "sonner";

interface WatchAdsTabProps {
  userId: string;
}

const AD_COUNT = 10;
const ADSGRAM_BLOCK_ID = "27106";
const MIN_WATCH_SECONDS = 33;

export function WatchAdsTab({ userId }: WatchAdsTabProps) {
  const [watchedAds, setWatchedAds] = useState<Record<number, number>>({});
  const [watchingAd, setWatchingAd] = useState<number | null>(null);
  const [reward, setReward] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 });
  const [adRewards, setAdRewards] = useState<Record<number, number>>({});
  const [showAdError, setShowAdError] = useState(false);

  const loadSettings = useCallback(async () => {
    const { data } = await supabase.from("app_settings").select("key, value").like("key", "ad_reward_%");
    if (data) {
      const map: Record<number, number> = {};
      data.forEach(s => {
        const idx = parseInt(s.key.replace("ad_reward_", ""));
        if (!isNaN(idx)) map[idx] = Number(s.value);
      });
      setAdRewards(map);
    }
  }, []);

  const loadWatchHistory = useCallback(async () => {
    const { data } = await supabase
      .from("ad_watches")
      .select("ad_index, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    if (data) {
      const map: Record<number, number> = {};
      data.forEach((w) => {
        if (!map[w.ad_index]) {
          map[w.ad_index] = new Date(w.created_at).getTime();
        }
      });
      setWatchedAds(map);
    }
  }, [userId]);

  useEffect(() => { 
    loadWatchHistory(); 
    loadSettings();
  }, [loadWatchHistory, loadSettings]);

  function canWatchAd(adIndex: number): boolean {
    const lastWatch = watchedAds[adIndex];
    if (!lastWatch) return true;
    return Date.now() - lastWatch >= 3600000;
  }

  function getCooldownSeconds(adIndex: number): number {
    const lastWatch = watchedAds[adIndex];
    if (!lastWatch) return 0;
    const diff = 3600 - Math.floor((Date.now() - lastWatch) / 1000);
    return Math.max(0, diff);
  }

  function getAdReward(adIndex: number): number {
    return adRewards[adIndex] || 20;
  }

  async function handleWatchAd(adIndex: number) {
    if (!canWatchAd(adIndex)) {
      toast.error("Please wait before watching this ad again!");
      return;
    }

    setWatchingAd(adIndex);
    
    try {
      // Try Adsgram
      const AdController = (window as any).Adsgram?.init?.({ blockId: ADSGRAM_BLOCK_ID });
      if (AdController) {
        const startTime = Date.now();
        try {
          await AdController.show();
          const watchDuration = (Date.now() - startTime) / 1000;
          
          if (watchDuration < MIN_WATCH_SECONDS) {
            setShowAdError(true);
            setWatchingAd(null);
            return;
          }
          
          await processAdReward(adIndex);
        } catch {
          // User closed ad early
          const watchDuration = (Date.now() - startTime) / 1000;
          if (watchDuration < MIN_WATCH_SECONDS) {
            setShowAdError(true);
            setWatchingAd(null);
            return;
          }
          await processAdReward(adIndex);
        }
      } else {
        // Fallback: simulate ad
        toast.info("📺 Ad is loading... Please wait");
        await new Promise(resolve => setTimeout(resolve, 3000));
        await processAdReward(adIndex);
      }
    } catch {
      toast.error("Failed to load ad");
      setWatchingAd(null);
    }
  }

  async function processAdReward(adIndex: number) {
    try {
      const adReward = getAdReward(adIndex);
      await supabase.from("ad_watches").insert({
        user_id: userId,
        ad_index: adIndex,
        earned: adReward,
      });

      const { data: user } = await supabase.from("users").select("balance").eq("id", userId).single();
      if (user) {
        await supabase.from("users").update({ 
          balance: Number(user.balance) + adReward 
        }).eq("id", userId);
      }

      setReward({ show: true, amount: adReward });
      loadWatchHistory();
    } catch {
      toast.error("Failed to process ad reward");
    }
    setWatchingAd(null);
  }

  return (
    <div className="px-4 pt-4 pb-24">
      <RewardPopup show={reward.show} amount={reward.amount} message="AD REWARD!" onClose={() => setReward({ show: false, amount: 0 })} />

      {/* Ad Error Popup */}
      {showAdError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAdError(false)}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 mx-6 text-center max-w-sm border-4 border-[hsl(var(--doggy-gold))]"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Bones Found!</h3>
            <p className="text-sm text-gray-600 mb-4">
              You must fully watch the ad (at least 33 seconds) to earn your bones. 🦴
            </p>
            <a 
              href="https://t.me/Doggycash1bot" 
              target="_blank"
              className="inline-block text-sm text-blue-600 underline mb-4"
            >
              🤖 Start our bot first
            </a>
            <Button 
              onClick={() => setShowAdError(false)}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-800 to-amber-900 text-white font-bold text-lg"
            >
              TRY AGAIN
            </Button>
          </motion.div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-[hsl(var(--doggy-gold))]/20 to-[hsl(var(--doggy-orange))]/20 rounded-2xl p-4 mb-4 border border-[hsl(var(--doggy-gold))]/30"
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">📺</span>
          <div>
            <p className="font-display font-bold text-gradient-gold">Watch Ads</p>
            <p className="text-xs text-muted-foreground">Watch ads to earn Doggy! 🦴 Each ad can be watched once per hour.</p>
          </div>
        </div>
      </motion.div>

      <div className="space-y-3">
        {Array.from({ length: AD_COUNT }).map((_, i) => {
          const adIndex = i + 1;
          const available = canWatchAd(adIndex);
          const cooldown = getCooldownSeconds(adIndex);
          const isWatching = watchingAd === adIndex;
          const adReward = getAdReward(adIndex);

          return (
            <motion.div
              key={adIndex}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.01 }}
              className={`bg-gradient-to-r from-card to-card/80 rounded-2xl border overflow-hidden ${
                !available ? 'border-border opacity-70' : 'border-[hsl(var(--doggy-gold))]/30'
              }`}
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/30">
                    <span className="text-xl font-bold text-[hsl(var(--doggy-gold))]">AD</span>
                  </div>
                  <div>
                    <p className="font-display font-bold text-sm">Watch Ad #{adIndex}</p>
                    <p className="text-xs font-bold text-gradient-gold flex items-center gap-1">🦴 {adReward}</p>
                  </div>
                </div>

                {!available ? (
                  <CooldownTimer key={`timer-${adIndex}-${cooldown}`} seconds={cooldown} onComplete={loadWatchHistory} />
                ) : (
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={() => handleWatchAd(adIndex)}
                      disabled={isWatching || watchingAd !== null}
                      className="h-10 px-5 rounded-2xl bg-gradient-to-b from-[hsl(var(--doggy-green))] to-emerald-700 text-white font-bold text-sm shadow-lg border-0"
                    >
                      {isWatching ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <Tv className="w-4 h-4 mr-1" />
                      )}
                      Watch
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function CooldownTimer({ seconds: initialSeconds, onComplete }: { seconds: number; onComplete: () => void }) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) { onComplete(); return; }
    const interval = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(interval); onComplete(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds, onComplete]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="flex items-center gap-1.5 bg-muted/30 rounded-xl px-3 py-2">
      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-xs font-mono font-bold text-muted-foreground">
        {mins}:{secs.toString().padStart(2, '0')}
      </span>
    </div>
  );
}
