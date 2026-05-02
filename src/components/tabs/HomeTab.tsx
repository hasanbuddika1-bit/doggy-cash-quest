import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, Wifi, CalendarPlus, Coins, Tv, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getTelegramWebApp } from "@/lib/telegram";
import logo from "@/assets/doggy-cash-logo.png";

interface HomeTabProps {
  user: any;
  appStats: { totalUsers: number; onlineUsers: number; todayJoins: number; totalPaid: number };
  onNavigate?: (tab: string) => void;
}

export function HomeTab({ user, appStats, onNavigate }: HomeTabProps) {
  const balance = Number(user?.balance || 0);
  const usdtValue = (balance * 0.0001).toFixed(4);
  const userId = user?.id;

  const [stats, setStats] = useState({ totalAds: 0, totalClicks: 0, totalRefs: 0, totalWithdrawn: 0 });

  const loadStats = useCallback(async () => {
    if (!userId) return;
    const [adsRes, clicksRes, refsRes, withdrawRes] = await Promise.all([
      supabase.from("ad_watches").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("clicks").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", userId).eq("verified", true),
      supabase.from("withdrawals").select("usdt_amount").eq("user_id", userId).eq("status", "approved"),
    ]);
    const totalWithdrawn = (withdrawRes.data || []).reduce((sum, w) => sum + Number(w.usdt_amount), 0);
    setStats({
      totalAds: adsRes.count || 0,
      totalClicks: clicksRes.count || 0,
      totalRefs: refsRes.count || 0,
      totalWithdrawn,
    });
  }, [userId]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const userStats = [
    { icon: "💰", label: "Total Earn", value: balance.toFixed(0), color: "from-amber-500/20 to-orange-500/10", borderColor: "border-amber-500/30" },
    { icon: "💸", label: "Withdrawn", value: `$${stats.totalWithdrawn.toFixed(2)}`, color: "from-red-500/20 to-pink-500/10", borderColor: "border-red-500/30" },
    { icon: "📺", label: "Total Ads", value: String(stats.totalAds), color: "from-blue-500/20 to-indigo-500/10", borderColor: "border-blue-500/30" },
    { icon: "👆", label: "Total Clicks", value: String(stats.totalClicks), color: "from-green-500/20 to-emerald-500/10", borderColor: "border-green-500/30" },
  ];

  const appStatCards = [
    { icon: <Users className="w-4 h-4 text-blue-400" />, label: "Total Users", value: appStats.totalUsers, bg: "from-blue-500/15 to-blue-500/5" },
    { icon: <Wifi className="w-4 h-4 text-green-400" />, label: "Online", value: appStats.onlineUsers, bg: "from-green-500/15 to-green-500/5" },
    { icon: <CalendarPlus className="w-4 h-4 text-purple-400" />, label: "Today", value: appStats.todayJoins, bg: "from-purple-500/15 to-purple-500/5" },
    { icon: <Coins className="w-4 h-4 text-amber-400" />, label: "Paid", value: `$${Number(appStats.totalPaid).toFixed(3)}`, bg: "from-amber-500/15 to-amber-500/5" },
  ];

  const otherApps = [
    { name: "Puppy Profit 🐶", link: "https://t.me/Puppyprofitbot?startapp", color: "from-amber-500/20 to-orange-500/10", border: "border-amber-500/30", emoji: "🐶" },
  ];

  function openLink(url: string) {
    const wa = getTelegramWebApp();
    if (wa) { wa.openTelegramLink(url); } else { window.open(url, "_blank"); }
  }

  return (
    <div className="px-4 pt-4 pb-24 space-y-5">
      {/* Welcome Guide */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-[hsl(var(--doggy-gold))]/15 to-[hsl(var(--doggy-orange))]/15 rounded-2xl p-4 border border-[hsl(var(--doggy-gold))]/20"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[hsl(var(--doggy-gold))]">
            {user?.photo_url ? (
              <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-gold flex items-center justify-center text-lg font-bold text-primary-foreground">
                {(user?.first_name || 'U')[0]}
              </div>
            )}
          </div>
          <div>
            <p className="font-display font-bold text-gradient-gold">Welcome, {user?.first_name || user?.username || 'User'}! 🐶</p>
            <p className="text-xs text-muted-foreground">@{user?.username || 'anonymous'}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Earn Doggy by completing tasks, clicking links, and inviting friends! 🦴</p>
      </motion.div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-[hsl(var(--doggy-gold))]/20 via-card to-[hsl(var(--doggy-orange))]/10 rounded-2xl p-5 border border-[hsl(var(--doggy-gold))]/30 glow-gold relative overflow-hidden"
      >
        <div className="absolute top-2 right-2 w-16 h-16 opacity-20">
          <img src={logo} alt="" className="w-full h-full" />
        </div>
        <p className="text-xs text-muted-foreground mb-1">💰 Your Balance</p>
        <motion.p key={balance} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="text-4xl font-display font-bold text-gradient-gold">
          {balance.toFixed(0)} 🦴
        </motion.p>
        <p className="text-sm text-muted-foreground mt-1">≈ ${usdtValue} USDT</p>
      </motion.div>

      {/* Watch Ads Button */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} whileTap={{ scale: 0.98 }}>
        <Button
          onClick={() => onNavigate?.("watchads")}
          className="w-full h-14 bg-gradient-to-r from-[hsl(var(--doggy-gold))] to-[hsl(var(--doggy-orange))] text-primary-foreground font-display font-bold text-lg rounded-2xl shadow-lg border-0"
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
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
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

      {/* App Stats */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-bold">🌐 App Stats</p>
        <div className="grid grid-cols-4 gap-2">
          {appStatCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              whileHover={{ scale: 1.05 }}
              className={`bg-gradient-to-b ${stat.bg} rounded-xl p-2 border border-border/50 text-center`}
            >
              <div className="mb-1 flex justify-center">{stat.icon}</div>
              <p className="font-bold text-xs">{stat.value}</p>
              <p className="text-[9px] text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Other Mini Apps */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-bold">🎮 Our Other Mini Apps</p>
        <div className="space-y-2">
          {otherApps.map((app, i) => (
            <motion.div
              key={app.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openLink(app.link)}
              className={`bg-gradient-to-r ${app.color} rounded-xl p-4 border ${app.border} flex items-center justify-between cursor-pointer`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <span className="text-xl">{app.name.includes("Dogs") ? "🐕" : "💎"}</span>
                </div>
                <div>
                  <p className="font-display font-bold text-sm">{app.name}</p>
                  <p className="text-[10px] text-muted-foreground">Tap to open →</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
