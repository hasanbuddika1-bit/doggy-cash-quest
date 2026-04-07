import { Home, Coins, ArrowDownToLine, User } from "lucide-react";
import { motion } from "framer-motion";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "home", icon: Home, label: "Home", emoji: "🏠" },
  { id: "watchads", icon: Coins, label: "Ads", emoji: "📺" },
  { id: "earn", icon: Coins, label: "Earn", emoji: "💰" },
  { id: "withdraw", icon: ArrowDownToLine, label: "Withdraw", emoji: "💸" },
  { id: "profile", icon: User, label: "Profile", emoji: "👤" },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border">
      <div className="flex items-center justify-around py-2 px-2 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all relative"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-gold rounded-xl opacity-20"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="text-lg">{tab.emoji}</span>
              <span className={`text-[10px] font-semibold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
