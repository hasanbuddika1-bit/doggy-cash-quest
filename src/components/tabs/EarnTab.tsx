import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Copy, Loader2, MousePointerClick, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { processClick, claimRewardCode } from "@/lib/api";
import { showRandomAd } from "@/lib/ads";
import { getTelegramWebApp } from "@/lib/telegram";
import { toast } from "sonner";
import { RewardPopup } from "@/components/RewardPopup";
import { ChallengesSection } from "@/components/tabs/ChallengesSection";
import { GuideButton } from "@/components/GuideButton";

interface EarnTabProps { userId: string; telegramId: number; }

const SUB_TABS = [
  { key: "Challenges",  icon: "🏆", color: "from-bunny-gold to-amber-500" },
  { key: "Clicks",      icon: "👆", color: "from-bunny-green to-emerald-600" },
  { key: "Refer",       icon: "👥", color: "from-bunny-pink to-bunny-lavender" },
  { key: "Reward Code", icon: "🎁", color: "from-bunny-lavender to-bunny-pink" },
];

const CLICK_LINKS = [
  "https://omg10.com/4/10176898",
  "https://omg10.com/4/10339385",
];

export function EarnTab({ userId, telegramId }: EarnTabProps) {
  const [subTab, setSubTab] = useState("Challenges");

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center justify-between mb-3">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-bunny-pink/20 to-bunny-lavender/20 rounded-2xl px-4 py-3 border border-bunny-pink/30 flex-1 mr-2"
        >
          <p className="font-display font-bold text-gradient-bunny text-sm">💰 Earn Bunny</p>
          <p className="text-[11px] text-muted-foreground">Challenges • Clicks • Refer • Codes</p>
        </motion.div>
        <GuideButton title="Earn Guide" steps={[
          "🏆 Challenges: Reach weekly tiers (refers & ads) and claim — resets Sun 24:00 UTC.",
          "👆 Clicks: View a sponsor link 10s → earn 5 🐰. Max 2/hour.",
          "👥 Refer: Share your link. Pending → Half-Active (50🐰) → Active (+100🐰 & 10% commission).",
          "🎁 Reward Code: Codes are posted in our community channel — paste & claim.",
        ]} />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide">
        {SUB_TABS.map((tab) => (
          <motion.button key={tab.key} whileTap={{ scale: 0.95 }} onClick={() => setSubTab(tab.key)}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              subTab === tab.key
                ? `bg-gradient-to-r ${tab.color} text-primary-foreground shadow-lg`
                : 'bg-card text-muted-foreground border border-bunny-pink/15'
            }`}
          >
            <span>{tab.icon}</span> {tab.key}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={subTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          {subTab === "Challenges" && <ChallengesSection userId={userId} />}
          {subTab === "Clicks"     && <ClicksSection userId={userId} />}
          {subTab === "Refer"      && <ReferSection userId={userId} telegramId={telegramId} />}
          {subTab === "Reward Code"&& <RewardCodeSection userId={userId} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ClicksSection({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [canClick, setCanClick] = useState(true);
  const [reward, setReward] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 });

  const load = useCallback(async () => {
    const { data } = await supabase.from("clicks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
    setHistory(data || []);
    if (data && data.length > 0) {
      const last = new Date(data[0].created_at).getTime();
      const diff = 60 - Math.floor((Date.now() - last) / 1000);
      if (diff > 0) { setTimer(diff); setCanClick(false); }
      const hourAgo = Date.now() - 3600000;
      if (data.filter(c => new Date(c.created_at).getTime() > hourAgo).length >= 2) setCanClick(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (timer > 0) {
      const i = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(i);
    } else setCanClick(true);
  }, [timer]);

  async function handleClick() {
    setLoading(true);
    const link = CLICK_LINKS[Math.floor(Math.random() * CLICK_LINKS.length)];
    const wa = getTelegramWebApp();
    if (wa) wa.openLink(link); else window.open(link, "_blank");
    setTimer(10);
    setTimeout(async () => {
      try {
        const r = await processClick(userId);
        if (r.success) { setReward({ show: true, amount: r.earned }); setTimer(60); setCanClick(false); load(); }
        else toast.error(r.message || "Click failed");
      } catch { toast.error("Click failed"); }
      setLoading(false);
    }, 10000);
  }

  return (
    <div className="space-y-4">
      <RewardPopup show={reward.show} amount={reward.amount} onClose={() => setReward({ show: false, amount: 0 })} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-bunny-green/25 via-card to-emerald-500/10 rounded-2xl p-5 border border-bunny-green/30 text-center"
      >
        <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-4xl inline-block">👆</motion.span>
        <p className="text-xs text-muted-foreground mb-1 mt-2">Per click</p>
        <p className="text-3xl font-display font-bold text-gradient-bunny">5 🐰</p>
        <p className="text-xs text-muted-foreground mt-2">Max 2 clicks/hour • View 10s</p>
      </motion.div>

      {timer > 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-gradient-to-br from-bunny-pink/10 to-card rounded-xl p-5 border border-bunny-pink/20 text-center"
        >
          <Clock className="w-8 h-8 text-bunny-pink-light mx-auto mb-2" />
          <p className="text-3xl font-display font-bold text-gradient-bunny">{timer}s</p>
          <p className="text-xs text-muted-foreground mt-1">{loading ? "⏳ Viewing..." : "Wait before next click"}</p>
        </motion.div>
      ) : (
        <Button onClick={handleClick} disabled={!canClick || loading}
          className="w-full h-14 bg-gradient-green text-white font-bold text-lg rounded-2xl shadow-lg border-0"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <MousePointerClick className="w-5 h-5 mr-2" />}
          Click to Earn
        </Button>
      )}

      {history.length > 0 && (
        <div className="bg-card rounded-xl p-3 border border-bunny-pink/15">
          <p className="text-xs text-muted-foreground mb-2 font-bold">📊 Recent Clicks</p>
          {history.slice(0, 5).map((c) => (
            <div key={c.id} className="flex justify-between py-1.5 text-xs border-b border-border/40 last:border-0">
              <span className="text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
              <span className="text-bunny-green font-bold">+{c.earned} 🐰</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReferSection({ userId, telegramId }: { userId: string; telegramId: number }) {
  const [referrals, setReferrals] = useState<any[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from("referrals").select("*").eq("referrer_id", userId).order("created_at", { ascending: false });
    const ids = (data || []).map(r => r.referee_id);
    let umap: Record<string, any> = {};
    if (ids.length) {
      const { data: us } = await supabase.from("users").select("id, username, first_name, telegram_id").in("id", ids);
      (us || []).forEach((u: any) => { umap[u.id] = u; });
    }
    setReferrals((data || []).map(r => ({ ...r, referred_user: umap[r.referee_id] })));
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const referLink = `https://t.me/Bunnyearnbot?startapp=ref_${telegramId}`;
  const half = referrals.filter(r => r.status === 'half_active' || r.status === 'active').length;
  const active = referrals.filter(r => r.status === 'active').length;

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-bunny-pink/25 via-card to-bunny-lavender/15 rounded-2xl p-5 border border-bunny-pink/30 text-center"
      >
        <motion.span animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="text-4xl inline-block">👥</motion.span>
        <p className="text-xs text-muted-foreground mb-1 mt-2">Total: {referrals.length} • Counted: {half} • Active: {active}</p>
        <p className="text-2xl font-display font-bold text-gradient-bunny">50 🐰 + 100 🐰 + 10%</p>
        <p className="text-[11px] text-muted-foreground mt-1">Main done → 50 🐰 • Partner done → +100 🐰 & commission</p>
      </motion.div>

      <div className="bg-card rounded-xl p-3 border border-bunny-pink/20">
        <p className="text-xs text-muted-foreground mb-2 font-bold">🔗 Your Referral Link</p>
        <div className="flex gap-2">
          <Input value={referLink} readOnly className="text-xs h-9 bg-muted" />
          <Button size="sm" className="h-9 bg-gradient-bunny text-primary-foreground border-0" onClick={() => {
            navigator.clipboard.writeText(referLink); toast.success("📋 Link copied!");
          }}>
            <Copy className="w-3 h-3 mr-1" /> Copy
          </Button>
        </div>
      </div>

      <div className="bg-destructive/10 rounded-xl p-3 border border-destructive/30">
        <p className="text-xs text-destructive font-semibold">⚠️ Warning</p>
        <p className="text-xs text-destructive/80 mt-1">Multiple accounts & VPN usage = auto-ban!</p>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-2 font-bold">📊 Referral History ({referrals.length})</p>
        {referrals.length === 0 && (
          <div className="text-center py-8">
            <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="text-4xl">🐇</motion.div>
            <p className="text-xs text-muted-foreground mt-2">No referrals yet. Share your link!</p>
          </div>
        )}
        {referrals.map((r) => {
          const statusBadge =
            r.status === 'active'      ? { label: '✅ Active',      cls: 'bg-bunny-green/20 text-bunny-green' } :
            r.status === 'half_active' ? { label: '⚡ Half-Active', cls: 'bg-bunny-gold/20 text-bunny-gold-soft' } :
                                         { label: '⏳ Pending',     cls: 'bg-bunny-pink/20 text-bunny-pink-light' };
          return (
            <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between bg-card rounded-xl p-3 border border-bunny-pink/15 mb-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">@{r.referred_user?.username || r.referred_user?.first_name || r.referred_user?.telegram_id || 'Unknown'}</p>
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${statusBadge.cls}`}>{statusBadge.label}</span>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Earned</p>
                <p className="text-xs font-bold text-gradient-bunny">{Number(r.commission_earned || 0).toFixed(0)} 🐰</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function RewardCodeSection({ userId }: { userId: string }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [claims, setClaims] = useState<any[]>([]);
  const [reward, setReward] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 });

  const load = useCallback(async () => {
    const { data } = await supabase.from("reward_claims").select("*, reward_codes(code, value)").eq("user_id", userId);
    setClaims(data || []);
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  async function handleClaim() {
    if (!code.trim()) return;
    setLoading(true);
    try {
      toast.info("📺 Watch a quick ad to claim...");
      await showRandomAd();
      const r = await claimRewardCode(userId, code.trim());
      if (r.success) { setReward({ show: true, amount: r.amount }); setCode(""); load(); }
      else toast.error(r.message || "Invalid code");
    } catch { toast.error("Failed to claim code"); }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <RewardPopup show={reward.show} amount={reward.amount} message="CODE REDEEMED!" onClose={() => setReward({ show: false, amount: 0 })} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-bunny-lavender/25 via-card to-bunny-pink/15 rounded-xl p-4 border border-bunny-lavender/30"
      >
        <p className="text-sm font-display font-bold text-gradient-bunny mb-3">🎁 Enter Reward Code</p>
        <div className="flex gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter code..." className="h-10 bg-background" />
          <Button onClick={handleClaim} disabled={loading} className="h-10 bg-gradient-bunny text-primary-foreground border-0 px-5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4 mr-1" />}
            Claim
          </Button>
        </div>
      </motion.div>

      <Button variant="outline" className="w-full border-bunny-pink/30" onClick={() => {
        const wa = getTelegramWebApp();
        const url = "https://t.me/bunnyearnhub";
        if (wa) wa.openTelegramLink(url); else window.open(url, "_blank");
      }}>
        📢 Get Codes from Community
      </Button>

      {claims.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-bold">📊 Claim History</p>
          {claims.map((c) => (
            <div key={c.id} className="flex justify-between bg-card rounded-xl p-3 border border-bunny-pink/15 mb-2">
              <span className="text-xs font-mono font-bold">{(c.reward_codes as any)?.code}</span>
              <span className="text-xs text-bunny-green font-bold">+{c.amount} 🐰</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
