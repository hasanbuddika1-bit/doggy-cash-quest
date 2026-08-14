import { motion } from "framer-motion";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "home",     label: "Home",    emoji: "🏠" },
  { id: "tasks",    label: "Tasks",   emoji: "📋" },
  { id: "watchads", label: "Ads",     emoji: "📺" },
  { id: "earn",     label: "Refer",   emoji: "👥" },
  { id: "profile",  label: "Profile", emoji: "👤" },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-bunny-lavender/25 bg-background/85 backdrop-blur-xl shadow-[0_-8px_30px_-10px_hsl(265_80%_4%/0.9)]">
      <div className="flex items-center justify-around py-2 px-2 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all relative min-w-[52px]"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-2xl btn-3d opacity-90"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className={`relative text-lg leading-none ${isActive ? 'animate-hop' : ''}`}>{tab.emoji}</span>
              <span className={`relative text-[10px] font-bold ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
