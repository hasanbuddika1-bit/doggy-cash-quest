import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, ExternalLink, Upload, Clock, Copy, Loader2, Check, X, MousePointerClick, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { processClick, claimRewardCode, claimReferralReward, submitTask, verifyChannel, processTelegramTask } from "@/lib/api";
import { showMonetagAd } from "@/lib/monetag";
import { getTelegramWebApp } from "@/lib/telegram";
import { toast } from "sonner";
import { RewardPopup } from "@/components/RewardPopup";

interface EarnTabProps {
  userId: string;
  telegramId: number;
}

const SUB_TABS = [
  { key: "Admin Tasks", icon: "📋", color: "from-amber-500 to-orange-600" },
  { key: "Telegram Tasks", icon: "📢", color: "from-blue-500 to-cyan-600" },
  { key: "Clicks", icon: "👆", color: "from-green-500 to-emerald-600" },
  { key: "Refer", icon: "👥", color: "from-indigo-500 to-purple-600" },
  { key: "Reward Code", icon: "🎁", color: "from-purple-500 to-pink-600" },
];

const CLICK_LINKS = [
  "https://omg10.com/4/10176898",
  "https://omg10.com/4/10339385",
];

export function EarnTab({ userId, telegramId }: EarnTabProps) {
  const [subTab, setSubTab] = useState("Admin Tasks");

  return (
    <div className="px-4 pt-4 pb-24">
      {/* Header guide */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-[hsl(var(--doggy-gold))]/20 to-[hsl(var(--doggy-orange))]/20 rounded-2xl p-4 mb-4 border border-[hsl(var(--doggy-gold))]/30"
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">💰</span>
          <div>
            <p className="font-display font-bold text-gradient-gold">Earn Doggy!</p>
            <p className="text-xs text-muted-foreground">Complete tasks, click links & invite friends 🐾</p>
          </div>
        </div>
      </motion.div>

      {/* Sub-tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide">
        {SUB_TABS.map((tab) => (
          <motion.button
            key={tab.key}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSubTab(tab.key)}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              subTab === tab.key
                ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                : 'bg-card text-muted-foreground border border-border hover:border-primary/50'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.key}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={subTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          {subTab === "Admin Tasks" && <TasksSection userId={userId} />}
          {subTab === "Telegram Tasks" && <TelegramTasksSection userId={userId} telegramId={telegramId} />}
          {subTab === "Clicks" && <ClicksSection userId={userId} />}
          {subTab === "Refer" && <ReferSection userId={userId} telegramId={telegramId} />}
          {subTab === "Reward Code" && <RewardCodeSection userId={userId} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ===== Admin Approve Tasks =====
function TasksSection({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [reward, setReward] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 });

  const loadTasks = useCallback(async () => {
    const { data } = await supabase.from("tasks").select("*").eq("active", true).eq("task_type", "admin_approve").order("created_at", { ascending: false });
    setTasks(data || []);
  }, []);

  const loadSubmissions = useCallback(async () => {
    const { data } = await supabase.from("task_submissions").select("*").eq("user_id", userId);
    if (data) {
      const map: Record<string, any> = {};
      data.forEach(s => { map[s.task_id] = s; });
      setSubmissions(map);
    }
  }, [userId]);

  useEffect(() => { loadTasks(); loadSubmissions(); }, [loadTasks, loadSubmissions]);

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
      <RewardPopup show={reward.show} amount={reward.amount} onClose={() => setReward({ show: false, amount: 0 })} />
      <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/20">
        <p className="text-xs text-amber-300">📋 <b>How it works:</b> Complete tasks, upload proof screenshot, and earn Doggy after admin approval!</p>
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
            <span className="text-5xl">📋</span>
          </motion.div>
          <p className="text-muted-foreground mt-3">No tasks available yet</p>
        </div>
      )}
      {tasks.map((task, i) => {
        const sub = submissions[task.id];
        const isExpanded = expandedTask === task.id;
        return (
          <motion.div key={task.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.01 }}
            className={`bg-gradient-to-r from-card to-card/80 rounded-xl border overflow-hidden ${sub?.status === 'approved' ? 'border-[hsl(var(--doggy-green))]/50' : 'border-border'}`}
          >
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                  <span className="text-lg">📋</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">{task.title}</p>
                  <p className="text-xs font-bold text-gradient-gold">+{task.value} 🦴</p>
                </div>
              </div>
              {sub?.status === 'approved' ? (
                <span className="text-xs font-bold flex items-center gap-1 bg-[hsl(var(--doggy-green))]/20 text-[hsl(var(--doggy-green))] px-2.5 py-1 rounded-full"><Check className="w-3 h-3" /> Done</span>
              ) : sub?.status === 'pending' ? (
                <span className="text-xs font-bold bg-primary/20 text-primary px-2.5 py-1 rounded-full">⏳ Pending</span>
              ) : sub?.status === 'rejected' ? (
                <span className="text-xs font-bold bg-destructive/20 text-destructive px-2.5 py-1 rounded-full flex items-center gap-1"><X className="w-3 h-3" /> Rejected</span>
              ) : (
                <Button size="sm" className="h-8 text-xs bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0" onClick={() => setExpandedTask(isExpanded ? null : task.id)}>
                  <Play className="w-3 h-3 mr-1" /> Start
                </Button>
              )}
            </div>
            <AnimatePresence>
              {isExpanded && !sub && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="px-3.5 pb-3.5 space-y-2 border-t border-border pt-2">
                    {task.description && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{task.description}</p>}
                    {task.link && (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => {
                        const wa = getTelegramWebApp();
                        if (wa) { wa.openLink(task.link); } else { window.open(task.link, "_blank"); }
                      }}>
                        <ExternalLink className="w-3 h-3 mr-1" /> Open Link
                      </Button>
                    )}
                    {task.requires_image && (
                      <label className="flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg p-3 cursor-pointer border border-dashed border-amber-500/30">
                        <Upload className="w-5 h-5 text-amber-400" />
                        <span className="text-xs text-amber-300 font-semibold">📷 Upload screenshot proof</span>
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

// ===== One-Click Telegram Tasks =====
function TelegramTasksSection({ userId, telegramId }: { userId: string; telegramId: number }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [verifying, setVerifying] = useState<string | null>(null);
  const [joined, setJoined] = useState<Record<string, boolean>>({});
  const [reward, setReward] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 });

  const loadTasks = useCallback(async () => {
    const { data } = await supabase.from("tasks").select("*").eq("active", true).eq("task_type", "one_click").order("created_at", { ascending: false });
    setTasks(data || []);
  }, []);

  const loadSubmissions = useCallback(async () => {
    const { data } = await supabase.from("task_submissions").select("*").eq("user_id", userId);
    if (data) {
      const map: Record<string, any> = {};
      data.forEach(s => { map[s.task_id] = s; });
      setSubmissions(map);
    }
  }, [userId]);

  useEffect(() => { loadTasks(); loadSubmissions(); }, [loadTasks, loadSubmissions]);

  function handleJoin(task: any) {
    const link = task.link || `https://t.me/${task.telegram_channel}`;
    const wa = getTelegramWebApp();
    if (wa) { wa.openTelegramLink(link); } else { window.open(link, "_blank"); }
    setJoined(prev => ({ ...prev, [task.id]: true }));
  }

  async function handleVerify(task: any) {
    setVerifying(task.id);
    try {
      const channel = task.telegram_channel?.replace('@', '') || '';
      const result = await verifyChannel(userId, channel, telegramId);
      if (result.verified) {
        // Submit as approved via edge function
        const { data: existing } = await supabase.from("task_submissions").select("id").eq("user_id", userId).eq("task_id", task.id).single();
        if (!existing) {
          await processTelegramTask(userId, task.id, task.value);
          setReward({ show: true, amount: task.value });
        }
        loadSubmissions();
      } else {
        toast.error("Not a member yet! Please join first.");
      }
    } catch { toast.error("Verification failed"); }
    setVerifying(null);
  }

  return (
    <div className="space-y-3">
      <RewardPopup show={reward.show} amount={reward.amount} message="TASK REWARD!" onClose={() => setReward({ show: false, amount: 0 })} />
      <div className="bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
        <p className="text-xs text-blue-300">📢 <b>How it works:</b> Join channels, verify membership, and earn Doggy instantly!</p>
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
            <span className="text-5xl">📢</span>
          </motion.div>
          <p className="text-muted-foreground mt-3">No Telegram tasks available yet</p>
        </div>
      )}
      {tasks.map((task, i) => {
        const sub = submissions[task.id];
        const isJoined = joined[task.id];
        const isDone = sub?.status === 'approved';

        return (
          <motion.div key={task.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className={`bg-gradient-to-r from-card to-card/80 rounded-xl border overflow-hidden ${isDone ? 'border-[hsl(var(--doggy-green))]/50' : 'border-border'}`}
          >
            <div className="p-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                    <span className="text-lg">📢</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{task.title}</p>
                    <p className="text-xs font-bold text-gradient-gold">+{task.value} 🦴</p>
                  </div>
                </div>
                {isDone && (
                  <span className="text-xs font-bold flex items-center gap-1 bg-[hsl(var(--doggy-green))]/20 text-[hsl(var(--doggy-green))] px-2.5 py-1 rounded-full"><Check className="w-3 h-3" /> Done</span>
                )}
              </div>
              {!isDone && (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-8 text-xs bg-gradient-to-r from-blue-500 to-cyan-600 text-white border-0" onClick={() => handleJoin(task)}>
                    <ExternalLink className="w-3 h-3 mr-1" /> Join
                  </Button>
                  {isJoined && (
                    <Button size="sm" className="flex-1 h-8 text-xs bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0"
                      onClick={() => handleVerify(task)} disabled={verifying === task.id}>
                      {verifying === task.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                      Verify
                    </Button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ===== Clicks Section =====
function ClicksSection({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [clickHistory, setClickHistory] = useState<any[]>([]);
  const [canClick, setCanClick] = useState(true);
  const [reward, setReward] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 });

  const loadClicks = useCallback(async () => {
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
  }, [userId]);

  useEffect(() => { loadClicks(); }, [loadClicks]);
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  async function handleClick() {
    setLoading(true);
    const link = CLICK_LINKS[Math.floor(Math.random() * CLICK_LINKS.length)];
    const wa = getTelegramWebApp();
    if (wa) { wa.openLink(link); } else { window.open(link, "_blank"); }
    
    setTimer(10);
    setTimeout(async () => {
      try {
        const result = await processClick(userId);
        if (result.success) {
          setReward({ show: true, amount: result.earned });
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
      <RewardPopup show={reward.show} amount={reward.amount} onClose={() => setReward({ show: false, amount: 0 })} />
      <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
        <p className="text-xs text-emerald-300">👆 <b>How it works:</b> Click the button, view the link for 10 seconds, then earn 5 Doggy! Max 2 clicks per hour.</p>
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-emerald-500/20 via-card to-green-500/10 rounded-2xl p-5 border border-emerald-500/30 text-center"
      >
        <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-4xl inline-block">👆</motion.span>
        <p className="text-xs text-muted-foreground mb-1 mt-2">Earn per click</p>
        <p className="text-3xl font-display font-bold text-gradient-gold">5 🦴</p>
        <p className="text-xs text-muted-foreground mt-2">Max 2 clicks/hour • View 10s</p>
      </motion.div>

      {timer > 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-gradient-to-br from-amber-500/10 to-card rounded-xl p-5 border border-amber-500/20 text-center"
        >
          <Clock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-3xl font-display font-bold text-gradient-gold">{timer}s</p>
          <p className="text-xs text-muted-foreground mt-1">{loading ? "⏳ Viewing link..." : "Wait before next click"}</p>
        </motion.div>
      ) : (
        <motion.div whileTap={{ scale: 0.98 }}>
          <Button onClick={handleClick} disabled={!canClick || loading}
            className="w-full h-14 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-lg rounded-2xl shadow-lg shadow-emerald-500/20 border-0"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <MousePointerClick className="w-5 h-5 mr-2" />}
            Click to Earn
          </Button>
        </motion.div>
      )}

      {clickHistory.length > 0 && (
        <div className="bg-card rounded-xl p-3 border border-border">
          <p className="text-xs text-muted-foreground mb-2 font-bold">📊 Recent Clicks</p>
          {clickHistory.slice(0, 5).map((c) => (
            <div key={c.id} className="flex justify-between py-1.5 text-xs border-b border-border/50 last:border-0">
              <span className="text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
              <span className="text-[hsl(var(--doggy-green))] font-bold">+{c.earned} 🦴</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== Refer Section =====
function ReferSection({ userId, telegramId }: { userId: string; telegramId: number }) {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [referBalance, setReferBalance] = useState(0);
  const [reward, setReward] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 });

  const loadReferrals = useCallback(async () => {
    const { data } = await supabase.from("referrals").select("*").eq("referrer_id", userId);
    const refereeIds = (data || []).map((r) => r.referee_id).filter(Boolean);
    let userMap: Record<string, any> = {};
    if (refereeIds.length) {
      const { data: referredUsers } = await supabase.from("users").select("id, username, first_name, telegram_id").in("id", refereeIds);
      (referredUsers || []).forEach((u) => { userMap[u.id] = u; });
    }
    const enriched = (data || []).map((r) => ({ ...r, referred_user: userMap[r.referee_id] }));
    setReferrals(enriched);
    const unclaimed = enriched.filter(r => r.verified && !r.reward_claimed);
    setReferBalance(unclaimed.reduce((sum: number, r: any) => sum + Number(r.reward_amount), 0));
  }, [userId]);

  useEffect(() => { loadReferrals(); }, [loadReferrals]);

  async function handleClaim(referralId: string, amount: number) {
    try {
      await claimReferralReward(userId, referralId);
      setReward({ show: true, amount });
      loadReferrals();
    } catch { toast.error("Claim failed"); }
  }

  const referLink = `https://t.me/Doggycash1bot?startapp=ref_${telegramId}`;
  return (
    <div className="space-y-4">
      <RewardPopup show={reward.show} amount={reward.amount} message="REFERRAL REWARD!" onClose={() => setReward({ show: false, amount: 0 })} />
      <div className="bg-indigo-500/10 rounded-xl p-3 border border-indigo-500/20">
        <p className="text-xs text-indigo-300">👥 <b>How it works:</b> Share your link, friends join & complete tasks → you earn 100 Doggy + 5% commission!</p>
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-indigo-500/20 via-card to-purple-500/10 rounded-2xl p-5 border border-indigo-500/30 text-center"
      >
        <motion.span animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="text-4xl inline-block">👥</motion.span>
        <p className="text-xs text-muted-foreground mb-1 mt-2">Referrals: {referrals.length} | Unclaimed</p>
        <p className="text-3xl font-display font-bold text-gradient-gold">{referBalance} 🦴</p>
      </motion.div>

      <div className="bg-card rounded-xl p-3 border border-border">
        <p className="text-xs text-muted-foreground mb-2 font-bold">🔗 Your Referral Link</p>
        <div className="flex gap-2">
          <Input value={referLink} readOnly className="text-xs h-9 bg-muted" />
          <Button size="sm" className="h-9 bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0" onClick={() => {
            navigator.clipboard.writeText(referLink);
            toast.success("📋 Link copied!");
          }}>
            <Copy className="w-3 h-3 mr-1" /> Copy
          </Button>
        </div>
      </div>

      <div className="bg-destructive/10 rounded-xl p-3 border border-destructive/30">
        <p className="text-xs text-destructive font-semibold">⚠️ Warning</p>
        <p className="text-xs text-destructive/80 mt-1">Multiple accounts & VPN usage will result in auto-ban!</p>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-2 font-bold">📊 Referral History ({referrals.length})</p>
        {referrals.length === 0 && (
          <div className="text-center py-8">
            <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }}><span className="text-4xl">🐕</span></motion.div>
            <p className="text-xs text-muted-foreground mt-2">No referrals yet. Share your link!</p>
          </div>
        )}
        {referrals.map((r) => (
          <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between bg-card rounded-xl p-3 border border-border mb-2"
          >
            <div>
              <p className="text-xs font-semibold">@{r.referred_user?.username || r.referred_user?.first_name || r.referred_user?.telegram_id || 'Unknown'}</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.verified ? 'bg-[hsl(var(--doggy-green))]/20 text-[hsl(var(--doggy-green))]' : 'bg-primary/20 text-primary'}`}>
                {r.verified ? '✅ Verified' : '⏳ Not Verified'}
              </span>
              <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
            </div>
            {r.verified && !r.reward_claimed && (
              <Button size="sm" className="h-7 text-[10px] bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0" onClick={() => handleClaim(r.id, r.reward_amount)}>
                Claim {r.reward_amount}🦴
              </Button>
            )}
            {r.reward_claimed && <span className="text-[10px] text-[hsl(var(--doggy-green))] font-bold">✅ Claimed</span>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ===== Reward Code Section =====
function RewardCodeSection({ userId }: { userId: string }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [claims, setClaims] = useState<any[]>([]);
  const [reward, setReward] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 });

  const loadClaims = useCallback(async () => {
    const { data } = await supabase.from("reward_claims").select("*, reward_codes(code, value)").eq("user_id", userId);
    setClaims(data || []);
  }, [userId]);

  useEffect(() => { loadClaims(); }, [loadClaims]);

  async function handleClaim() {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const result = await claimRewardCode(userId, code.trim());
      if (result.success) {
        setReward({ show: true, amount: result.amount });
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
      <RewardPopup show={reward.show} amount={reward.amount} message="CODE REDEEMED!" onClose={() => setReward({ show: false, amount: 0 })} />
      <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20">
        <p className="text-xs text-purple-300">🎁 <b>How it works:</b> Get reward codes from our community channel and enter them here!</p>
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-purple-500/20 via-card to-pink-500/10 rounded-xl p-4 border border-purple-500/30"
      >
        <p className="text-sm font-display font-bold text-gradient-gold mb-3">🎁 Enter Reward Code</p>
        <div className="flex gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter code..." className="h-10 bg-background" />
          <Button onClick={handleClaim} disabled={loading} className="h-10 bg-gradient-to-r from-purple-500 to-pink-600 text-white border-0 px-5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4 mr-1" />}
            Claim
          </Button>
        </div>
      </motion.div>

      <Button variant="outline" className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10" onClick={() => {
        const wa = getTelegramWebApp();
        if (wa) { wa.openTelegramLink("https://t.me/doggycash12"); } else { window.open("https://t.me/doggycash12", "_blank"); }
      }}>
        📢 Get Codes from Community
      </Button>

      {claims.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-bold">📊 Claim History</p>
          {claims.map((c) => (
            <div key={c.id} className="flex justify-between bg-card rounded-xl p-3 border border-border mb-2">
              <span className="text-xs font-mono font-bold">{(c.reward_codes as any)?.code}</span>
              <span className="text-xs text-[hsl(var(--doggy-green))] font-bold">+{c.amount} 🦴</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
