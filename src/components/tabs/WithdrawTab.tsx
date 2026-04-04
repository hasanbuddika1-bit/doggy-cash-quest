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
      {/* Balance */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl p-5 border border-border text-center"
      >
        <p className="text-xs text-muted-foreground">Available Balance</p>
        <p className="text-3xl font-display font-bold text-gradient-gold">{balance.toFixed(0)} 🦴</p>
        <p className="text-sm text-muted-foreground">≈ ${(balance * 0.0001).toFixed(4)} USDT</p>
      </motion.div>

      {/* Wallet */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-2">
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          <Wallet className="w-3 h-3" /> USDT Wallet (APTOS Network)
        </label>
        <div className="flex gap-2">
          <Input value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} placeholder="Enter wallet address" className="h-9 text-xs" />
          <Button size="sm" variant="outline" className="h-9 text-xs" onClick={saveWallet}>Save</Button>
        </div>
      </div>

      {/* Amount */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-2">
        <label className="text-xs text-muted-foreground">Amount (Doggy)</label>
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Min 500" className="h-10" />
        {Number(amount) > 0 && (
          <p className="text-xs text-muted-foreground">≈ ${usdtAmount} USDT</p>
        )}
      </div>

      {/* Requirements */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <p className="text-xs font-semibold mb-2 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-primary" /> Requirements
        </p>
        <div className="space-y-1">
          {requirements.map((req) => (
            <div key={req.label} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{req.label}</span>
              <span className={req.met ? 'text-secondary' : 'text-destructive'}>
                {req.required} {req.met ? '✅' : '❌'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleWithdraw} disabled={loading || hasPending}
        className="w-full h-14 bg-gradient-gold text-primary-foreground font-bold text-lg rounded-2xl glow-gold"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Wallet className="w-5 h-5 mr-2" />}
        Withdraw
      </Button>

      {/* History */}
      {history.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-semibold">Withdraw History</p>
          {history.map((w) => (
            <div key={w.id} className="flex items-center justify-between bg-card rounded-lg p-3 border border-border mb-2">
              <div>
                <p className="text-sm font-bold">{Number(w.amount).toFixed(0)} 🦴</p>
                <p className="text-[10px] text-muted-foreground">≈ ${Number(w.usdt_amount).toFixed(4)} USDT</p>
                <p className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</p>
              </div>
              <span className={`text-xs font-bold flex items-center gap-1 ${
                w.status === 'approved' ? 'text-secondary' :
                w.status === 'rejected' ? 'text-destructive' : 'text-primary'
              }`}>
                {w.status === 'approved' && <><Check className="w-3 h-3" /> Approved</>}
                {w.status === 'rejected' && <><X className="w-3 h-3" /> Rejected</>}
                {w.status === 'pending' && <><Clock className="w-3 h-3" /> Pending</>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
