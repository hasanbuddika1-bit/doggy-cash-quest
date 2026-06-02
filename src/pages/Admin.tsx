import { useState, useEffect } from "react";
import { Megaphone, Settings, Check, X, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { adminAction, adminLogin } from "@/lib/api";
import { toast } from "sonner";

export default function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl p-6 border border-border w-full max-w-sm">
          <h1 className="text-xl font-display font-bold text-center mb-4">🔐 Admin Panel</h1>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="mb-3" />
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="mb-3" />
          <Button className="w-full bg-gradient-gold text-primary-foreground" onClick={async () => {
            try {
              const result = await adminLogin(username, password);
              if (result.success) { sessionStorage.setItem("doggy_admin_token", result.token); setAuthed(true); toast.success("✅ Welcome, Admin!"); }
              else toast.error("Wrong admin login");
            } catch { toast.error("Wrong admin login"); }
          }}>Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <h1 className="text-xl font-display font-bold text-gradient-gold mb-4">🐰 Bunny Earn Hub Admin</h1>
      <Tabs defaultValue="users">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-card">
          <TabsTrigger value="users" className="text-xs">👥 Users</TabsTrigger>
          <TabsTrigger value="suspended" className="text-xs">🚫 IP Suspended</TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs">📋 Admin Tasks</TabsTrigger>
          <TabsTrigger value="tgtasks" className="text-xs">📢 TG Tasks</TabsTrigger>
          <TabsTrigger value="submissions" className="text-xs">📤 Submissions</TabsTrigger>
          <TabsTrigger value="withdrawals" className="text-xs">💸 Withdrawals</TabsTrigger>
          <TabsTrigger value="codes" className="text-xs">🎁 Codes</TabsTrigger>
          <TabsTrigger value="channels" className="text-xs">📢 Channels</TabsTrigger>
          <TabsTrigger value="broadcast" className="text-xs">📡 Broadcast</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">⚙️ Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="suspended"><SuspendedTab /></TabsContent>
        <TabsContent value="tasks"><TasksTab taskType="admin_approve" /></TabsContent>
        <TabsContent value="tgtasks"><TasksTab taskType="one_click" /></TabsContent>
        <TabsContent value="submissions"><SubmissionsTab /></TabsContent>
        <TabsContent value="withdrawals"><WithdrawalsTab /></TabsContent>
        <TabsContent value="codes"><CodesTab /></TabsContent>
        <TabsContent value="channels"><ChannelsTab /></TabsContent>
        <TabsContent value="broadcast"><BroadcastTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [activityCounts, setActivityCounts] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    // Fetch all users in pages of 1000 (Supabase limit per query)
    const all: any[] = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await supabase.from("users").select("*")
        .order("balance", { ascending: false }).range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      all.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    setUsers(all);
    const ids = all.map((u) => u.id);
    if (ids.length) {
      const { data: bonusSetting } = await supabase.from("app_settings").select("value").eq("key", "welcome_bonus").single();
      const welcomeBonus = Number(bonusSetting?.value || 50);
      const [ads, clicks, tasks, refs, codes, withdrawals, weekly] = await Promise.all([
        supabase.from("ad_watches").select("user_id, earned").in("user_id", ids),
        supabase.from("clicks").select("user_id, earned").in("user_id", ids),
        supabase.from("task_submissions").select("user_id, status, task_id").in("user_id", ids),
        supabase.from("referrals").select("referrer_id, reward_amount, commission_earned, verified, reward_claimed").in("referrer_id", ids),
        supabase.from("reward_claims").select("user_id, amount").in("user_id", ids),
        supabase.from("withdrawals").select("user_id, amount, status").in("user_id", ids),
        supabase.from("weekly_challenge_claims").select("user_id, amount").in("user_id", ids),
      ]);
      const taskIds = [...new Set((tasks.data || []).map((r: any) => r.task_id).filter(Boolean))];
      const taskTypes: Record<string, string> = {};
      const taskValues: Record<string, number> = {};
      if (taskIds.length) {
        const taskMeta = await supabase.from("tasks").select("id, task_type, value").in("id", taskIds);
        (taskMeta.data || []).forEach((t: any) => { taskTypes[t.id] = t.task_type; taskValues[t.id] = Number(t.value || 0); });
      }
      const counts: Record<string, any> = {};
      ids.forEach((id) => {
        const u = all.find(x => x.id === id);
        const wb = u?.welcome_bonus_claimed ? welcomeBonus : 0;
        counts[id] = { ads: 0, clicks: 0, adminTasks: 0, telegramTasks: 0, refs: 0, codes: 0, weekly: 0, withdrawals: 0, withdrawnDoggy: 0, pendingDoggy: 0, welcomeBonus: wb, earned: wb };
      });
      (ads.data || []).forEach((r: any) => { if (counts[r.user_id]) { counts[r.user_id].ads++; counts[r.user_id].earned += Number(r.earned || 0); } });
      (clicks.data || []).forEach((r: any) => { if (counts[r.user_id]) { counts[r.user_id].clicks++; counts[r.user_id].earned += Number(r.earned || 0); } });
      (tasks.data || []).forEach((r: any) => {
        if (!counts[r.user_id] || r.status !== "approved") return;
        const tv = taskValues[r.task_id] || 0;
        counts[r.user_id].earned += tv;
        taskTypes[r.task_id] === "one_click" ? counts[r.user_id].telegramTasks++ : counts[r.user_id].adminTasks++;
      });
      (refs.data || []).forEach((r: any) => {
        if (!counts[r.referrer_id]) return;
        counts[r.referrer_id].refs++;
        if (r.verified && r.reward_claimed) counts[r.referrer_id].earned += Number(r.reward_amount || 0);
        if (r.verified) counts[r.referrer_id].earned += Number(r.commission_earned || 0);
      });
      (codes.data || []).forEach((r: any) => { if (counts[r.user_id]) { counts[r.user_id].codes++; counts[r.user_id].earned += Number(r.amount || 0); } });
      (weekly.data || []).forEach((r: any) => { if (counts[r.user_id]) { counts[r.user_id].weekly++; counts[r.user_id].earned += Number(r.amount || 0); } });
      (withdrawals.data || []).forEach((r: any) => {
        if (!counts[r.user_id]) return;
        counts[r.user_id].withdrawals++;
        if (r.status === 'approved') counts[r.user_id].withdrawnDoggy += Number(r.amount || 0);
        if (r.status === 'pending') counts[r.user_id].pendingDoggy += Number(r.amount || 0);
      });
      setActivityCounts(counts);
    }
  }

  const filtered = users.filter(u => 
    (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
    String(u.telegram_id).includes(search)
  );

  if (selectedUser) {
    return <UserActivityView user={selectedUser} onBack={() => setSelectedUser(null)} onRefresh={loadUsers} />;
  }

  return (
    <div className="space-y-3 mt-3">
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="h-9" />
      <p className="text-xs text-muted-foreground">Total: {users.length} users (sorted by balance)</p>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {filtered.map((u) => {
          const act = activityCounts[u.id] || { ads: 0, clicks: 0, adminTasks: 0, telegramTasks: 0, refs: 0, codes: 0, weekly: 0, withdrawnDoggy: 0, pendingDoggy: 0, welcomeBonus: 0, earned: 0 };
          const bal = Number(u.balance || 0);
          const expected = act.earned - act.withdrawnDoggy - act.pendingDoggy;
          const diff = bal - expected;
          const suspicious = Math.abs(diff) > Math.max(50, expected * 0.05);
          return (
          <div key={u.id} className="bg-card rounded-lg p-3 border border-border cursor-pointer hover:border-primary/50" onClick={() => setSelectedUser(u)}>
            <div className="flex justify-between items-start">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{u.first_name || u.username || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">@{u.username} | ID: {u.telegram_id}</p>
                <p className="text-xs text-muted-foreground">Country: {u.country || 'Unknown'} | IP: {u.ip_address || 'N/A'}</p>
                <p className="text-xs text-primary font-bold">{bal.toFixed(0)} 🐰 {suspicious && <span className="text-destructive">⚠️ Diff {diff >= 0 ? '+' : ''}{diff.toFixed(0)}</span>}</p>
                <p className={`text-[10px] ${suspicious ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>Expected ≈ {expected.toFixed(0)} 🐰 (Earned {act.earned.toFixed(0)} − Withdrawn {act.withdrawnDoggy.toFixed(0)}{act.pendingDoggy ? ` − Pending ${act.pendingDoggy.toFixed(0)}` : ''})</p>
                <p className="text-[10px] text-muted-foreground">🎁 {act.welcomeBonus} • 📺 {act.ads} • 🖱️ {act.clicks} • 📋 {act.adminTasks} • 📢 {act.telegramTasks} • 👥 {act.refs} • 🎟️ {act.codes} • 🏆 {act.weekly}</p>
                {u.suspension_reason && <p className="text-[10px] text-destructive">Reason: {u.suspension_reason}</p>}
                <p className="text-[10px] text-muted-foreground">Access: {u.access_tasks_completed ? '✅' : '❌'} | Banned: {u.banned ? '🚫' : '✅'} | Withdraw: {u.withdraw_unlocked ? '🔓 Unlocked' : '🔒 Normal'}</p>
              </div>
              <div className="flex gap-1 flex-col" onClick={(e) => e.stopPropagation()}>
                {u.banned ? (
                  <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={async () => {
                    await adminAction("update_user", { target_user_id: u.id, updates: { banned: false } });
                    loadUsers();
                    toast.success("User unbanned");
                  }}>Unban</Button>
                ) : (
                  <Button size="sm" variant="destructive" className="h-6 text-[10px]" onClick={async () => {
                    const reason = window.prompt("Suspend reason", "Suspicious activity / invalid balance activity") || "Suspicious activity detected by admin";
                    await adminAction("ban_user", { target_user_id: u.id, reason });
                    loadUsers();
                    toast.success("User banned");
                  }}>Ban</Button>
                )}
                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={async () => {
                  await adminAction("update_user", { target_user_id: u.id, updates: { access_tasks_completed: !u.access_tasks_completed } });
                  loadUsers();
                  toast.success(`Access tasks ${!u.access_tasks_completed ? 'completed' : 'reset'}`);
                }}>
                  {u.access_tasks_completed ? 'Reset Access' : 'Grant Access'}
                </Button>
                <Button size="sm" variant={u.withdraw_unlocked ? 'destructive' : 'outline'} className="h-6 text-[10px]" onClick={async () => {
                  await adminAction("unlock_withdraw", { target_user_id: u.id, unlocked: !u.withdraw_unlocked });
                  loadUsers();
                  toast.success(u.withdraw_unlocked ? '🔒 Withdraw locked' : '🔓 Withdraw requirements filled');
                }}>
                  {u.withdraw_unlocked ? '🔒 Lock Withdraw' : '🔓 Fill Requirements'}
                </Button>
              </div>
            </div>
          </div>
        );})}
      </div>
    </div>
  );
}

function UserActivityView({ user, onBack, onRefresh }: { user: any; onBack: () => void; onRefresh: () => void }) {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [adWatches, setAdWatches] = useState<any[]>([]);
  const [clicks, setClicks] = useState<any[]>([]);
  const [taskSubs, setTaskSubs] = useState<any[]>([]);
  const [rewardClaims, setRewardClaims] = useState<any[]>([]);
  const [weeklyClaims, setWeeklyClaims] = useState<any[]>([]);
  const [welcomeBonus, setWelcomeBonus] = useState<number>(0);

  // Fetch ALL records (paged) for a single user — to compute 100% accurate totals
  async function fetchAll(table: string, col: string, val: string) {
    const sb: any = supabase;
    const out: any[] = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await sb.from(table).select("*").eq(col, val).order("created_at", { ascending: false }).range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      out.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return out;
  }

  useEffect(() => {
    const uid = user.id;
    (async () => {
      const [refs, wds, ads, cls, tsks, codes, weekly, bonusSetting] = await Promise.all([
        fetchAll("referrals", "referrer_id", uid),
        fetchAll("withdrawals", "user_id", uid),
        fetchAll("ad_watches", "user_id", uid),
        fetchAll("clicks", "user_id", uid),
        fetchAll("task_submissions", "user_id", uid),
        fetchAll("reward_claims", "user_id", uid),
        fetchAll("weekly_challenge_claims", "user_id", uid),
        supabase.from("app_settings").select("value").eq("key", "welcome_bonus").single(),
      ]);
      setWelcomeBonus(user.welcome_bonus_claimed ? Number((bonusSetting as any)?.data?.value || 50) : 0);

      const refereeIds = refs.map((r: any) => r.referee_id).filter(Boolean);
      const taskIds = tsks.map((t: any) => t.task_id).filter(Boolean);
      const codeIds = codes.map((c: any) => c.code_id).filter(Boolean);
      const [refUsers, taskMeta, codeMeta] = await Promise.all([
        refereeIds.length ? supabase.from("users").select("id, username, first_name, telegram_id").in("id", refereeIds) : Promise.resolve({ data: [] as any[] }),
        taskIds.length ? supabase.from("tasks").select("id, title, task_type, value").in("id", taskIds) : Promise.resolve({ data: [] as any[] }),
        codeIds.length ? supabase.from("reward_codes").select("id, code").in("id", codeIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      const refMap: Record<string, any> = {}, taskMap: Record<string, any> = {}, codeMap: Record<string, any> = {};
      (refUsers.data || []).forEach((u: any) => { refMap[u.id] = u; });
      (taskMeta.data || []).forEach((t: any) => { taskMap[t.id] = t; });
      (codeMeta.data || []).forEach((c: any) => { codeMap[c.id] = c; });
      setReferrals(refs.map((r: any) => ({ ...r, referred_user: refMap[r.referee_id] })));
      setWithdrawals(wds);
      setAdWatches(ads);
      setClicks(cls);
      setTaskSubs(tsks.map((t: any) => ({ ...t, task: taskMap[t.task_id] })));
      setRewardClaims(codes.map((c: any) => ({ ...c, reward_code: codeMap[c.code_id] })));
      setWeeklyClaims(weekly);
    })();
  }, [user.id]);

  // Accurate totals
  const adsEarned = adWatches.reduce((s, a) => s + Number(a.earned || 0), 0);
  const clicksEarned = clicks.reduce((s, c) => s + Number(c.earned || 0), 0);
  const tasksApproved = taskSubs.filter(t => t.status === 'approved');
  const tasksEarned = tasksApproved.reduce((s, t) => s + Number(t.task?.value || 0), 0);
  const refRewardEarned = referrals.filter(r => r.verified && r.reward_claimed).reduce((s, r) => s + Number(r.reward_amount || 0), 0);
  const refCommissionEarned = referrals.filter(r => r.verified).reduce((s, r) => s + Number(r.commission_earned || 0), 0);
  const codesEarned = rewardClaims.reduce((s, c) => s + Number(c.amount || 0), 0);
  const weeklyEarned = weeklyClaims.reduce((s, w) => s + Number(w.amount || 0), 0);
  const totalEarned = welcomeBonus + adsEarned + clicksEarned + tasksEarned + refRewardEarned + refCommissionEarned + codesEarned + weeklyEarned;
  const withdrawnApproved = withdrawals.filter(w => w.status === 'approved').reduce((s, w) => s + Number(w.amount || 0), 0);
  const withdrawnPending = withdrawals.filter(w => w.status === 'pending').reduce((s, w) => s + Number(w.amount || 0), 0);
  const expectedBalance = totalEarned - withdrawnApproved - withdrawnPending;
  const actualBalance = Number(user.balance || 0);
  const diff = actualBalance - expectedBalance;
  const accurate = Math.abs(diff) <= Math.max(1, expectedBalance * 0.01);

  return (
    <div className="space-y-3 mt-3">
      <Button size="sm" variant="outline" onClick={onBack} className="h-7 text-xs">← Back to Users</Button>
      <div className="bg-card rounded-lg p-3 border border-border">
        <p className="text-sm font-bold">{user.first_name || user.username || 'Unknown'}</p>
        <p className="text-xs text-muted-foreground">@{user.username} | TG: {user.telegram_id} | IP: {user.ip_address || 'N/A'}</p>
        <p className="text-xs text-primary font-bold">{actualBalance.toFixed(2)} 🐰 | Country: {user.country || 'Unknown'}</p>
        {user.wallet_address && <p className="text-[10px] text-muted-foreground break-all">🟢 USDT (Aptos): {user.wallet_address}</p>}
        {user.ton_address && <p className="text-[10px] text-muted-foreground break-all">🔵 TON: {user.ton_address}</p>}
        <p className="text-[10px] text-muted-foreground">Joined: {new Date(user.created_at).toLocaleString()}</p>
      </div>

      <div className={`rounded-lg p-3 border ${accurate ? 'bg-green-950/30 border-green-700' : 'bg-red-950/30 border-destructive'}`}>
        <p className="text-xs font-bold mb-2">{accurate ? '✅ Balance Accurate' : '⚠️ Balance Mismatch'}</p>
        <div className="space-y-0.5 text-[11px]">
          <p>🎁 Welcome Bonus: <b>+{welcomeBonus.toFixed(2)}</b></p>
          <p>📺 Ads ({adWatches.length}): <b>+{adsEarned.toFixed(2)}</b></p>
          <p>🖱️ Clicks ({clicks.length}): <b>+{clicksEarned.toFixed(2)}</b></p>
          <p>📋 Tasks Approved ({tasksApproved.length}/{taskSubs.length}): <b>+{tasksEarned.toFixed(2)}</b></p>
          <p>👥 Referrals Reward ({referrals.filter(r=>r.verified && r.reward_claimed).length}): <b>+{refRewardEarned.toFixed(2)}</b></p>
          <p>💰 Referral Commissions: <b>+{refCommissionEarned.toFixed(2)}</b></p>
          <p>🎟️ Reward Codes ({rewardClaims.length}): <b>+{codesEarned.toFixed(2)}</b></p>
          <p>🏆 Weekly Challenges ({weeklyClaims.length}): <b>+{weeklyEarned.toFixed(2)}</b></p>
          <hr className="border-border my-1" />
          <p className="font-bold">Total Earned: <b>{totalEarned.toFixed(2)} 🐰</b></p>
          <p>💸 Withdrawn (approved): <b>−{withdrawnApproved.toFixed(2)}</b></p>
          <p>⏳ Pending withdrawal: <b>−{withdrawnPending.toFixed(2)}</b></p>
          <hr className="border-border my-1" />
          <p className="font-bold">Expected Balance: <b>{expectedBalance.toFixed(2)} 🐰</b></p>
          <p className="font-bold">Actual Balance: <b>{actualBalance.toFixed(2)} 🐰</b></p>
          <p className={`font-bold ${accurate ? 'text-green-400' : 'text-destructive'}`}>Difference: {diff >= 0 ? '+' : ''}{diff.toFixed(2)} 🐰</p>
        </div>
      </div>

      {referrals.length > 0 && (
        <div className="bg-card rounded-lg p-3 border border-border">
          <p className="text-xs font-bold mb-1">👥 Referrals ({referrals.length})</p>
          <div className="max-h-40 overflow-y-auto">
          {referrals.map(r => (
            <p key={r.id} className="text-[10px] text-muted-foreground">
              @{r.referred_user?.username || r.referred_user?.first_name || r.referred_user?.telegram_id || 'Unknown'} — {r.verified ? '✅ Verified' : '⏳ Pending'} | Reward: {r.reward_claimed ? `✅ +${r.reward_amount}` : '❌'} | Comm: +{Number(r.commission_earned || 0).toFixed(2)} | {new Date(r.created_at).toLocaleDateString()}
            </p>
          ))}
          </div>
        </div>
      )}

      {withdrawals.length > 0 && (
        <div className="bg-card rounded-lg p-3 border border-border">
          <p className="text-xs font-bold mb-1">💸 Withdrawals ({withdrawals.length})</p>
          <div className="max-h-40 overflow-y-auto">
          {withdrawals.map(w => (
            <p key={w.id} className="text-[10px] text-muted-foreground">
              {Number(w.amount).toFixed(0)} 🐰 → ${Number(w.net_usdt || w.usdt_amount).toFixed(4)} | <span className={w.status==='approved'?'text-green-400':w.status==='rejected'?'text-red-400':'text-yellow-400'}>{w.status.toUpperCase()}</span> | {new Date(w.created_at).toLocaleDateString()}
            </p>
          ))}
          </div>
        </div>
      )}

      {adWatches.length > 0 && (
        <div className="bg-card rounded-lg p-3 border border-border">
          <p className="text-xs font-bold mb-1">📺 Ad Watches ({adWatches.length})</p>
          <div className="max-h-40 overflow-y-auto">
          {adWatches.slice(0, 50).map(a => (
            <p key={a.id} className="text-[10px] text-muted-foreground">
              Ad #{a.ad_index} — +{a.earned} 🐰 | {new Date(a.created_at).toLocaleString()}
            </p>
          ))}
          </div>
        </div>
      )}

      {clicks.length > 0 && (
        <div className="bg-card rounded-lg p-3 border border-border">
          <p className="text-xs font-bold mb-1">🖱️ Clicks ({clicks.length})</p>
          <div className="max-h-40 overflow-y-auto">
          {clicks.slice(0, 50).map(c => (
            <p key={c.id} className="text-[10px] text-muted-foreground">
              +{c.earned} 🐰 | {new Date(c.created_at).toLocaleString()}
            </p>
          ))}
          </div>
        </div>
      )}

      {taskSubs.length > 0 && (
        <div className="bg-card rounded-lg p-3 border border-border">
          <p className="text-xs font-bold mb-1">📋 Task Submissions ({taskSubs.length})</p>
          <div className="max-h-40 overflow-y-auto">
          {taskSubs.map(t => (
            <p key={t.id} className="text-[10px] text-muted-foreground">
              {t.task?.title || 'Unknown'} ({t.task?.task_type === 'one_click' ? 'TG' : 'Admin'}) +{t.task?.value || 0} — <span className={t.status==='approved'?'text-green-400':t.status==='rejected'?'text-red-400':'text-yellow-400'}>{t.status.toUpperCase()}</span> | {new Date(t.created_at).toLocaleDateString()}
            </p>
          ))}
          </div>
        </div>
      )}

      {rewardClaims.length > 0 && (
        <div className="bg-card rounded-lg p-3 border border-border">
          <p className="text-xs font-bold mb-1">🎟️ Reward Codes ({rewardClaims.length})</p>
          <div className="max-h-40 overflow-y-auto">
          {rewardClaims.map(c => (
            <p key={c.id} className="text-[10px] text-muted-foreground">
              {c.reward_code?.code || 'Code'} — +{c.amount} 🐰 | {new Date(c.created_at).toLocaleDateString()}
            </p>
          ))}
          </div>
        </div>
      )}

      {weeklyClaims.length > 0 && (
        <div className="bg-card rounded-lg p-3 border border-border">
          <p className="text-xs font-bold mb-1">🏆 Weekly Challenges ({weeklyClaims.length})</p>
          <div className="max-h-40 overflow-y-auto">
          {weeklyClaims.map(w => (
            <p key={w.id} className="text-[10px] text-muted-foreground">
              {w.challenge_key} — +{w.amount} 🐰 | week {new Date(w.week_start).toLocaleDateString()} | claimed {new Date(w.created_at).toLocaleDateString()}
            </p>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SuspendedTab() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    const { data } = await supabase.from("users").select("*").eq("banned", true).order("updated_at", { ascending: false }).limit(100);
    setUsers(data || []);
  }

  return (
    <div className="space-y-3 mt-3">
      <p className="text-xs text-muted-foreground font-bold">🚫 IP Suspended Accounts ({users.length})</p>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {users.map((u) => (
          <div key={u.id} className="bg-card rounded-lg p-3 border border-destructive/30">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold">{u.first_name || u.username || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">@{u.username} | TG: {u.telegram_id}</p>
                <p className="text-xs text-destructive font-bold">IP: {u.ip_address || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">Balance: {Number(u.balance).toFixed(0)} 🐰</p>
                <p className="text-[10px] text-muted-foreground">Banned: {new Date(u.updated_at).toLocaleString()}</p>
              </div>
              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={async () => {
                await adminAction("update_user", { target_user_id: u.id, updates: { banned: false } });
                loadUsers();
                toast.success("User unbanned");
              }}>Unban</Button>
            </div>
          </div>
        ))}
        {users.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No suspended accounts</p>}
      </div>
    </div>
  );
}

function TasksTab({ taskType }: { taskType: string }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [value, setValue] = useState("10");
  const [telegramChannel, setTelegramChannel] = useState("");

  useEffect(() => { loadTasks(); }, [taskType]);

  async function loadTasks() {
    const { data } = await supabase.from("tasks").select("*").eq("task_type", taskType).order("created_at", { ascending: false });
    setTasks(data || []);
  }

  async function createTask() {
    if (!title.trim()) return;
    const insertData: any = { title, description, link, value: Number(value), task_type: taskType };
    if (taskType === 'one_click') {
      insertData.telegram_channel = telegramChannel.trim().replace('@', '');
      insertData.requires_image = false;
    }
    await adminAction("create_task", { task_data: insertData });
    toast.success("Task created!");
    setTitle(""); setDescription(""); setLink(""); setValue("10"); setTelegramChannel("");
    loadTasks();
  }

  return (
    <div className="space-y-3 mt-3">
      <div className="bg-card rounded-xl p-3 border border-border space-y-2">
        <p className="text-sm font-semibold">{taskType === 'one_click' ? '📢 Create Telegram Task' : '📋 Create Admin Task'}</p>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="h-8 text-xs" />
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="text-xs min-h-[60px]" />
        {taskType === 'one_click' ? (
          <>
            <Input value={telegramChannel} onChange={(e) => setTelegramChannel(e.target.value)} placeholder="Telegram channel username (without @)" className="h-8 text-xs" />
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Channel link (https://t.me/...)" className="h-8 text-xs" />
          </>
        ) : (
          <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Task link" className="h-8 text-xs" />
        )}
        <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Bunny value" className="h-8 text-xs" />
        <Button className="w-full h-8 text-xs bg-gradient-gold text-primary-foreground" onClick={createTask}>Create Task</Button>
      </div>
      {tasks.map((t) => (
        <div key={t.id} className="bg-card rounded-lg p-3 border border-border">
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-semibold">{t.title}</p>
              <p className="text-xs text-primary">+{t.value} 🐰</p>
              {t.telegram_channel && <p className="text-[10px] text-muted-foreground">@{t.telegram_channel}</p>}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant={t.active ? "destructive" : "outline"} className="h-6 text-[10px]" onClick={async () => {
                await adminAction("update_task", { task_id: t.id, updates: { active: !t.active } });
                loadTasks();
              }}>{t.active ? 'Disable' : 'Enable'}</Button>
              <Button size="sm" variant="destructive" className="h-6 text-[10px]" onClick={async () => {
                await adminAction("delete_task", { task_id: t.id });
                loadTasks();
                toast.success("Task deleted");
              }}><Trash2 className="w-3 h-3" /></Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SubmissionsTab() {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => { loadSubs(); }, []);

  async function loadSubs() {
    const { data } = await supabase.from("task_submissions").select("*, tasks(title, value), users(username, telegram_id)")
      .order("created_at", { ascending: false }).limit(50);
    setSubs(data || []);
  }

  async function handleAction(id: string, action: string) {
    setLoading(id);
    try {
      await adminAction(action, { submission_id: id });
      toast.success(action === 'approve_task' ? '✅ Approved!' : '❌ Rejected!');
      loadSubs();
    } catch { toast.error("Action failed"); }
    setLoading(null);
  }

  return (
    <div className="space-y-2 mt-3 max-h-[70vh] overflow-y-auto">
      {subs.map((s) => (
        <div key={s.id} className="bg-card rounded-lg p-3 border border-border">
          <p className="text-xs font-semibold">{(s.tasks as any)?.title} - @{(s.users as any)?.username}</p>
          <p className="text-xs text-primary">+{(s.tasks as any)?.value} 🐰</p>
          {s.image_url && <a href={s.image_url} target="_blank" className="text-xs text-blue-400 underline">View Image</a>}
          <p className={`text-xs font-bold mt-1 ${s.status === 'approved' ? 'text-green-400' : s.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}>
            {s.status.toUpperCase()}
          </p>
          {s.status === 'pending' && (
            <div className="flex gap-2 mt-2">
              <Button size="sm" className="h-6 text-[10px] bg-green-600" onClick={() => handleAction(s.id, 'approve_task')}
                disabled={loading === s.id}>
                {loading === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />} Approve
              </Button>
              <Button size="sm" variant="destructive" className="h-6 text-[10px]" onClick={() => handleAction(s.id, 'reject_task')}
                disabled={loading === s.id}>
                <X className="w-3 h-3 mr-1" /> Reject
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function WithdrawalsTab() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'usdt_aptos' | 'ton'>('all');
  const [loading, setLoading] = useState<string | null>(null);
  const [txInputs, setTxInputs] = useState<Record<string, string>>({});
  const [activity, setActivity] = useState<Record<string, any>>({});

  useEffect(() => { loadWithdrawals(); }, []);

  async function loadWithdrawals() {
    const { data } = await supabase.from("withdrawals").select("*, users(username, telegram_id, balance)")
      .order("created_at", { ascending: false }).limit(100);
    const list = data || [];
    setWithdrawals(list);

    // Load activity counts to validate balance plausibility
    const userIds = [...new Set(list.map((w: any) => w.user_id))];
    if (userIds.length) {
      const [ads, clicks, refs, codes] = await Promise.all([
        supabase.from("ad_watches").select("user_id, earned").in("user_id", userIds),
        supabase.from("clicks").select("user_id, earned").in("user_id", userIds),
        supabase.from("referrals").select("referrer_id, reward_amount, commission_earned").in("referrer_id", userIds).eq("verified", true),
        supabase.from("reward_claims").select("user_id, amount").in("user_id", userIds),
      ]);
      const map: Record<string, any> = {};
      userIds.forEach((id) => { map[id] = { ads: 0, clicks: 0, refs: 0, codes: 0, earned: 0 }; });
      (ads.data || []).forEach((r: any) => { map[r.user_id].ads++; map[r.user_id].earned += Number(r.earned || 0); });
      (clicks.data || []).forEach((r: any) => { map[r.user_id].clicks++; map[r.user_id].earned += Number(r.earned || 0); });
      (refs.data || []).forEach((r: any) => { map[r.referrer_id].refs++; map[r.referrer_id].earned += Number(r.reward_amount || 0) + Number(r.commission_earned || 0); });
      (codes.data || []).forEach((r: any) => { map[r.user_id].codes++; map[r.user_id].earned += Number(r.amount || 0); });
      setActivity(map);
    }
  }

  async function handleApprove(w: any) {
    const txHash = (txInputs[w.id] || '').trim();
    if (!txHash) { toast.error("Enter Transaction Hash / ID first"); return; }
    setLoading(w.id);
    try {
      await adminAction("approve_withdrawal", { withdrawal_id: w.id, tx_hash: txHash });
      toast.success('✅ Approved & broadcasted!');
      loadWithdrawals();
    } catch { toast.error("Action failed"); }
    setLoading(null);
  }

  async function handleReject(id: string) {
    setLoading(id);
    try {
      await adminAction("reject_withdrawal", { withdrawal_id: id });
      toast.success('❌ Rejected');
      loadWithdrawals();
    } catch { toast.error("Action failed"); }
    setLoading(null);
  }

  const filtered = withdrawals.filter(w => filter === 'all' ? true : w.method === filter);

  return (
    <div className="space-y-2 mt-3">
      <div className="flex gap-1.5">
        {([['all','All'],['usdt_aptos','🟢 USDT'],['ton','🔵 TON']] as const).map(([k, l]) => (
          <Button key={k} size="sm" variant={filter === k ? 'default' : 'outline'}
            className="h-7 text-[10px] flex-1" onClick={() => setFilter(k as any)}>{l}</Button>
        ))}
      </div>
      <div className="space-y-2 max-h-[70vh] overflow-y-auto">
      {filtered.map((w) => {
        const isTon = w.method === 'ton';
        const u = w.users as any;
        const act = activity[w.user_id] || { ads: 0, clicks: 0, refs: 0, codes: 0, earned: 0 };
        const userBalance = Number(u?.balance || 0);
        // simple plausibility: balance shouldn't exceed earned + (current balance refers to remaining); flag if balance > earned * 1.1
        const suspicious = userBalance > act.earned * 1.5 && act.earned > 0;
        return (
          <div key={w.id} className={`bg-card rounded-lg p-3 border ${suspicious ? 'border-destructive/60' : 'border-border'}`}>
            <div className="flex justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold flex items-center gap-1">
                  {isTon ? '🔵 TON' : '🟢 USDT (Aptos)'} • @{u?.username}
                </p>
                <p className="text-sm font-bold text-primary">{Number(w.amount).toFixed(0)} 🐰</p>
                <p className="text-[10px] text-muted-foreground">
                  Gross: ${Number(w.usdt_amount).toFixed(4)} | Fee: ${Number(w.fee_usdt || 0).toFixed(4)} | Net: ${Number(w.net_usdt || w.usdt_amount).toFixed(4)}
                </p>
                {isTon && w.ton_amount && (
                  <p className="text-[10px] text-blue-400 font-bold">🪙 Pay: {Number(w.ton_amount).toFixed(6)} TON</p>
                )}
                <p className="text-[10px] text-muted-foreground font-mono break-all">{w.wallet_address}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleString()}</p>
                <p className={`text-[10px] mt-1 ${suspicious ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                  Balance: {userBalance.toFixed(0)} 🐰 | Earned: {act.earned.toFixed(0)} 🐰 | Ads {act.ads} • Clicks {act.clicks} • Refs {act.refs} • Codes {act.codes}
                  {suspicious && ' ⚠️ Inconsistent'}
                </p>
                {w.tx_hash && <p className="text-[10px] text-blue-400 break-all">TX: {w.tx_hash}</p>}
              </div>
            </div>
            <p className={`text-xs font-bold mt-1 ${w.status === 'approved' ? 'text-green-400' : w.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}>
              {w.status.toUpperCase()}
            </p>
            {w.status === 'pending' && (
              <div className="mt-2 space-y-2">
                <Input
                  value={txInputs[w.id] || ''}
                  onChange={(e) => setTxInputs(prev => ({ ...prev, [w.id]: e.target.value }))}
                  placeholder={isTon ? 'TON tx hash (paste after sending)' : 'Aptos tx hash'}
                  className="h-7 text-[10px] font-mono"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-6 text-[10px] bg-green-600 flex-1" onClick={() => handleApprove(w)} disabled={loading === w.id}>
                    {loading === w.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />} Approve & Notify
                  </Button>
                  <Button size="sm" variant="destructive" className="h-6 text-[10px]" onClick={() => handleReject(w.id)} disabled={loading === w.id}>
                    <X className="w-3 h-3 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

function CodesTab() {
  const [codes, setCodes] = useState<any[]>([]);
  const [code, setCode] = useState("");
  const [codeValue, setCodeValue] = useState("50");
  const [maxUses, setMaxUses] = useState("100");

  useEffect(() => { loadCodes(); }, []);

  async function loadCodes() {
    const { data } = await supabase.from("reward_codes").select("*").order("created_at", { ascending: false });
    setCodes(data || []);
  }

  async function createCode() {
    if (!code.trim()) return;
    await adminAction("create_code", { code_data: { code: code.trim(), value: Number(codeValue), max_uses: Number(maxUses) } });
    toast.success("Code created!");
    setCode(""); setCodeValue("50"); setMaxUses("100");
    loadCodes();
  }

  return (
    <div className="space-y-3 mt-3">
      <div className="bg-card rounded-xl p-3 border border-border space-y-2">
        <p className="text-sm font-semibold">Create Reward Code</p>
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" className="h-8 text-xs" />
        <div className="flex gap-2">
          <Input type="number" value={codeValue} onChange={(e) => setCodeValue(e.target.value)} placeholder="Value" className="h-8 text-xs" />
          <Input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Max uses" className="h-8 text-xs" />
        </div>
        <Button className="w-full h-8 text-xs bg-gradient-gold text-primary-foreground" onClick={createCode}>Create Code</Button>
      </div>
      {codes.map((c) => (
        <div key={c.id} className="bg-card rounded-lg p-3 border border-border flex justify-between">
          <div>
            <p className="text-sm font-mono font-bold">{c.code}</p>
            <p className="text-xs text-primary">+{c.value} 🐰 • {c.current_uses}/{c.max_uses} used</p>
          </div>
          <Button size="sm" variant={c.active ? "destructive" : "outline"} className="h-6 text-[10px]" onClick={async () => {
            await adminAction("update_code", { code_id: c.id, updates: { active: !c.active } });
            loadCodes();
          }}>{c.active ? 'Deactivate' : 'Activate'}</Button>
        </div>
      ))}
    </div>
  );
}

function ChannelsTab() {
  const [channels, setChannels] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [link, setLink] = useState("");
  const [countryRestriction, setCountryRestriction] = useState("");

  useEffect(() => { loadChannels(); }, []);

  async function loadChannels() {
    const { data } = await supabase.from("channels").select("*").order("sort_order");
    setChannels(data || []);
  }

  async function addChannel() {
    if (!name.trim() || !telegramUsername.trim() || !link.trim()) return;
    await adminAction("create_channel", { channel_data: {
      name: name.trim(),
      telegram_username: telegramUsername.trim().replace('@', ''),
      link: link.trim(),
      country_restriction: countryRestriction.trim() || null,
      sort_order: channels.length + 1,
    }});
    toast.success("Channel added!");
    setName(""); setTelegramUsername(""); setLink(""); setCountryRestriction("");
    loadChannels();
  }

  async function removeChannel(id: string) {
    await adminAction("delete_channel", { channel_id: id });
    toast.success("Channel removed!");
    loadChannels();
  }

  async function toggleRequired(id: string, currentRequired: boolean) {
    await adminAction("update_channel", { channel_id: id, updates: { required: !currentRequired } });
    loadChannels();
  }

  return (
    <div className="space-y-3 mt-3">
      <div className="bg-card rounded-xl p-3 border border-border space-y-2">
        <p className="text-sm font-semibold">📢 Add Channel</p>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Channel name" className="h-8 text-xs" />
        <Input value={telegramUsername} onChange={(e) => setTelegramUsername(e.target.value)} placeholder="Telegram username (without @)" className="h-8 text-xs" />
        <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Channel link (https://t.me/...)" className="h-8 text-xs" />
        <Input value={countryRestriction} onChange={(e) => setCountryRestriction(e.target.value)} placeholder="Country restriction (e.g. LK, leave empty for all)" className="h-8 text-xs" />
        <Button className="w-full h-8 text-xs bg-gradient-gold text-primary-foreground" onClick={addChannel}>
          <Plus className="w-3 h-3 mr-1" /> Add Channel
        </Button>
      </div>

      <p className="text-xs text-muted-foreground font-bold">Channels ({channels.length})</p>
      {channels.map((ch) => (
        <div key={ch.id} className="bg-card rounded-lg p-3 border border-border">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold">{ch.name}</p>
              <p className="text-xs text-muted-foreground">@{ch.telegram_username}</p>
              <p className="text-[10px] text-muted-foreground">{ch.link}</p>
              {ch.country_restriction && <p className="text-[10px] text-amber-400">🌍 {ch.country_restriction} only</p>}
              <p className="text-[10px] text-muted-foreground">Required: {ch.required ? '✅' : '❌'}</p>
            </div>
            <div className="flex gap-1 flex-col">
              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => toggleRequired(ch.id, ch.required)}>
                {ch.required ? 'Disable' : 'Enable'}
              </Button>
              <Button size="sm" variant="destructive" className="h-6 text-[10px]" onClick={() => removeChannel(ch.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BroadcastTab() {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [sending, setSending] = useState(false);

  async function sendBroadcast() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const result = await adminAction("broadcast", {
        text, image_url: imageUrl || undefined,
        button_text: buttonText || undefined,
        button_url: buttonUrl || undefined,
      });
      toast.success(`📢 Sent to ${result.sent} users!`);
      setText(""); setImageUrl(""); setButtonText(""); setButtonUrl("");
    } catch { toast.error("Broadcast failed"); }
    setSending(false);
  }

  return (
    <div className="space-y-3 mt-3">
      <div className="bg-card rounded-xl p-3 border border-border space-y-2">
        <p className="text-sm font-semibold">📢 Broadcast Message</p>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Message (HTML supported)" className="text-xs min-h-[80px]" />
        <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL (optional)" className="h-8 text-xs" />
        <div className="flex gap-2">
          <Input value={buttonText} onChange={(e) => setButtonText(e.target.value)} placeholder="Button text" className="h-8 text-xs" />
          <Input value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} placeholder="Button URL" className="h-8 text-xs" />
        </div>
        <Button className="w-full h-8 text-xs bg-gradient-gold text-primary-foreground" onClick={sendBroadcast} disabled={sending}>
          {sending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Megaphone className="w-3 h-3 mr-1" />}
          Send Broadcast
        </Button>
      </div>
    </div>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState<any[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    const { data } = await supabase.from("app_settings").select("*").order("key");
    setSettings(data || []);
    const map: Record<string, string> = {};
    (data || []).forEach(s => { map[s.key] = s.value; });
    setValues(map);
  }

  async function saveSettings() {
    for (const s of settings) {
      if (values[s.key] !== s.value) {
        await adminAction("update_settings", { key: s.key, value: values[s.key] });
      }
    }
    toast.success("⚙️ Settings saved!");
    loadSettings();
  }

  return (
    <div className="space-y-3 mt-3">
      <div className="bg-card rounded-xl p-3 border border-border space-y-3">
        <p className="text-sm font-semibold">⚙️ App Settings</p>
        {settings.map((s) => (
          <div key={s.id}>
            <label className="text-xs text-muted-foreground">{s.description || s.key}</label>
            <Input value={values[s.key] || ''} onChange={(e) => setValues(prev => ({ ...prev, [s.key]: e.target.value }))} className="h-8 text-xs" />
          </div>
        ))}
        <Button className="w-full h-8 text-xs bg-gradient-gold text-primary-foreground" onClick={saveSettings}>
          <Settings className="w-3 h-3 mr-1" /> Save Settings
        </Button>
      </div>
    </div>
  );
}
