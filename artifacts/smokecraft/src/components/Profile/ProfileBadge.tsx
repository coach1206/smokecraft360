import { motion, AnimatePresence } from "framer-motion";
import { Crown, BookMarked } from "lucide-react";
import { UserProfile, ELITE_THRESHOLD } from "../../services/storage";

interface ProfileBadgeProps {
  profile: UserProfile;
  onOpenVault: () => void;
}

export function ProfileBadge({ profile, onOpenVault }: ProfileBadgeProps) {
  const isElite = profile.level === "elite";
  const progress = Math.min((profile.score / ELITE_THRESHOLD) * 100, 100);

  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Vault button */}
      <motion.button
        onClick={onOpenVault}
        className="flex items-center gap-2 px-3 py-2 rounded-full text-xs uppercase tracking-[0.18em] transition-all duration-300"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.09)",
          color: "rgba(180,155,100,0.65)",
        }}
        whileHover={{
          borderColor: "rgba(212,175,55,0.4)",
          color: "rgba(212,175,55,0.85)",
          background: "rgba(212,175,55,0.06)",
        }}
        whileTap={{ scale: 0.96 }}
        title="My Vault"
      >
        <BookMarked size={13} />
        <span className="hidden sm:inline">Vault</span>
        {profile.savedExperiences.length > 0 && (
          <span
            className="text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-medium"
            style={{ background: "rgba(212,175,55,0.25)", color: "rgba(212,175,55,0.9)" }}
          >
            {profile.savedExperiences.length}
          </span>
        )}
      </motion.button>

      {/* Score + level badge */}
      <motion.div
        className="relative flex items-center gap-2 px-3 py-2 rounded-full"
        style={
          isElite
            ? {
                background: "linear-gradient(135deg, rgba(180,130,30,0.2), rgba(212,175,55,0.1))",
                border: "1px solid rgba(212,175,55,0.4)",
                boxShadow: "0 0 16px rgba(212,175,55,0.12)",
              }
            : {
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
              }
        }
      >
        <AnimatePresence mode="wait">
          {isElite ? (
            <motion.div
              key="elite"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Crown
                size={13}
                style={{ color: "rgba(212,175,55,0.9)" }}
                fill="rgba(212,175,55,0.3)"
              />
            </motion.div>
          ) : (
            <motion.div
              key="standard"
              className="w-3 h-3 rounded-full relative"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              {/* Progress arc approximated as a border */}
              <svg
                className="absolute inset-0 w-full h-full -rotate-90"
                viewBox="0 0 12 12"
              >
                <circle
                  cx="6" cy="6" r="4.5"
                  fill="none"
                  stroke="rgba(212,175,55,0.7)"
                  strokeWidth="1.5"
                  strokeDasharray={`${(progress / 100) * 28.27} 28.27`}
                  strokeLinecap="round"
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        <span
          className="text-xs font-serif tracking-wider"
          style={{ color: isElite ? "rgba(212,175,55,0.9)" : "rgba(180,155,100,0.7)" }}
        >
          {isElite ? "Elite" : `${profile.score}pts`}
        </span>
      </motion.div>
    </motion.div>
  );
}
