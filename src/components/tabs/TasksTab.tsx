import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Loader2, Check, ShieldCheck, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { verifyTaskCompletion } from "@/lib/api";
import { getTelegramWebApp } from "@/lib/telegram";
import { toast } from "sonner";
import { RewardPopup } from "@/components/RewardPopup";
import { GuideButton } from "@/components/GuideButton";

interface TasksTabProps {
  userId: string;
  telegramId: number;
}

type Category = "main" | "partner" | "other";

const TABS: { key: Category; label: string; emoji: string; gradient: string }[] = [
  { key: "main",    label: "Main",    emoji: "⭐", gradient: "from-bunny-pink to-bunny-lavender" },
  { key: "partner", label: "Partner", emoji: "🤝", gradient: "from-amber-400 to-bunny-gold" },
  { key: "other",   label: "Other",   emoji: "📌", gradient: "from-bunny-lavender to-bunny-pink" },
];

export function TasksTab({ userId, telegramId }: TasksTabProps) {
  const [tab, setTab] = useState<Category>("main");

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center justify-between mb-3">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-r from-bunny-pink/20 to-bunny-lavender/20 rounded-2xl px-4 py-3 border border-bunny-pink/30 flex-1 mr-2"
        >
          <p className="font-display font-bold text-gradient-bunny text-sm">📋 Daily Tasks</p>
          <p className="text-[11px] text-muted-foreground">Complete tasks → earn Bunny 🐰</p>
        </motion.div>
        <GuideButton
          title="Tasks Guide"
          steps={[
            "Open Main, Partner, and Other tabs to see available tasks.",
            "Tap 'Join' to open the Telegram channel or bot.",
            "After joining/starting, tap 'Verify' — the bot will check automatically.",
            "All Main tasks → your referrer earns +50 🐰. All Main+Partner → +100 🐰 and 10% commission.",
            "Other tab has 'Start Mini Bot' — this enables notifications, no reward.",
          ]}
        />
      </div>

      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <motion.button key={t.key} whileTap={{ scale: 0.95 }}
            onClick={() => setTab(t.key)}
            className={`flex-1 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === t.key
                ? `bg-gradient-to-r ${t.gradient} text-primary-foreground shadow-lg`
                : 'bg-card text-muted-foreground border border-bunny-pink/15'
            }`}
          >
            <span className="text-base">{t.emoji}</span> {t.label}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          <TaskList userId={userId} telegramId={telegramId} category={tab} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function TaskList({ userId, telegramId, category }: { userId: string; telegramId: number; category: Category }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [joined, setJoined] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [reward, setReward] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 });

  const load = useCallback(async () => {
    const { data: t } = await supabase.from("tasks")
      .select("*").eq("active", true).eq("category", category)
      .order("sort_order", { ascending: true });
    setTasks(t || []);
    const { data: c } = await supabase.from("task_completions").select("task_id").eq("user_id", userId);
    const map: Record<string, boolean> = {};
    (c || []).forEach((x: any) => { map[x.task_id] = true; });
    setDone(map);
  }, [userId, category]);

  useEffect(() => { load(); }, [load]);

  function openLink(task: any) {
    const link = task.link || (task.telegram_channel ? `https://t.me/${task.telegram_channel.replace(/^@/, '')}` :
      task.telegram_bot_username ? `https://t.me/${task.telegram_bot_username.replace(/^@/, '')}?start=task_${task.id}` : "");
    if (!link) return;
    const wa = getTelegramWebApp();
    if (wa) wa.openTelegramLink(link); else window.open(link, "_blank");
    setJoined(p => ({ ...p, [task.id]: true }));
  }

  async function verify(task: any) {
    setBusy(task.id);
    try {
      const r = await verifyTaskCompletion(userId, task.id, telegramId);
      if (r.success) {
        if (r.reward && r.reward > 0) setReward({ show: true, amount: r.reward });
        else toast.success(r.message || "✅ Marked complete!");
        load();
      } else {
        toast.error(r.message || "Not verified yet");
      }
    } catch {
      toast.error("Verification failed");
    }
    setBusy(null);
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-14">
        <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="text-6xl">📭</motion.div>
        <p className="text-muted-foreground mt-3 text-sm">No {category} tasks yet — check back soon!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <RewardPopup show={reward.show} amount={reward.amount} message="TASK COMPLETE!" onClose={() => setReward({ show: false, amount: 0 })} />
      {tasks.map((task, i) => {
        const isDone = done[task.id];
        const isJoined = joined[task.id];
        const isStartBot = task.verify_method === "start_bot" || (!task.gives_reward && category === "other");
        return (
          <motion.div key={task.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
            className={`bg-gradient-to-r from-card to-card/90 rounded-2xl border overflow-hidden ${
              isDone ? 'border-bunny-green/50' : 'border-bunny-pink/15'
            }`}
          >
            <div className="p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-bunny-pink/20 to-bunny-lavender/20 flex items-center justify-center text-xl flex-none">
                    {isStartBot ? "🤖" : task.telegram_bot_username ? "🤖" : "📢"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{task.title}</p>
                    {task.description && <p className="text-[11px] text-muted-foreground truncate">{task.description}</p>}
                    {task.gives_reward ? (
                      <p className="text-xs font-bold text-gradient-bunny">+{task.value} 🐰</p>
                    ) : (
                      <p className="text-[11px] text-bunny-gold-soft font-semibold flex items-center gap-1"><Bell className="w-3 h-3" /> Enables notifications</p>
                    )}
                  </div>
                </div>
                {isDone && (
                  <span className="flex-none text-xs font-bold flex items-center gap-1 bg-bunny-green/20 text-bunny-green px-2.5 py-1 rounded-full">
                    <Check className="w-3 h-3" /> Done
                  </span>
                )}
              </div>
              {!isDone && (
                <div className="flex gap-2 mt-2">
                  <Button size="sm" className="flex-1 h-8 text-xs bg-gradient-bunny text-primary-foreground border-0" onClick={() => openLink(task)}>
                    <ExternalLink className="w-3 h-3 mr-1" />
                    {isStartBot ? "Open Bot" : task.telegram_bot_username ? "Start Bot" : "Join"}
                  </Button>
                  {isJoined && (
                    <Button size="sm" className="flex-1 h-8 text-xs bg-gradient-green text-white border-0"
                      onClick={() => verify(task)} disabled={busy === task.id}>
                      {busy === task.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ShieldCheck className="w-3 h-3 mr-1" />}
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
