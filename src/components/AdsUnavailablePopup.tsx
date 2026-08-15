import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  show: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

/** Shown when Adsgram has no ads for the user's region — advise a VPN. */
export function AdsUnavailablePopup({ show, onClose, title, message }: Props) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="card-3d p-6 text-center max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-full bg-destructive/15 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-7 h-7 text-destructive" />
        </div>
        <h3 className="font-display font-bold text-lg text-3d-gold mb-2">{title || "No Ads Available 😿"}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {message || "Adsgram has no ads for your region right now. 🌍 Please turn ON a VPN (try USA / UK / Germany) and try again."}
        </p>
        <Button onClick={onClose} className="w-full h-11 btn-3d border-0">OK, GOT IT</Button>
      </motion.div>
    </div>
  );
}
