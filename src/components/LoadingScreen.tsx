import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import bunnyLogo from "@/assets/bunny-logo.png";

interface LoadingScreenProps {
  progress: number;
}

export function LoadingScreen({ progress }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Floating money rain */}
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 800, opacity: [0, 1, 1, 0], rotate: 360 }}
          transition={{ duration: 3 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2, ease: "linear" }}
          style={{ left: `${Math.random() * 100}%` }}
        >
          {i % 3 === 0 ? "💵" : i % 3 === 1 ? "🪙" : "✨"}
        </motion.div>
      ))}

      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
        className="relative z-10"
      >
        <div className="w-40 h-40 glow-pink rounded-full">
          <img src={bunnyLogo} alt="Bunny Earn Hub" className="w-full h-full object-contain drop-shadow-2xl" />
        </div>
        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-bunny-pink-light"
            style={{ top: "50%", left: "50%", transform: `rotate(${deg}deg) translateY(-90px)` }}
            animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-3xl font-display font-bold text-gradient-bunny mt-6 z-10 text-center"
      >
        💸🐰 Bunny Earn Hub 🏆✨
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-muted-foreground text-sm mt-2 z-10"
      >
        Hopping in your rewards… 🐇
      </motion.p>

      <motion.div
        initial={{ opacity: 0, width: 0 }}
        animate={{ opacity: 1, width: 220 }}
        transition={{ delay: 1 }}
        className="mt-6 z-10"
      >
        <Progress value={progress} className="h-2 bg-muted" />
      </motion.div>
    </div>
  );
}
