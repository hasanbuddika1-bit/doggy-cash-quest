import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Pickaxe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMining, startMining, claimMining } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  userId: string;
  onClaimed?: (amount: number) => void;
}

interface MiningState {
  active: boolean;
  ready: boolean;
  ends_at?: string;
  amount: number;
  rate: number;
}

function fmt(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function MiningCard({ userId, onClaimed }: Props) {
  const [state, setState] = useState<MiningState>({ active: false, ready: false, amount: 0, rate: 100 });
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const r = await getMining(userId);
      setState({ active: !!r.active, ready: !!r.ready, ends_at: r.ends_at, amount: Number(r.amount || 100), rate: Number(r.rate || 100) });
    } catch { /* offline */ }
  }, [userId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  useEffect(() => {
    if (state.active && state.ends_at && now >= new Date(state.ends_at).getTime() && !state.ready) {
      setState((s) => ({ ...s, ready: true }));
    }
  }, [now, state]);

  const endsMs = state.ends_at ? new Date(state.ends_at).getTime() : 0;
  const remaining = endsMs - now;
  const isReady = state.active && remaining <= 0;
  const progress = state.active
    ? Math.min(100, Math.max(0, 100 - (remaining / (60 * 60 * 1000)) * 100))
    : 0;
  const mined = state.active ? Math.floor((progress / 100) * state.amount) : 0;

  async function handleStart() {
    if (busy.current) return;
    busy.current = true; setLoading(true);
    try {
      const r = await startMining(userId);
      if (r.success) { toast.success("⛏️ Mining started! Come back in 1 hour."); await load(); }
      else toast.error(r.message || "Could not start mining");
    } catch { toast.error("Could not start mining"); }
    setLoading(false); busy.current = false;
  }

  async function handleClaim() {
    if (busy.current) return;
    busy.current = true; setLoading(true);
    try {
      const r = await claimMining(userId);
      if (r.success) { onClaimed?.(Number(r.amount || 0)); await load(); }
      else toast.error(r.message || "Not ready yet");
    } catch { toast.error("Claim failed"); }
    setLoading(false); busy.current = false;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="card-3d p-5 relative overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-bunny-gold/10 blur-2xl" />

      <div className="flex items-center justify-between mb-4 relative">
        <div>
          <p className="font-display font-bold text-lg text-3d-gold">⛏️ Bunny Mining</p>
          <p className="text-[11px] text-muted-foreground">{state.rate} 🐰 every hour</p>
        </div>
        <div className="relative w-14 h-14">
          {state.active && !isReady && (
            <span className="absolute inset-0 rounded-full border-2 border-bunny-gold/60 animate-pulse-ring" />
          )}
          <div className={`w-14 h-14 rounded-full coin-3d flex items-center justify-center text-2xl ${state.active && !isReady ? "animate-spin-slow" : ""}`}>
            🐰
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="relative h-4 rounded-full bg-bunny-purple-deep/70 overflow-hidden border border-bunny-lavender/25 mb-2">
        <motion.div
          className="h-full bg-gradient-to-r from-bunny-gold via-bunny-gold-soft to-bunny-pink"
          animate={{ width: `${state.active ? progress : 0}%` }}
          transition={{ ease: "linear", duration: 0.5 }}
        />
        <div className="absolute inset-0 shimmer" />
      </div>

      <div className="flex items-center justify-between text-xs mb-4">
        <span className="text-muted-foreground">
          {state.active ? (isReady ? "✅ Full — ready to claim" : `⏳ ${fmt(remaining)} left`) : "💤 Idle"}
        </span>
        <span className="font-bold text-bunny-gold-soft">{state.active ? mined : 0} / {state.amount} 🐰</span>
      </div>

      {!state.active ? (
        <Button onClick={handleStart} disabled={loading} className="w-full h-13 py-4 btn-3d border-0 text-base">
          {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Pickaxe className="w-5 h-5 mr-2" />}
          Start Mining
        </Button>
      ) : isReady ? (
        <Button onClick={handleClaim} disabled={loading} className="w-full h-13 py-4 btn-3d btn-3d-pink border-0 text-base">
          {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <span className="mr-2">🎉</span>}
          Claim {state.amount} 🐰
        </Button>
      ) : (
        <div className="w-full text-center py-3 rounded-2xl bg-bunny-purple-deep/50 border border-bunny-lavender/20 font-display font-bold text-bunny-gold-soft">
          {fmt(remaining)}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        You get a Telegram alert when your mining is full 🔔
      </p>
    </motion.div>
  );
}
