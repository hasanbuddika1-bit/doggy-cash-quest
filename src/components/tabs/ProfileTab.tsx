import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Calendar, Edit, Save, MapPin, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateWallet } from "@/lib/api";
import { toast } from "sonner";

interface ProfileTabProps {
  user: any;
  userId: string;
}

export function ProfileTab({ user, userId }: ProfileTabProps) {
  const [aptosWallet, setAptosWallet] = useState(user?.wallet_address || "");
  const [tonWallet, setTonWallet] = useState(user?.ton_address || "");
  const [editingAptos, setEditingAptos] = useState(false);
  const [editingTon, setEditingTon] = useState(false);
  const balance = Number(user?.balance || 0);

  async function saveAptos() {
    if (!aptosWallet.trim()) { toast.error("Enter address"); return; }
    await updateWallet(userId, aptosWallet, 'usdt_aptos');
    toast.success("✅ USDT (Aptos) wallet saved!");
    setEditingAptos(false);
  }
  async function saveTon() {
    if (!tonWallet.trim()) { toast.error("Enter address"); return; }
    await updateWallet(userId, tonWallet, 'ton');
    toast.success("✅ TON wallet saved!");
    setEditingTon(false);
  }

  const countryDisplay = user?.country && user.country !== 'UNKNOWN' 
    ? `${getCountryFlag(user.country)} ${getCountryName(user.country)}`
    : '🌍 Detecting...';

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      {/* Profile Card */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[hsl(var(--doggy-gold))]/20 via-card to-[hsl(var(--doggy-orange))]/10 rounded-2xl p-6 border border-[hsl(var(--doggy-gold))]/30 text-center"
      >
        <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 border-3 border-[hsl(var(--doggy-gold))] glow-gold">
          {user?.photo_url ? (
            <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-gold flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {(user?.first_name || 'U')[0]}
            </div>
          )}
        </div>
        <p className="font-display font-bold text-lg text-gradient-gold">{user?.first_name || 'User'}</p>
        <p className="text-sm text-muted-foreground">@{user?.username || 'anonymous'}</p>
        
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">ID: {user?.telegram_id}</span>
          <button onClick={() => {
            navigator.clipboard.writeText(String(user?.telegram_id || ''));
            toast.success("📋 ID copied!");
          }} className="p-1 hover:bg-muted rounded">
            <Copy className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </motion.div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-500/15 to-blue-500/5 rounded-xl p-3 border border-blue-500/20"
        >
          <Calendar className="w-4 h-4 text-blue-400 mb-1" />
          <p className="text-[10px] text-muted-foreground">Joined</p>
          <p className="text-xs font-semibold">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-amber-500/15 to-amber-500/5 rounded-xl p-3 border border-amber-500/20"
        >
          <span className="text-lg">🦴</span>
          <p className="text-[10px] text-muted-foreground">Balance</p>
          <p className="text-xs font-semibold">{balance.toFixed(0)} Doggy</p>
        </motion.div>
      </div>

      {/* Country */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-green-500/15 to-green-500/5 rounded-xl p-3 border border-green-500/20"
      >
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-green-400" />
          <div>
            <p className="text-[10px] text-muted-foreground">Country</p>
            <p className="text-xs font-semibold">{countryDisplay}</p>
          </div>
        </div>
      </motion.div>

      {/* USDT Aptos Wallet */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-gradient-to-br from-emerald-500/10 to-card rounded-xl p-4 border border-emerald-500/30"
      >
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-bold flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-emerald-400" /> 🟢 USDT (Aptos) Address
          </p>
          <button onClick={() => setEditingAptos(!editingAptos)} className="p-1 hover:bg-muted rounded">
            <Edit className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        {editingAptos ? (
          <div className="flex gap-2">
            <Input value={aptosWallet} onChange={(e) => setAptosWallet(e.target.value)} className="h-9 text-xs" placeholder="Aptos address (0x...)" />
            <Button size="sm" className="h-9 bg-gradient-to-r from-emerald-500 to-green-600 text-white" onClick={saveAptos}><Save className="w-3 h-3" /></Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground font-mono break-all">{aptosWallet || 'Not set'}</p>
        )}
      </motion.div>

      {/* TON Wallet */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-blue-500/10 to-card rounded-xl p-4 border border-blue-500/30"
      >
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-bold flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-blue-400" /> 🔵 TON Address
          </p>
          <button onClick={() => setEditingTon(!editingTon)} className="p-1 hover:bg-muted rounded">
            <Edit className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        {editingTon ? (
          <div className="flex gap-2">
            <Input value={tonWallet} onChange={(e) => setTonWallet(e.target.value)} className="h-9 text-xs" placeholder="TON address (EQ.../UQ...)" />
            <Button size="sm" className="h-9 bg-gradient-to-r from-blue-500 to-cyan-600 text-white" onClick={saveTon}><Save className="w-3 h-3" /></Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground font-mono break-all">{tonWallet || 'Not set'}</p>
        )}
      </motion.div>

      {/* Stats Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-card rounded-xl p-4 border border-border"
      >
        <p className="text-sm font-bold mb-3">📊 Statistics</p>
        <div className="space-y-2">
          {[
            { label: "Total Balance", value: `${balance.toFixed(0)} 🦴`, color: "text-[hsl(var(--doggy-gold))]" },
            { label: "USDT Value", value: `$${(balance * 0.0001).toFixed(4)}`, color: "text-[hsl(var(--doggy-green))]" },
          ].map((stat) => (
            <div key={stat.label} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{stat.label}</span>
              <span className={`font-bold ${stat.color}`}>{stat.value}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function getCountryFlag(code: string): string {
  if (!code || code === 'UNKNOWN') return '🌍';
  const flags: Record<string, string> = { LK: '🇱🇰', US: '🇺🇸', IN: '🇮🇳', UK: '🇬🇧', GB: '🇬🇧', PK: '🇵🇰', BD: '🇧🇩', NP: '🇳🇵', PH: '🇵🇭', ID: '🇮🇩', MY: '🇲🇾', SG: '🇸🇬', AE: '🇦🇪', SA: '🇸🇦', NG: '🇳🇬', KE: '🇰🇪', ZA: '🇿🇦' };
  return flags[code] || '🏳️';
}

function getCountryName(code: string): string {
  if (!code || code === 'UNKNOWN') return 'Unknown';
  const names: Record<string, string> = { LK: 'Sri Lanka', US: 'United States', IN: 'India', UK: 'United Kingdom', GB: 'United Kingdom', PK: 'Pakistan', BD: 'Bangladesh', NP: 'Nepal', PH: 'Philippines', ID: 'Indonesia', MY: 'Malaysia', SG: 'Singapore', AE: 'UAE', SA: 'Saudi Arabia', NG: 'Nigeria', KE: 'Kenya', ZA: 'South Africa' };
  return names[code] || code;
}
