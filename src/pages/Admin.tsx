import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, ListTodo, Gift, ArrowDownToLine, Megaphone, Settings, ShieldCheck, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { adminAction } from "@/lib/api";
import { toast } from "sonner";

const ADMIN_PASSWORD = "Aabbcc.123";

export default function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl p-6 border border-border w-full max-w-sm">
          <h1 className="text-xl font-display font-bold text-center mb-4">🔐 Admin Panel</h1>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="mb-3" />
          <Button className="w-full bg-gradient-gold text-primary-foreground" onClick={() => {
            if (password === ADMIN_PASSWORD) { setAuthed(true); toast.success("✅ Welcome, Admin!"); }
            else toast.error("Wrong password");
          }}>Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <h1 className="text-xl font-display font-bold text-gradient-gold mb-4">🐶 Doggy Cash Admin</h1>
      <Tabs defaultValue="users">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-card">
          <TabsTrigger value="users" className="text-xs">👥 Users</TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs">📋 Tasks</TabsTrigger>
          <TabsTrigger value="submissions" className="text-xs">📤 Submissions</TabsTrigger>
          <TabsTrigger value="withdrawals" className="text-xs">💸 Withdrawals</TabsTrigger>
          <TabsTrigger value="codes" className="text-xs">🎁 Codes</TabsTrigger>
          <TabsTrigger value="broadcast" className="text-xs">📢 Broadcast</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">⚙️ Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="tasks"><TasksTab /></TabsContent>
        <TabsContent value="submissions"><SubmissionsTab /></TabsContent>
        <TabsContent value="withdrawals"><WithdrawalsTab /></TabsContent>
        <TabsContent value="codes"><CodesTab /></TabsContent>
        <TabsContent value="broadcast"><BroadcastTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    const { data } = await supabase.from("users").select("*").order("balance", { ascending: false }).limit(100);
    setUsers(data || []);
  }

  const filtered = users.filter(u => 
    (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
    String(u.telegram_id).includes(search)
  );

  return (
    <div className="space-y-3 mt-3">
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="h-9" />
      <p className="text-xs text-muted-foreground">Total: {users.length} users</p>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {filtered.map((u) => (
          <div key={u.id} className="bg-card rounded-lg p-3 border border-border">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold">{u.first_name || u.username || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">@{u.username} | ID: {u.telegram_id}</p>
                <p className="text-xs text-primary font-bold">{Number(u.balance).toFixed(0)} 🦴</p>
              </div>
              <div className="flex gap-1">
                {u.banned ? (
                  <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={async () => {
                    await supabase.from("users").update({ banned: false }).eq("id", u.id);
                    loadUsers();
                    toast.success("User unbanned");
                  }}>Unban</Button>
                ) : (
                  <Button size="sm" variant="destructive" className="h-6 text-[10px]" onClick={async () => {
                    await supabase.from("users").update({ banned: true }).eq("id", u.id);
                    loadUsers();
                    toast.success("User banned");
                  }}>Ban</Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TasksTab() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [value, setValue] = useState("10");

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    setTasks(data || []);
  }

  async function createTask() {
    if (!title.trim()) return;
    await supabase.from("tasks").insert({ title, description, link, value: Number(value) });
    toast.success("Task created!");
    setTitle(""); setDescription(""); setLink(""); setValue("10");
    loadTasks();
  }

  return (
    <div className="space-y-3 mt-3">
      <div className="bg-card rounded-xl p-3 border border-border space-y-2">
        <p className="text-sm font-semibold">Create Task</p>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="h-8 text-xs" />
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="text-xs min-h-[60px]" />
        <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Task link" className="h-8 text-xs" />
        <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Doggy value" className="h-8 text-xs" />
        <Button className="w-full h-8 text-xs bg-gradient-gold text-primary-foreground" onClick={createTask}>Create Task</Button>
      </div>
      {tasks.map((t) => (
        <div key={t.id} className="bg-card rounded-lg p-3 border border-border">
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-semibold">{t.title}</p>
              <p className="text-xs text-primary">+{t.value} 🦴</p>
            </div>
            <Button size="sm" variant={t.active ? "destructive" : "outline"} className="h-6 text-[10px]" onClick={async () => {
              await supabase.from("tasks").update({ active: !t.active }).eq("id", t.id);
              loadTasks();
            }}>{t.active ? 'Disable' : 'Enable'}</Button>
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
          <p className="text-xs text-primary">+{(s.tasks as any)?.value} 🦴</p>
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
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => { loadWithdrawals(); }, []);

  async function loadWithdrawals() {
    const { data } = await supabase.from("withdrawals").select("*, users(username, telegram_id, balance)")
      .order("created_at", { ascending: false }).limit(50);
    setWithdrawals(data || []);
  }

  async function handleAction(id: string, action: string) {
    setLoading(id);
    try {
      await adminAction(action, { withdrawal_id: id });
      toast.success(action === 'approve_withdrawal' ? '✅ Approved!' : '❌ Rejected!');
      loadWithdrawals();
    } catch { toast.error("Action failed"); }
    setLoading(null);
  }

  return (
    <div className="space-y-2 mt-3 max-h-[70vh] overflow-y-auto">
      {withdrawals.map((w) => (
        <div key={w.id} className="bg-card rounded-lg p-3 border border-border">
          <div className="flex justify-between">
            <div>
              <p className="text-xs font-semibold">@{(w.users as any)?.username}</p>
              <p className="text-sm font-bold text-primary">{Number(w.amount).toFixed(0)} 🦴 = ${Number(w.usdt_amount).toFixed(4)}</p>
              <p className="text-[10px] text-muted-foreground font-mono break-all">{w.wallet_address}</p>
              <p className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleString()}</p>
            </div>
          </div>
          <p className={`text-xs font-bold mt-1 ${w.status === 'approved' ? 'text-green-400' : w.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}>
            {w.status.toUpperCase()}
          </p>
          {w.status === 'pending' && (
            <div className="flex gap-2 mt-2">
              <Button size="sm" className="h-6 text-[10px] bg-green-600" onClick={() => handleAction(w.id, 'approve_withdrawal')}
                disabled={loading === w.id}>
                {loading === w.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />} Approve
              </Button>
              <Button size="sm" variant="destructive" className="h-6 text-[10px]" onClick={() => handleAction(w.id, 'reject_withdrawal')}
                disabled={loading === w.id}>
                <X className="w-3 h-3 mr-1" /> Reject
              </Button>
            </div>
          )}
        </div>
      ))}
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
    await supabase.from("reward_codes").insert({ code: code.trim(), value: Number(codeValue), max_uses: Number(maxUses) });
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
            <p className="text-xs text-primary">+{c.value} 🦴 • {c.current_uses}/{c.max_uses} used</p>
          </div>
          <Button size="sm" variant={c.active ? "destructive" : "outline"} className="h-6 text-[10px]" onClick={async () => {
            await supabase.from("reward_codes").update({ active: !c.active }).eq("id", c.id);
            loadCodes();
          }}>{c.active ? 'Deactivate' : 'Activate'}</Button>
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
        await supabase.from("app_settings").update({ value: values[s.key] }).eq("id", s.id);
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
