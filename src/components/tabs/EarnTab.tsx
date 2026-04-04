import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Play, ExternalLink, Upload, Clock, Copy, Loader2, Check, X, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { processClick, claimRewardCode, claimReferralReward, submitTask } from "@/lib/api";
import { getTelegramWebApp } from "@/lib/telegram";
import { toast } from "sonner";

interface EarnTabProps {
  userId: string;
  telegramId: number;
}

const SUB_TABS = ["Watch Ads", "Tasks", "Clicks", "Refer", "Reward Code"];
const CLICK_LINKS = [
  "https://omg10.com/4/10532433",
  "https://omg10.com/4/10487551",
  "https://omg10.com/4/10473220",
];

export function EarnTab({ userId, telegramId }: EarnTabProps) {
  const [subTab, setSubTab] = useState("Tasks");

  return (
    <div className="px-4 pt-4 pb-24">
      {/* Sub-tabs */}
      <div className="flex gap-1 overflow-x-auto pb-3 scrollbar-hide">
        {SUB_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              subTab === tab
                ? 'bg-gradient-gold text-primary-foreground'
                : 'bg-card text-muted-foreground border border-border'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={subTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          {subTab === "Watch Ads" && <WatchAdsSection />}
          {subTab === "Tasks" && <TasksSection userId={userId} />}
          {subTab === "Clicks" && <ClicksSection userId={userId} />}
          {subTab === "Refer" && <ReferSection userId={userId} telegramId={telegramId} />}
          {subTab === "Reward Code" && <RewardCodeSection userId={userId} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function WatchAdsSection() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
        <Lock className="w-16 h-16 text-muted-foreground" />
      </motion.div>
      <p className="text-lg font-display font-bold text-muted-foreground mt-4">Coming Soon</p>
      <p className="text-sm text-muted-foreground">Watch ads to earn Doggy! 📺</p>
    </div>
  );
}

function TasksSection({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});

  useEffect(() => {
    loadTasks();
    loadSubmissions();
  }, []);

  async function loadTasks() {
    const { data } = await supabase.from("tasks").select("*").eq("active", true).order("created_at", { ascending: false });
    setTasks(data || []);
  }

  async function loadSubmissions() {
    const { data } = await supabase.from("task_submissions").select("*").eq("user_id", userId);
    if (data) {
      const map: Record<string, any> = {};
      data.forEach(s => { map[s.task_id] = s; });
      setSubmissions(map);
    }
  }

  async function handleImageUpload(taskId: string, file: File) {
    const ext = file.name.split('.').pop();
    const path = `${userId}/${taskId}.${ext}`;
    const { error } = await supabase.storage.from("task-images").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); return; }
    const { data: urlData } = supabase.storage.from("task-images").getPublicUrl(path);
    try {
      await submitTask(userId, taskId, urlData.publicUrl);
      toast.success("📤 Task submitted! Waiting for review.");
      loadSubmissions();
    } catch { toast.error("Submit failed"); }
  }

  return (
    <div className="space-y-3">
      {tasks.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No tasks available yet 📋</p>
      )}
      {tasks.map((task) => {
        const sub = submissions[task.id];
        const isExpanded = expandedTask === task.id;
        return (
          <motion.div key={task.id} layout className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-3 flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-sm">{task.title}</p>
                <p className="text-xs text-primary font-bold">+{task.value} 🦴</p>
              </div>
              {sub?.status === 'approved' ? (
                <span className="text-xs text-secondary font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Done</span>
              ) : sub?.status === 'pending' ? (
                <span className="text-xs text-primary font-bold">⏳ Pending</span>
              ) : sub?.status === 'rejected' ? (
                <span className="text-xs text-destructive font-bold flex items-center gap-1"><X className="w-3 h-3" /> Rejected</span>
              ) : (
                <Button size="sm" className="h-7 text-xs bg-gradient-gold text-primary-foreground" onClick={() => setExpandedTask(isExpanded ? null : task.id)}>
                  <Play className="w-3 h-3 mr-1" /> Start
                </Button>
              )}
            </div>
            <AnimatePresence>
              {isExpanded && !sub && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                    {task.description && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{task.description}</p>}
                    {task.link && (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => {
                        const wa = getTelegramWebApp();
                        wa ? wa.openLink(task.link) : window.open(task.link, "_blank");
                      }}>
                        <ExternalLink className="w-3 h-3 mr-1" /> Open
                      </Button>
                    )}
                    {task.requires_image && (
                      <label className="flex items-center gap-2 bg-muted rounded-lg p-2 cursor-pointer">
                        <Upload className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Upload screenshot</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleImageUpload(task.id, f);
                        }} />
                      </label>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

function ClicksSection({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [clickHistory, setClickHistory] = useState<any[]>([]);
  const [canClick, setCanClick] = useState(true);

  useEffect(() => {
    loadClicks();
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  async function loadClicks() {
    const { data } = await supabase.from("clicks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
    setClickHistory(data || []);
    if (data && data.length > 0) {
      const last = new Date(data[0].created_at).getTime();
      const diff = 60 - Math.floor((Date.now() - last) / 1000);
      if (diff > 0) { setTimer(diff); setCanClick(false); }
      const hourAgo = Date.now() - 3600000;
      const hourClicks = data.filter(c => new Date(c.created_at).getTime() > hourAgo).length;
      if (hourClicks >= 2) setCanClick(false);
    }
  }

  async function handleClick() {
    setLoading(true);
    const link = CLICK_LINKS[Math.floor(Math.random() * CLICK_LINKS.length)];
    const wa = getTelegramWebApp();
    wa ? wa.openLink(link) : window.open(link, "_blank");
    
    // Start 10s countdown
    setTimer(10);
    setTimeout(async () => {
      try {
        const result = await processClick(userId);
        if (result.success) {
          toast.success(`+${result.earned} Doggy! 🦴`);
          setTimer(60);
          setCanClick(false);
          loadClicks();
        } else {
          toast.error(result.message || "Click failed");
        }
      } catch { toast.error("Click failed"); }
      setLoading(false);
    }, 10000);
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl p-5 border border-border text-center">
        <p className="text-xs text-muted-foreground mb-2">Earn per click</p>
        <p className="text-3xl font-display font-bold text-gradient-gold">5 🦴</p>
        <p className="text-xs text-muted-foreground mt-2">Max 2 clicks/hour • View 10s</p>
      </div>

      {timer > 0 ? (
        <div className="bg-card rounded-xl p-4 border border-border text-center">
          <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="text-2xl font-display font-bold">{timer}s</p>
          <p className="text-xs text-muted-foreground">{loading ? "Viewing link..." : "Wait before next click"}</p>
        </div>
      ) : (
        <Button onClick={handleClick} disabled={!canClick || loading}
          className="w-full h-14 bg-gradient-gold text-primary-foreground font-bold text-lg rounded-2xl glow-gold"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <MousePointerClick className="w-5 h-5 mr-2" />}
          Click to Earn
        </Button>
      )}

      {clickHistory.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Recent Clicks</p>
          {clickHistory.slice(0, 5).map((c) => (
            <div key={c.id} className="flex justify-between py-1 text-xs text-muted-foreground">
              <span>{new Date(c.created_at).toLocaleString()}</span>
              <span className="text-secondary">+{c.earned} 🦴</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReferSection({ userId, telegramId }: { userId: string; telegramId: number }) {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [referBalance, setReferBalance] = useState(0);

  useEffect(() => { loadReferrals(); }, []);

  async function loadReferrals() {
    const { data } = await supabase.from("referrals").select("*").eq("referrer_id", userId);
    setReferrals(data || []);
    const unclaimed = (data || []).filter(r => r.verified && !r.reward_claimed);
    setReferBalance(unclaimed.reduce((sum: number, r: any) => sum + Number(r.reward_amount), 0));
  }

  async function handleClaim(referralId: string) {
    try {
      await claimReferralReward(userId, referralId);
      toast.success("🎉 Referral reward claimed!");
      loadReferrals();
    } catch { toast.error("Claim failed"); }
  }

  const referLink = `https://t.me/Goggycashbot?start=ref_${userId}`;

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl p-5 border border-border text-center">
        <p className="text-xs text-muted-foreground mb-1">Refer Balance</p>
        <p className="text-3xl font-display font-bold text-gradient-gold">{referBalance} 🦴</p>
        <p className="text-xs text-muted-foreground mt-1">100 Doggy + 5% commission per referral</p>
      </div>

      <div className="bg-card rounded-xl p-3 border border-border">
        <p className="text-xs text-muted-foreground mb-2">Your Referral Link</p>
        <div className="flex gap-2">
          <Input value={referLink} readOnly className="text-xs h-8" />
          <Button size="sm" className="h-8" onClick={() => {
            navigator.clipboard.writeText(referLink);
            toast.success("📋 Link copied!");
          }}>
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="bg-destructive/10 rounded-xl p-3 border border-destructive/30">
        <p className="text-xs text-destructive font-semibold">⚠️ Warning</p>
        <p className="text-xs text-destructive/80 mt-1">Multiple accounts & VPN usage will result in auto-ban!</p>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-2 font-semibold">Referral History</p>
        {referrals.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No referrals yet 🐕</p>}
        {referrals.map((r) => (
          <div key={r.id} className="flex items-center justify-between bg-card rounded-lg p-2 border border-border mb-2">
            <div>
              <span className={`text-xs font-bold ${r.verified ? 'text-secondary' : 'text-primary'}`}>
                {r.verified ? '✅ Verified' : '⏳ Not Verified'}
              </span>
              <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
            </div>
            {r.verified && !r.reward_claimed && (
              <Button size="sm" className="h-6 text-[10px] bg-gradient-green text-secondary-foreground" onClick={() => handleClaim(r.id)}>
                Claim {r.reward_amount}🦴
              </Button>
            )}
            {r.reward_claimed && <span className="text-[10px] text-secondary">Claimed ✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function RewardCodeSection({ userId }: { userId: string }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [claims, setClaims] = useState<any[]>([]);

  useEffect(() => { loadClaims(); }, []);

  async function loadClaims() {
    const { data } = await supabase.from("reward_claims").select("*, reward_codes(code, value)").eq("user_id", userId);
    setClaims(data || []);
  }

  async function handleClaim() {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const result = await claimRewardCode(userId, code.trim());
      if (result.success) {
        toast.success(`🎁 +${result.amount} Doggy!`);
        setCode("");
        loadClaims();
      } else {
        toast.error(result.message || "Invalid code");
      }
    } catch { toast.error("Failed to claim code"); }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl p-4 border border-border">
        <p className="text-sm font-semibold mb-2">🎁 Enter Reward Code</p>
        <div className="flex gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter code..." className="h-10" />
          <Button onClick={handleClaim} disabled={loading} className="h-10 bg-gradient-gold text-primary-foreground">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Claim"}
          </Button>
        </div>
      </div>

      <Button variant="outline" className="w-full" onClick={() => {
        const wa = getTelegramWebApp();
        wa ? wa.openTelegramLink("https://t.me/doggycash12") : window.open("https://t.me/doggycash12", "_blank");
      }}>
        📢 Get Codes from Community
      </Button>

      {claims.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-semibold">History</p>
          {claims.map((c) => (
            <div key={c.id} className="flex justify-between bg-card rounded-lg p-2 border border-border mb-2">
              <span className="text-xs font-mono">{(c.reward_codes as any)?.code}</span>
              <span className="text-xs text-secondary">+{c.amount} 🦴</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
