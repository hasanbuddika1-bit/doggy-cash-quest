import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import logo from "@/assets/doggy-cash-logo.png";

interface LoadingScreenProps {
  progress: number;
}

export function LoadingScreen({ progress }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Coin rain */}
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl"
          initial={{ y: -50, x: Math.random() * 400 - 200, opacity: 0 }}
          animate={{ y: 700, opacity: [0, 1, 1, 0], rotate: 360 }}
          transition={{ duration: 3 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2, ease: "linear" }}
          style={{ left: `${Math.random() * 100}%` }}
        >
          🪙
        </motion.div>
      ))}

      {/* Logo */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
        className="relative z-10"
      >
        <div className="w-32 h-32 rounded-full overflow-hidden glow-gold">
          <img src={logo} alt="Doggy Cash" className="w-full h-full object-cover" />
        </div>
        {/* Sparkles */}
        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary"
            style={{
              top: '50%', left: '50%',
              transform: `rotate(${deg}deg) translateY(-80px)`,
            }}
            animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-3xl font-display font-bold text-gradient-gold mt-6 z-10"
      >
        Doggy Cash 🐶💰
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-muted-foreground text-sm mt-2 z-10"
      >
        Loading your rewards...
      </motion.p>

      <motion.div
        initial={{ opacity: 0, width: 0 }}
        animate={{ opacity: 1, width: 200 }}
        transition={{ delay: 1 }}
        className="mt-6 z-10"
      >
        <Progress value={progress} className="h-2 bg-muted" />
      </motion.div>
    </div>
  );
}
