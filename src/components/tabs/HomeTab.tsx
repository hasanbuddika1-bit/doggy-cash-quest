import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Tv, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getTelegramWebApp } from "@/lib/telegram";
import bunnyLogo from "@/assets/bunny-logo.png";
import { GuideButton } from "@/components/GuideButton";

interface HomeTabProps {
  user: any;
  onNavigate?: (tab: string) => void;
}

export function HomeTab({ user, onNavigate }: HomeTabProps) {
  const balance = Number(user?.balance || 0);
  const usdtValue = (balance * 0.0001).toFixed(4);
  const userId = user?.id;

  const [stats, setStats] = useState({ totalAds: 0, totalClicks: 0, totalRefs: 0, totalWithdrawn: 0 });

  const loadStats = useCallback(async () => {
    if (!userId) return;
    const [adsRes, clicksRes, refsRes, withdrawRes] = await Promise.all([
      supabase.from("ad_watches").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("clicks").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", userId).in("status", ["half_active", "active"]),
      supabase.from("withdrawals").select("usdt_amount").eq("user_id", userId).eq("status", "approved"),
    ]);
    setStats({
      totalAds: adsRes.count || 0,
      totalClicks: clicksRes.count || 0,
      totalRefs: refsRes.count || 0,
      totalWithdrawn: (withdrawRes.data || []).reduce((s, w) => s + Number(w.usdt_amount), 0),
    });
  }, [userId]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const userStats = [
    { icon: "💰", label: "Balance",   value: balance.toFixed(0),                color: "from-bunny-pink/25 to-bunny-lavender/10", borderColor: "border-bunny-pink/30" },
    { icon: "💸", label: "Withdrawn", value: `$${stats.totalWithdrawn.toFixed(2)}`, color: "from-rose-500/25 to-pink-500/10", borderColor: "border-rose-400/30" },
    { icon: "📺", label: "Total Ads", value: String(stats.totalAds),            color: "from-cyan-500/25 to-blue-500/10",  borderColor: "border-cyan-400/30" },
    { icon: "👆", label: "Clicks",    value: String(stats.totalClicks),         color: "from-emerald-500/25 to-green-500/10", borderColor: "border-emerald-400/30" },
  ];

  return (
    <div className="px-4 pt-4 pb-24 space-y-5">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-bunny-pink/20 to-bunny-lavender/20 rounded-2xl p-4 border border-bunny-pink/30 flex-1 mr-2"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-bunny-pink glow-pink flex-none">
              {user?.photo_url ? (
                <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-bunny flex items-center justify-center text-lg font-bold text-primary-foreground">
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
          "Watch your balance and stats here.",
          "Tap 📺 Watch Ads → earn Bunny from 3 ad networks.",
          "Visit Tasks tab → complete Main/Partner missions.",
          "Earn tab → daily challenges, clicks, referrals & reward codes.",
          "Withdraw tab → cash out as USDT or TON.",
        ]} />
      </div>

      {/* Balance Card */}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-bunny-pink/25 via-card to-bunny-lavender/15 rounded-3xl p-5 border border-bunny-pink/30 glow-pink relative overflow-hidden"
      >
        <div className="absolute -top-3 -right-3 w-24 h-24 opacity-30 animate-hop">
          <img src={bunnyLogo} alt="" className="w-full h-full object-contain" />
        </div>
        <p className="text-xs text-muted-foreground mb-1">💰 Your Balance</p>
        <motion.p key={balance} initial={{ scale: 1.2 }} animate={{ scale: 1 }}
          className="text-4xl font-display font-bold text-gradient-bunny"
        >
          {balance.toFixed(0)} 🐰
        </motion.p>
        <p className="text-sm text-muted-foreground mt-1">≈ ${usdtValue} USDT</p>
      </motion.div>

      {/* CTA */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} whileTap={{ scale: 0.98 }}>
        <Button
          onClick={() => onNavigate?.("watchads")}
          className="w-full h-14 bg-gradient-bunny text-primary-foreground font-display font-bold text-lg rounded-2xl shadow-lg border-0 glow-pink"
        >
          <Tv className="w-5 h-5 mr-2" />
          📺 Watch Ads & Earn
        </Button>
      </motion.div>

      {/* User Stats */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-bold">📊 Your Stats</p>
        <div className="grid grid-cols-2 gap-2">
          {userStats.map((stat, i) => (
            <motion.div key={stat.label}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
              whileHover={{ scale: 1.02 }}
              className={`bg-gradient-to-br ${stat.color} rounded-xl p-3 border ${stat.borderColor}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{stat.icon}</span>
                <span className="text-[10px] text-muted-foreground font-semibold">{stat.label}</span>
              </div>
              <p className="font-bold text-sm">{stat.value}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Community */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="bg-gradient-to-r from-bunny-lavender/20 to-bunny-pink/15 rounded-2xl p-4 border border-bunny-pink/25"
      >
        <p className="text-xs font-bold text-gradient-bunny mb-2">🌸 Join the Hub</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Community", url: "https://t.me/bunnyearnhub", emoji: "📢" },
            { label: "Payments",  url: "https://t.me/bunnyearnhubpay", emoji: "💳" },
          ].map((c) => (
            <button key={c.url} onClick={() => {
              const wa = getTelegramWebApp();
              if (wa) wa.openTelegramLink(c.url); else window.open(c.url, "_blank");
            }}
              className="bg-card/60 rounded-xl py-2 px-2 border border-bunny-pink/20 flex items-center justify-center gap-1 text-xs font-bold hover:scale-[1.02] transition"
            >
              <span>{c.emoji}</span> {c.label} <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
