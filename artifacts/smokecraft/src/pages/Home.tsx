import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CategoryToggle }    from "@/components/CategoryToggle";
import { FlavorChips }       from "@/components/FlavorChips";
import { StrengthSlider }    from "@/components/StrengthSlider";
import { MoodSelector }      from "@/components/MoodSelector";
import { CardStack }         from "@/components/CardStack";
import { PairingsSection }   from "@/components/PairingsSection";
import { FoodSection }       from "@/components/Food/FoodSection";
import { FeaturedSection }   from "@/components/Featured/FeaturedSection";
import { CigarBurnLoader }   from "@/components/CigarBurnLoader";
import { AmbientBackground } from "@/components/AmbientBackground";
import { ProfileBadge }      from "@/components/Profile/ProfileBadge";
import { EliteUnlockAnimation } from "@/components/Profile/EliteUnlockAnimation";
import { VaultModal }        from "@/components/Vault/VaultModal";
import { BandCreatorModal }  from "@/components/Band/BandCreatorModal";
import { OfflineBanner }     from "@/components/PWA/OfflineBanner";
import { InstallBanner }     from "@/components/PWA/InstallBanner";
import { fetchRecommendations, createDemandRequest, captureDemandEvent, trackEvent, trackPreferences, persistExperience, type RecommendResponse, type ProductResult, type OrderType } from "@/services/api";
import { useUser }           from "@/hooks/useUser";
import { useOnlineStatus }   from "@/hooks/useOnlineStatus";
import { useVenue }          from "@/contexts/VenueContext";
import { usePresentation }  from "@/contexts/PresentationContext";
import { AlertCircle, RotateCcw, Bookmark, BookmarkCheck, Flame, Zap, ShoppingBag, MonitorPlay, Bell, CheckCircle2 } from "lucide-react";
import { OrderModal }        from "@/components/Order/OrderModal";
import { OrderConfirmation } from "@/components/Order/OrderConfirmation";
import type { SavedBlend }   from "@/services/storage";

type Phase = "form" | "loading" | "results";

// ── Demo mode preset ──────────────────────────────────────────────────────────
const DEMO: { category: "cigar" | "alcohol"; flavors: string[]; strength: number; mood: string } = {
  category: "cigar",
  flavors:  ["cedar", "leather", "smoky"],
  strength: 3,
  mood:     "relaxed",
};

export default function Home() {
  const [phase, setPhase]                     = useState<Phase>("form");
  const [error, setError]                     = useState<string | null>(null);
  const [results, setResults]                 = useState<RecommendResponse | null>(null);
  const [vaultOpen, setVaultOpen]             = useState(false);
  const [bandOpen, setBandOpen]               = useState(false);
  const [experienceSaved, setExperienceSaved] = useState(false);
  const [isDemoMode, setIsDemoMode]           = useState(false);
  const [orderModalOpen, setOrderModalOpen]   = useState(false);
  const [confirmedOrder, setConfirmedOrder]   = useState<{ id: string; type: OrderType } | null>(null);
  const [requestedItems, setRequestedItems]   = useState<Set<string>>(new Set());

  const [category, setCategory] = useState<"cigar" | "alcohol">("cigar");
  const [flavors, setFlavors]   = useState<string[]>([]);
  const [strength, setStrength] = useState<number>(3);
  const [mood, setMood]         = useState<string>("relaxed");

  const {
    profile, isElite, justUnlockedElite, clearEliteUnlock,
    recordSession, recordSwipe,
    handleSaveExperience, handleRemoveExperience,
    handleSaveBlend, handleRemoveBlend,
    updateName,
  } = useUser();

  const isOnline = useOnlineStatus();
  const venue    = useVenue();

  const {
    isActive:              isPresenting,
    currentStep:           presentationStep,
    shouldTriggerDiscover,
    clearTriggerDiscover,
    onResultsReady,
    start:                 startPresentation,
  } = usePresentation();

  const handleCategoryChange = (newCat: "cigar" | "alcohol") => {
    setCategory(newCat);
    setFlavors([]);
  };

  /** Core discover function — accepts explicit params to avoid async state races. */
  const discover = useCallback(async (params: {
    category: "cigar" | "alcohol";
    flavors:   string[];
    strength:  number;
    mood:      string;
  }) => {
    setError(null);
    setPhase("loading");
    setExperienceSaved(false);
    try {
      const venueIdParam = venue.id !== "default" ? venue.id : undefined;
      const data = await fetchRecommendations({
        category:          params.category,
        flavorPreferences: params.flavors,
        strength:          params.strength,
        mood:              params.mood,
        venueId:           venueIdParam,
      });
      setResults(data);
      // Fire recommendation_view event for each recommended product, tagging campaignId if set
      for (const rec of data.recommendations) {
        trackEvent({
          eventType: "recommendation_view",
          productId: rec.id,
          metadata:  rec.campaignId ? { campaignId: rec.campaignId } : undefined,
        });
      }
      trackPreferences({
        category:          params.category,
        flavorPreferences: params.flavors,
        strength:          params.strength,
        mood:              params.mood,
      });
    } catch (err) {
      setPhase("form");
      setError(
        !isOnline
          ? "You're offline. Connect to the internet and try again."
          : "The cellar is currently unavailable. Please try again.",
      );
    }
  }, [isOnline]);

  // Presentation step 1 → 2: auto-fill form + trigger discover
  useEffect(() => {
    if (!shouldTriggerDiscover) return;
    clearTriggerDiscover();
    setCategory(DEMO.category);
    setFlavors(DEMO.flavors);
    setStrength(DEMO.strength);
    setMood(DEMO.mood);
    setIsDemoMode(true);
    discover(DEMO);
  }, [shouldTriggerDiscover, clearTriggerDiscover, discover]);

  // Presentation step 2: auto-advance when results are ready
  useEffect(() => {
    if (!isPresenting || presentationStep !== 2) return;
    if (phase === "results") onResultsReady();
  }, [isPresenting, presentationStep, phase, onResultsReady]);

  const handleDiscover = () => {
    if (flavors.length === 0) { setError("Please select at least one tasting note."); return; }
    setRequestedItems(new Set());
    discover({ category, flavors, strength, mood });
  };

  const handleRequestItem = (item: ProductResult) => {
    if (requestedItems.has(item.id)) return;
    setRequestedItems((prev) => new Set([...prev, item.id]));
    const venueIdParam = venue.id !== "default" ? venue.id : undefined;
    // Fire both legacy demand_requests and new demand_events
    createDemandRequest({
      productId:   item.id,
      productName: item.name,
      category:    item.category,
      venueId:     venueIdParam,
    });
    captureDemandEvent({
      productId:   item.id,
      productName: item.name,
      category:    item.category,
      flavorNotes: item.flavorNotes,
      eventType:   "oos_request",
      venueId:     venueIdParam,
    });
  };

  /** Demo Mode — pre-fills the form and immediately runs the full flow. */
  const handleTryDemo = () => {
    setCategory(DEMO.category);
    setFlavors(DEMO.flavors);
    setStrength(DEMO.strength);
    setMood(DEMO.mood);
    setIsDemoMode(true);
    discover(DEMO);
  };

  const handleBurnComplete = () => {
    if (results) { setPhase("results"); recordSession(); }
  };

  const handleSwipe = (direction: "left" | "right", productId: string) => {
    recordSwipe();
    const product = results?.recommendations.find((r) => r.id === productId);
    trackEvent({
      eventType: direction === "right" ? "swipe_right" : "swipe_left",
      productId,
      metadata: product?.campaignId ? { campaignId: product.campaignId } : undefined,
    });
    if (direction === "right") {
      trackEvent({
        eventType: "product_selected",
        productId,
        metadata: product?.campaignId ? { campaignId: product.campaignId } : undefined,
      });
      // Capture as demand signal
      if (product) {
        captureDemandEvent({
          productId,
          productName: product.name,
          category:    product.category,
          flavorNotes: product.flavorNotes,
          eventType:   "selection",
          venueId:     venue.id !== "default" ? venue.id : undefined,
        });
      }
    }
  };

  const handleSave = () => {
    if (!results) return;
    handleSaveExperience({ category, flavorPreferences: flavors, strength, mood }, results.recommendations, results.pairings);
    setExperienceSaved(true);
    void persistExperience({
      selectedProductId: results.recommendations[0]?.id ?? "",
      pairingProductId:  results.pairings[0]?.id,
      foodPairingId:     results.foodPairings[0]?.id,
    });
    if (results.recommendations[0]) {
      trackEvent({ eventType: "save_experience", productId: results.recommendations[0].id });
    }
  };

  const handleOrderSuccess = (orderId: string, orderType: OrderType) => {
    setOrderModalOpen(false);
    setConfirmedOrder({ id: orderId, type: orderType });
    const topRec = results?.recommendations[0];
    trackEvent({
      eventType: "order_created",
      productId: topRec?.id,
      metadata:  {
        orderId,
        orderType,
        ...(topRec?.campaignId ? { campaignId: topRec.campaignId } : {}),
      },
    });
  };

  const handleStartOver = () => {
    setPhase("form");
    setResults(null);
    setFlavors([]);
    setStrength(3);
    setMood("relaxed");
    setExperienceSaved(false);
    setIsDemoMode(false);
  };

  const cigarBase    = results?.recommendations[0]?.name ?? "";
  const pairingBase  = results?.pairings[0]?.name        ?? "";
  const foodPairings = results?.foodPairings              ?? [];
  const featured     = results?.featured                  ?? [];

  return (
    <div className="min-h-[100dvh] w-full text-foreground flex flex-col relative overflow-hidden" style={{ background: "hsl(22 18% 5%)" }}>
      <AmbientBackground />

      {/* Elite ambient overlay */}
      {isElite && (
        <div className="fixed inset-0 pointer-events-none z-0"
          style={{ background: "radial-gradient(ellipse 100% 60% at 50% 0%, rgba(212,175,55,0.04) 0%, transparent 60%)" }} />
      )}

      {/* Offline + Install banners */}
      <OfflineBanner isOnline={isOnline} />
      <InstallBanner />

      <AnimatePresence>
        {phase === "loading" && <CigarBurnLoader onComplete={handleBurnComplete} />}
      </AnimatePresence>
      <AnimatePresence>
        {justUnlockedElite && <EliteUnlockAnimation onComplete={clearEliteUnlock} />}
      </AnimatePresence>

      <AnimatePresence>
        {orderModalOpen && (
          <OrderModal
            isOpen={orderModalOpen}
            cigar={results?.recommendations[0]}
            drink={results?.pairings[0]}
            food={results?.foodPairings[0]}
            onClose={() => setOrderModalOpen(false)}
            onSuccess={handleOrderSuccess}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {confirmedOrder && (
          <OrderConfirmation
            orderId={confirmedOrder.id}
            orderType={confirmedOrder.type}
            onDismiss={() => setConfirmedOrder(null)}
          />
        )}
      </AnimatePresence>

      <VaultModal
        profile={profile}
        isOpen={vaultOpen}
        onClose={() => setVaultOpen(false)}
        onRemove={handleRemoveExperience}
        onRemoveBlend={handleRemoveBlend}
        onNameChange={updateName}
      />
      <BandCreatorModal
        isOpen={bandOpen}
        isElite={isElite}
        cigarBaseName={cigarBase}
        pairingName={pairingBase}
        foodPairings={foodPairings}
        onClose={() => setBandOpen(false)}
        onSave={(blend: Omit<SavedBlend, "id" | "createdAt">) => handleSaveBlend(blend)}
      />

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 py-10 relative z-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-12">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}>
            <h1 className="font-serif tracking-[0.1em]"
              style={{
                fontSize: "clamp(1.9rem, 5vw, 2.8rem)", fontWeight: 400,
                background: isElite
                  ? "linear-gradient(135deg, hsl(43 90% 72%), hsl(43 85% 56%), hsl(38 90% 68%))"
                  : "linear-gradient(135deg, hsl(38 25% 88%), hsl(43 85% 68%), hsl(38 25% 82%))",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>
              {venue.logoText}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-px w-8" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.35))" }} />
              <p className="text-[9px] uppercase tracking-[0.4em]" style={{ color: "rgba(212,175,55,0.45)" }}>{venue.tagline}</p>
            </div>
          </motion.div>
          <ProfileBadge profile={profile} onOpenVault={() => setVaultOpen(true)} />
        </div>

        <AnimatePresence mode="wait">

          {/* ── Form ─────────────────────────── */}
          {(phase === "form" || phase === "loading") && (
            <motion.div key="form"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: phase === "loading" ? 0 : 1, y: 0 }}
              exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-10 flex-1 max-w-xl mx-auto w-full"
            >
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-4 rounded-xl"
                  style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.22)", color: "rgba(239,68,68,0.85)" }}
                  data-testid="error-message">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </motion.div>
              )}

              <div data-tour="tour-preferences" className="flex flex-col gap-10">
                <section><CategoryToggle value={category} onChange={handleCategoryChange} /></section>
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
              </div>

              <div className="mt-6 mb-2 flex flex-col gap-3">
                {/* Primary CTA */}
                <motion.button data-testid="btn-discover" data-tour="tour-discover" onClick={handleDiscover}
                  className="w-full py-5 font-serif text-xl tracking-[0.22em] uppercase rounded-sm relative overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, hsl(43 75% 42%), hsl(45 85% 52%), hsl(43 75% 44%))",
                    color: "hsl(22 18% 6%)",
                    boxShadow: isElite
                      ? "0 0 0 1px rgba(212,175,55,0.4), 0 8px 30px rgba(0,0,0,0.5), 0 0 50px rgba(212,175,55,0.15)"
                      : "0 0 0 1px rgba(212,175,55,0.3), 0 8px 30px rgba(0,0,0,0.5), 0 0 40px rgba(212,175,55,0.08)",
                  }}
                  whileHover={{ boxShadow: "0 0 0 1px rgba(212,175,55,0.55), 0 12px 40px rgba(0,0,0,0.55), 0 0 65px rgba(212,175,55,0.22)", scale: 1.005 }}
                  whileTap={{ scale: 0.997 }} transition={{ duration: 0.3 }}
                >
                  <motion.div className="absolute inset-0 pointer-events-none"
                    style={{ background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%)", backgroundSize: "200% 100%" }}
                    animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "linear", repeatDelay: 1.5 }}
                  />
                  Curate Selection
                </motion.button>

                {/* Guided Tour CTA */}
                <motion.button
                  data-testid="btn-start-presentation"
                  onClick={startPresentation}
                  className="w-full py-3 text-xs uppercase tracking-[0.22em] rounded-sm flex items-center justify-center gap-2"
                  style={{
                    background: "rgba(212,175,55,0.05)",
                    border: "1px solid rgba(212,175,55,0.28)",
                    color: "rgba(212,175,55,0.65)",
                  }}
                  whileHover={{
                    background: "rgba(212,175,55,0.1)",
                    borderColor: "rgba(212,175,55,0.55)",
                    color: "rgba(212,175,55,0.9)",
                  }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ duration: 0.2 }}
                >
                  <MonitorPlay size={12} />
                  Start Guided Experience
                </motion.button>

                {/* Demo Mode CTA */}
                {venue.features.demoMode && (
                  <motion.button
                    data-testid="btn-try-demo"
                    onClick={handleTryDemo}
                    className="w-full py-3 text-xs uppercase tracking-[0.22em] rounded-sm flex items-center justify-center gap-2"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px dashed rgba(212,175,55,0.18)",
                      color: "rgba(180,155,100,0.4)",
                    }}
                    whileHover={{
                      background: "rgba(212,175,55,0.04)",
                      borderColor: "rgba(212,175,55,0.35)",
                      color: "rgba(212,175,55,0.65)",
                    }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Zap size={12} />
                    Try Demo — 15 second experience
                  </motion.button>
                )}
              </div>

              {/* Partner dashboard link */}
              <div className="text-center pb-4">
                <a href="/dashboard"
                  className="text-[8px] uppercase tracking-[0.22em] transition-colors duration-200"
                  style={{ color: "rgba(180,155,100,0.22)" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(212,175,55,0.45)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(180,155,100,0.22)")}
                >
                  Partner Dashboard
                </a>
              </div>
            </motion.div>
          )}

          {/* ── Results ───────────────────────── */}
          {phase === "results" && results && (
            <motion.div key="results"
              initial={{ opacity: 0, scale: 0.96, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col flex-1 w-full"
            >
              <motion.div className="mb-10 text-center"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <h2 className="font-serif text-3xl" style={{ fontWeight: 300 }}>Your Selection</h2>
                  {isDemoMode && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-[0.22em]"
                      style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)", color: "rgba(212,175,55,0.75)" }}>
                      Demo
                    </span>
                  )}
                </div>
                <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "rgba(212,175,55,0.45)" }}>Swipe to explore</p>
              </motion.div>

              <div data-tour="tour-card-stack">
                <CardStack
                  recommendations={results.recommendations}
                  onComplete={() => {}}
                  onSwipe={handleSwipe}
                />
              </div>

              {/* Action buttons */}
              <motion.div className="flex items-center justify-center gap-3 mt-8 flex-wrap"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.6 }}>

                {/* PRIMARY CTA — Order */}
                <motion.button
                  onClick={() => setOrderModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-full text-xs uppercase tracking-[0.18em] relative overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, hsl(43 75% 42%), hsl(45 85% 52%))",
                    color:      "hsl(22 18% 6%)",
                    boxShadow:  "0 0 20px rgba(212,175,55,0.22), 0 4px 16px rgba(0,0,0,0.4)",
                  }}
                  whileHover={{ scale: 1.04, boxShadow: "0 0 32px rgba(212,175,55,0.38), 0 6px 20px rgba(0,0,0,0.45)" }}
                  whileTap={{ scale: 0.97 }}
                  data-testid="btn-order"
                  data-tour="tour-order-btn"
                >
                  <motion.div className="absolute inset-0 pointer-events-none"
                    style={{ background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%)", backgroundSize: "200% 100%" }}
                    animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
                  />
                  <ShoppingBag size={13} />Order This Experience
                </motion.button>

                <motion.button onClick={handleSave} disabled={experienceSaved}
                  className="flex items-center gap-2 px-5 py-3 rounded-full text-xs uppercase tracking-[0.18em] transition-all duration-400"
                  style={experienceSaved
                    ? { background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", color: "rgba(212,175,55,0.75)" }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(180,155,100,0.55)" }
                  }
                  whileHover={!experienceSaved ? { borderColor: "rgba(212,175,55,0.35)", color: "rgba(212,175,55,0.75)", background: "rgba(212,175,55,0.06)" } : {}}
                  whileTap={!experienceSaved ? { scale: 0.96 } : {}}
                  data-testid="btn-save">
                  <AnimatePresence mode="wait">
                    {experienceSaved
                      ? <motion.span key="saved" className="flex items-center gap-2" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}><BookmarkCheck size={13} />Saved · +5pts</motion.span>
                      : <motion.span key="save"  className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Bookmark size={13} />Save Experience</motion.span>
                    }
                  </AnimatePresence>
                </motion.button>

                {venue.features.bandCreator && (
                  <motion.button onClick={() => setBandOpen(true)}
                    className="flex items-center gap-2 px-5 py-3 rounded-full text-xs uppercase tracking-[0.18em]"
                    style={{
                      background: "linear-gradient(135deg, rgba(180,130,30,0.22), rgba(212,175,55,0.12))",
                      border: "1px solid rgba(212,175,55,0.38)",
                      color: "rgba(212,175,55,0.88)",
                      boxShadow: "0 0 16px rgba(212,175,55,0.1)",
                    }}
                    whileHover={{ boxShadow: "0 0 24px rgba(212,175,55,0.22)", borderColor: "rgba(212,175,55,0.6)" }}
                    whileTap={{ scale: 0.96 }}
                    data-testid="btn-create-blend">
                    <Flame size={13} />Create My Blend
                  </motion.button>
                )}
              </motion.div>

              {/* ── Out-of-stock demand section ────────────────────── */}
              {results.outOfStock && results.outOfStock.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1, duration: 0.6 }}
                  className="mt-8 rounded-xl p-5"
                  style={{ background: "rgba(212,175,55,0.03)", border: "1px solid rgba(212,175,55,0.12)" }}
                >
                  <p className="text-[9px] uppercase tracking-[0.28em] mb-4" style={{ color: "rgba(212,175,55,0.4)" }}>
                    Not Available at This Venue · Request for Future Stock
                  </p>
                  <div className="space-y-2">
                    {results.outOfStock.map((item) => {
                      const requested = requestedItems.has(item.id);
                      return (
                        <div key={item.id}
                          className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl"
                          style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="min-w-0">
                            <p className="font-serif text-sm truncate" style={{ color: "rgba(200,180,145,0.75)" }}>{item.name}</p>
                            <p className="text-[8px] uppercase tracking-[0.15em] mt-0.5" style={{ color: "rgba(180,155,100,0.35)" }}>
                              {item.category} · Not in stock
                            </p>
                          </div>
                          <motion.button
                            onClick={() => handleRequestItem(item)}
                            disabled={requested}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[9px] uppercase tracking-[0.15em] flex-shrink-0 transition-all duration-300"
                            style={requested
                              ? { background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", color: "rgba(212,175,55,0.55)" }
                              : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(180,155,100,0.5)" }
                            }
                            whileHover={!requested ? { borderColor: "rgba(212,175,55,0.35)", color: "rgba(212,175,55,0.75)", background: "rgba(212,175,55,0.06)" } : {}}
                            whileTap={!requested ? { scale: 0.96 } : {}}
                          >
                            {requested
                              ? <><CheckCircle2 size={10} />Requested</>
                              : <><Bell size={10} />Request This Item</>
                            }
                          </motion.button>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Featured Selections */}
              <FeaturedSection featured={featured} />

              {/* Alcohol pairings */}
              <div data-tour="tour-pairings">
                <PairingsSection pairings={results.pairings} />
              </div>

              {/* Food pairings */}
              {venue.features.foodPairing && <FoodSection foodPairings={foodPairings} />}

              <motion.div className="mt-16 text-center pb-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 0.6 }}>
                <button data-testid="btn-start-over" onClick={handleStartOver}
                  className="inline-flex items-center gap-2.5 text-xs uppercase tracking-[0.25em] group transition-all duration-300"
                  style={{ color: "rgba(180,155,100,0.4)" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(212,175,55,0.7)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(180,155,100,0.4)")}>
                  <RotateCcw size={13} className="group-hover:-rotate-90 transition-transform duration-500" />
                  {isDemoMode ? "Exit Demo" : "Begin Anew"}
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
      <h2 className="font-serif text-2xl" style={{ fontWeight: 400, color: isElite ? "rgba(235,210,165,0.95)" : "rgba(230,210,175,0.9)" }}>
        {title}
      </h2>
      {hint && <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "rgba(180,155,100,0.45)" }}>{hint}</span>}
    </div>
  );
}
