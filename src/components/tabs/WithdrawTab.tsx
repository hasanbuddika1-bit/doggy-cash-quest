import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wallet, AlertCircle, Loader2, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { submitWithdrawal } from "@/lib/api";
import { toast } from "sonner";

interface WithdrawTabProps {
  userId: string;
  user: any;
}

export function WithdrawTab({ userId, user }: WithdrawTabProps) {
  const [walletAddress, setWalletAddress] = useState(user?.wallet_address || "");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [hasPending, setHasPending] = useState(false);

  const balance = Number(user?.balance || 0);
  const usdtAmount = (Number(amount || 0) * 0.0001).toFixed(4);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    const { data } = await supabase.from("withdrawals").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setHistory(data || []);
    setHasPending((data || []).some(w => w.status === 'pending'));
  }

  async function saveWallet() {
    await supabase.from("users").update({ wallet_address: walletAddress }).eq("id", userId);
    toast.success("💾 Wallet saved!");
  }

  async function handleWithdraw() {
    if (!walletAddress.trim()) { toast.error("Enter wallet address"); return; }
    if (Number(amount) < 500) { toast.error("Minimum 500 Doggy"); return; }
    if (Number(amount) > balance) { toast.error("Insufficient balance"); return; }
    if (hasPending) { toast.error("You have a pending withdrawal"); return; }

    setLoading(true);
    try {
      const result = await submitWithdrawal(userId, Number(amount), walletAddress);
      if (result.success) {
        toast.success("📤 Withdrawal request submitted!");
        setAmount("");
        loadHistory();
      } else {
        toast.error(result.message || "Withdrawal failed");
      }
    } catch { toast.error("Withdrawal failed"); }
    setLoading(false);
  }

  const requirements = [
    { label: "Daily Watch Ads", required: "10", met: false },
    { label: "Daily Clicks", required: "3", met: false },
    { label: "Total Referrals", required: "2", met: false },
    { label: "Minimum Amount", required: "500 🦴", met: Number(amount) >= 500 },
    { label: "No Pending Withdrawal", required: "✓", met: !hasPending },
  ];

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      {/* Guide */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-[hsl(var(--doggy-gold))]/15 to-[hsl(var(--doggy-orange))]/15 rounded-2xl p-4 border border-[hsl(var(--doggy-gold))]/20"
      >
        <p className="font-display font-bold text-gradient-gold text-sm">💸 Withdraw Doggy</p>
        <p className="text-xs text-muted-foreground mt-1">Convert your Doggy to USDT (APTOS Network). 100 Doggy = 0.01 USDT</p>
      </motion.div>

      {/* Balance */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-amber-500/20 via-card to-orange-500/10 rounded-2xl p-5 border border-amber-500/30 text-center"
      >
        <p className="text-xs text-muted-foreground">Available Balance</p>
        <p className="text-3xl font-display font-bold text-gradient-gold">{balance.toFixed(0)} 🦴</p>
        <p className="text-sm text-muted-foreground">≈ ${(balance * 0.0001).toFixed(4)} USDT</p>
      </motion.div>

      {/* Wallet */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card rounded-xl p-4 border border-border space-y-2"
      >
        <label className="text-xs text-muted-foreground flex items-center gap-1 font-bold">
          <Wallet className="w-3 h-3 text-amber-400" /> USDT Wallet (APTOS Network)
        </label>
        <div className="flex gap-2">
          <Input value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} placeholder="Enter wallet address" className="h-9 text-xs" />
          <Button size="sm" variant="outline" className="h-9 text-xs border-amber-500/30" onClick={saveWallet}>Save</Button>
        </div>
      </motion.div>

      {/* Amount */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-card rounded-xl p-4 border border-border space-y-2"
      >
        <label className="text-xs text-muted-foreground font-bold">💰 Amount (Doggy)</label>
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Min 500" className="h-10" />
        {Number(amount) > 0 && (
          <p className="text-xs text-[hsl(var(--doggy-green))]">≈ ${usdtAmount} USDT</p>
        )}
      </motion.div>

      {/* Requirements */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-amber-500/5 to-card rounded-xl p-4 border border-amber-500/20"
      >
        <p className="text-xs font-bold mb-2 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-amber-400" /> Requirements
        </p>
        <div className="space-y-1.5">
          {requirements.map((req) => (
            <div key={req.label} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{req.label}</span>
              <span className={`font-bold ${req.met ? 'text-[hsl(var(--doggy-green))]' : 'text-destructive'}`}>
                {req.required} {req.met ? '✅' : '❌'}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div whileTap={{ scale: 0.98 }}>
        <Button onClick={handleWithdraw} disabled={loading || hasPending}
          className="w-full h-14 bg-gradient-gold text-primary-foreground font-bold text-lg rounded-2xl glow-gold"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Wallet className="w-5 h-5 mr-2" />}
          Withdraw
        </Button>
      </motion.div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-bold">📊 Withdraw History</p>
          {history.map((w) => (
            <motion.div key={w.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between bg-card rounded-xl p-3 border border-border mb-2"
            >
              <div>
                <p className="text-sm font-bold">{Number(w.amount).toFixed(0)} 🦴</p>
                <p className="text-[10px] text-muted-foreground">≈ ${Number(w.usdt_amount).toFixed(4)} USDT</p>
                <p className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</p>
              </div>
              <span className={`text-xs font-bold flex items-center gap-1 px-2.5 py-1 rounded-full ${
                w.status === 'approved' ? 'bg-[hsl(var(--doggy-green))]/20 text-[hsl(var(--doggy-green))]' :
                w.status === 'rejected' ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'
              }`}>
                {w.status === 'approved' && <><Check className="w-3 h-3" /> Approved</>}
                {w.status === 'rejected' && <><X className="w-3 h-3" /> Rejected</>}
                {w.status === 'pending' && <><Clock className="w-3 h-3" /> Pending</>}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
