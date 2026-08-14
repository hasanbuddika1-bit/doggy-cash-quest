import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { LoadingScreen } from "@/components/LoadingScreen";
import { NotificationGate } from "@/components/NotificationGate";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { BottomNav } from "@/components/BottomNav";
import { HomeTab } from "@/components/tabs/HomeTab";
import { TasksTab } from "@/components/tabs/TasksTab";
import { EarnTab } from "@/components/tabs/EarnTab";
import { WatchAdsTab } from "@/components/tabs/WatchAdsTab";
import { ProfileTab } from "@/components/tabs/ProfileTab";
import { ensureTelegramWebApp, getCurrentUser, getStartParam } from "@/lib/telegram";
import { getOrCreateUser, detectCountry, supabase } from "@/lib/api";
import { showAdsgramBlock1 } from "@/lib/ads";

type AppState = "loading" | "main" | "banned" | "maintenance";
const ADMIN_TELEGRAM_ID = 5419054691;

const Index = () => {
  const [appState, setAppState] = useState<AppState>("loading");
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("home");
  const [userId, setUserId] = useState("");
  const [user, setUser] = useState<any>(null);
  const [_userCountry, setUserCountry] = useState<string | null>(null);

  const initApp = useCallback(async () => {
    try {
      const webapp = await ensureTelegramWebApp();
      if (webapp) { webapp.ready(); webapp.expand(); }
      setProgress(20);

      let detectedCountry: string | null = null;
      try { const geo = await detectCountry(); detectedCountry = geo.country; setUserCountry(detectedCountry); } catch {}
      setProgress(40);

      const telegramUser = getCurrentUser();
      const startParam = getStartParam();
      let referrerId: string | undefined;
      if (startParam?.startsWith("ref_")) {
        const refValue = startParam.replace("ref_", "");
        if (/^\d+$/.test(refValue)) {
          const { data: referrer } = await supabase.from("users").select("id").eq("telegram_id", Number(refValue)).single();
          if (referrer) referrerId = referrer.id;
        } else referrerId = refValue;
      }

      const result = await getOrCreateUser(
        telegramUser.id, telegramUser.username, telegramUser.first_name, telegramUser.photo_url,
        referrerId, detectedCountry || undefined
      );

      setProgress(75);
      setUserId(result.user.id);
      setUser(result.user);

      if (result.user.banned) { setProgress(100); setTimeout(() => setAppState("banned"), 500); return; }

      const { data: maintenance } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "maintenance_mode")
        .maybeSingle();
      if (maintenance?.value === "true" && telegramUser.id !== ADMIN_TELEGRAM_ID) {
        setProgress(100);
        setTimeout(() => setAppState("maintenance"), 500);
        return;
      }

      setProgress(100);
      setTimeout(() => setAppState("main"), 700);
    } catch (err) {
      console.error("Init error:", err);
      setProgress(100);
      setTimeout(() => setAppState("main"), 700);
    }
  }, []);

  useEffect(() => { initApp(); }, [initApp]);

  const refreshUser = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from("users").select("*").eq("id", userId).single();
    if (data) setUser(data);
  }, [userId]);

  const handleTabChange = useCallback((tab: string) => {
    if (tab === "home") showAdsgramBlock1().catch(() => { /* ignore: another ad is already playing */ });
    setActiveTab(tab);
    refreshUser();
  }, [refreshUser]);

  if (appState === "loading") return <LoadingScreen progress={progress} />;

  if (appState === "banned") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card rounded-2xl p-8 border border-destructive/30 text-center max-w-sm">
          <span className="text-6xl block mb-4">🚫</span>
          <h2 className="text-xl font-display font-bold text-destructive mb-2">Account Suspended</h2>
          <p className="text-sm text-muted-foreground mb-4">Your account has been suspended due to a violation of our terms.</p>
          <p className="text-xs text-muted-foreground">Reason: Multiple accounts or VPN usage detected.</p>
        </div>
      </div>
    );
  }

  if (appState === "maintenance") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="card-3d p-8 text-center max-w-sm glow-gold">
          <span className="text-6xl block mb-4 animate-hop">🛠️</span>
          <h2 className="text-xl font-display font-bold text-3d-gold mb-2">Update in Progress</h2>
          <p className="text-sm text-muted-foreground mb-2">Bunny Earn Hub V2 is under maintenance.</p>
          <p className="text-xs text-muted-foreground">Please come back soon for the new update. 🐰✨</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <AnimatedBackground />
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === "home"     && <HomeTab key="home" user={user} userId={userId} onNavigate={(tab) => setActiveTab(tab)} onBalanceChange={refreshUser} />}
          {activeTab === "tasks"    && <TasksTab key="tasks" userId={userId} telegramId={user?.telegram_id} />}
          {activeTab === "watchads" && <WatchAdsTab key="watchads" userId={userId} />}
          {activeTab === "earn"     && <EarnTab key="earn" userId={userId} telegramId={user?.telegram_id} />}
          {activeTab === "profile"  && <ProfileTab key="profile" user={user} userId={userId} />}
        </AnimatePresence>
      </div>
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {user && !user.notifications_enabled && (
        <NotificationGate userId={userId} telegramId={user.telegram_id} onAllow={refreshUser} />
      )}
    </div>
  );
};

export default Index;
