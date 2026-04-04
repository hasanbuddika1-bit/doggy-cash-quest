import { motion } from "framer-motion";
import { Users, Wifi, CalendarPlus, Coins } from "lucide-react";
import logo from "@/assets/doggy-cash-logo.png";

interface HomeTabProps {
  user: any;
  appStats: { totalUsers: number; onlineUsers: number; todayJoins: number; totalPaid: number };
}

export function HomeTab({ user, appStats }: HomeTabProps) {
  const balance = Number(user?.balance || 0);
  const usdtValue = (balance * 0.0001).toFixed(4);

  const userStats = [
    { icon: "💰", label: "Total Earn", value: balance.toFixed(0) },
    { icon: "💸", label: "Total Withdraw", value: "0" },
    { icon: "📺", label: "Total Ads", value: "0" },
    { icon: "👆", label: "Total Clicks", value: "0" },
  ];

  const appStatCards = [
    { icon: <Users className="w-4 h-4" />, label: "Total Users", value: appStats.totalUsers },
    { icon: <Wifi className="w-4 h-4" />, label: "Online", value: appStats.onlineUsers },
    { icon: <CalendarPlus className="w-4 h-4" />, label: "Today", value: appStats.todayJoins },
    { icon: <Coins className="w-4 h-4" />, label: "Paid", value: `${appStats.totalPaid}🦴` },
  ];

  return (
    <div className="px-4 pt-4 pb-24 space-y-5">
      {/* Profile Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary">
          {user?.photo_url ? (
            <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-gold flex items-center justify-center text-lg font-bold text-primary-foreground">
              {(user?.first_name || 'U')[0]}
            </div>
          )}
        </div>
        <div>
          <p className="font-semibold text-sm">{user?.first_name || user?.username || 'User'}</p>
          <p className="text-xs text-muted-foreground">@{user?.username || 'anonymous'}</p>
        </div>
      </motion.div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl p-5 border border-border glow-gold relative overflow-hidden"
      >
        <div className="absolute top-2 right-2 w-16 h-16 opacity-20">
          <img src={logo} alt="" className="w-full h-full" />
        </div>
        <p className="text-xs text-muted-foreground mb-1">Your Balance</p>
        <motion.p
          key={balance}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="text-4xl font-display font-bold text-gradient-gold"
        >
          {balance.toFixed(0)} 🦴
        </motion.p>
        <p className="text-sm text-muted-foreground mt-1">≈ ${usdtValue} USDT</p>
      </motion.div>

      {/* User Stats */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-semibold">📊 Your Stats</p>
        <div className="grid grid-cols-2 gap-2">
          {userStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="bg-card rounded-xl p-3 border border-border"
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{stat.icon}</span>
                <span className="text-[10px] text-muted-foreground">{stat.label}</span>
              </div>
              <p className="font-bold text-sm">{stat.value}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* App Stats */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-semibold">🌐 App Stats</p>
        <div className="grid grid-cols-4 gap-2">
          {appStatCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="bg-card rounded-xl p-2 border border-border text-center"
            >
              <div className="text-primary mb-1 flex justify-center">{stat.icon}</div>
              <p className="font-bold text-xs">{stat.value}</p>
              <p className="text-[9px] text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
