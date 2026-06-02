import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface GuideButtonProps {
  title: string;
  steps: string[];
}

export function GuideButton({ title, steps }: GuideButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open guide"
        className="w-8 h-8 rounded-full bg-gradient-bunny text-primary-foreground flex items-center justify-center shadow-md hover:scale-105 transition"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-3xl border border-bunny-pink/30 p-5 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-gradient-bunny text-lg">📖 {title}</h3>
                <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="space-y-2.5 text-sm">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="flex-none w-6 h-6 rounded-full bg-gradient-bunny text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground leading-relaxed">{s}</span>
                  </li>
                ))}
              </ol>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
