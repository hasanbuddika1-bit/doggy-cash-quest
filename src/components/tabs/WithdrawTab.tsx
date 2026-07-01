import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wallet, AlertCircle, Loader2, Check, X, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { submitWithdrawal, updateWallet, getTonPrice } from "@/lib/api";
import { showRandomAd } from "@/lib/ads";
import { toast } from "sonner";
import usdtLogo from "@/assets/usdt-logo.png";
import tonLogo from "@/assets/ton-logo.png";
import { GuideButton } from "@/components/GuideButton";

interface WithdrawTabProps { userId: string; user: any; }

type Method = 'usdt_bep20' | 'ton';

export function WithdrawTab({ userId, user }: WithdrawTabProps) {
  const [method, setMethod] = useState<Method>('usdt_bep20');
  const [bep20Address, setBep20Address] = useState(user?.wallet_address || "");
  const [tonAddress, setTonAddress] = useState(user?.ton_address || "");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [hasPending, setHasPending] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [tonPrice, setTonPrice] = useState(0);
  const [stats, setStats] = useState({ dailyAds: 0, totalRefs: 0, mainDone: 0, mainTotal: 0, partnerDone: 0, partnerTotal: 0 });

  const isTon = method === 'ton';
  const balance = Number(user?.balance || 0);
  const rate = Number(settings.doggy_to_usdt_rate || 0.0001);
  const bep20Enabled = settings.bep20_enabled !== 'false';
  const tonEnabled = settings.ton_enabled !== 'false';

  const feeFixed = isTon ? Number(settings.ton_fee_fixed || 0.005) : Number(settings.withdraw_fee_fixed || 0.01);
  const feePercent = isTon ? Number(settings.ton_fee_percent || 2) : Number(settings.withdraw_fee_percent || 2);
  const maxWithdrawUsdt = isTon ? Number(settings.ton_max_usdt || 0.1) : Number(settings.max_withdraw_usdt || 0.1);

  const dailyAdsReq = Number(settings.daily_ads_required || 40);
  const totalRefReq = Number(settings.total_referrals_required || 2);

  const rawUsdt = Number(amount || 0) * rate;
  const fee = feeFixed + (rawUsdt * feePercent / 100);
  const netUsdt = Math.max(0, rawUsdt - fee);
  const maxDoggy = Math.floor(maxWithdrawUsdt / rate);
  const tonAmount = isTon && tonPrice > 0 ? netUsdt / tonPrice : 0;

  const walletAddress = isTon ? tonAddress : bep20Address;
  const setWalletAddress = isTon ? setTonAddress : setBep20Address;

  useEffect(() => {
    loadHistory(); loadSettings(); loadStats(); refreshTonPrice();
    const t = setInterval(refreshTonPrice, 60_000);
    return () => clearInterval(t);
  }, []);

  async function refreshTonPrice() { const p = await getTonPrice(); if (p > 0) setTonPrice(p); }

  async function loadSettings() {
    const { data } = await supabase.from("app_settings").select("key, value");
    const map: Record<string, string> = {};
    (data || []).forEach(s => { map[s.key] = s.value; });
    setSettings(map);
  }

  async function loadStats() {
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
  }

  async function loadHistory() {
    const { data } = await supabase.from("withdrawals").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setHistory(data || []);
    setHasPending((data || []).some(w => w.status === 'pending'));
  }

  async function saveWallet() {
    if (!walletAddress.trim()) { toast.error("Enter address"); return; }
    await updateWallet(userId, walletAddress, method);
    toast.success(`💾 ${isTon ? 'GRAM (ex TON)' : 'USDT (BEP20)'} address saved!`);
  }

  async function handleWithdraw() {
    if (isTon && !tonEnabled) { toast.error("GRAM withdrawals disabled"); return; }
    if (!isTon && !bep20Enabled) { toast.error("USDT (BEP20) withdrawals disabled"); return; }
    if (!walletAddress.trim()) { toast.error("Enter wallet address"); return; }
    const minAmount = Number(settings.min_withdraw || 500);
    if (Number(amount) < minAmount) { toast.error(`Minimum ${minAmount} Bunny`); return; }
    if (Number(amount) > balance) { toast.error("Insufficient balance"); return; }
    if (Number(amount) > maxDoggy) { toast.error(`Max ${maxDoggy} Bunny`); return; }
    if (hasPending) { toast.error("You have a pending withdrawal"); return; }
    if (!user?.withdraw_unlocked) {
      if (stats.dailyAds < dailyAdsReq) { toast.error(`Need ${dailyAdsReq} daily ads`); return; }
      if (stats.totalRefs < totalRefReq) { toast.error(`Need ${totalRefReq} active referrals`); return; }
      if (stats.mainDone < stats.mainTotal) { toast.error("Complete all Main tasks first"); return; }
      if (stats.partnerDone < stats.partnerTotal) { toast.error("Complete all Partner tasks first"); return; }
    }

    setLoading(true);
    try {
      toast.info("📺 Watch a quick ad to submit...");
      await showRandomAd();
      const result = await submitWithdrawal(userId, Number(amount), walletAddress, method);
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
    { label: "Min Amount", required: `${Number(settings.min_withdraw || 500)} 🐰`, met: Number(amount) >= Number(settings.min_withdraw || 500) },
    { label: "Max Withdraw", required: `${maxWithdrawUsdt} USDT`, met: rawUsdt <= maxWithdrawUsdt },
    { label: "No Pending", required: "✓", met: !hasPending },
  ];

  const MethodCard = ({ id, label, sublabel, logo, enabled }: any) => (
    <button type="button" disabled={!enabled} onClick={() => setMethod(id)}
      className={`flex-1 rounded-2xl p-3 border-2 transition-all ${
        method === id
          ? 'border-bunny-pink bg-gradient-to-br from-bunny-pink/20 to-bunny-lavender/10 scale-[1.02]'
          : 'border-bunny-pink/15 bg-card opacity-90'
      } ${!enabled ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
    >
      <div className="flex flex-col items-center gap-1.5">
        <img src={logo} alt={label} loading="lazy" width={40} height={40} className="w-10 h-10 object-contain" />
        <p className="text-xs font-display font-bold">{label}</p>
        <p className="text-[10px] text-muted-foreground">{sublabel}</p>
        {!enabled && <p className="text-[9px] text-destructive font-bold">DISABLED</p>}
      </div>
    </button>
  );

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-bunny-pink/20 to-bunny-lavender/20 rounded-2xl px-4 py-3 border border-bunny-pink/30 flex-1 mr-2"
        >
          <p className="font-display font-bold text-gradient-bunny text-sm">💸 Withdraw Bunny</p>
          <p className="text-[11px] text-muted-foreground">Choose USDT (BEP20) or GRAM (ex TON)</p>
        </motion.div>
        <GuideButton title="Withdraw Guide" steps={[
          "Save your USDT (BEP20) or GRAM (ex TON) wallet address first.",
          "Meet the requirements: 40 daily ads, 2 active refers, all Main & Partner tasks.",
          `Minimum ${settings.min_withdraw || 500} 🐰 per request.`,
          "Submit, watch a quick ad, then wait for admin approval.",
          "After approval, payment is posted to @bunnyearnhubpay channel with TX hash.",
        ]} />
      </div>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-bunny-pink/25 via-card to-bunny-lavender/15 rounded-2xl p-5 border border-bunny-pink/30 text-center"
      >
        <p className="text-xs text-muted-foreground">Available Balance</p>
        <p className="text-3xl font-display font-bold text-gradient-bunny">{balance.toFixed(0)} 🐰</p>
        <p className="text-sm text-muted-foreground">≈ ${(balance * rate).toFixed(4)} USDT</p>
      </motion.div>

      <div className="flex gap-2">
        <MethodCard id="usdt_bep20" label="USDT" sublabel="BEP20 Network" logo={usdtLogo} enabled={bep20Enabled} />
        <MethodCard id="ton" label="GRAM" sublabel={tonPrice ? `$${tonPrice.toFixed(2)}/GRAM` : 'ex TON Network'} logo={tonLogo} enabled={tonEnabled} />
      </div>

      <div className="bg-card rounded-xl p-4 border border-bunny-pink/15 space-y-2">
        <label className="text-xs text-muted-foreground flex items-center gap-2 font-bold">
          <img src={isTon ? tonLogo : usdtLogo} alt="" className="w-4 h-4 object-contain" />
          {isTon ? 'GRAM (ex TON) Wallet Address' : 'USDT Wallet (BEP20 Network)'}
        </label>
        <div className="flex gap-2">
          <Input value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)}
            placeholder={isTon ? 'EQ... or UQ...' : 'Enter BEP20/BSC address (0x...)'} className="h-9 text-xs" />
          <Button size="sm" variant="outline" className="h-9 text-xs border-bunny-pink/30" onClick={saveWallet}>Save</Button>
        </div>
      </div>

      <div className="bg-card rounded-xl p-4 border border-bunny-pink/15 space-y-2">
        <label className="text-xs text-muted-foreground font-bold">💰 Amount (Bunny) • Max: {maxDoggy}</label>
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Min ${settings.min_withdraw || 500}`} className="h-10" />
        {Number(amount) > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Gross: ${rawUsdt.toFixed(4)} USDT</p>
            <p className="text-xs text-destructive">Fee: -${fee.toFixed(4)} (${feeFixed} + {feePercent}%)</p>
            {isTon ? (
              <p className="text-xs text-blue-400 font-bold">🪙 Receive: <b>{tonAmount.toFixed(6)} GRAM</b> (~${netUsdt.toFixed(4)})</p>
            ) : (
              <p className="text-xs text-bunny-green font-bold">Receive: ${netUsdt.toFixed(4)} USDT</p>
            )}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-bunny-pink/10 to-card rounded-xl p-4 border border-bunny-pink/25">
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

      <motion.div whileTap={{ scale: 0.98 }}>
        <Button onClick={handleWithdraw} disabled={loading || hasPending}
          className="w-full h-14 bg-gradient-bunny text-primary-foreground font-bold text-lg rounded-2xl glow-pink"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Wallet className="w-5 h-5 mr-2" />}
          Withdraw via {isTon ? 'GRAM' : 'USDT (BEP20)'}
        </Button>
      </motion.div>

      {history.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-bold">📊 Withdraw History</p>
          {history.map((w) => {
            const wFee = Number(w.fee_usdt || 0);
            const wNet = Number(w.net_usdt || w.usdt_amount);
            const wIsTon = w.method === 'ton';
            const explorer = w.tx_hash ? (wIsTon
              ? `https://tonviewer.com/transaction/${w.tx_hash}`
              : `https://bscscan.com/tx/${w.tx_hash}`) : null;
            return (
              <motion.div key={w.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between bg-card rounded-xl p-3 border border-bunny-pink/15 mb-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <img src={wIsTon ? tonLogo : usdtLogo} alt="" className="w-4 h-4 object-contain" />
                    <p className="text-sm font-bold">{Number(w.amount).toFixed(0)} 🐰</p>
                    <span className="text-[10px] text-muted-foreground">{wIsTon ? 'GRAM' : 'USDT BEP20'}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Gross: ${Number(w.usdt_amount).toFixed(4)} | Fee: ${wFee.toFixed(4)}</p>
                  <p className="text-[10px] text-bunny-green font-bold">
                    Net: {wIsTon && w.ton_amount ? `${Number(w.ton_amount).toFixed(6)} GRAM` : `$${wNet.toFixed(4)} USDT`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</p>
                  {explorer && (
                    <a href={explorer} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 underline flex items-center gap-1">
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
