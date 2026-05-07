import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Crown, Flame, BookMarked, Download, Share2, Layers } from "lucide-react";
import { UserProfile, SavedExperience, SavedBlend, ELITE_THRESHOLD } from "../../services/storage";
import { useRef, useState, useEffect, useCallback } from "react";
import { CigarBandPreview } from "../Band/CigarBandPreview";
import { fetchSavedBuilds, type SavedBuildCard } from "../../services/api";
import ShareCard from "../ShareCard/ShareCard";

interface VaultModalProps {
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  onRemoveBlend: (id: string) => void;
  onNameChange: (name: string) => void;
}

type VaultTab = "experiences" | "blends" | "builds";

const FOOD_EMOJI: Record<string, string> = {
  wings: "🍗", steak: "🥩", salad: "🥗",
  appetizers: "🫙", seafood: "🦞", desserts: "🍫",
};

const CRAFT_ACCENTS: Record<string, { accent: string; accentSoft: string }> = {
  smoke: { accent: "rgb(212,175,55)",  accentSoft: "rgb(180,130,30)"  },
  brew:  { accent: "rgb(255,160,50)",  accentSoft: "rgb(220,120,30)"  },
  pour:  { accent: "rgb(100,180,255)", accentSoft: "rgb(60,140,220)"  },
  vape:  { accent: "rgb(160,100,255)", accentSoft: "rgb(120,70,220)"  },
};

export function VaultModal({ profile, isOpen, onClose, onRemove, onRemoveBlend, onNameChange }: VaultModalProps) {
  const isElite = profile.level === "elite";
  const progressPct = Math.min((profile.score / ELITE_THRESHOLD) * 100, 100);
  const nameRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<VaultTab>("experiences");

  const [savedBuilds, setSavedBuilds] = useState<SavedBuildCard[]>([]);
  const [buildsLoading, setBuildsLoading] = useState(false);
  const [reexportCard, setReexportCard] = useState<SavedBuildCard | null>(null);

  const loadBuilds = useCallback(() => {
    if (buildsLoading) return;
    setBuildsLoading(true);
    fetchSavedBuilds().then((builds) => {
      setSavedBuilds(builds);
      setBuildsLoading(false);
    });
  }, [buildsLoading]);

  useEffect(() => {
    if (isOpen && tab === "builds" && savedBuilds.length === 0) {
      loadBuilds();
    }
  }, [isOpen, tab]);

  const handleTabChange = useCallback((t: VaultTab) => {
    setTab(t);
    if (t === "builds" && savedBuilds.length === 0) {
      loadBuilds();
    }
  }, [savedBuilds.length, loadBuilds]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[60]"
              style={{ background: "rgba(26,26,27,0.32)", backdropFilter: "blur(4px)" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose}
            />

            <motion.div
              className="fixed top-0 right-0 bottom-0 z-[70] flex flex-col w-full max-w-md"
              style={{
                background: "linear-gradient(160deg, hsl(24 16% 8%), hsl(22 18% 5%))",
                borderLeft: "1px solid rgba(212,139,0,0.15)",
                boxShadow: "-20px 0 60px rgba(26,26,27,0.32)",
              }}
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
            >
              <div className="h-px w-full flex-shrink-0" style={{ background: "linear-gradient(90deg, transparent, rgba(212,139,0,0.35), transparent)" }} />

              {/* Header */}
              <div className="flex items-center justify-between px-7 py-5 flex-shrink-0">
                <div>
                  <h2 className="font-serif text-2xl" style={{ fontWeight: 300, color: "rgba(230,210,175,0.9)" }}>My Vault</h2>
                  <p className="text-[10px] uppercase tracking-[0.25em] mt-0.5" style={{ color: "rgba(180,155,100,0.45)" }}>
                    {profile.savedExperiences.length} experiences · {profile.savedBlends.length} blends · {savedBuilds.length} builds
                  </p>
                </div>
                <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)", color: "rgba(180,155,100,0.5)" }}>
                  <X size={15} />
                </button>
              </div>

              {/* Profile strip */}
              <div className="mx-6 mb-4 p-4 rounded-xl flex-shrink-0"
                style={{
                  background: isElite ? "linear-gradient(135deg, rgba(180,130,30,0.18), rgba(212,139,0,0.08))" : "rgba(26,26,27,0.05)",
                  border: isElite ? "1px solid rgba(212,139,0,0.3)" : "1px solid rgba(26,26,27,0.09)",
                }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {isElite && <Crown size={14} style={{ color: "rgba(212,139,0,0.85)" }} fill="rgba(212,139,0,0.2)" />}
                    <input ref={nameRef}
                      className="font-serif text-base bg-transparent outline-none border-b border-transparent focus:border-current transition-colors"
                      style={{ color: "rgba(230,210,175,0.85)", width: "140px" }}
                      placeholder="Your name…"
                      defaultValue={profile.name}
                      onBlur={(e) => onNameChange(e.target.value.trim())}
                      onKeyDown={(e) => e.key === "Enter" && nameRef.current?.blur()}
                    />
                  </div>
                  <span className="text-xs font-serif italic px-3 py-1 rounded-full"
                    style={isElite
                      ? { background: "rgba(212,139,0,0.12)", color: "rgba(212,139,0,0.85)", border: "1px solid rgba(212,139,0,0.25)" }
                      : { background: "rgba(26,26,27,0.07)", color: "rgba(180,155,100,0.55)", border: "1px solid rgba(26,26,27,0.10)" }
                    }>
                    {isElite ? "Elite Member" : "Connoisseur"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Flame size={11} style={{ color: "rgba(212,139,0,0.6)", flexShrink: 0 }} />
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(26,26,27,0.09)" }}>
                    <motion.div className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, hsl(36 70% 40%), hsl(43 85% 52%), hsl(48 90% 62%))" }}
                      initial={{ width: 0 }} animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums" style={{ color: "rgba(180,155,100,0.55)" }}>
                    {isElite ? "MAX" : `${profile.score} / ${ELITE_THRESHOLD}`}
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex mx-6 mb-4 flex-shrink-0 rounded-full p-0.5" style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.09)" }}>
                {(["experiences", "blends", "builds"] as VaultTab[]).map((t) => (
                  <button key={t} onClick={() => handleTabChange(t)}
                    className="flex-1 py-2.5 text-[10px] uppercase tracking-[0.15em] rounded-full transition-all duration-300 flex items-center justify-center gap-1.5"
                    style={tab === t
                      ? { background: "linear-gradient(135deg, rgba(180,130,30,0.28), rgba(212,139,0,0.15))", color: "rgba(212,139,0,0.9)", border: "1px solid rgba(212,139,0,0.3)" }
                      : { color: "rgba(180,155,100,0.45)" }
                    }>
                    {t === "experiences" ? <Flame size={10} /> : t === "blends" ? <BookMarked size={10} /> : <Layers size={10} />}
                    {t}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-4">
                {tab === "experiences" ? (
                  profile.savedExperiences.length === 0 ? (
                    <EmptyState label="Your vault awaits" sub="Save your first experience to begin" />
                  ) : (
                    profile.savedExperiences.map((exp, i) => (
                      <ExperienceCard key={exp.id} experience={exp} index={i} onRemove={onRemove} />
                    ))
                  )
                ) : tab === "blends" ? (
                  profile.savedBlends.length === 0 ? (
                    <EmptyState label="No blends yet" sub="Create your signature blend after a recommendation" />
                  ) : (
                    profile.savedBlends.map((blend, i) => (
                      <BlendCard key={blend.id} blend={blend} index={i} onRemove={onRemoveBlend} />
                    ))
                  )
                ) : (
                  buildsLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                        className="w-8 h-8 rounded-full"
                        style={{ border: "2px solid rgba(212,139,0,0.15)", borderTopColor: "rgba(212,139,0,0.7)" }}
                      />
                      <p className="text-[10px] uppercase tracking-[0.22em]" style={{ color: "rgba(180,155,100,0.4)" }}>Loading builds…</p>
                    </div>
                  ) : savedBuilds.length === 0 ? (
                    <EmptyState label="No builds saved yet" sub="Complete a craft experience to save your build card" />
                  ) : (
                    savedBuilds.map((build, i) => (
                      <BuildCard key={build.id} build={build} index={i} onReexport={() => setReexportCard(build)} />
                    ))
                  )
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Re-export ShareCard overlay */}
      {reexportCard && (() => {
        const ct = reexportCard.craftType as "smoke" | "brew" | "pour" | "vape";
        const colors = CRAFT_ACCENTS[ct] ?? CRAFT_ACCENTS["smoke"]!;
        return (
          <ShareCard
            craftType={ct}
            styleTitle={reexportCard.styleTitle}
            moodTitle={reexportCard.moodTitle}
            recommendationName={reexportCard.recommendationName}
            score={parseFloat(reexportCard.score)}
            accent={colors.accent}
            accentSoft={colors.accentSoft}
            onClose={() => setReexportCard(null)}
          />
        );
      })()}
    </>
  );
}

function EmptyState({ label, sub }: { label: string; sub: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: "rgba(26,26,27,0.05)", border: "1px solid rgba(26,26,27,0.09)" }}>
        <Flame size={22} style={{ color: "rgba(180,155,100,0.3)" }} />
      </div>
      <p className="font-serif text-lg italic" style={{ color: "rgba(180,155,100,0.35)" }}>{label}</p>
      <p className="text-[10px] uppercase tracking-[0.22em] text-center" style={{ color: "rgba(180,155,100,0.22)" }}>{sub}</p>
    </motion.div>
  );
}

function ExperienceCard({ experience, index, onRemove }: { experience: SavedExperience; index: number; onRemove: (id: string) => void }) {
  const date = new Date(experience.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const top = experience.recommendations[0];
  const topPairing = experience.pairings[0];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card rounded-xl p-5 relative group">
      <button onClick={() => onRemove(experience.id)}
        className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.7)" }}>
        <Trash2 size={11} />
      </button>
      <p className="text-[9px] uppercase tracking-[0.2em] mb-3" style={{ color: "rgba(180,155,100,0.4)" }}>{date}</p>
      {top && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <Flame size={10} style={{ color: "rgba(212,139,0,0.5)" }} />
            <span className="text-[9px] uppercase tracking-[0.18em]" style={{ color: "rgba(180,155,100,0.45)" }}>{top.category}</span>
          </div>
          <h4 className="font-serif text-base leading-tight" style={{ color: "rgba(230,210,175,0.85)" }}>{top.name}</h4>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {top.flavorNotes.slice(0, 3).map((n) => (
              <span key={n} className="text-[9px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(26,26,27,0.07)", border: "1px solid rgba(26,26,27,0.09)", color: "rgba(200,180,140,0.7)" }}>{n}</span>
            ))}
          </div>
        </div>
      )}
      {topPairing && (
        <div className="pt-3" style={{ borderTop: "1px solid rgba(26,26,27,0.08)" }}>
          <p className="text-[9px] uppercase tracking-[0.18em] mb-1" style={{ color: "rgba(180,155,100,0.35)" }}>Paired with</p>
          <p className="font-serif text-sm italic" style={{ color: "rgba(212,139,0,0.6)" }}>{topPairing.name}</p>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="text-[8px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full"
          style={{ background: "rgba(212,139,0,0.07)", border: "1px solid rgba(212,139,0,0.15)", color: "rgba(212,139,0,0.5)" }}>
          {experience.preferences.mood}
        </span>
        <span className="text-[8px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full"
          style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.09)", color: "rgba(180,155,100,0.4)" }}>
          str {experience.preferences.strength}/5
        </span>
      </div>
    </motion.div>
  );
}

function BlendCard({ blend, index, onRemove }: { blend: SavedBlend; index: number; onRemove: (id: string) => void }) {
  const date = new Date(blend.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const hasFullExperience = blend.cigarBaseName && blend.pairingName && blend.foodPairingName;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card rounded-xl p-5 relative group">
      <button onClick={() => onRemove(blend.id)}
        className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.7)" }}>
        <Trash2 size={11} />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <p className="text-[9px] uppercase tracking-[0.2em]" style={{ color: "rgba(180,155,100,0.4)" }}>{date}</p>
        {hasFullExperience && (
          <span className="text-[8px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full"
            style={{ background: "rgba(212,139,0,0.08)", border: "1px solid rgba(212,139,0,0.2)", color: "rgba(212,139,0,0.6)" }}>
            Full Experience
          </span>
        )}
      </div>

      <div className="flex justify-center mb-4">
        <CigarBandPreview design={blend.design} blendName={blend.blendName} style={blend.style} size="sm" />
      </div>

      {blend.description && (
        <p className="text-xs italic text-center mb-4 font-serif" style={{ color: "rgba(210,190,155,0.6)" }}>"{blend.description}"</p>
      )}

      <div className="pt-3 space-y-2.5" style={{ borderTop: "1px solid rgba(26,26,27,0.08)" }}>
        <ExperienceRow label="Cigar"  value={blend.cigarBaseName} />
        <ExperienceRow label="Drink"  value={blend.pairingName}   accent />
        {blend.foodPairingName && (
          <ExperienceRow label="Food" value={blend.foodPairingName} />
        )}
      </div>
    </motion.div>
  );
}

const CRAFT_LABELS: Record<string, string> = {
  smoke: "Craft Cigar Build",
  brew:  "Craft Beer Build",
  pour:  "Craft Pour Build",
  vape:  "Craft Vape Build",
};

const CRAFT_GLYPHS: Record<string, string> = {
  smoke: "◆",
  brew:  "⬡",
  pour:  "◈",
  vape:  "◉",
};

function BuildCard({ build, index, onReexport }: { build: SavedBuildCard; index: number; onReexport: () => void }) {
  const ct = build.craftType as string;
  const colors = CRAFT_ACCENTS[ct] ?? CRAFT_ACCENTS["smoke"]!;
  const { accent, accentSoft } = colors;
  const score = parseFloat(build.score);
  const out5 = (score / 20).toFixed(1);
  const pct  = Math.min(100, Math.max(0, score));
  const rankLabel =
    score >= 80 ? "Elite Build"    :
    score >= 60 ? "Strong Build"   :
    score >= 40 ? "Solid Build"    :
    "Keep Crafting";
  const date = new Date(build.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const label = CRAFT_LABELS[ct] ?? "Craft Build";
  const glyph = CRAFT_GLYPHS[ct] ?? "◆";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl overflow-hidden relative"
      style={{
        background: `linear-gradient(145deg, #EFEBE0, #F5F2ED)`,
        border: `1px solid ${accent}40`,
        boxShadow: `0 8px 28px rgba(26,26,27,0.18)`,
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: -30, right: -30,
        width: 120, height: 120, borderRadius: "50%",
        background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <div className="p-5 relative">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span style={{ color: accent, fontSize: 10, fontFamily: "monospace" }}>{glyph}</span>
              <span className="text-[9px] uppercase tracking-[0.3em] font-bold" style={{ color: accent }}>{label}</span>
            </div>
            <div style={{ width: 24, height: 1.5, background: `linear-gradient(90deg, ${accent}, transparent)` }} />
          </div>

          {/* Score ring */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div style={{
              width: 44, height: 44, borderRadius: "50%", position: "relative",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: `conic-gradient(${accent} ${pct}%, rgba(26,26,27,0.08) 0%)`,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "#F5F2ED",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexDirection: "column",
              }}>
                <span className="font-serif font-bold leading-none" style={{ fontSize: 11, color: accent }}>{out5}</span>
                <span className="text-[7px] leading-none" style={{ color: "rgba(232,224,200,0.4)", letterSpacing: "0.1em" }}>/5</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendation name */}
        <div className="mb-3">
          <p className="text-[9px] uppercase tracking-[0.25em] mb-0.5" style={{ color: "rgba(232,224,200,0.4)" }}>Top Pick</p>
          <h4 className="font-serif text-base leading-snug" style={{ color: "#fff" }}>{build.recommendationName || "—"}</h4>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {build.styleTitle && (
            <span className="text-[9px] px-2.5 py-1 rounded-full"
              style={{ background: `${accent}14`, border: `1px solid ${accent}30`, color: "rgba(232,224,200,0.7)" }}>
              {build.styleTitle}
            </span>
          )}
          {build.moodTitle && (
            <span className="text-[9px] px-2.5 py-1 rounded-full"
              style={{ background: `${accent}14`, border: `1px solid ${accent}30`, color: "rgba(232,224,200,0.7)" }}>
              {build.moodTitle}
            </span>
          )}
          <span className="text-[9px] px-2.5 py-1 rounded-full font-bold"
            style={{ background: `${accent}22`, border: `1px solid ${accent}50`, color: accent }}>
            {rankLabel}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${accent}18` }}>
          <span className="text-[9px]" style={{ color: "rgba(232,224,200,0.3)", letterSpacing: "0.1em" }}>{date}</span>
          <motion.button
            type="button"
            onClick={onReexport}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] font-bold px-3 py-1.5 rounded-full"
            style={{
              background: `${accent}14`,
              border: `1px solid ${accent}40`,
              color: accent,
              cursor: "pointer",
            }}
          >
            <Download size={10} /> Export
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function ExperienceRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <p className="text-[9px] uppercase tracking-[0.18em] flex-shrink-0" style={{ color: "rgba(180,155,100,0.35)" }}>{label}</p>
      <p className="font-serif text-xs italic text-right" style={{ color: accent ? "rgba(212,139,0,0.65)" : "rgba(210,190,155,0.65)" }}>
        {value || "—"}
      </p>
    </div>
  );
}
