import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wallet, AlertCircle, Loader2, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { submitWithdrawal, updateWallet } from "@/lib/api";
import { showMonetagAd } from "@/lib/monetag";
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
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({ dailyAds: 0, dailyClicks: 0, totalRefs: 0, telegramTasks: 0, totalTelegramTasks: 0 });

  const balance = Number(user?.balance || 0);
  const rate = Number(settings.doggy_to_usdt_rate || 0.0001);
  const feeFixed = Number(settings.withdraw_fee_fixed || 0.01);
  const feePercent = Number(settings.withdraw_fee_percent || 2);
  const maxWithdrawUsdt = Number(settings.max_withdraw_usdt || 0.1);
  const dailyAdsReq = Number(settings.daily_ads_required || 10);
  const dailyClicksReq = Number(settings.daily_clicks_required || 3);
  const totalRefReq = Number(settings.total_referrals_required || 2);
  const withdrawAdsReq = Number(settings.withdraw_ads_required || 2);

  const rawUsdt = Number(amount || 0) * rate;
  const fee = feeFixed + (rawUsdt * feePercent / 100);
  const netUsdt = Math.max(0, rawUsdt - fee);
  const maxDoggy = Math.floor(maxWithdrawUsdt / rate);

  useEffect(() => {
    loadHistory();
    loadSettings();
    loadStats();
  }, []);

  async function loadSettings() {
    const { data } = await supabase.from("app_settings").select("key, value");
    const map: Record<string, string> = {};
    (data || []).forEach(s => { map[s.key] = s.value; });
    setSettings(map);
  }

  async function loadStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [adsRes, clicksRes, refsRes, tgTasksRes] = await Promise.all([
      supabase.from("ad_watches").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", todayISO),
      supabase.from("clicks").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", todayISO),
      supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", userId).eq("verified", true),
      supabase.from("tasks").select("id").eq("active", true).eq("task_type", "one_click"),
    ]);
    const telegramTaskIds = (tgTasksRes.data || []).map((t) => t.id);
    const doneTgRes = telegramTaskIds.length
      ? await supabase.from("task_submissions").select("id", { count: "exact", head: true }).eq("user_id", userId).in("task_id", telegramTaskIds).eq("status", "approved")
      : { count: 0 };

    setStats({
      dailyAds: adsRes.count || 0,
      dailyClicks: clicksRes.count || 0,
      totalRefs: refsRes.count || 0,
      telegramTasks: doneTgRes.count || 0,
      totalTelegramTasks: telegramTaskIds.length,
    });
  }

  async function loadHistory() {
    const { data } = await supabase.from("withdrawals").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setHistory(data || []);
    setHasPending((data || []).some(w => w.status === 'pending'));
  }

  async function saveWallet() {
    await updateWallet(userId, walletAddress);
    toast.success("💾 Wallet saved!");
  }

  async function handleWithdraw() {
    if (!walletAddress.trim()) { toast.error("Enter wallet address"); return; }
    const minAmount = Number(settings.min_withdraw || 500);
    if (Number(amount) < minAmount) { toast.error(`Minimum ${minAmount} Doggy`); return; }
    if (Number(amount) > balance) { toast.error("Insufficient balance"); return; }
    if (Number(amount) > maxDoggy) { toast.error(`Maximum ${maxDoggy} Doggy (${maxWithdrawUsdt} USDT)`); return; }
    if (hasPending) { toast.error("You have a pending withdrawal"); return; }
    if (stats.dailyAds < withdrawAdsReq) { toast.error(`Watch at least ${withdrawAdsReq} ads before withdrawing`); return; }
    if (stats.dailyAds < dailyAdsReq) { toast.error(`Need ${dailyAdsReq} daily ads watched`); return; }
    if (stats.dailyClicks < dailyClicksReq) { toast.error(`Need ${dailyClicksReq} daily clicks`); return; }
    if (stats.totalRefs < totalRefReq) { toast.error(`Need ${totalRefReq} verified referrals`); return; }
    if (stats.telegramTasks < stats.totalTelegramTasks) { toast.error("Complete all Telegram tasks first"); return; }

    setLoading(true);
    try {
      toast.info("📺 Watch a quick ad to submit your request...");
      await showMonetagAd();
      const result = await submitWithdrawal(userId, Number(amount), walletAddress);
      if (result.success) {
        toast.success("📤 Withdrawal request submitted!");
        setAmount("");
        loadHistory();
        loadStats();
      } else {
        toast.error(result.message || "Withdrawal failed");
      }
    } catch { toast.error("Withdrawal failed"); }
    setLoading(false);
  }

  const requirements = [
    { label: "Daily Watch Ads", required: `${stats.dailyAds}/${dailyAdsReq}`, met: stats.dailyAds >= dailyAdsReq },
    { label: "Daily Clicks", required: `${stats.dailyClicks}/${dailyClicksReq}`, met: stats.dailyClicks >= dailyClicksReq },
    { label: "Total Referrals", required: `${stats.totalRefs}/${totalRefReq}`, met: stats.totalRefs >= totalRefReq },
    { label: "All Telegram Tasks", required: `${stats.telegramTasks}/${stats.totalTelegramTasks}`, met: stats.telegramTasks >= stats.totalTelegramTasks },
    { label: "Watch Ads (Pre-withdraw)", required: `${Math.min(stats.dailyAds, withdrawAdsReq)}/${withdrawAdsReq}`, met: stats.dailyAds >= withdrawAdsReq },
    { label: "Minimum Amount", required: `${Number(settings.min_withdraw || 500)} 🦴`, met: Number(amount) >= Number(settings.min_withdraw || 500) },
    { label: "Max Withdraw", required: `${maxWithdrawUsdt} USDT`, met: rawUsdt <= maxWithdrawUsdt },
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
        <p className="text-xs text-muted-foreground mt-1">Convert your Doggy to USDT (APTOS Network). Fee: ${feeFixed} + {feePercent}%</p>
      </motion.div>

      {/* Balance */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-amber-500/20 via-card to-orange-500/10 rounded-2xl p-5 border border-amber-500/30 text-center"
      >
        <p className="text-xs text-muted-foreground">Available Balance</p>
        <p className="text-3xl font-display font-bold text-gradient-gold">{balance.toFixed(0)} 🦴</p>
        <p className="text-sm text-muted-foreground">≈ ${(balance * rate).toFixed(4)} USDT</p>
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
        <label className="text-xs text-muted-foreground font-bold">💰 Amount (Doggy) • Max: {maxDoggy}</label>
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Min ${settings.min_withdraw || 500}`} className="h-10" />
        {Number(amount) > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Gross: ${rawUsdt.toFixed(4)} USDT</p>
            <p className="text-xs text-destructive">Fee: -${fee.toFixed(4)} (${feeFixed} + {feePercent}%)</p>
            <p className="text-xs text-[hsl(var(--doggy-green))] font-bold">You receive: ${netUsdt.toFixed(4)} USDT</p>
          </div>
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
          {history.map((w) => {
            const wFee = Number(w.fee_usdt || 0);
            const wNet = Number(w.net_usdt || w.usdt_amount);
            return (
              <motion.div key={w.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between bg-card rounded-xl p-3 border border-border mb-2"
              >
                <div>
                  <p className="text-sm font-bold">{Number(w.amount).toFixed(0)} 🦴</p>
                  <p className="text-[10px] text-muted-foreground">Gross: ${Number(w.usdt_amount).toFixed(4)} | Fee: ${wFee.toFixed(4)}</p>
                  <p className="text-[10px] text-[hsl(var(--doggy-green))] font-bold">Net: ${wNet.toFixed(4)} USDT</p>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
