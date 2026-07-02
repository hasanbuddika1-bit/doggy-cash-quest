import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTelegramWebApp } from "@/lib/telegram";

const HIVE_URL = "https://t.me/Hiveearnbot/play?startapp=ref_HIVE2HMD5CZ";

export function HiveEarnPopup() {
  const [open, setOpen] = useState(true);
  const [counter, setCounter] = useState(20);

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => {
      setCounter((c) => {
        if (c <= 1) { clearInterval(t); setOpen(false); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [open]);

  function openHive() {
    const wa = getTelegramWebApp();
    if (wa) wa.openTelegramLink(HIVE_URL);
    else window.open(HIVE_URL, "_blank");
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.85, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-3xl p-6 border border-amber-400/40 bg-gradient-to-br from-amber-500/25 via-slate-900 to-amber-900/20 shadow-[0_0_50px_rgba(251,191,36,0.35)]"
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-center">
              <div className="text-5xl mb-2 animate-hop">🐝</div>
              <h2 className="font-display font-bold text-2xl text-gradient-gold mb-2">
                Our New Mini App
              </h2>
              <p className="text-xl font-bold text-amber-300 mb-3">Hive Earn 🍯</p>
              <p className="text-sm text-foreground/90 leading-relaxed mb-4">
                Watch ads, complete tasks, refer friends, and earn real money on our
                brand-new mini app. Withdraw instantly as{" "}
                <span className="font-bold text-amber-300">USDT (BEP20)</span>.
              </p>

              <Button
                onClick={openHive}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold text-base shadow-lg border-0 hover:brightness-110"
              >
                🐝 Open Hive Earn
              </Button>

              <p className="text-[11px] text-muted-foreground mt-3">
                Auto-closes in <span className="font-bold text-amber-300">{counter}s</span>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
