/**
 * ProfileBadge — compact user level + XP display in the top bar.
 *
 * Shows:
 *  - Vault / saved experiences button
 *  - 5-tier level title (Explorer → Maestro del Fuego)
 *  - XP progress arc toward next tier (client-side score)
 *  - Crown icon once the user reaches Connoisseur+
 */

import { motion, AnimatePresence } from "framer-motion";
import { Crown, BookMarked }       from "lucide-react";
import { UserProfile, ELITE_THRESHOLD } from "../../services/storage";
import { computeLevel, levelProgress, LEVEL_TIERS } from "../../lib/levels";

interface ProfileBadgeProps {
  profile:     UserProfile;
  onOpenVault: () => void;
}

export function ProfileBadge({ profile, onOpenVault }: ProfileBadgeProps) {
  // Map client-side score to XP and estimate verified orders from saves/blends
  const xp             = profile.score;
  const estOrders      = profile.savedBlends.length * 3 + profile.savedExperiences.length;
  const tier           = computeLevel(estOrders, xp);
  const pct            = levelProgress(estOrders, xp);
  const isConnoisseur  = tier.index >= 3;
  const isMaestro      = tier.index >= 4;
  const circumference  = 2 * Math.PI * 4.5;

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
          background: "rgba(26,26,27,0.06)",
          border:     "1px solid rgba(26,26,27,0.11)",
          color:      "rgba(180,155,100,0.65)",
        }}
        whileHover={{
          borderColor: "rgba(212,139,0,0.4)",
          color:       "rgba(212,139,0,0.85)",
          background:  "rgba(212,139,0,0.06)",
        }}
        whileTap={{ scale: 0.96 }}
        title="My Vault"
      >
        <BookMarked size={13} />
        <span className="hidden sm:inline">Vault</span>
        {profile.savedExperiences.length > 0 && (
          <span
            className="text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-medium"
            style={{ background: "rgba(212,139,0,0.25)", color: "rgba(212,139,0,0.9)" }}
          >
            {profile.savedExperiences.length}
          </span>
        )}
      </motion.button>

      {/* Level + XP badge */}
      <motion.div
        className="relative flex items-center gap-2 px-3 py-2 rounded-full"
        style={
          isConnoisseur
            ? {
                background: isMaestro
                  ? "linear-gradient(135deg, rgba(120,80,5,0.25), rgba(212,139,0,0.12))"
                  : "linear-gradient(135deg, rgba(180,130,30,0.2), rgba(212,139,0,0.1))",
                border:    `1px solid ${tier.borderColor}`,
                boxShadow: isMaestro
                  ? "0 0 20px rgba(212,139,0,0.18)"
                  : "0 0 16px rgba(212,139,0,0.12)",
              }
            : {
                background: "rgba(26,26,27,0.06)",
                border:     "1px solid rgba(26,26,27,0.11)",
              }
        }
      >
        {/* Crown / progress arc */}
        <AnimatePresence mode="wait">
          {isConnoisseur ? (
            <motion.div
              key="crown"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Crown
                size={13}
                style={{
                  color: tier.color,
                  filter: isMaestro ? "drop-shadow(0 0 4px rgba(212,139,0,0.5))" : "none",
                }}
                fill={isMaestro ? "rgba(212,139,0,0.3)" : "rgba(212,139,0,0.15)"}
              />
            </motion.div>
          ) : (
            <motion.div
              key="arc"
              className="w-3 h-3 rounded-full relative flex-shrink-0"
              style={{ background: "rgba(26,26,27,0.10)" }}
            >
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 12 12">
                <circle
                  cx="6" cy="6" r="4.5"
                  fill="none"
                  stroke={tier.color}
                  strokeWidth="1.5"
                  strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
                  strokeLinecap="round"
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Level title */}
        <div className="flex flex-col leading-none">
          <span
            className="text-xs font-serif tracking-wider"
            style={{ color: tier.color }}
          >
            {isMaestro ? "Maestro" : tier.title}
          </span>
          {!isConnoisseur && (
            <span className="text-[7px] uppercase tracking-[0.12em] mt-0.5"
              style={{ color: "rgba(180,155,100,0.4)" }}>
              {xp} XP
            </span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
