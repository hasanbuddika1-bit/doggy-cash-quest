import { motion } from "framer-motion";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "home",     label: "Home",     emoji: "🏠" },
  { id: "tasks",    label: "Tasks",    emoji: "📋" },
  { id: "watchads", label: "Ads",      emoji: "📺" },
  { id: "earn",     label: "Earn",     emoji: "💰" },
  { id: "shortlinks", label: "Links",  emoji: "🔗" },
  { id: "history",  label: "History",  emoji: "📜" },
  { id: "withdraw", label: "Withdraw", emoji: "💸" },
  { id: "profile",  label: "Profile",  emoji: "👤" },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-bunny-pink/20">
      <div className="flex items-center justify-around py-1.5 px-1 max-w-lg mx-auto overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all relative min-w-[44px]"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-bunny rounded-xl opacity-25"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className={`text-base leading-none ${isActive ? 'animate-hop' : ''}`}>{tab.emoji}</span>
              <span className={`text-[9px] font-bold ${isActive ? 'text-bunny-pink-light' : 'text-muted-foreground'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
