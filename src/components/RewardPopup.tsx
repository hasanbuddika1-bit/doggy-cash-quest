import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

interface RewardPopupProps {
  show: boolean;
  amount: number;
  message?: string;
  onClose: () => void;
}

export function RewardPopup({ show, amount, message = "ADDED TO WALLET!", onClose }: RewardPopupProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                background: ['#F472B6', '#A78BFA', '#FACC15', '#34D399', '#FB7185', '#C084FC'][i % 6],
                left: `${20 + Math.random() * 60}%`,
                top: `${30 + Math.random() * 30}%`,
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{
                scale: [0, 1.6, 0],
                opacity: [1, 1, 0],
                x: (Math.random() - 0.5) * 260,
                y: (Math.random() - 0.5) * 260,
                rotate: Math.random() * 360,
              }}
              transition={{ duration: 1.6, delay: Math.random() * 0.3 }}
            />
          ))}

          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.3, opacity: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            className="text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
              className="text-7xl mb-4"
            >
              🐰
            </motion.div>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-5xl font-display font-bold text-gradient-bunny drop-shadow-lg"
            >
              +{amount} Bunny
            </motion.p>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-lg font-bold text-white/80 mt-2 tracking-wider"
            >
              {message}
            </motion.p>

            <motion.button
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="mt-6 px-10 py-3 rounded-full border-2 border-bunny-pink text-bunny-pink-light font-display font-bold text-lg tracking-widest hover:bg-bunny-pink/15 transition-colors"
            >
              NICE! 🎉
            </motion.button>

            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
              className="text-xs text-white/40 mt-4 tracking-wider"
            >
              TAP ANYWHERE TO CLOSE
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
