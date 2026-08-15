import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Calendar, Edit, Save, MapPin, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateWallet } from "@/lib/api";
import { toast } from "sonner";
import { GuideButton } from "@/components/GuideButton";
import { WithdrawTab } from "@/components/tabs/WithdrawTab";
import { HistoryTab } from "@/components/tabs/HistoryTab";

interface ProfileTabProps { user: any; userId: string; initialSubTab?: string; }

const SUB_TABS = [
  { key: "Profile",  icon: "👤" },
  { key: "Withdraw", icon: "💸" },
  { key: "History",  icon: "📜" },
];

export function ProfileTab({ user, userId, initialSubTab }: ProfileTabProps) {
  const [subTab, setSubTab] = useState(initialSubTab || "Profile");

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {SUB_TABS.map((t) => (
          <motion.button key={t.key} whileTap={{ scale: 0.95 }} onClick={() => setSubTab(t.key)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              subTab === t.key ? "btn-3d text-primary-foreground" : "bg-card border border-bunny-lavender/20 text-muted-foreground"
            }`}
          >
            <span>{t.icon}</span> {t.key}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={subTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          {subTab === "Profile"  && <ProfileSection user={user} userId={userId} />}
          {subTab === "Withdraw" && <WithdrawTab userId={userId} user={user} />}
          {subTab === "History"  && <HistoryTab userId={userId} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ProfileSection({ user, userId }: ProfileTabProps) {
  const [wallet, setWallet] = useState(user?.wallet_address || "");
  const [editing, setEditing] = useState(false);
  const balance = Number(user?.balance || 0);

  async function saveWallet() {
    if (!wallet.trim()) { toast.error("Enter address"); return; }
    await updateWallet(userId, wallet.trim());
    toast.success("✅ USDT (BEP20) wallet saved!");
    setEditing(false);
  }

  const country = user?.country && user.country !== 'UNKNOWN'
    ? `${getCountryFlag(user.country)} ${getCountryName(user.country)}` : '🌍 Detecting...';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-display font-bold text-3d-gold text-lg">👤 Profile</p>
        <GuideButton title="Profile Guide" steps={[
          "Save your USDT (BEP20) wallet address here — it is used for withdrawals.",
          "Withdraw and History are now inside this Profile tab.",
          "1000 🐰 = $0.01 USDT.",
          "Your Telegram ID is shown for support requests.",
        ]} />
      </div>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card-3d p-6 text-center">
        <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 border-2 border-bunny-gold glow-gold">
          {user?.photo_url ? (
            <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full coin-3d flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {(user?.first_name || 'U')[0]}
            </div>
          )}
        </div>
        <p className="font-display font-bold text-lg text-gradient-bunny">{user?.first_name || 'User'}</p>
        <p className="text-sm text-muted-foreground">@{user?.username || 'anonymous'}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">ID: {user?.telegram_id}</span>
          <button onClick={() => { navigator.clipboard.writeText(String(user?.telegram_id || '')); toast.success("📋 ID copied!"); }} className="p-1 hover:bg-muted rounded">
            <Copy className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card-3d p-3">
          <Calendar className="w-4 h-4 text-bunny-cyan mb-1" />
          <p className="text-[10px] text-muted-foreground">Joined</p>
          <p className="text-xs font-semibold">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</p>
        </div>
        <div className="card-3d p-3">
          <span className="text-lg">🐰</span>
          <p className="text-[10px] text-muted-foreground">Balance</p>
          <p className="text-xs font-semibold">{balance.toFixed(0)} Bunny</p>
        </div>
      </div>

      <div className="card-3d p-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-bunny-green" />
          <div>
            <p className="text-[10px] text-muted-foreground">Country</p>
            <p className="text-xs font-semibold">{country}</p>
          </div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-3d p-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-bold flex items-center gap-1.5"><Wallet className="w-4 h-4 text-bunny-green" /> 🟢 USDT (BEP20) Address</p>
          <button onClick={() => setEditing(!editing)} className="p-1 hover:bg-muted rounded">
            <Edit className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Input value={wallet} onChange={(e) => setWallet(e.target.value)} className="h-9 text-xs" placeholder="BEP20/BSC address (0x...)" />
            <Button size="sm" className="h-9 bg-gradient-green text-white" onClick={saveWallet}><Save className="w-3 h-3" /></Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground font-mono break-all">{wallet || 'Not set'}</p>
        )}
      </motion.div>

      <div className="card-3d p-4">
        <p className="text-sm font-bold mb-3">📊 Statistics</p>
        <div className="space-y-2">
          {[
            { label: "Total Balance", value: `${balance.toFixed(0)} 🐰`, color: "text-bunny-gold-soft" },
            { label: "USDT Value", value: `$${(balance * 0.00001).toFixed(4)}`, color: "text-bunny-green" },
            { label: "Notifications", value: user?.notifications_enabled ? "✅ Enabled" : "❌ Disabled", color: "text-bunny-pink-light" },
          ].map((stat) => (
            <div key={stat.label} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{stat.label}</span>
              <span className={`font-bold ${stat.color}`}>{stat.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getCountryFlag(code: string): string {
  const flags: Record<string, string> = { LK: '🇱🇰', US: '🇺🇸', IN: '🇮🇳', UK: '🇬🇧', GB: '🇬🇧', PK: '🇵🇰', BD: '🇧🇩', NP: '🇳🇵', PH: '🇵🇭', ID: '🇮🇩', MY: '🇲🇾', SG: '🇸🇬', AE: '🇦🇪', SA: '🇸🇦', NG: '🇳🇬', KE: '🇰🇪', ZA: '🇿🇦' };
  return flags[code] || '🏳️';
}
function getCountryName(code: string): string {
  const names: Record<string, string> = { LK: 'Sri Lanka', US: 'United States', IN: 'India', UK: 'United Kingdom', GB: 'United Kingdom', PK: 'Pakistan', BD: 'Bangladesh', NP: 'Nepal', PH: 'Philippines', ID: 'Indonesia', MY: 'Malaysia', SG: 'Singapore', AE: 'UAE', SA: 'Saudi Arabia', NG: 'Nigeria', KE: 'Kenya', ZA: 'South Africa' };
  return names[code] || code;
}
