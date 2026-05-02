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
import { fetchRecommendations, RecommendResponse } from "@/services/api";
import { AlertCircle, RotateCcw } from "lucide-react";

type Phase = "form" | "loading" | "results";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RecommendResponse | null>(null);

  const [category, setCategory] = useState<"cigar" | "alcohol">("cigar");
  const [flavors, setFlavors]   = useState<string[]>([]);
  const [strength, setStrength] = useState<number>(3);
  const [mood, setMood]         = useState<string>("relaxed");

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

    try {
      const data = await fetchRecommendations({ category, flavorPreferences: flavors, strength, mood });
      setResults(data);
      // CigarBurnLoader calls onComplete after its animation; we store results here
      // and let the loader trigger the reveal
    } catch {
      setPhase("form");
      setError("The cellar is currently unavailable. Please try again.");
    }
  };

  const handleBurnComplete = () => {
    if (results) setPhase("results");
  };

  const handleStartOver = () => {
    setPhase("form");
    setResults(null);
    setFlavors([]);
    setStrength(3);
    setMood("relaxed");
  };

  return (
    <div className="min-h-[100dvh] w-full text-foreground flex flex-col relative overflow-hidden"
      style={{ background: "hsl(22 18% 5%)" }}>

      {/* Layered ambient environment */}
      <AmbientBackground />

      {/* Cigar burn loading screen */}
      <AnimatePresence>
        {phase === "loading" && (
          <CigarBurnLoader onComplete={handleBurnComplete} />
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 py-12 relative z-10">

        {/* Header */}
        <motion.header
          className="mb-14 text-center"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1
            className="font-serif tracking-[0.12em] mb-3"
            style={{ fontSize: "clamp(2.4rem, 6vw, 3.4rem)", fontWeight: 400,
              background: "linear-gradient(135deg, hsl(38 25% 88%), hsl(43 85% 68%), hsl(38 25% 82%))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            SmokeCraft
          </h1>
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-12" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.4))" }} />
            <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: "rgba(212,175,55,0.55)" }}>
              Connoisseur's Companion
            </p>
            <div className="h-px w-12" style={{ background: "linear-gradient(90deg, rgba(212,175,55,0.4), transparent)" }} />
          </div>
        </motion.header>

        <AnimatePresence mode="wait">

          {/* ── Form phase ─────────────────────────────────────── */}
          {(phase === "form" || phase === "loading") && phase !== "results" && (
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

              {/* Glass form sections */}
              <section>
                <CategoryToggle value={category} onChange={handleCategoryChange} />
              </section>

              <section>
                <FormLabel title="Palate" hint="Select notes" />
                <FlavorChips category={category} selected={flavors} onChange={setFlavors} />
              </section>

              <section>
                <FormLabel title="Strength" />
                <StrengthSlider value={strength} onChange={setStrength} />
              </section>

              <section>
                <FormLabel title="Atmosphere" />
                <MoodSelector selected={mood} onChange={setMood} />
              </section>

              {/* CTA */}
              <div className="mt-6 mb-12">
                <motion.button
                  data-testid="btn-discover"
                  onClick={handleDiscover}
                  className="w-full py-5 font-serif text-xl tracking-[0.22em] uppercase rounded-sm relative overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, hsl(43 75% 42%), hsl(45 85% 52%), hsl(43 75% 44%))",
                    color: "hsl(22 18% 6%)",
                    boxShadow: "0 0 0 1px rgba(212,175,55,0.3), 0 8px 30px rgba(0,0,0,0.5), 0 0 40px rgba(212,175,55,0.08)",
                  }}
                  whileHover={{
                    boxShadow: "0 0 0 1px rgba(212,175,55,0.5), 0 12px 40px rgba(0,0,0,0.55), 0 0 60px rgba(212,175,55,0.18)",
                    scale: 1.005,
                  }}
                  whileTap={{ scale: 0.997 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Shimmer overlay */}
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

          {/* ── Results phase ───────────────────────────────────── */}
          {phase === "results" && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.96, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col flex-1 w-full"
            >
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
              />

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
                  onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(212,175,55,0.7)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(180,155,100,0.4)")}
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

function FormLabel({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between">
      <h2 className="font-serif text-2xl" style={{ fontWeight: 400, color: "rgba(230,210,175,0.9)" }}>
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
