import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CategoryToggle } from "@/components/CategoryToggle";
import { FlavorChips } from "@/components/FlavorChips";
import { StrengthSlider } from "@/components/StrengthSlider";
import { MoodSelector } from "@/components/MoodSelector";
import { CardStack } from "@/components/CardStack";
import { PairingsSection } from "@/components/PairingsSection";
import { LoadingState } from "@/components/LoadingState";
import { fetchRecommendations, RecommendResponse } from "@/services/api";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function Home() {
  const [phase, setPhase] = useState<"form" | "results">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RecommendResponse | null>(null);

  // Form State
  const [category, setCategory] = useState<"cigar" | "alcohol">("cigar");
  const [flavors, setFlavors] = useState<string[]>([]);
  const [strength, setStrength] = useState<number>(3);
  const [mood, setMood] = useState<string>("relaxed");

  const handleCategoryChange = (newCat: "cigar" | "alcohol") => {
    setCategory(newCat);
    setFlavors([]); // Reset flavors when category changes
  };

  const handleDiscover = async () => {
    if (flavors.length === 0) {
      setError("Please select at least one flavor preference.");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const data = await fetchRecommendations({
        category,
        flavorPreferences: flavors,
        strength,
        mood,
      });
      setResults(data);
      setPhase("results");
    } catch (err) {
      setError("The cellar is currently unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setPhase("form");
    setResults(null);
    setFlavors([]);
    setStrength(3);
    setMood("relaxed");
  };

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Decorative noise/texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 py-12 relative z-10">
        
        <header className="mb-12 text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-wider text-foreground mb-3">
            SmokeCraft
          </h1>
          <p className="text-sm uppercase tracking-[0.3em] text-primary/70">
            Connoisseur's Companion
          </p>
        </header>

        <AnimatePresence mode="wait">
          {phase === "form" ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="flex flex-col gap-10 flex-1 max-w-xl mx-auto w-full"
            >
              
              {error && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-lg flex items-start gap-3" data-testid="error-message">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <section>
                <CategoryToggle value={category} onChange={handleCategoryChange} />
              </section>

              <section>
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="font-serif text-2xl">Palate</h2>
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">Select notes</span>
                </div>
                <FlavorChips category={category} selected={flavors} onChange={setFlavors} />
              </section>

              <section>
                <div className="mb-4">
                  <h2 className="font-serif text-2xl">Strength</h2>
                </div>
                <StrengthSlider value={strength} onChange={setStrength} />
              </section>

              <section>
                <div className="mb-4">
                  <h2 className="font-serif text-2xl">Atmosphere</h2>
                </div>
                <MoodSelector selected={mood} onChange={setMood} />
              </section>

              <div className="mt-8 mb-12">
                <button
                  data-testid="btn-discover"
                  onClick={handleDiscover}
                  className="w-full py-5 bg-primary text-primary-foreground font-serif text-xl tracking-widest uppercase hover:bg-primary/90 transition-colors shadow-[0_0_30px_rgba(200,150,50,0.15)] hover:shadow-[0_0_40px_rgba(200,150,50,0.25)] rounded-sm"
                >
                  Curate Selection
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="flex flex-col flex-1 w-full"
            >
              {results && (
                <>
                  <div className="mb-8 text-center">
                    <h2 className="font-serif text-3xl mb-2">Your Selection</h2>
                    <p className="text-sm text-muted-foreground tracking-widest uppercase">
                      Swipe to explore
                    </p>
                  </div>
                  
                  <CardStack
                    recommendations={results.recommendations}
                    onComplete={() => {}} // Could show a "That's all" message, but bindings stay clean
                  />
                  
                  <PairingsSection pairings={results.pairings} />

                  <div className="mt-16 text-center pb-12">
                    <button
                      data-testid="btn-start-over"
                      onClick={handleStartOver}
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors tracking-widest uppercase group"
                    >
                      <RotateCcw size={16} className="group-hover:-rotate-90 transition-transform duration-500" />
                      Begin Anew
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {loading && <LoadingState />}
    </div>
  );
}
