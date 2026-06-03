import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Loader2, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getTelegramWebApp } from "@/lib/telegram";
import { toast } from "sonner";
import bunnyLogo from "@/assets/bunny-logo.png";

interface Props {
  userId: string;
  telegramId: number;
  onAllow: () => void;
}

// One-time popup gate shown when notifications_enabled = false.
// User must Start the bot to allow notifications. Cannot be dismissed.
export function NotificationGate({ userId, telegramId, onAllow }: Props) {
  const [opening, setOpening] = useState(false);
  const [opened, setOpened] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Poll the database — once notifications_enabled flips true (e.g. user
  // pressed the bot Start button), automatically close.
  useEffect(() => {
    if (!opened) return;
    const t = setInterval(async () => {
      const { data } = await supabase.from("users").select("notifications_enabled").eq("id", userId).single();
      if (data?.notifications_enabled) { clearInterval(t); onAllow(); }
    }, 3000);
    return () => clearInterval(t);
  }, [opened, userId, onAllow]);

  function handleOpenBot() {
    setOpening(true);
    const url = `https://t.me/Bunnyearnbot?start=notify_${telegramId}`;
    const wa = getTelegramWebApp();
    if (wa) wa.openTelegramLink(url); else window.open(url, "_blank");
    setTimeout(() => { setOpening(false); setOpened(true); }, 1500);
  }

  async function handleConfirm() {
    setConfirming(true);
    try {
      const { error } = await supabase.from("users").update({ notifications_enabled: true }).eq("id", userId);
      if (error) throw error;
      toast.success("🔔 Notifications enabled!");
      onAllow();
    } catch {
      toast.error("Try again — make sure you started the bot.");
    }
    setConfirming(false);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-card rounded-3xl border-2 border-bunny-pink/40 p-6 max-w-sm w-full shadow-2xl glow-pink"
        >
          <div className="w-28 h-28 mx-auto mb-4 glow-pink">
            <img src={bunnyLogo} alt="Bunny Earn Hub" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-xl font-display font-bold text-gradient-bunny text-center mb-2">
            🔔 Allow Notifications
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-5 leading-relaxed">
            Start <b>@Bunnyearnbot</b> to receive payment, referral & reward updates. Required to use the app.
          </p>

          <div className="space-y-2.5">
            <Button
              onClick={handleOpenBot}
              disabled={opening}
              className="w-full h-12 bg-gradient-bunny text-primary-foreground font-bold rounded-2xl"
            >
              {opening ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
              {opened ? "Open Bot Again" : "Open Bot & Press Start"}
            </Button>
            {opened && (
              <Button
                onClick={handleConfirm}
                disabled={confirming}
                className="w-full h-12 bg-gradient-green text-white font-bold rounded-2xl"
              >
                {confirming ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                I've started the bot
              </Button>
            )}
          </div>

          <p className="text-[10px] text-center text-muted-foreground mt-4 flex items-center justify-center gap-1">
            <Bell className="w-3 h-3" /> This popup will not close until notifications are enabled.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
