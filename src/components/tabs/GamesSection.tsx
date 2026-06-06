import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { playGame } from "@/lib/api";
import { showRandomAd } from "@/lib/ads";
import { toast } from "sonner";
import { RewardPopup } from "@/components/RewardPopup";

const MIN_BET = 10;
const BET_OPTIONS = [10, 50, 100, 500, 1000];
const MULTIPLIER = 1.8;

interface GamesSectionProps { userId: string; }

type GameKey = "coin" | "mines" | "crash";

const GAMES: { key: GameKey; emoji: string; label: string; desc: string }[] = [
  { key: "coin",  emoji: "🪙", label: "Coin Flip", desc: "Pick Heads / Tails — win 1.8x your bet" },
  { key: "mines", emoji: "💣", label: "Mines",     desc: "Pick the safe tile of 4 — win 1.8x your bet" },
  { key: "crash", emoji: "🚀", label: "Crash",     desc: "Auto cash-out at 1.8x — beat the crash!" },
];

export function GamesSection({ userId }: GamesSectionProps) {
  const [active, setActive] = useState<GameKey>("coin");
  const [bet, setBet] = useState<number>(MIN_BET);
  const [balance, setBalance] = useState(0);
  const [busy, setBusy] = useState(false);
  const [reward, setReward] = useState<{ show: boolean; amount: number; msg?: string }>({ show: false, amount: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [livePlays, setLivePlays] = useState<Record<string, number>>({ coin: 0, mines: 0, crash: 0 });

  const loadCounts = useCallback(async () => {
    const games: GameKey[] = ["coin", "mines", "crash"];
    const counts: Record<string, number> = {};
    await Promise.all(games.map(async (g) => {
      const { count } = await supabase.from("game_plays").select("id", { count: "exact", head: true }).eq("game", g);
      counts[g] = count || 0;
    }));
    setLivePlays(counts);
  }, []);

  const load = useCallback(async () => {
    const [{ data: u }, { data: h }] = await Promise.all([
      supabase.from("users").select("balance").eq("id", userId).single(),
      supabase.from("game_plays").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    ]);
    setBalance(Number(u?.balance || 0));
    setHistory(h || []);
    loadCounts();
  }, [userId, loadCounts]);

  useEffect(() => { load(); }, [load]);

  // Live realtime: refresh play counts when any row inserted
  useEffect(() => {
    const ch = supabase.channel("game_plays_live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_plays" }, () => loadCounts())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadCounts]);

  async function play(game: GameKey, choice: any) {
    if (busy) return;
    if (balance < bet) { toast.error(`Need ${bet} 🐰 to play`); return; }
    setBusy(true);
    try {
      toast.info("📺 Watch a quick ad to play...");
      await showRandomAd();
      const r = await playGame(userId, game, bet, choice);
      if (!r.success) { toast.error(r.message || "Play failed"); }
      else {
        setBalance(Number(r.new_balance));
        if (r.won) setReward({ show: true, amount: Number(r.payout), msg: "🎉 YOU WON!" });
        else toast.error(`😿 Lost ${bet} 🐰 — try again!`);
        load();
      }
    } catch (e: any) { toast.error(e?.message || "Play failed"); }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <RewardPopup show={reward.show} amount={reward.amount} message={reward.msg || "WON!"} onClose={() => setReward({ show: false, amount: 0 })} />

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-bunny-gold/25 via-card to-bunny-pink/15 rounded-2xl p-4 border border-bunny-gold/30 text-center"
      >
        <p className="text-xs text-muted-foreground">Bet</p>
        <p className="text-2xl font-display font-bold text-gradient-bunny">{bet} 🐰 → x{MULTIPLIER}</p>
        <p className="text-[11px] text-muted-foreground mt-1">Balance: {balance.toFixed(0)} 🐰</p>
        <div className="flex gap-1.5 justify-center mt-2 flex-wrap">
          {BET_OPTIONS.map((b) => (
            <button key={b} onClick={() => setBet(b)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${bet === b ? "bg-gradient-bunny text-primary-foreground" : "bg-card border border-bunny-pink/20"}`}
            >{b}</button>
          ))}
        </div>
      </motion.div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {GAMES.map((g) => (
          <button key={g.key} onClick={() => setActive(g.key)}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex flex-col items-center gap-0.5 ${
              active === g.key ? "bg-gradient-bunny text-primary-foreground shadow-lg" : "bg-card text-muted-foreground border border-bunny-pink/15"
            }`}
          >
            <span className="flex items-center gap-1"><span>{g.emoji}</span> {g.label}</span>
            <span className="text-[9px] opacity-80">🟢 {livePlays[g.key] || 0} plays</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          className="bg-card rounded-2xl p-4 border border-bunny-pink/20"
        >
          <p className="text-sm font-bold mb-1">{GAMES.find(g => g.key === active)?.emoji} {GAMES.find(g => g.key === active)?.label}</p>
          <p className="text-xs text-muted-foreground mb-3">{GAMES.find(g => g.key === active)?.desc}</p>

          {active === "coin" && (
            <div className="grid grid-cols-2 gap-2">
              <Button disabled={busy} onClick={() => play("coin", "heads")} className="h-16 bg-gradient-bunny text-primary-foreground border-0 font-bold text-lg">
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "🌝 Heads"}
              </Button>
              <Button disabled={busy} onClick={() => play("coin", "tails")} className="h-16 bg-gradient-to-r from-bunny-lavender to-bunny-pink text-primary-foreground border-0 font-bold text-lg">
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "🌚 Tails"}
              </Button>
            </div>
          )}

          {active === "mines" && (
            <div className="grid grid-cols-4 gap-2">
              {[0,1,2,3].map((i) => (
                <Button key={i} disabled={busy} onClick={() => play("mines", i)}
                  className="h-20 bg-gradient-to-br from-bunny-pink/40 to-bunny-lavender/30 text-primary-foreground border-0 text-2xl"
                >
                  {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "❓"}
                </Button>
              ))}
            </div>
          )}

          {active === "crash" && (
            <Button disabled={busy} onClick={() => play("crash", null)}
              className="w-full h-16 bg-gradient-to-r from-bunny-gold to-amber-500 text-primary-foreground border-0 font-bold text-lg"
            >
              {busy ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "🚀 "}
              Launch & Cash-out @ {MULTIPLIER}x
            </Button>
          )}
        </motion.div>
      </AnimatePresence>

      {history.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-bold">📊 Recent Plays</p>
          {history.map((h) => (
            <div key={h.id} className="flex justify-between items-center bg-card rounded-xl p-2.5 border border-bunny-pink/15 mb-1.5">
              <div>
                <span className="text-xs font-bold capitalize">{h.game}</span>
                <span className="text-[10px] text-muted-foreground ml-2">{new Date(h.created_at).toLocaleString()}</span>
              </div>
              <span className={`text-xs font-bold ${h.won ? "text-bunny-green" : "text-destructive"}`}>
                {h.won ? `+${Number(h.payout).toFixed(0)}` : `-${Number(h.bet).toFixed(0)}`} 🐰
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
