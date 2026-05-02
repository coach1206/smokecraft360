import { useCallback, useEffect, useRef, useState } from "react";
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
import { DynamicBackground } from "@/components/DynamicBackground";
import { SwipeCardDeck }     from "@/components/SwipeCardDeck";
import { ProfileBadge }      from "@/components/Profile/ProfileBadge";
import { EliteUnlockAnimation } from "@/components/Profile/EliteUnlockAnimation";
import { VaultModal }               from "@/components/Vault/VaultModal";
import { BandCreatorModal }         from "@/components/Band/BandCreatorModal";
import { SignatureCigarModal }      from "@/components/SignatureCigar/SignatureCigarModal";
import { useProgression }           from "@/hooks/useProgression";
import { OfflineBanner }     from "@/components/PWA/OfflineBanner";
import { InstallBanner }     from "@/components/PWA/InstallBanner";
import { fetchRecommendations, createDemandRequest, captureDemandEvent, trackEvent, trackPreferences, persistExperience, type RecommendResponse, type ProductResult, type OrderType } from "@/services/api";
import { useUser }           from "@/hooks/useUser";
import { useOnlineStatus }   from "@/hooks/useOnlineStatus";
import { useVenue }          from "@/contexts/VenueContext";
import { usePresentation }  from "@/contexts/PresentationContext";
import { AlertCircle, RotateCcw, Bookmark, BookmarkCheck, Flame, Zap, ShoppingBag, MonitorPlay, Bell, CheckCircle2, Crown } from "lucide-react";
import { ExperienceSidebar, type SidebarStep, type SidebarValues } from "@/components/ExperienceSidebar";
import { ExperienceRightPanel }                from "@/components/ExperienceRightPanel";
import { OrderModal }        from "@/components/Order/OrderModal";
import { OrderConfirmation } from "@/components/Order/OrderConfirmation";
import type { SavedBlend }   from "@/services/storage";

type Phase = "welcome" | "form" | "loading" | "results";

/* ── Universal slide animation ────────────────────────────────── */
const SLIDE_VARIANTS = {
  enter:  (dir: number) => ({ x: dir > 0 ? "110%" : "-110%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir > 0 ? "-55%"  : "55%",  opacity: 0 }),
};
const SLIDE_T = { duration: 0.42, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] };

/* ── Swipe-deck card data ─────────────────────────────────────── */
const CIGAR_FLAVORS = [
  { id: "smoky",   title: "Smoky",   desc: "Deep wood smoke, campfire, volcanic ash"     },
  { id: "sweet",   title: "Sweet",   desc: "Natural honey, dried fruit, light caramel"   },
  { id: "earthy",  title: "Earthy",  desc: "Damp soil, forest floor, rich minerals"      },
  { id: "cedar",   title: "Cedar",   desc: "Crisp cedarwood, freshly cut timber"         },
  { id: "spicy",   title: "Spicy",   desc: "Black pepper, chili, cinnamon bark"          },
  { id: "creamy",  title: "Creamy",  desc: "Smooth chocolate, butter, vanilla"           },
  { id: "nutty",   title: "Nutty",   desc: "Toasted almond, hazelnut, walnut"            },
  { id: "leather", title: "Leather", desc: "Rich saddle leather, aged tobacco"           },
  { id: "cocoa",   title: "Cocoa",   desc: "Dark chocolate, roasted coffee"              },
  { id: "floral",  title: "Floral",  desc: "Jasmine, fresh rose, light herbs"            },
];
const SPIRITS_FLAVORS = [
  { id: "vanilla", title: "Vanilla", desc: "Soft vanilla bean, sweet cream"             },
  { id: "oak",     title: "Oak",     desc: "American oak, toasted wood"                 },
  { id: "caramel", title: "Caramel", desc: "Burnt sugar, rich toffee"                   },
  { id: "citrus",  title: "Citrus",  desc: "Orange peel, lemon zest, bright"            },
  { id: "honey",   title: "Honey",   desc: "Wildflower honey, golden sweetness"         },
  { id: "rye",     title: "Rye",     desc: "Spicy rye grain, herbal notes"              },
  { id: "smoke",   title: "Smoke",   desc: "Peaty smoke, bonfire, mineral"              },
  { id: "fruity",  title: "Fruity",  desc: "Dried cherry, apple, fresh pear"            },
];
const STRENGTH_CARDS = [
  { id: "mild",   title: "Mild",   subtitle: "Strength · Level 1", desc: "Smooth and gentle — perfect for newcomers or a relaxed afternoon" },
  { id: "medium", title: "Medium", subtitle: "Strength · Level 3", desc: "Balanced character — the classic refined experience"              },
  { id: "full",   title: "Full",   subtitle: "Strength · Level 5", desc: "Rich and powerful — bold complexity for the experienced"         },
];
const MOOD_CARDS = [
  { id: "relaxed",     title: "Relaxed",     desc: "Smooth and easy — perfect for winding down"              },
  { id: "bold",        title: "Bold",        desc: "Strong character — full-bodied and powerful"             },
  { id: "social",      title: "Social",      desc: "Great for sharing and good conversation"                 },
  { id: "reflective",  title: "Reflective",  desc: "Complex and contemplative — a quiet moment"             },
  { id: "celebratory", title: "Celebratory", desc: "Special occasion — premium and memorable"               },
  { id: "focused",     title: "Focused",     desc: "Clean and clear — helps you stay sharp"                 },
  { id: "adventurous", title: "Adventurous", desc: "Something different — exciting and unique"              },
  { id: "intense",     title: "Intense",     desc: "Rich and commanding — for the experienced"              },
];

// ── Demo mode preset ──────────────────────────────────────────────────────────
const DEMO: { category: "cigar" | "alcohol"; flavors: string[]; strength: number; mood: string } = {
  category: "cigar",
  flavors:  ["cedar", "leather", "smoky"],
  strength: 3,
  mood:     "relaxed",
};

export default function Home() {
  const [phase, setPhase]                     = useState<Phase>("welcome");
  const [error, setError]                     = useState<string | null>(null);
  const [results, setResults]                 = useState<RecommendResponse | null>(null);
  const [vaultOpen, setVaultOpen]             = useState(false);
  const [bandOpen, setBandOpen]               = useState(false);
  const [signatureOpen, setSignatureOpen]     = useState(false);
  const [experienceSaved, setExperienceSaved] = useState(false);
  const [isDemoMode, setIsDemoMode]           = useState(false);
  const [orderModalOpen, setOrderModalOpen]   = useState(false);
  const [confirmedOrder, setConfirmedOrder]   = useState<{ id: string; type: OrderType } | null>(null);
  const [requestedItems, setRequestedItems]   = useState<Set<string>>(new Set());

  const [category, setCategory] = useState<"cigar" | "alcohol">("cigar");
  const [flavors, setFlavors]   = useState<string[]>([]);
  const [strength, setStrength] = useState<number>(3);
  const [mood, setMood]         = useState<string>("relaxed");

  // Step wizard
  const [formStep,  setFormStep]  = useState<0|1|2|3>(0);
  const [slideDir,  setSlideDir]  = useState<1|-1>(1);
  const [orderTaken, setOrderTaken] = useState(false);
  const [bgKey,      setBgKey]      = useState("welcome");
  const [moodDone,   setMoodDone]   = useState(false);

  // Sidebar step computation
  const activeStep: SidebarStep =
    phase === "loading" ? 4 :
    phase === "results" ? (orderTaken ? 6 : 5) :
    formStep;
  const completedSteps = new Set<number>(
    Array.from({ length: activeStep }, (_, i) => i),
  );

  // Web Audio click sound — subtle soft tick.
  // Lazily cache a single AudioContext so iOS Safari accepts it as a
  // user-gesture-bound instance and we never throw "operation is insecure".
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBrokenRef = useRef(false);
  const playClick = useCallback(() => {
    if (audioBrokenRef.current) return;
    try {
      if (!audioCtxRef.current) {
        const ACtx = window.AudioContext ?? (window as unknown as Record<string, typeof AudioContext>)["webkitAudioContext"];
        if (!ACtx) { audioBrokenRef.current = true; return; }
        audioCtxRef.current = new ACtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      // Resume if suspended (iOS auto-suspends until user gesture)
      if (ctx.state === "suspended") {
        try { void ctx.resume(); } catch { /* ignore */ }
      }
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(1100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(550, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.055, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Mark audio as permanently unavailable so we stop trying
      audioBrokenRef.current = true;
    }
  }, []);

  const goToStep = useCallback((step: 0|1|2|3) => {
    playClick();
    setSlideDir(step >= formStep ? 1 : -1);
    setFormStep(step);
    const defaults: Record<number, string> = {
      0: `experience_${category}`,
      1: "flavor_smoky",
      2: "strength_mild",
      3: "mood_relaxed",
    };
    setBgKey(defaults[step] ?? "default");
    if (step < 3) setMoodDone(false);
  }, [formStep, playClick, category]);

  const {
    profile, isElite, justUnlockedElite, clearEliteUnlock,
    recordSession, recordSwipe,
    handleSaveExperience, handleRemoveExperience,
    handleSaveBlend, handleRemoveBlend,
    updateName,
  } = useUser();

  const { isMaestro } = useProgression();

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
        // Capture as "view" demand signal (fire-and-forget, no venue needed)
        captureDemandEvent({
          productId:   rec.id,
          productName: rec.name,
          category:    rec.category,
          flavorNotes: rec.flavorNotes,
          eventType:   "view",
          venueId:     venue.id !== "default" ? venue.id : undefined,
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
    setOrderTaken(true);
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
    setOrderTaken(true);
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
    setPhase("welcome");
    setResults(null);
    setFlavors([]);
    setStrength(3);
    setMood("relaxed");
    setExperienceSaved(false);
    setIsDemoMode(false);
    setOrderTaken(false);
    setFormStep(0);
    setBgKey("welcome");
    setMoodDone(false);
  };

  const cigarBase    = results?.recommendations[0]?.name ?? "";
  const pairingBase  = results?.pairings[0]?.name        ?? "";
  const foodPairings = results?.foodPairings              ?? [];
  const featured     = results?.featured                  ?? [];

  return (
    <div className="min-h-[100dvh] w-full text-foreground flex flex-col relative overflow-hidden" style={{ background: "hsl(22 18% 5%)" }}>
      <DynamicBackground bgKey={bgKey} />

      {/* Experience sidebar — self-positions fixed on lg+ screens */}
      <ExperienceSidebar
        activeStep={activeStep}
        completed={completedSteps}
        values={{ category, flavors, strength, mood } satisfies SidebarValues}
        onReset={phase === "results" ? handleStartOver : undefined}
        onStepClick={(s) => {
          if (phase !== "form") return;
          if (s <= activeStep) goToStep(s as 0|1|2|3);
        }}
      />

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
      <SignatureCigarModal
        isOpen={signatureOpen}
        isMaestro={isMaestro}
        onClose={() => setSignatureOpen(false)}
      />

      {/* Right panel — fixed, only visible on xl when results showing */}
      {phase === "results" && results?.recommendations[0] && (
        <aside
          className="hidden xl:flex flex-col fixed right-0 top-0 bottom-0 overflow-y-auto z-20"
          style={{
            width:          300,
            background:     "rgba(10,8,5,0.78)",
            backdropFilter: "blur(20px) saturate(1.4)",
            WebkitBackdropFilter: "blur(20px) saturate(1.4)",
            borderLeft:     "1px solid rgba(212,175,55,0.09)",
            boxShadow:      "-4px 0 32px rgba(0,0,0,0.5)",
          }}>
          <div className="p-5">
            <ExperienceRightPanel
              product={results.recommendations[0]}
              pairing={results.pairings[0]}
              onOrder={() => setOrderModalOpen(true)}
              onSave={handleSave}
              experienceSaved={experienceSaved}
            />
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 py-10 relative z-10 lg:ml-[260px] xl:pr-[300px] transition-all duration-300">

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
            <div className="flex items-center gap-2 mt-1.5">
              <div className="h-px w-8" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.35))" }} />
              <p className="text-xs font-medium uppercase tracking-[0.32em]" style={{ color: "rgba(212,175,55,0.55)" }}>{venue.tagline}</p>
            </div>
          </motion.div>
          <ProfileBadge profile={profile} onOpenVault={() => setVaultOpen(true)} />
        </div>

        <AnimatePresence mode="wait">

          {/* ── Welcome landing ──────────────── */}
          {phase === "welcome" && (
            <motion.div key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center justify-center flex-1 text-center"
              style={{ minHeight: "60vh", paddingTop: "8vh" }}
            >
              {/* Eyebrow */}
              <motion.p
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.6 }}
                className="uppercase tracking-[0.35em] text-xs mb-6"
                style={{ color: "rgba(212,175,55,0.65)" }}
              >
                Curated for the Connoisseur
              </motion.p>

              {/* Headline */}
              <motion.h2
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.7 }}
                className="font-serif"
                style={{
                  fontSize: "clamp(2rem, 5vw, 3.2rem)",
                  fontWeight: 300,
                  lineHeight: 1.15,
                  letterSpacing: "0.04em",
                  color: "rgba(245,235,221,0.95)",
                  maxWidth: 520,
                  marginBottom: "1.2rem",
                }}
              >
                Your Perfect Cigar &amp;<br />Spirit Awaits
              </motion.h2>

              {/* Subline */}
              <motion.p
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38, duration: 0.6 }}
                style={{
                  color: "rgba(210,190,155,0.62)",
                  fontSize: 15,
                  fontWeight: 400,
                  maxWidth: 380,
                  lineHeight: 1.6,
                  marginBottom: "2.8rem",
                }}
              >
                Tell us your palate, your strength preference, and your mood —
                we'll craft the perfect pairing for this moment.
              </motion.p>

              {/* Gold divider */}
              <motion.div
                initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                transition={{ delay: 0.42, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  height: 1,
                  width: 80,
                  background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.55), transparent)",
                  marginBottom: "2.8rem",
                }}
              />

              {/* Begin CTA */}
              <motion.button
                data-testid="btn-begin-experience"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.55 }}
                onClick={() => { playClick(); setPhase("form"); setBgKey(`experience_${category}`); }}
                whileHover={{
                  scale: 1.03,
                  boxShadow: "0 0 0 1px rgba(212,175,55,0.65), 0 16px 48px rgba(0,0,0,0.55), 0 0 80px rgba(212,175,55,0.22)",
                }}
                whileTap={{ scale: 0.97 }}
                style={{
                  minHeight: 64,
                  minWidth: 280,
                  padding: "0 48px",
                  background: "linear-gradient(135deg, hsl(43 75% 38%), hsl(45 85% 50%), hsl(43 75% 40%))",
                  color: "#1A1410",
                  border: "none",
                  borderRadius: 4,
                  fontFamily: "var(--app-font-serif)",
                  fontSize: 17,
                  fontWeight: 600,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  boxShadow: "0 0 0 1px rgba(212,175,55,0.38), 0 10px 36px rgba(0,0,0,0.45), 0 0 55px rgba(212,175,55,0.12)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <motion.div
                  style={{
                    position: "absolute", inset: 0, pointerEvents: "none",
                    background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.14) 50%, transparent 65%)",
                    backgroundSize: "200% 100%",
                  }}
                  animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
                />
                Begin Your Experience
              </motion.button>

              {/* Secondary: demo link */}
              {venue.features.demoMode && (
                <motion.button
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: 0.75, duration: 0.5 }}
                  onClick={handleTryDemo}
                  style={{
                    marginTop: 18,
                    background: "transparent",
                    border: "none",
                    color: "rgba(180,155,100,0.38)",
                    fontSize: 11,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                  whileHover={{ color: "rgba(212,175,55,0.65)" }}
                >
                  Try 15-Second Demo
                </motion.button>
              )}
            </motion.div>
          )}

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

              {/* ── Swipe-driven step wizard ─────────────────── */}
              <div style={{ position: "relative", overflow: "hidden" }}>
                <AnimatePresence mode="wait" custom={slideDir}>

                  {/* STEP 0 — Experience */}
                  {formStep === 0 && (
                    <motion.div key="step-exp"
                      custom={slideDir} variants={SLIDE_VARIANTS}
                      initial="enter" animate="center" exit="exit"
                      transition={SLIDE_T}
                      style={{ display: "flex", flexDirection: "column", gap: 24 }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <p style={{ color: "rgba(212,175,55,0.65)", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 10 }}>Step 1 of 4</p>
                        <h2 className="font-serif" style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)", color: "rgba(245,235,221,0.94)", fontWeight: 300 }}>Choose Your Experience</h2>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {(["cigar","alcohol"] as const).map((cat) => {
                          const isSel = category === cat;
                          return (
                            <motion.button key={cat}
                              data-testid={`choice-${cat}`}
                              onClick={() => { handleCategoryChange(cat); setBgKey(cat === "cigar" ? "experience_cigar" : "experience_spirits"); playClick(); }}
                              whileTap={{ scale: 0.94 }}
                              style={{
                                minHeight: 170, borderRadius: 20, cursor: "pointer",
                                border: isSel ? "2px solid rgba(184,137,26,0.82)" : "2px solid rgba(184,137,26,0.28)",
                                background: isSel ? "rgba(245,235,221,0.97)" : "rgba(245,235,221,0.11)",
                                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14,
                                boxShadow: isSel ? "0 0 0 3px rgba(212,175,55,0.2), 0 12px 42px rgba(0,0,0,0.38)" : "0 4px 18px rgba(0,0,0,0.25)",
                                transition: "all 0.25s ease",
                              } as React.CSSProperties}
                            >
                              {cat === "cigar"
                                ? <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={isSel ? "#7B5A1E" : "rgba(245,235,221,0.72)"} strokeWidth="1.4" strokeLinecap="round"><line x1="2" y1="13" x2="18" y2="13"/><line x1="18" y1="13" x2="22" y2="9"/><path d="M6 11 Q8 7 12 8 Q16 9 18 13"/></svg>
                                : <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={isSel ? "#7B5A1E" : "rgba(245,235,221,0.72)"} strokeWidth="1.4" strokeLinecap="round"><path d="M8 22h8"/><path d="M12 11v11"/><path d="M5 3l2 8h10l2-8H5z"/></svg>
                              }
                              <span style={{ fontFamily: "var(--app-font-serif)", fontSize: 22, fontWeight: 600, color: isSel ? "#1A1410" : "rgba(245,235,221,0.88)", letterSpacing: "0.07em" }}>
                                {cat === "cigar" ? "Cigar" : "Spirits"}
                              </span>
                              {isSel && <div style={{ width: 36, height: 2, background: "linear-gradient(90deg,transparent,rgba(184,137,26,0.75),transparent)", borderRadius: 1 }} />}
                            </motion.button>
                          );
                        })}
                      </div>

                      <motion.button onClick={() => goToStep(1)}
                        whileHover={{ scale: 1.02, boxShadow: "0 0 0 1px rgba(212,175,55,0.6), 0 14px 44px rgba(0,0,0,0.55)" }}
                        whileTap={{ scale: 0.94 }}
                        style={{
                          minHeight: 64, width: "100%", borderRadius: 6, border: "none", cursor: "pointer",
                          background: "linear-gradient(135deg,hsl(43 75% 40%),hsl(45 85% 52%),hsl(43 75% 42%))",
                          color: "#1A1410", fontFamily: "var(--app-font-serif)", fontSize: 16,
                          fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase",
                          boxShadow: "0 0 0 1px rgba(212,175,55,0.35), 0 10px 36px rgba(0,0,0,0.45)",
                        }}
                      >
                        Continue — Choose Flavors
                      </motion.button>
                    </motion.div>
                  )}

                  {/* STEP 1 — Flavor */}
                  {formStep === 1 && (
                    <motion.div key="step-flavor"
                      custom={slideDir} variants={SLIDE_VARIANTS}
                      initial="enter" animate="center" exit="exit"
                      transition={SLIDE_T}
                      style={{ display: "flex", flexDirection: "column", gap: 24 }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <p style={{ color: "rgba(212,175,55,0.65)", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 10 }}>Step 2 of 4</p>
                        <h2 className="font-serif" style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)", color: "rgba(245,235,221,0.94)", fontWeight: 300 }}>Your Palate</h2>
                        <p style={{ color: "rgba(210,190,155,0.52)", fontSize: 13, marginTop: 6 }}>Swipe right to add · left to skip</p>
                      </div>
                      <SwipeCardDeck
                        items={category === "cigar" ? CIGAR_FLAVORS : SPIRITS_FLAVORS}
                        multiSelect={true}
                        onComplete={(sel) => { setFlavors(sel.map(s => s.charAt(0).toUpperCase() + s.slice(1))); goToStep(2); }}
                        onCardFocus={(id) => setBgKey(`flavor_${id}`)}
                        rightLabel="Add"
                        leftLabel="Skip"
                      />
                      <button onClick={() => goToStep(0)} style={{ background:"transparent", border:"none", color:"rgba(210,190,155,0.4)", fontSize:12, letterSpacing:"0.2em", textTransform:"uppercase", cursor:"pointer", marginTop:44 }}>← Back</button>
                    </motion.div>
                  )}

                  {/* STEP 2 — Strength */}
                  {formStep === 2 && (
                    <motion.div key="step-strength"
                      custom={slideDir} variants={SLIDE_VARIANTS}
                      initial="enter" animate="center" exit="exit"
                      transition={SLIDE_T}
                      style={{ display: "flex", flexDirection: "column", gap: 24 }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <p style={{ color: "rgba(212,175,55,0.65)", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 10 }}>Step 3 of 4</p>
                        <h2 className="font-serif" style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)", color: "rgba(245,235,221,0.94)", fontWeight: 300 }}>Your Strength</h2>
                        <p style={{ color: "rgba(210,190,155,0.52)", fontSize: 13, marginTop: 6 }}>Swipe right to select · left for next</p>
                      </div>
                      <SwipeCardDeck
                        items={STRENGTH_CARDS}
                        multiSelect={false}
                        onComplete={(sel) => { setStrength(sel[0] === "mild" ? 1 : sel[0] === "medium" ? 3 : 5); goToStep(3); }}
                        onCardFocus={(id) => setBgKey(`strength_${id}`)}
                        rightLabel="Select"
                        leftLabel="Next"
                      />
                      <button onClick={() => goToStep(1)} style={{ background:"transparent", border:"none", color:"rgba(210,190,155,0.4)", fontSize:12, letterSpacing:"0.2em", textTransform:"uppercase", cursor:"pointer", marginTop:44 }}>← Back</button>
                    </motion.div>
                  )}

                  {/* STEP 3 — Mood */}
                  {formStep === 3 && (
                    <motion.div key="step-mood"
                      custom={slideDir} variants={SLIDE_VARIANTS}
                      initial="enter" animate="center" exit="exit"
                      transition={SLIDE_T}
                      style={{ display: "flex", flexDirection: "column", gap: 24 }}
                    >
                      {!moodDone ? (
                        <>
                          <div style={{ textAlign: "center" }}>
                            <p style={{ color: "rgba(212,175,55,0.65)", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 10 }}>Step 4 of 4</p>
                            <h2 className="font-serif" style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)", color: "rgba(245,235,221,0.94)", fontWeight: 300 }}>Your Atmosphere</h2>
                            <p style={{ color: "rgba(210,190,155,0.52)", fontSize: 13, marginTop: 6 }}>Swipe right when it resonates</p>
                          </div>
                          <SwipeCardDeck
                            items={MOOD_CARDS}
                            multiSelect={false}
                            onComplete={(sel) => { setMood(sel[0] ?? "relaxed"); setMoodDone(true); setBgKey("results"); }}
                            onCardFocus={(id) => setBgKey(`mood_${id}`)}
                            rightLabel="This is Me"
                            leftLabel="Next"
                          />
                          <button onClick={() => goToStep(2)} style={{ background:"transparent", border:"none", color:"rgba(210,190,155,0.4)", fontSize:12, letterSpacing:"0.2em", textTransform:"uppercase", cursor:"pointer", marginTop:44 }}>← Back</button>
                        </>
                      ) : (
                        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.52, ease: [0.22,1,0.36,1] }}
                          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}
                        >
                          <div style={{ textAlign: "center" }}>
                            <p style={{ color: "rgba(212,175,55,0.72)", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 14 }}>Your experience is taking shape</p>
                            <h2 className="font-serif" style={{ fontSize: "clamp(1.8rem,4vw,2.5rem)", color: "rgba(245,235,221,0.95)", fontWeight: 300 }}>Ready to Reveal</h2>
                          </div>

                          {/* Selection summary tags */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
                            {[
                              category === "cigar" ? "Cigar" : "Spirits",
                              ...flavors.slice(0, 3),
                              strength === 1 ? "Mild" : strength <= 3 ? "Medium" : "Full",
                              mood.charAt(0).toUpperCase() + mood.slice(1),
                            ].filter(Boolean).map(tag => (
                              <span key={tag} style={{ padding: "7px 18px", borderRadius: 20, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.32)", color: "rgba(212,175,55,0.88)", fontSize: 13, letterSpacing: "0.1em", fontWeight: 600 }}>{tag}</span>
                            ))}
                          </div>

                          <div style={{ height: 1, width: 80, background: "linear-gradient(90deg,transparent,rgba(212,175,55,0.48),transparent)" }} />

                          {/* Primary CTA */}
                          <motion.button data-testid="btn-discover" onClick={handleDiscover}
                            whileHover={{ scale: 1.02, boxShadow: "0 0 0 1px rgba(212,175,55,0.62), 0 16px 50px rgba(0,0,0,0.55), 0 0 75px rgba(212,175,55,0.22)" }}
                            whileTap={{ scale: 0.94 }}
                            style={{
                              minHeight: 68, minWidth: 300, padding: "0 44px", borderRadius: 6, border: "none", cursor: "pointer",
                              background: "linear-gradient(135deg,hsl(43 75% 40%),hsl(45 85% 52%),hsl(43 75% 42%))",
                              color: "#1A1410", fontFamily: "var(--app-font-serif)", fontSize: 18,
                              fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase",
                              boxShadow: "0 0 0 1px rgba(212,175,55,0.38), 0 10px 36px rgba(0,0,0,0.45), 0 0 55px rgba(212,175,55,0.1)",
                              position: "relative", overflow: "hidden",
                            }}
                          >
                            <motion.div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.15) 50%,transparent 65%)", backgroundSize:"200% 100%" }}
                              animate={{ backgroundPosition: ["200% 0","-200% 0"] }}
                              transition={{ duration: 3.5, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
                            />
                            Curate My Selection
                          </motion.button>

                          {/* Secondary buttons */}
                          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                            <motion.button data-testid="btn-start-presentation" onClick={startPresentation}
                              whileHover={{ borderColor: "rgba(212,175,55,0.55)", color: "rgba(212,175,55,0.9)" }}
                              whileTap={{ scale: 0.94 }}
                              style={{ padding:"11px 22px", background:"rgba(212,175,55,0.05)", border:"1px solid rgba(212,175,55,0.28)", color:"rgba(212,175,55,0.65)", borderRadius:6, cursor:"pointer", fontSize:11, letterSpacing:"0.22em", textTransform:"uppercase" }}
                            >
                              Guided Tour
                            </motion.button>
                            {venue.features.demoMode && (
                              <motion.button data-testid="btn-try-demo" onClick={handleTryDemo}
                                whileHover={{ color: "rgba(212,175,55,0.65)" }}
                                whileTap={{ scale: 0.94 }}
                                style={{ padding:"11px 22px", background:"transparent", border:"1px dashed rgba(212,175,55,0.2)", color:"rgba(180,155,100,0.4)", borderRadius:6, cursor:"pointer", fontSize:11, letterSpacing:"0.22em", textTransform:"uppercase" }}
                              >
                                Try Demo
                              </motion.button>
                            )}
                          </div>

                          <button onClick={() => setMoodDone(false)} style={{ background:"transparent", border:"none", color:"rgba(210,190,155,0.32)", fontSize:11, letterSpacing:"0.2em", textTransform:"uppercase", cursor:"pointer" }}>← Revisit Atmosphere</button>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* Maestro del Fuego — Signature Cigar CTA */}
              {isMaestro && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.5 }}
                  className="rounded-2xl p-4"
                  style={{
                    background: "linear-gradient(135deg, rgba(212,175,55,0.08), rgba(180,130,30,0.04))",
                    border: "1px solid rgba(212,175,55,0.25)",
                    boxShadow: "0 0 30px rgba(212,175,55,0.06)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Crown size={11} style={{ color: "rgba(212,175,55,0.7)" }} />
                    <span className="text-[8px] uppercase tracking-[0.25em]" style={{ color: "rgba(212,175,55,0.55)" }}>
                      Maestro del Fuego · Exclusive
                    </span>
                  </div>
                  <p className="font-serif text-sm mb-3" style={{ color: "rgba(210,190,155,0.75)", fontWeight: 300 }}>
                    Design your signature cigar and submit for manufacturer fulfillment.
                  </p>
                  <motion.button
                    onClick={() => setSignatureOpen(true)}
                    className="w-full py-2.5 text-xs uppercase tracking-[0.2em] rounded-lg flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, hsl(43 75% 42%), hsl(45 85% 52%))",
                      color: "hsl(22 18% 6%)",
                    }}
                    whileHover={{ scale: 1.01, boxShadow: "0 0 24px rgba(212,175,55,0.2)" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Flame size={12} />Create Your Signature Cigar
                  </motion.button>
                </motion.div>
              )}

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
              <motion.div className="mb-8 text-center"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.32em", textTransform: "uppercase", color: "rgba(212,175,55,0.65)", marginBottom: 8 }}>
                  Step 7 of 7
                  {isDemoMode && <span style={{ marginLeft: 12, color: "rgba(212,175,55,0.50)" }}>· Demo</span>}
                </p>
                <h2 className="font-serif" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)", fontWeight: 700, color: "rgba(245,230,200,0.97)", letterSpacing: "0.04em", lineHeight: 1.1 }}>
                  Your Experience Is Ready
                </h2>
                <p style={{ fontSize: 14, color: "rgba(200,175,135,0.65)", marginTop: 8, letterSpacing: "0.04em" }}>
                  Crafted for your taste. Designed for the moment.
                </p>
              </motion.div>

              <div data-tour="tour-card-stack">
                <CardStack
                  recommendations={results.recommendations}
                  pairings={results.pairings}
                  onComplete={() => {}}
                  onSwipe={handleSwipe}
                  onOrder={() => setOrderModalOpen(true)}
                  onSave={handleSave}
                  experienceSaved={experienceSaved}
                />
              </div>

              {/* Create My Blend — secondary feature, shown below stack if enabled */}
              {venue.features.bandCreator && (
                <motion.div className="flex justify-center mt-6"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.5 }}>
                  <motion.button onClick={() => setBandOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs uppercase tracking-[0.18em]"
                    style={{
                      background: "linear-gradient(135deg, rgba(180,130,30,0.18), rgba(212,175,55,0.09))",
                      border: "1px solid rgba(212,175,55,0.32)",
                      color: "rgba(212,175,55,0.8)",
                    }}
                    whileHover={{ boxShadow: "0 0 22px rgba(212,175,55,0.2)", borderColor: "rgba(212,175,55,0.55)" }}
                    whileTap={{ scale: 0.96 }}
                    data-testid="btn-create-blend">
                    <Flame size={12} />Create My Blend
                  </motion.button>
                </motion.div>
              )}

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

function FormLabel({ title, hint, isElite: _isElite }: { title: string; hint?: string; isElite: boolean }) {
  return (
    <div className="mb-4 flex items-baseline justify-between">
      <h2 className="font-serif" style={{ fontSize: "1.45rem", fontWeight: 700, color: "#1A1410", letterSpacing: "0.02em" }}>
        {title}
      </h2>
      {hint && <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: "#7B5A1E" }}>{hint}</span>}
    </div>
  );
}
