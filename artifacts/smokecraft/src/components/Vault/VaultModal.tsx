import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Crown, Flame } from "lucide-react";
import { UserProfile, SavedExperience, ELITE_THRESHOLD } from "../../services/storage";
import { useRef } from "react";

interface VaultModalProps {
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  onNameChange: (name: string) => void;
}

export function VaultModal({ profile, isOpen, onClose, onRemove, onNameChange }: VaultModalProps) {
  const isElite = profile.level === "elite";
  const progressPct = Math.min((profile.score / ELITE_THRESHOLD) * 100, 100);
  const nameRef = useRef<HTMLInputElement>(null);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60]"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed top-0 right-0 bottom-0 z-[70] flex flex-col w-full max-w-md"
            style={{
              background: "linear-gradient(160deg, hsl(24 16% 8%), hsl(22 18% 5%))",
              borderLeft: "1px solid rgba(212,175,55,0.15)",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.7)",
            }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
          >
            {/* Top accent line */}
            <div
              className="h-px w-full"
              style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.35), transparent)" }}
            />

            {/* Header */}
            <div className="flex items-center justify-between px-7 py-6">
              <div>
                <h2 className="font-serif text-2xl" style={{ fontWeight: 300, color: "rgba(230,210,175,0.9)" }}>
                  My Vault
                </h2>
                <p className="text-[10px] uppercase tracking-[0.25em] mt-0.5" style={{ color: "rgba(180,155,100,0.45)" }}>
                  Saved Experiences
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(180,155,100,0.5)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(212,175,55,0.8)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(180,155,100,0.5)"; }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Profile strip */}
            <div
              className="mx-6 mb-5 p-4 rounded-xl"
              style={{
                background: isElite
                  ? "linear-gradient(135deg, rgba(180,130,30,0.18), rgba(212,175,55,0.08))"
                  : "rgba(255,255,255,0.03)",
                border: isElite ? "1px solid rgba(212,175,55,0.3)" : "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {isElite && (
                    <Crown size={14} style={{ color: "rgba(212,175,55,0.85)" }} fill="rgba(212,175,55,0.2)" />
                  )}
                  <input
                    ref={nameRef}
                    className="font-serif text-base bg-transparent outline-none border-b border-transparent focus:border-current transition-colors"
                    style={{ color: "rgba(230,210,175,0.85)", width: "140px" }}
                    placeholder="Your name…"
                    defaultValue={profile.name}
                    onBlur={(e) => onNameChange(e.target.value.trim())}
                    onKeyDown={(e) => e.key === "Enter" && nameRef.current?.blur()}
                  />
                </div>
                <span
                  className="text-xs font-serif italic px-3 py-1 rounded-full"
                  style={
                    isElite
                      ? { background: "rgba(212,175,55,0.12)", color: "rgba(212,175,55,0.85)", border: "1px solid rgba(212,175,55,0.25)" }
                      : { background: "rgba(255,255,255,0.05)", color: "rgba(180,155,100,0.55)", border: "1px solid rgba(255,255,255,0.08)" }
                  }
                >
                  {isElite ? "Elite Member" : "Connoisseur"}
                </span>
              </div>

              {/* Score bar */}
              <div className="flex items-center gap-3">
                <Flame size={11} style={{ color: "rgba(212,175,55,0.6)", flexShrink: 0 }} />
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, hsl(36 70% 40%), hsl(43 85% 52%), hsl(48 90% 62%))" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                  />
                </div>
                <span className="text-[10px] tabular-nums" style={{ color: "rgba(180,155,100,0.55)" }}>
                  {isElite ? "MAX" : `${profile.score} / ${ELITE_THRESHOLD}`}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="mx-6 h-px mb-4" style={{ background: "rgba(255,255,255,0.06)" }} />

            {/* Saved experiences */}
            <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-4 scrollbar-hide">
              {profile.savedExperiences.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-20 gap-4"
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <Flame size={22} style={{ color: "rgba(180,155,100,0.3)" }} />
                  </div>
                  <p className="font-serif text-lg italic" style={{ color: "rgba(180,155,100,0.35)" }}>
                    Your vault awaits
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-center" style={{ color: "rgba(180,155,100,0.25)" }}>
                    Save your first experience<br />to begin your collection
                  </p>
                </motion.div>
              ) : (
                profile.savedExperiences.map((exp, i) => (
                  <ExperienceCard key={exp.id} experience={exp} index={i} onRemove={onRemove} />
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ExperienceCard({
  experience,
  index,
  onRemove,
}: {
  experience: SavedExperience;
  index: number;
  onRemove: (id: string) => void;
}) {
  const date = new Date(experience.savedAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  const top = experience.recommendations[0];
  const topPairing = experience.pairings[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, transition: { duration: 0.25 } }}
      transition={{ delay: index * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card rounded-xl p-5 relative group"
    >
      {/* Remove button */}
      <button
        onClick={() => onRemove(experience.id)}
        className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.7)" }}
      >
        <Trash2 size={11} />
      </button>

      {/* Date */}
      <p className="text-[9px] uppercase tracking-[0.2em] mb-3" style={{ color: "rgba(180,155,100,0.4)" }}>
        {date}
      </p>

      {/* Main recommendation */}
      {top && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <Flame size={10} style={{ color: "rgba(212,175,55,0.5)" }} />
            <span className="text-[9px] uppercase tracking-[0.18em]" style={{ color: "rgba(180,155,100,0.45)" }}>
              {top.category}
            </span>
          </div>
          <h4 className="font-serif text-base leading-tight" style={{ color: "rgba(230,210,175,0.85)" }}>
            {top.name}
          </h4>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {top.flavorNotes.slice(0, 3).map((n) => (
              <span key={n} className="text-[9px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(200,180,140,0.7)" }}>
                {n}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pairing */}
      {topPairing && (
        <div className="pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[9px] uppercase tracking-[0.18em] mb-1" style={{ color: "rgba(180,155,100,0.35)" }}>
            Paired with
          </p>
          <p className="font-serif text-sm italic" style={{ color: "rgba(212,175,55,0.6)" }}>
            {topPairing.name}
          </p>
        </div>
      )}

      {/* Preferences chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="text-[8px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full"
          style={{ background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.15)", color: "rgba(212,175,55,0.5)" }}>
          {experience.preferences.mood}
        </span>
        <span className="text-[8px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(180,155,100,0.4)" }}>
          str {experience.preferences.strength}/5
        </span>
      </div>
    </motion.div>
  );
}
