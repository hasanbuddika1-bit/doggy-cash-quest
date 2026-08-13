import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Wallet, AlertCircle, Loader2, Check, X, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { submitWithdrawal, updateWallet } from "@/lib/api";
import { showRandomAd } from "@/lib/ads";
import { toast } from "sonner";
import usdtLogo from "@/assets/usdt-logo.png";
import { GuideButton } from "@/components/GuideButton";

interface WithdrawTabProps { userId: string; user: any; }

export function WithdrawTab({ userId, user }: WithdrawTabProps) {
  const [address, setAddress] = useState(user?.wallet_address || "");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [hasPending, setHasPending] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({ dailyAds: 0, totalRefs: 0, mainDone: 0, mainTotal: 0, partnerDone: 0, partnerTotal: 0 });

  const balance = Number(user?.balance || 0);
  const rate = Number(settings.doggy_to_usdt_rate || 0.00001); // 1000 🐰 = $0.01
  const bep20Enabled = settings.bep20_enabled !== 'false';

  const feeFixed = Number(settings.withdraw_fee_fixed || 0.01);
  const feePercent = Number(settings.withdraw_fee_percent || 2);
  const maxWithdrawUsdt = Number(settings.max_withdraw_usdt || 0.1);
  const minWithdraw = Number(settings.min_withdraw || 1000);

  const dailyAdsReq = Number(settings.daily_ads_required || 40);
  const totalRefReq = Number(settings.total_referrals_required || 2);

  const rawUsdt = Number(amount || 0) * rate;
  const fee = feeFixed + (rawUsdt * feePercent / 100);
  const netUsdt = Math.max(0, rawUsdt - fee);
  const maxBunny = Math.floor(maxWithdrawUsdt / rate);

  const loadSettings = useCallback(async () => {
    const { data } = await supabase.from("app_settings").select("key, value");
    const map: Record<string, string> = {};
    (data || []).forEach(s => { map[s.key] = s.value; });
    setSettings(map);
  }, []);

  const loadStats = useCallback(async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const [adsRes, refsRes, mainTasksRes, partnerTasksRes, completionsRes] = await Promise.all([
      supabase.from("ad_watches").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", todayISO),
      supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", userId).eq("status", "active"),
      supabase.from("tasks").select("id").eq("active", true).eq("category", "main").eq("gives_reward", true),
      supabase.from("tasks").select("id").eq("active", true).eq("category", "partner").eq("gives_reward", true),
      supabase.from("task_completions").select("task_id").eq("user_id", userId),
    ]);
    const doneIds = new Set((completionsRes.data || []).map((c: any) => c.task_id));
    const mainIds = (mainTasksRes.data || []).map((t: any) => t.id);
    const partnerIds = (partnerTasksRes.data || []).map((t: any) => t.id);
    setStats({
      dailyAds: adsRes.count || 0,
      totalRefs: refsRes.count || 0,
      mainDone: mainIds.filter(id => doneIds.has(id)).length, mainTotal: mainIds.length,
      partnerDone: partnerIds.filter(id => doneIds.has(id)).length, partnerTotal: partnerIds.length,
    });
  }, [userId]);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase.from("withdrawals").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setHistory(data || []);
    setHasPending((data || []).some(w => w.status === 'pending'));
  }, [userId]);

  useEffect(() => { loadHistory(); loadSettings(); loadStats(); }, [loadHistory, loadSettings, loadStats]);

  async function saveWallet() {
    if (!address.trim()) { toast.error("Enter address"); return; }
    await updateWallet(userId, address.trim());
    toast.success("💾 USDT (BEP20) address saved!");
  }

  async function handleWithdraw() {
    if (!bep20Enabled) { toast.error("Withdrawals are temporarily disabled"); return; }
    if (!address.trim()) { toast.error("Enter wallet address"); return; }
    if (Number(amount) < minWithdraw) { toast.error(`Minimum ${minWithdraw} Bunny`); return; }
    if (Number(amount) > balance) { toast.error("Insufficient balance"); return; }
    if (Number(amount) > maxBunny) { toast.error(`Max ${maxBunny} Bunny`); return; }
    if (hasPending) { toast.error("You have a pending withdrawal"); return; }
    if (!user?.withdraw_unlocked) {
      if (stats.dailyAds < dailyAdsReq) { toast.error(`Need ${dailyAdsReq} daily ads`); return; }
      if (stats.totalRefs < totalRefReq) { toast.error(`Need ${totalRefReq} active referrals`); return; }
      if (stats.mainDone < stats.mainTotal) { toast.error("Complete all Main tasks first"); return; }
      if (stats.partnerDone < stats.partnerTotal) { toast.error("Complete all Partner tasks first"); return; }
    }

    setLoading(true);
    try {
      try {
        toast.info("📺 Quick ad before submitting...");
        await showRandomAd();
      } catch (adErr) {
        console.warn("Withdraw ad skipped:", adErr);
      }
      const result = await submitWithdrawal(userId, Number(amount), address.trim());
      if (result.success) { toast.success("📤 Withdrawal submitted!"); setAmount(""); loadHistory(); loadStats(); }
      else toast.error(result.message || "Withdrawal failed");
    } catch { toast.error("Withdrawal failed"); }
    setLoading(false);
  }

  const requirements = [
    { label: `Daily Ads`, required: `${stats.dailyAds}/${dailyAdsReq}`, met: stats.dailyAds >= dailyAdsReq },
    { label: `Active Refs`, required: `${stats.totalRefs}/${totalRefReq}`, met: stats.totalRefs >= totalRefReq },
    { label: `Main Tasks`, required: `${stats.mainDone}/${stats.mainTotal}`, met: stats.mainDone >= stats.mainTotal },
    { label: `Partner Tasks`, required: `${stats.partnerDone}/${stats.partnerTotal}`, met: stats.partnerDone >= stats.partnerTotal },
    { label: "Min Amount", required: `${minWithdraw} 🐰`, met: Number(amount) >= minWithdraw },
    { label: "Max Withdraw", required: `${maxWithdrawUsdt} USDT`, met: rawUsdt <= maxWithdrawUsdt },
    { label: "No Pending", required: "✓", met: !hasPending },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="card-3d px-4 py-3 flex-1 mr-2"
        >
          <p className="font-display font-bold text-3d-gold text-sm">💸 Withdraw Bunny</p>
          <p className="text-[11px] text-muted-foreground">USDT • BEP20 network only</p>
        </motion.div>
        <GuideButton title="Withdraw Guide" steps={[
          "Save your USDT (BEP20) wallet address first.",
          "Meet the requirements: daily ads, active refers, all Main & Partner tasks.",
          `Minimum ${minWithdraw} 🐰 per request (1000 🐰 = $0.01).`,
          "Submit, watch a quick ad, then wait for admin approval.",
          "After approval, payment is posted to @bunnyearnhubpay with the TX hash.",
        ]} />
      </div>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card-3d p-5 text-center">
        <p className="text-xs text-muted-foreground">Available Balance</p>
        <p className="text-3xl font-display font-bold text-3d-gold">{balance.toFixed(0)} 🐰</p>
        <p className="text-sm text-muted-foreground">≈ ${(balance * rate).toFixed(4)} USDT</p>
      </motion.div>

      <div className="card-3d p-4 space-y-2">
        <label className="text-xs text-muted-foreground flex items-center gap-2 font-bold">
          <img src={usdtLogo} alt="" className="w-4 h-4 object-contain" /> USDT Wallet (BEP20 Network)
        </label>
        <div className="flex gap-2">
          <Input value={address} onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter BEP20/BSC address (0x...)" className="h-9 text-xs" />
          <Button size="sm" variant="outline" className="h-9 text-xs border-bunny-lavender/40" onClick={saveWallet}>Save</Button>
        </div>
      </div>

      <div className="card-3d p-4 space-y-2">
        <label className="text-xs text-muted-foreground font-bold">💰 Amount (Bunny) • Max: {maxBunny}</label>
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Min ${minWithdraw}`} className="h-10" />
        {Number(amount) > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Gross: ${rawUsdt.toFixed(4)} USDT</p>
            <p className="text-xs text-destructive">Fee: -${fee.toFixed(4)} (${feeFixed} + {feePercent}%)</p>
            <p className="text-xs text-bunny-green font-bold">Receive: ${netUsdt.toFixed(4)} USDT</p>
          </div>
        )}
      </div>

      <div className="card-3d p-4">
        <p className="text-xs font-bold mb-2 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-bunny-pink-light" /> Requirements
        </p>
        <div className="space-y-1.5">
          {requirements.map((req) => (
            <div key={req.label} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{req.label}</span>
              <span className={`font-bold ${req.met ? 'text-bunny-green' : 'text-destructive'}`}>
                {req.required} {req.met ? '✅' : '❌'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleWithdraw} disabled={loading || hasPending}
        className="w-full h-14 btn-3d border-0 text-lg"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Wallet className="w-5 h-5 mr-2" />}
        Withdraw USDT (BEP20)
      </Button>

      {history.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-bold">📊 Withdraw History</p>
          {history.map((w) => {
            const wFee = Number(w.fee_usdt || 0);
            const wNet = Number(w.net_usdt || w.usdt_amount);
            const explorer = w.tx_hash ? `https://bscscan.com/tx/${w.tx_hash}` : null;
            return (
              <motion.div key={w.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between card-3d p-3 mb-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <img src={usdtLogo} alt="" className="w-4 h-4 object-contain" />
                    <p className="text-sm font-bold">{Number(w.amount).toFixed(0)} 🐰</p>
                    <span className="text-[10px] text-muted-foreground">USDT BEP20</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Gross: ${Number(w.usdt_amount).toFixed(4)} | Fee: ${wFee.toFixed(4)}</p>
                  <p className="text-[10px] text-bunny-green font-bold">Net: ${wNet.toFixed(4)} USDT</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</p>
                  {explorer && (
                    <a href={explorer} target="_blank" rel="noreferrer" className="text-[10px] text-bunny-cyan underline flex items-center gap-1">
                      <ExternalLink className="w-2.5 h-2.5" /> View TX
                    </a>
                  )}
                </div>
                <span className={`text-xs font-bold flex items-center gap-1 px-2.5 py-1 rounded-full ${
                  w.status === 'approved' ? 'bg-bunny-green/20 text-bunny-green' :
                  w.status === 'rejected' ? 'bg-destructive/20 text-destructive' : 'bg-bunny-pink/20 text-bunny-pink-light'
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
