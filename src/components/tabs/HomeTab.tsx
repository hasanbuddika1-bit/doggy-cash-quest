import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Tv, ExternalLink, Gift, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { claimRewardCode } from "@/lib/api";
import { showRandomAd, showAdsgramInt } from "@/lib/ads";
import { getTelegramWebApp } from "@/lib/telegram";
import bunnyLogo from "@/assets/bunny-v2-logo.png";
import { GuideButton } from "@/components/GuideButton";
import { RewardPopup } from "@/components/RewardPopup";
import { MiningCard } from "@/components/MiningCard";
import { toast } from "sonner";

interface HomeTabProps {
  user: any;
  userId: string;
  onNavigate?: (tab: string) => void;
  onBalanceChange?: () => void;
}

const COIN_RATE = 0.00001; // 1000 🐰 = $0.01

export function HomeTab({ user, userId, onNavigate, onBalanceChange }: HomeTabProps) {
  const balance = Number(user?.balance || 0);
  const usdtValue = (balance * COIN_RATE).toFixed(4);

  const [stats, setStats] = useState({ totalAds: 0, totalClicks: 0, totalRefs: 0, totalWithdrawn: 0, mined: 0 });
  const [rewardCode, setRewardCode] = useState("");
  const [claimingCode, setClaimingCode] = useState(false);
  const [reward, setReward] = useState<{ show: boolean; amount: number; message?: string }>({ show: false, amount: 0 });

  const loadStats = useCallback(async () => {
    if (!userId) return;
    const [adsRes, clicksRes, refsRes, withdrawRes, miningRes] = await Promise.all([
      supabase.from("ad_watches").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("clicks").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", userId).in("status", ["day1_complete", "active"]),
      supabase.from("withdrawals").select("usdt_amount").eq("user_id", userId).eq("status", "approved"),
      supabase.from("mining_sessions").select("amount").eq("user_id", userId).eq("claimed", true),
    ]);
    setStats({
      totalAds: adsRes.count || 0,
      totalClicks: clicksRes.count || 0,
      totalRefs: refsRes.count || 0,
      totalWithdrawn: (withdrawRes.data || []).reduce((s, w) => s + Number(w.usdt_amount), 0),
      mined: (miningRes.data || []).reduce((s: number, m: any) => s + Number(m.amount || 0), 0),
    });
  }, [userId]);

  useEffect(() => { loadStats(); }, [loadStats]);

  async function handleClaimCode() {
    if (!userId || !rewardCode.trim()) return;
    setClaimingCode(true);
    try {
      toast.info("📺 Watch a quick ad to claim...");
      await showRandomAd();
      const r = await claimRewardCode(userId, rewardCode.trim());
      if (r.success) {
        setReward({ show: true, amount: Number(r.amount || 0), message: "CODE REDEEMED!" });
        setRewardCode("");
        loadStats();
        onBalanceChange?.();
      } else toast.error(r.message || "Invalid code");
    } catch (e: any) {
      toast.error(e?.message || "Failed to claim code");
    }
    setClaimingCode(false);
  }

  const userStats = [
    { icon: "⛏️", label: "Mined",     value: String(stats.mined) },
    { icon: "💸", label: "Withdrawn", value: `$${stats.totalWithdrawn.toFixed(2)}` },
    { icon: "📺", label: "Total Ads", value: String(stats.totalAds) },
    { icon: "👥", label: "Referrals", value: String(stats.totalRefs) },
  ];

  // Play an Adsgram ad on taps inside the Home area.
  function handleHomeTouch() {
    showAdsgramInt(10).catch(() => { /* ignore: another ad playing / SDK not ready */ });
  }

  return (
    <div className="px-4 pt-4 pb-24 space-y-5" onClick={handleHomeTouch}>
      <RewardPopup
        show={reward.show}
        amount={reward.amount}
        message={reward.message}
        onClose={() => setReward({ show: false, amount: 0 })}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card-3d p-3 flex-1 mr-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-bunny-gold glow-gold flex-none">
              {user?.photo_url ? (
                <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full coin-3d flex items-center justify-center text-lg font-bold text-primary-foreground">
                  {(user?.first_name || 'U')[0]}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-gradient-bunny truncate">Hi, {user?.first_name || user?.username || 'Friend'}! 🐰</p>
              <p className="text-xs text-muted-foreground truncate">@{user?.username || 'anonymous'}</p>
            </div>
          </div>
        </motion.div>
        <GuideButton title="Home Guide" steps={[
          "⛏️ Start mining — earn 100 🐰 every hour, then claim it here.",
          "🔔 We send you a Telegram alert when mining is full.",
          "📺 Watch Ads → earn Bunny from multiple ad networks.",
          "📋 Tasks → complete Main/Partner missions.",
          "💸 Withdraw & History are inside the Profile tab (USDT BEP20).",
          "1000 🐰 = $0.01 USDT.",
        ]} />
      </div>

      {/* Balance */}
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08 }}
        className="card-3d p-5 relative overflow-hidden"
      >
        <div className="absolute -top-4 -right-4 w-28 h-28 opacity-40 animate-hop">
          <img src={bunnyLogo} alt="" className="w-full h-full object-contain" />
        </div>
        <p className="text-xs text-muted-foreground mb-1">💰 Your Balance</p>
        <motion.p key={balance} initial={{ scale: 1.15 }} animate={{ scale: 1 }} className="text-4xl font-display font-bold text-3d-gold">
          {balance.toFixed(0)} 🐰
        </motion.p>
        <p className="text-sm text-muted-foreground mt-1">≈ ${usdtValue} USDT</p>

        <Button
          onClick={(e) => { e.stopPropagation(); onNavigate?.("withdraw"); }}
          className="mt-3 h-11 w-full btn-3d btn-3d-pink border-0 relative"
        >
          <Wallet className="w-4 h-4 mr-2" /> 💸 Withdraw Now
        </Button>
      </motion.div>

      {/* ⛏️ Mining */}
      <MiningCard
        userId={userId}
        onClaimed={(amount) => {
          setReward({ show: true, amount, message: "MINING CLAIMED!" });
          loadStats();
          onBalanceChange?.();
        }}
      />

      {/* CTA */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} whileTap={{ scale: 0.98 }}>
        <Button onClick={(e) => { e.stopPropagation(); onNavigate?.("watchads"); }} className="w-full h-14 btn-3d btn-3d-pink border-0 text-lg">
          <Tv className="w-5 h-5 mr-2" />
          📺 Watch Ads & Earn
        </Button>
      </motion.div>

      {/* Reward Code */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
        className="card-3d p-4" onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-display font-bold text-3d-gold mb-2">🎁 Reward Code</p>
        <p className="text-[11px] text-muted-foreground mb-3">Paste your code and watch one ad to redeem.</p>
        <div className="flex gap-2">
          <Input value={rewardCode} onChange={(e) => setRewardCode(e.target.value)} placeholder="Enter code..." className="h-10 bg-background" />
          <Button onClick={handleClaimCode} disabled={claimingCode || !rewardCode.trim()} className="h-10 btn-3d border-0 px-5">
            {claimingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4 mr-1" />}
            Claim
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-bold">📊 Your Stats</p>
        <div className="grid grid-cols-2 gap-2">
          {userStats.map((stat, i) => (
            <motion.div key={stat.label}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
              className="card-3d p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{stat.icon}</span>
                <span className="text-[10px] text-muted-foreground font-semibold">{stat.label}</span>
              </div>
              <p className="font-bold text-sm text-bunny-gold-soft">{stat.value}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Community */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card-3d p-4">
        <p className="text-xs font-bold text-gradient-bunny mb-2">🌸 Join the Hub</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Community", url: "https://t.me/bunnyearnhubV2_community", emoji: "📢" },
            { label: "Payments",  url: "https://t.me/bunnyearnhubpay", emoji: "💳" },
          ].map((c) => (
            <button key={c.url} onClick={(e) => {
              e.stopPropagation();
              const wa = getTelegramWebApp();
              if (wa) wa.openTelegramLink(c.url); else window.open(c.url, "_blank");
            }}
              className="bg-background/40 rounded-2xl py-2 px-2 border border-bunny-lavender/25 flex items-center justify-center gap-1 text-xs font-bold"
            >
              <span>{c.emoji}</span> {c.label} <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
