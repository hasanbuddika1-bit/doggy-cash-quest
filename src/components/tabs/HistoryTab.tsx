import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHistory } from "@/lib/api";

interface Props { userId: string }

export function HistoryTab({ userId }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getHistory(userId);
      setItems(r.items || []);
    } finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-bunny-pink/20 to-bunny-lavender/20 rounded-2xl px-4 py-3 border border-bunny-pink/30 flex-1"
        >
          <p className="font-display font-bold text-gradient-bunny text-sm">📜 History</p>
          <p className="text-[11px] text-muted-foreground">Balance changes and rewards</p>
        </motion.div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} className="h-10 border-bunny-pink/30">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {items.length === 0 && <div className="text-center py-10 text-sm text-muted-foreground">No history yet.</div>}
      <div className="space-y-2">
        {items.map((h, i) => {
          const amount = Number(h.amount || 0);
          return (
            <motion.div key={h.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}
              className="bg-card rounded-xl p-3 border border-bunny-pink/15 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold">{h.title}</p>
                {h.description && <p className="text-[11px] text-muted-foreground truncate">{h.description}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(h.created_at).toLocaleString()}</p>
              </div>
              <span className={`text-xs font-bold whitespace-nowrap ${amount >= 0 ? "text-bunny-green" : "text-destructive"}`}>
                {amount >= 0 ? "+" : ""}{amount.toFixed(0)} 🐰
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}