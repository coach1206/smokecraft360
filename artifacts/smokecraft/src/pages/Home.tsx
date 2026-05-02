import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CategoryToggle } from "@/components/CategoryToggle";
import { FlavorChips } from "@/components/FlavorChips";
import { StrengthSlider } from "@/components/StrengthSlider";
import { MoodSelector } from "@/components/MoodSelector";
import { CardStack } from "@/components/CardStack";
import { PairingsSection } from "@/components/PairingsSection";
import { CigarBurnLoader } from "@/components/CigarBurnLoader";
import { AmbientBackground } from "@/components/AmbientBackground";
import { ProfileBadge } from "@/components/Profile/ProfileBadge";
import { EliteUnlockAnimation } from "@/components/Profile/EliteUnlockAnimation";
import { VaultModal } from "@/components/Vault/VaultModal";
import { fetchRecommendations, RecommendResponse } from "@/services/api";
import { useUser } from "@/hooks/useUser";
import { AlertCircle, RotateCcw, Bookmark, BookmarkCheck } from "lucide-react";

type Phase = "form" | "loading" | "results";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RecommendResponse | null>(null);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [experienceSaved, setExperienceSaved] = useState(false);

  const [category, setCategory] = useState<"cigar" | "alcohol">("cigar");
  const [flavors, setFlavors]   = useState<string[]>([]);
  const [strength, setStrength] = useState<number>(3);
  const [mood, setMood]         = useState<string>("relaxed");

  const {
    profile,
    isElite,
    justUnlockedElite,
    clearEliteUnlock,
    recordSession,
    recordSwipe,
    handleSaveExperience,
    handleRemoveExperience,
    updateName,
  } = useUser();

  const handleCategoryChange = (newCat: "cigar" | "alcohol") => {
    setCategory(newCat);
    setFlavors([]);
  };

  const handleDiscover = async () => {
    if (flavors.length === 0) {
      setError("Please select at least one tasting note.");
      return;
    }
    setError(null);
    setPhase("loading");
    setExperienceSaved(false);

    try {
      const data = await fetchRecommendations({ category, flavorPreferences: flavors, strength, mood });
      setResults(data);
    } catch {
      setPhase("form");
      setError("The cellar is currently unavailable. Please try again.");
    }
  };

  const handleBurnComplete = () => {
    if (results) {
      setPhase("results");
      recordSession();
    }
  };

  const handleSwipe = () => {
    recordSwipe();
  };

  const handleSave = () => {
    if (!results) return;
    handleSaveExperience(
      { category, flavorPreferences: flavors, strength, mood },
      results.recommendations,
      results.pairings,
    );
    setExperienceSaved(true);
  };

  const handleStartOver = () => {
    setPhase("form");
    setResults(null);
    setFlavors([]);
    setStrength(3);
    setMood("relaxed");
    setExperienceSaved(false);
  };

  const eliteGlow = isElite
    ? "0 0 80px rgba(212,175,55,0.04), 0 0 160px rgba(212,175,55,0.02)"
    : "none";

  return (
    <div
      className="min-h-[100dvh] w-full text-foreground flex flex-col relative overflow-hidden"
      style={{ background: "hsl(22 18% 5%)", boxShadow: eliteGlow }}
    >
      <AmbientBackground />

      {/* Elite mode ambient enhancement */}
      {isElite && (
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: "radial-gradient(ellipse 100% 60% at 50% 0%, rgba(212,175,55,0.04) 0%, transparent 60%)",
          }}
        />
      )}

      {/* Cigar burn loader */}
      <AnimatePresence>
        {phase === "loading" && (
          <CigarBurnLoader onComplete={handleBurnComplete} />
        )}
      </AnimatePresence>

      {/* Elite unlock animation */}
      <AnimatePresence>
        {justUnlockedElite && (
          <EliteUnlockAnimation onComplete={clearEliteUnlock} />
        )}
      </AnimatePresence>

      {/* Vault modal */}
      <VaultModal
        profile={profile}
        isOpen={vaultOpen}
        onClose={() => setVaultOpen(false)}
        onRemove={handleRemoveExperience}
        onNameChange={updateName}
      />

      {/* Main layout */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 py-10 relative z-10">

        {/* Top bar: logo left, badge right */}
        <div className="flex items-start justify-between mb-12">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1
              className="font-serif tracking-[0.1em]"
              style={{
                fontSize: "clamp(1.9rem, 5vw, 2.8rem)",
                fontWeight: 400,
                background: isElite
                  ? "linear-gradient(135deg, hsl(43 90% 72%), hsl(43 85% 56%), hsl(38 90% 68%))"
                  : "linear-gradient(135deg, hsl(38 25% 88%), hsl(43 85% 68%), hsl(38 25% 82%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              SmokeCraft
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-px w-8" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.35))" }} />
              <p className="text-[9px] uppercase tracking-[0.4em]" style={{ color: "rgba(212,175,55,0.45)" }}>
                Connoisseur's Companion
              </p>
            </div>
          </motion.div>

          <ProfileBadge profile={profile} onOpenVault={() => setVaultOpen(true)} />
        </div>

        <AnimatePresence mode="wait">

          {/* ── Form ───────────────────────────────────────────── */}
          {(phase === "form" || phase === "loading") && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: phase === "loading" ? 0 : 1, y: 0 }}
              exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-10 flex-1 max-w-xl mx-auto w-full"
            >
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-4 rounded-xl"
                  style={{
                    background: "rgba(239,68,68,0.07)",
                    border: "1px solid rgba(239,68,68,0.22)",
                    color: "rgba(239,68,68,0.85)",
                  }}
                  data-testid="error-message"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </motion.div>
              )}

              <section>
                <CategoryToggle value={category} onChange={handleCategoryChange} />
              </section>

              <section>
                <FormLabel title="Palate" hint="Select notes" isElite={isElite} />
                <FlavorChips category={category} selected={flavors} onChange={setFlavors} />
              </section>

              <section>
                <FormLabel title="Strength" isElite={isElite} />
                <StrengthSlider value={strength} onChange={setStrength} />
              </section>

              <section>
                <FormLabel title="Atmosphere" isElite={isElite} />
                <MoodSelector selected={mood} onChange={setMood} />
              </section>

              <div className="mt-6 mb-12">
                <motion.button
                  data-testid="btn-discover"
                  onClick={handleDiscover}
                  className="w-full py-5 font-serif text-xl tracking-[0.22em] uppercase rounded-sm relative overflow-hidden"
                  style={{
                    background: isElite
                      ? "linear-gradient(135deg, hsl(43 80% 46%), hsl(45 90% 56%), hsl(40 80% 48%))"
                      : "linear-gradient(135deg, hsl(43 75% 42%), hsl(45 85% 52%), hsl(43 75% 44%))",
                    color: "hsl(22 18% 6%)",
                    boxShadow: isElite
                      ? "0 0 0 1px rgba(212,175,55,0.4), 0 8px 30px rgba(0,0,0,0.5), 0 0 50px rgba(212,175,55,0.15)"
                      : "0 0 0 1px rgba(212,175,55,0.3), 0 8px 30px rgba(0,0,0,0.5), 0 0 40px rgba(212,175,55,0.08)",
                  }}
                  whileHover={{
                    boxShadow: "0 0 0 1px rgba(212,175,55,0.55), 0 12px 40px rgba(0,0,0,0.55), 0 0 65px rgba(212,175,55,0.22)",
                    scale: 1.005,
                  }}
                  whileTap={{ scale: 0.997 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%)",
                      backgroundSize: "200% 100%",
                    }}
                    animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "linear", repeatDelay: 1.5 }}
                  />
                  Curate Selection
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── Results ─────────────────────────────────────────── */}
          {phase === "results" && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.96, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col flex-1 w-full"
            >
              {/* Results header */}
              <motion.div
                className="mb-10 text-center"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.7 }}
              >
                <h2 className="font-serif text-3xl mb-2" style={{ fontWeight: 300 }}>
                  Your Selection
                </h2>
                <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "rgba(212,175,55,0.45)" }}>
                  Swipe to explore
                </p>
              </motion.div>

              <CardStack
                recommendations={results.recommendations}
                onComplete={() => {}}
                onSwipe={handleSwipe}
              />

              {/* Save Experience button */}
              <motion.div
                className="flex justify-center mt-8"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
              >
                <motion.button
                  onClick={handleSave}
                  disabled={experienceSaved}
                  className="flex items-center gap-2.5 px-5 py-3 rounded-full text-xs uppercase tracking-[0.2em] transition-all duration-400"
                  style={
                    experienceSaved
                      ? {
                          background: "linear-gradient(135deg, rgba(180,130,30,0.2), rgba(212,175,55,0.1))",
                          border: "1px solid rgba(212,175,55,0.35)",
                          color: "rgba(212,175,55,0.8)",
                        }
                      : {
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "rgba(180,155,100,0.55)",
                        }
                  }
                  whileHover={!experienceSaved ? {
                    borderColor: "rgba(212,175,55,0.4)",
                    color: "rgba(212,175,55,0.8)",
                    background: "rgba(212,175,55,0.06)",
                  } : {}}
                  whileTap={!experienceSaved ? { scale: 0.96 } : {}}
                  data-testid="btn-save"
                >
                  <AnimatePresence mode="wait">
                    {experienceSaved ? (
                      <motion.div
                        key="saved"
                        className="flex items-center gap-2.5"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <BookmarkCheck size={13} />
                        <span>Saved to Vault · +5pts</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="save"
                        className="flex items-center gap-2.5"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Bookmark size={13} />
                        <span>Save Experience</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </motion.div>

              <PairingsSection pairings={results.pairings} />

              <motion.div
                className="mt-16 text-center pb-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.6 }}
              >
                <button
                  data-testid="btn-start-over"
                  onClick={handleStartOver}
                  className="inline-flex items-center gap-2.5 text-xs uppercase tracking-[0.25em] group transition-all duration-300"
                  style={{ color: "rgba(180,155,100,0.4)" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(212,175,55,0.7)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(180,155,100,0.4)")}
                >
                  <RotateCcw size={13} className="group-hover:-rotate-90 transition-transform duration-500" />
                  Begin Anew
                </button>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

function FormLabel({ title, hint, isElite }: { title: string; hint?: string; isElite: boolean }) {
  return (
    <div className="mb-4 flex items-baseline justify-between">
      <h2
        className="font-serif text-2xl"
        style={{
          fontWeight: 400,
          color: isElite ? "rgba(235,210,165,0.95)" : "rgba(230,210,175,0.9)",
        }}
      >
        {title}
      </h2>
      {hint && (
        <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "rgba(180,155,100,0.45)" }}>
          {hint}
        </span>
      )}
    </div>
  );
}
