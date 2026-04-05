import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { verifyChannel, claimWelcomeBonus } from "@/lib/api";
import { getCurrentUser, getTelegramUser, getTelegramWebApp } from "@/lib/telegram";
import { toast } from "sonner";
import logo from "@/assets/doggy-cash-logo.png";

interface Channel {
  id: string;
  name: string;
  link: string;
  telegram_username: string;
  country_restriction: string | null;
}

interface AccessTasksProps {
  userId: string;
  userCountry: string | null;
  onComplete: () => void;
}

export function AccessTasks({ userId, userCountry, onComplete }: AccessTasksProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [verifications, setVerifications] = useState<Record<string, boolean>>({});
  const [verifying, setVerifying] = useState<string | null>(null);
  const [botStarted, setBotStarted] = useState(false);
  const [startingBot, setStartingBot] = useState(false);
  const [claimingBonus, setClaimingBonus] = useState(false);
  const telegramUser = getCurrentUser();

  useEffect(() => {
    loadChannels();
    loadVerifications();
  }, []);

  async function loadChannels() {
    const { data } = await supabase.from("channels").select("*").eq("required", true).order("sort_order");
    if (data) {
      const filtered = data.filter(ch => {
        if (ch.country_restriction && userCountry !== ch.country_restriction) return false;
        return true;
      });
      setChannels(filtered);
    }
  }

  async function loadVerifications() {
    const { data } = await supabase.from("channel_verifications").select("*").eq("user_id", userId);
    if (data) {
      const map: Record<string, boolean> = {};
      data.forEach(v => { if (v.verified) map[v.channel_id] = true; });
      setVerifications(map);
    }
  }

  function handleStartBot() {
    setStartingBot(true);
    const webapp = getTelegramWebApp();
    if (webapp) {
      webapp.openTelegramLink("https://t.me/Goggycashbot?start=access");
    } else {
      window.open("https://t.me/Goggycashbot?start=access", "_blank");
    }
    // Auto-mark as done after a short delay (bot is started by opening the link)
    setTimeout(() => {
      setBotStarted(true);
      setStartingBot(false);
      toast.success("✅ Bot started!");
    }, 2000);
  }

  function handleJoin(link: string) {
    const webapp = getTelegramWebApp();
    if (webapp) {
      webapp.openTelegramLink(link);
    } else {
      window.open(link, "_blank");
    }
  }

  async function handleVerify(channel: Channel) {
    const currentTelegramUser = getTelegramUser();
    if (!currentTelegramUser) {
      toast.error("Open this mini app inside Telegram to verify channels.");
      return;
    }

    setVerifying(channel.id);
    try {
      const result = await verifyChannel(userId, channel.telegram_username, currentTelegramUser.id);
      if (result.verified) {
        setVerifications(prev => ({ ...prev, [channel.id]: true }));
        toast.success(`✅ ${channel.name} verified!`);
      } else if (result.reason === "bot_missing_channel_access") {
        toast.error("Channel verification is temporarily unavailable. Please try again soon.");
      } else if (result.reason === "telegram_api_error") {
        toast.error("Telegram verification failed. Please try again.");
      } else {
        toast.error(`❌ Please join ${channel.name} first and then try again!`);
      }
    } catch {
      toast.error("Verification failed. Try again!");
    }
    setVerifying(null);
  }

  const allVerified = channels.length > 0 && channels.every(ch => verifications[ch.id]) && botStarted;

  async function handleClaimBonus() {
    setClaimingBonus(true);
    try {
      await claimWelcomeBonus(userId, telegramUser.id);
      toast.success("🎉 Welcome Bonus: +50 Doggy!", { duration: 4000 });
      onComplete();
    } catch {
      toast.error("Failed to claim bonus");
    }
    setClaimingBonus(false);
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
        <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 glow-gold">
          <img src={logo} alt="Doggy Cash" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-2xl font-display font-bold text-gradient-gold">Welcome to Doggy Cash!</h1>
        <p className="text-muted-foreground text-sm mt-1">Complete these tasks to get started 🐾</p>
      </motion.div>

      <div className="space-y-3 max-w-md mx-auto">
        {/* Start Bot */}
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          className={`bg-card rounded-xl p-4 border ${botStarted ? 'border-secondary/50' : 'border-border'}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <p className="font-semibold text-sm">Start Bot</p>
                <p className="text-xs text-muted-foreground">Open and start the bot</p>
              </div>
            </div>
            {botStarted ? (
              <div className="flex items-center gap-1">
                <Check className="w-5 h-5 text-secondary" />
                <span className="text-xs text-secondary font-bold">Done</span>
              </div>
            ) : (
              <Button size="sm" className="text-xs h-8 bg-gradient-gold text-primary-foreground" onClick={handleStartBot} disabled={startingBot}>
                {startingBot ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ExternalLink className="w-3 h-3 mr-1" />}
                Start
              </Button>
            )}
          </div>
        </motion.div>

        {/* Channels */}
        {channels.map((channel, i) => {
          const isVerified = verifications[channel.id];
          return (
            <motion.div
              key={channel.id}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className={`bg-card rounded-xl p-4 border ${isVerified ? 'border-secondary/50' : 'border-border'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📢</span>
                  <div>
                    <p className="font-semibold text-sm">{channel.name}</p>
                    <p className="text-xs text-muted-foreground">Join channel</p>
                  </div>
                </div>
                {isVerified ? (
                  <div className="flex items-center gap-1">
                    <Check className="w-5 h-5 text-secondary" />
                    <span className="text-xs text-secondary font-bold">Done</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => handleJoin(channel.link)}>
                      <ExternalLink className="w-3 h-3 mr-1" /> Join
                    </Button>
                    <Button size="sm" className="text-xs h-8 bg-gradient-gold text-primary-foreground" onClick={() => handleVerify(channel)}
                      disabled={verifying === channel.id}
                    >
                      {verifying === channel.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3 mr-1" />}
                      Verify
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Claim Welcome Bonus */}
        <AnimatePresence>
          {allVerified && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="pt-4"
            >
              <Button
                onClick={handleClaimBonus}
                disabled={claimingBonus}
                className="w-full h-14 bg-gradient-gold text-primary-foreground font-bold text-lg rounded-2xl glow-gold"
              >
                {claimingBonus ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <span className="mr-2">🎁</span>
                )}
                Claim Welcome Bonus
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
