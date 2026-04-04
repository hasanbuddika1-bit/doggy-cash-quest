import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Calendar, Edit, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileTabProps {
  user: any;
  userId: string;
}

export function ProfileTab({ user, userId }: ProfileTabProps) {
  const [wallet, setWallet] = useState(user?.wallet_address || "");
  const [editing, setEditing] = useState(false);
  const balance = Number(user?.balance || 0);

  async function saveWallet() {
    await supabase.from("users").update({ wallet_address: wallet }).eq("id", userId);
    toast.success("✅ Wallet updated!");
    setEditing(false);
  }

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      {/* Profile Card */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl p-6 border border-border text-center"
      >
        <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 border-2 border-primary">
          {user?.photo_url ? (
            <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-gold flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {(user?.first_name || 'U')[0]}
            </div>
          )}
        </div>
        <p className="font-display font-bold text-lg">{user?.first_name || 'User'}</p>
        <p className="text-sm text-muted-foreground">@{user?.username || 'anonymous'}</p>
        
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground font-mono">ID: {user?.telegram_id}</span>
          <button onClick={() => {
            navigator.clipboard.writeText(String(user?.telegram_id || ''));
            toast.success("📋 ID copied!");
          }}>
            <Copy className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </motion.div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-xl p-3 border border-border"
        >
          <Calendar className="w-4 h-4 text-primary mb-1" />
          <p className="text-[10px] text-muted-foreground">Joined</p>
          <p className="text-xs font-semibold">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
          className="bg-card rounded-xl p-3 border border-border"
        >
          <span className="text-lg">🦴</span>
          <p className="text-[10px] text-muted-foreground">Balance</p>
          <p className="text-xs font-semibold">{balance.toFixed(0)} Doggy</p>
        </motion.div>
      </div>

      {/* Wallet */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card rounded-xl p-4 border border-border"
      >
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-semibold">💼 Wallet Address</p>
          <button onClick={() => setEditing(!editing)}>
            <Edit className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Input value={wallet} onChange={(e) => setWallet(e.target.value)} className="h-9 text-xs" placeholder="USDT APTOS address" />
            <Button size="sm" className="h-9" onClick={saveWallet}><Save className="w-3 h-3" /></Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground font-mono break-all">{wallet || 'Not set'}</p>
        )}
      </motion.div>

      {/* Stats Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-card rounded-xl p-4 border border-border"
      >
        <p className="text-sm font-semibold mb-3">📊 Statistics</p>
        <div className="space-y-2">
          {[
            { label: "Total Balance", value: `${balance.toFixed(0)} 🦴` },
            { label: "USDT Value", value: `$${(balance * 0.0001).toFixed(4)}` },
            { label: "Country", value: user?.country || "Unknown" },
          ].map((stat) => (
            <div key={stat.label} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{stat.label}</span>
              <span className="font-semibold">{stat.value}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
