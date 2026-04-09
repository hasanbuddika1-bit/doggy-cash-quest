import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { LoadingScreen } from "@/components/LoadingScreen";
import { AccessTasks } from "@/components/AccessTasks";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { BottomNav } from "@/components/BottomNav";
import { HomeTab } from "@/components/tabs/HomeTab";
import { EarnTab } from "@/components/tabs/EarnTab";
import { WatchAdsTab } from "@/components/tabs/WatchAdsTab";
import { WithdrawTab } from "@/components/tabs/WithdrawTab";
import { ProfileTab } from "@/components/tabs/ProfileTab";
import { ensureTelegramWebApp, getCurrentUser, getStartParam } from "@/lib/telegram";
import { getOrCreateUser, detectCountry, supabase } from "@/lib/api";


type AppState = "loading" | "access_tasks" | "main" | "banned";

const ADSGRAM_AUTO_BLOCK = "int-27102";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("loading");
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("home");
  const [userId, setUserId] = useState("");
  const [user, setUser] = useState<any>(null);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [appStats, setAppStats] = useState({ totalUsers: 0, onlineUsers: 0, todayJoins: 0, totalPaid: 0 });

  // Auto-play ad on app open
  const playAutoAd = useCallback(() => {
    setTimeout(() => {
      try {
        const AdController = (window as any).Adsgram?.init?.({ blockId: ADSGRAM_AUTO_BLOCK });
        if (AdController) {
          AdController.show().catch(() => {});
        }
      } catch { /* ignore */ }
    }, 3000);

    // Schedule recurring ads every 25-50 seconds
    const scheduleNext = () => {
      const delay = 25000 + Math.random() * 25000; // 25-50s
      setTimeout(() => {
        try {
          const AdController = (window as any).Adsgram?.init?.({ blockId: ADSGRAM_AUTO_BLOCK });
          if (AdController) {
            AdController.show().catch(() => {});
          }
        } catch { /* ignore */ }
        scheduleNext();
      }, delay);
    };
    scheduleNext();
  }, []);

  const initApp = useCallback(async () => {
    try {
      const webapp = await ensureTelegramWebApp();
      if (webapp) { webapp.ready(); webapp.expand(); }

      setProgress(20);

      let detectedCountry: string | null = null;
      try {
        const geo = await detectCountry();
        detectedCountry = geo.country;
        setUserCountry(detectedCountry);
      } catch { /* ignore */ }

      setProgress(40);

      const telegramUser = getCurrentUser();
      const startParam = getStartParam();
      let referrerId: string | undefined;
      
      if (startParam?.startsWith("ref_")) {
        const refValue = startParam.replace("ref_", "");
        if (/^\d+$/.test(refValue)) {
          const { data: referrer } = await supabase.from("users").select("id").eq("telegram_id", Number(refValue)).single();
          if (referrer) referrerId = referrer.id;
        } else {
          referrerId = refValue;
        }
      }

      const result = await getOrCreateUser(
        telegramUser.id,
        telegramUser.username,
        telegramUser.first_name,
        telegramUser.photo_url,
        referrerId
      );

      setProgress(70);
      setUserId(result.user.id);
      setUser(result.user);

      // Check if banned
      if (result.user.banned) {
        setProgress(100);
        setTimeout(() => setAppState("banned"), 500);
        return;
      }

      // Country is saved server-side via get_or_create_user

      const { count: totalUsers } = await supabase.from("users").select("*", { count: "exact", head: true });
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayJoins } = await supabase.from("users").select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());
      
      // Get total paid
      const { data: paidData } = await supabase.from("withdrawals").select("usdt_amount").eq("status", "approved");
      const totalPaid = (paidData || []).reduce((sum, w) => sum + Number(w.usdt_amount), 0);

      setAppStats({
        totalUsers: totalUsers || 0,
        onlineUsers: Math.max(1, Math.floor((totalUsers || 1) * 0.1)),
        todayJoins: todayJoins || 0,
        totalPaid,
      });

      setProgress(100);

      setTimeout(() => {
        if (result.user.access_tasks_completed && result.user.welcome_bonus_claimed) {
          setAppState("main");
          playAutoAd();
        } else {
          setAppState("access_tasks");
        }
      }, 1000);
    } catch (err) {
      console.error("Init error:", err);
      setProgress(100);
      setTimeout(() => setAppState("access_tasks"), 1000);
    }
  }, [playAutoAd]);

  useEffect(() => { initApp(); }, [initApp]);

  const refreshUser = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from("users").select("*").eq("id", userId).single();
    if (data) setUser(data);
  }, [userId]);

  function handleAccessComplete() {
    refreshUser();
    setAppState("main");
    playAutoAd();
  }

  if (appState === "loading") {
    return <LoadingScreen progress={progress} />;
  }

  if (appState === "banned") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card rounded-2xl p-8 border border-destructive/30 text-center max-w-sm">
          <span className="text-6xl block mb-4">🚫</span>
          <h2 className="text-xl font-display font-bold text-destructive mb-2">Account Suspended</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Your account has been suspended due to violation of our terms of service.
          </p>
          <p className="text-xs text-muted-foreground">
            Reason: Multiple accounts or VPN usage detected. Please use only one account without VPN.
          </p>
        </div>
      </div>
    );
  }

  if (appState === "access_tasks") {
    return <AccessTasks userId={userId} userCountry={userCountry} onComplete={handleAccessComplete} />;
  }

  return (
    <div className="min-h-screen bg-background relative">
      <AnimatedBackground />
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === "home" && <HomeTab key="home" user={user} appStats={appStats} onNavigate={(tab) => setActiveTab(tab)} />}
          {activeTab === "watchads" && <WatchAdsTab key="watchads" userId={userId} />}
          {activeTab === "earn" && <EarnTab key="earn" userId={userId} telegramId={user?.telegram_id} />}
          {activeTab === "withdraw" && <WithdrawTab key="withdraw" userId={userId} user={user} />}
          {activeTab === "profile" && <ProfileTab key="profile" user={user} userId={userId} />}
        </AnimatePresence>
      </div>
      <BottomNav activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); refreshUser(); }} />
    </div>
  );
};

export default Index;
