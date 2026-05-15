import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DesignPlayground, {
  hasSeenPlayground, markPlaygroundSeen,
  type PlaygroundConfig,
} from "@/components/DesignPlayground/DesignPlayground";
import CinematicLanding from "@/components/CinematicLanding/CinematicLanding";
import DrawEngineeringScene from "@/components/CinematicLanding/DrawEngineeringScene";
import PinGate from "@/components/CinematicLanding/PinGate";
import PresenceEnvironment from "@/components/CinematicLanding/PresenceEnvironment";
import TerroirArchitecture from "@/components/CinematicLanding/TerroirArchitecture";
import { RitualEngine } from "@/components/CinematicLanding/RitualEngine";
import type { RitualData } from "@/components/CinematicLanding/RitualConfig";
import { useLocation } from "wouter";
import { motion, AnimatePresence, animate, useAnimation } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { CategoryToggle }    from "@/components/CategoryToggle";
import { FlavorChips }       from "@/components/FlavorChips";
import { StrengthSlider }    from "@/components/StrengthSlider";
import { CardStack }         from "@/components/CardStack";
import { PairingsSection }   from "@/components/PairingsSection";
import { FoodSection }       from "@/components/Food/FoodSection";
import { FeaturedSection }   from "@/components/Featured/FeaturedSection";
import { CigarBurnLoader }   from "@/components/CigarBurnLoader";
import { DynamicBackground } from "@/components/DynamicBackground";
import { SwipeCardDeck }     from "@/components/SwipeCardDeck";
import { CigarStructureStep } from "@/components/CigarStructureStep";
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

type Phase = "welcome" | "pin_gate" | "presence" | "terroir" | "ritual" | "form" | "loading" | "ready" | "results" | "draw_engineering";

/* ── Universal slide animation ────────────────────────────────── */
const SLIDE_VARIANTS = {
  enter:  (dir: number) => ({ x: dir > 0 ? "110%" : "-110%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir > 0 ? "-55%"  : "55%",  opacity: 0 }),
};
const SLIDE_T = { duration: 0.42, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] };

/* ── AnimatedCount ─────────────────────────────────────────────────
 * Counts up from 0 → `to` over `durationMs`, starting after `delayMs`.
 * Uses framer-motion's `animate()` driver so it cancels cleanly on
 * unmount (no leaked rAF). Tabular-nums + fixed min-width on the parent
 * span so the digits don't reflow during the count.                   */
function AnimatedCount({
  to, delayMs = 0, durationMs = 1200, className, style,
}: { to: number; delayMs?: number; durationMs?: number; className?: string; style?: React.CSSProperties }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    setValue(0);
    const t = setTimeout(() => {
      const controls = animate(0, to, {
        duration: durationMs / 1000,
        ease: [0.22, 1, 0.36, 1],
        onUpdate: (v) => setValue(Math.round(v)),
      });
      return () => controls.stop();
    }, delayMs);
    return () => clearTimeout(t);
  }, [to, delayMs, durationMs]);
  return <span className={className} style={style}>{value}</span>;
}

/* ── Swipe-deck card data ─────────────────────────────────────────
 * LOCKED-IN imagery: AI-generated, hosted in attached_assets/locked_cards/
 * and bundled by Vite (fingerprinted hashes, never expire).
 *
 * History: previous version pulled from Unsplash by photo-ID. Multiple IDs
 * were silently repurposed by Unsplash over time (most famously, Medium-
 * strength fell through to a giraffe photo — see audit screenshots). The
 * fallback chain masked it but never fixed it. Locking in local assets
 * eliminates that drift entirely. Each image was generated to match its
 * card description AND brand rules (no fruit slices, no animals, no
 * cocktails — dark luxury cigar lounge aesthetic only).                  */
import flavorSmoky    from "@assets/locked_cards/flavor_smoky.png";
import flavorSweet    from "@assets/locked_cards/flavor_sweet.png";
import flavorEarthy   from "@assets/locked_cards/flavor_earthy.png";
import flavorCedar    from "@assets/locked_cards/flavor_cedar.png";
import flavorSpicy    from "@assets/locked_cards/flavor_spicy.png";
import flavorCreamy   from "@assets/locked_cards/flavor_creamy.png";
import flavorNutty    from "@assets/locked_cards/flavor_nutty.png";
import flavorLeather  from "@assets/locked_cards/flavor_leather.png";
import flavorCocoa    from "@assets/locked_cards/flavor_cocoa.png";
import flavorFloral   from "@assets/locked_cards/flavor_floral.png";
import flavorVanilla  from "@assets/locked_cards/flavor_vanilla.png";
import flavorOak      from "@assets/locked_cards/flavor_oak.png";
import flavorCaramel  from "@assets/locked_cards/flavor_caramel.png";
import flavorCitrus   from "@assets/locked_cards/flavor_citrus.png";
import flavorHoney    from "@assets/locked_cards/flavor_honey.png";
import flavorRye      from "@assets/locked_cards/flavor_rye.png";
import flavorSmoke    from "@assets/locked_cards/flavor_smoke.png";
import flavorFruity   from "@assets/locked_cards/flavor_fruity.png";
import strengthMild   from "@assets/locked_cards/strength_mild.png";
import strengthMedium from "@assets/locked_cards/strength_medium.png";
import strengthFull   from "@assets/locked_cards/strength_full.png";
import moodRelaxed     from "@assets/locked_cards/mood_relaxed.png";
import moodBold        from "@assets/locked_cards/mood_bold.png";
import moodSocial      from "@assets/locked_cards/mood_social.png";
import moodReflective  from "@assets/locked_cards/mood_reflective.png";
import moodCelebratory from "@assets/locked_cards/mood_celebratory.png";
import moodFocused     from "@assets/locked_cards/mood_focused.png";
import moodAdventurous from "@assets/locked_cards/mood_adventurous.png";
import moodIntense     from "@assets/locked_cards/mood_intense.png";

const CIGAR_FLAVORS = [
  { id: "smoky",   title: "Smoky",   desc: "Cigar smoke, embers, whiskey haze",        images: [flavorSmoky]   },
  { id: "sweet",   title: "Sweet",   desc: "Honey, brown sugar, light caramel",        images: [flavorSweet]   },
  { id: "earthy",  title: "Earthy",  desc: "Damp soil, forest floor, rich minerals",   images: [flavorEarthy]  },
  { id: "cedar",   title: "Cedar",   desc: "Crisp cedarwood, freshly cut timber",      images: [flavorCedar]   },
  { id: "spicy",   title: "Spicy",   desc: "Black pepper, chili, cinnamon bark",       images: [flavorSpicy]   },
  { id: "creamy",  title: "Creamy",  desc: "Latte foam, vanilla bean, cream swirl",    images: [flavorCreamy]  },
  { id: "nutty",   title: "Nutty",   desc: "Toasted almond, hazelnut, walnut",         images: [flavorNutty]   },
  { id: "leather", title: "Leather", desc: "Aged saddle leather, lounge chair, tobacco", images: [flavorLeather] },
  { id: "cocoa",   title: "Cocoa",   desc: "Cocoa beans, dark chocolate, roasted coffee", images: [flavorCocoa]  },
  { id: "floral",  title: "Floral",  desc: "Dark rose petals, jasmine, herbal leaves", images: [flavorFloral]  },
];
const SPIRITS_FLAVORS = [
  { id: "vanilla", title: "Vanilla", desc: "Soft vanilla bean, sweet cream",           images: [flavorVanilla] },
  { id: "oak",     title: "Oak",     desc: "American oak, toasted wood",               images: [flavorOak]     },
  { id: "caramel", title: "Caramel", desc: "Burnt sugar, rich toffee",                 images: [flavorCaramel] },
  { id: "citrus",  title: "Citrus",  desc: "Orange peel, lemon zest",                  images: [flavorCitrus]  },
  { id: "honey",   title: "Honey",   desc: "Wildflower honey, golden sweetness",       images: [flavorHoney]   },
  { id: "rye",     title: "Rye",     desc: "Spicy rye grain, herbal notes",            images: [flavorRye]     },
  { id: "smoke",   title: "Smoke",   desc: "Peaty smoke, bonfire, mineral",            images: [flavorSmoke]   },
  { id: "fruity",  title: "Fruity",  desc: "Dried fig, tobacco fruit notes",           images: [flavorFruity]  },
];
const STRENGTH_CARDS = [
  { id: "mild",   title: "Mild",   subtitle: "Strength · Level 1",
    desc: "Smooth and gentle — perfect for newcomers or a relaxed afternoon",
    images: [strengthMild] },
  { id: "medium", title: "Medium", subtitle: "Strength · Level 3",
    desc: "Balanced character — the classic refined experience",
    images: [strengthMedium] },
  { id: "full",   title: "Full",   subtitle: "Strength · Level 5",
    desc: "Rich and powerful — bold complexity for the experienced",
    images: [strengthFull] },
];
const MOOD_CARDS = [
  { id: "relaxed",     title: "Relaxed",     desc: "Smooth and easy — perfect for winding down",   image: moodRelaxed },
  { id: "bold",        title: "Bold",        desc: "Strong character — full-bodied and powerful",  image: moodBold },
  { id: "social",      title: "Social",      desc: "Great for sharing and good conversation",      image: moodSocial },
  { id: "reflective",  title: "Reflective",  desc: "Complex and contemplative — a quiet moment",   image: moodReflective },
  { id: "celebratory", title: "Celebratory", desc: "Special occasion — premium and memorable",     image: moodCelebratory },
  { id: "focused",     title: "Focused",     desc: "Clean and clear — helps you stay sharp",       image: moodFocused },
  { id: "adventurous", title: "Adventurous", desc: "Something different — exciting and unique",    image: moodAdventurous },
  { id: "intense",     title: "Intense",     desc: "Rich and commanding — for the experienced",    image: moodIntense },
];

// ── Demo mode preset ──────────────────────────────────────────────────────────
const DEMO: { category: "cigar" | "alcohol"; flavors: string[]; strength: number; mood: string } = {
  category: "cigar",
  flavors:  ["cedar", "leather", "smoky"],
  strength: 3,
  mood:     "relaxed",
};

const SMOKE_PLAYGROUND_CONFIG: PlaygroundConfig = {
  craft: "smoke", craftLabel: "SmokeCraft",
  accent: "#D48B00", accentSoft: "#C49A25",
  tint: "rgba(40,25,5,0.5)",
  background: "/images/cigar.png",
  brandNameLabel: "Brand Name",
  brandNamePlaceholder: "Name your cigar brand…",
  emblemLabel: "Insignia",
  emblemOptions: [
    { id: "crown",    label: "Crown ♛"   },
    { id: "crest",    label: "Crest ❧"   },
    { id: "initials", label: "Initials"  },
    { id: "flame",    label: "Flame 🔥"  },
    { id: "leaf",     label: "Leaf 🌿"   },
  ],
  colorSwatches: [
    { id: "gold",     label: "Gold",     primary: "#2A1F08", accent: "#D48B00" },
    { id: "black",    label: "Onyx",     primary: "#141010", accent: "#8B7355" },
    { id: "burgundy", label: "Burgundy", primary: "#3A0F18", accent: "#C4708A" },
    { id: "navy",     label: "Navy",     primary: "#0F1B35", accent: "#4A8AC4" },
    { id: "forest",   label: "Forest",   primary: "#0F2018", accent: "#6AB87A" },
    { id: "crimson",  label: "Crimson",  primary: "#2A0808", accent: "#C46060" },
    { id: "obsidian", label: "Obsidian", primary: "#060606", accent: "#A0A0A0", locked: true },
    { id: "platinum", label: "Platinum", primary: "#1A1814", accent: "#C8C8C8", locked: true },
  ],
  selectFields: [
    {
      id: "woodTone", label: "Exterior Veneer",
      options: [
        { id: "cedar",    label: "Cedar Burl"      },
        { id: "mahogany", label: "Dark Mahogany"   },
        { id: "walnut",   label: "Macassar Ebony"  },
        { id: "pine",     label: "Maple Burl"      },
        { id: "rosewood", label: "Rosewood"        },
      ],
    },
    {
      id: "interiorColor", label: "Interior Lining",
      options: [
        { id: "crimson", label: "Crimson Velvet" },
        { id: "obsidian", label: "Obsidian Satin" },
        { id: "navy",    label: "Navy Tweed"     },
        { id: "ivory",   label: "Ivory Cream"    },
      ],
    },
    {
      id: "hardware", label: "Metallic Hardware",
      options: [
        { id: "rosegold", label: "Brushed Rose Gold" },
        { id: "platinum", label: "Sovereign Platinum"  },
        { id: "gunmetal", label: "Chrome Gunmetal"   },
      ],
      locked: true,
    },
  ],
  engravingLabel: "Lid Engraving",
  engravingPlaceholder: "Add a personal engraving…",
  engravingLocked: false,
  lockedHint: "Metallic Hardware & Obsidian/Platinum finishes unlock in Signature Studio.",
};

export default function Home() {
  /* Route navigation. Used for the top-left "Back to Experience Hub" button
   * so the SmokeCraft experience page is no longer a dead end — guests can
   * return to the Intro portal selector without falling back on the browser
   * back button. Per 31st brief audit: Intro/Dashboard/BrewCraft/PourCraft/
   * PaymentSuccess/PaymentCancel all already have escape paths via existing
   * `navigate("/")` or `<a href="/">`; Home was the lone gap. */
  const [, navigate] = useLocation();

  const [showPlayground, setShowPlayground] = useState(false);
  const [wasPlayground]                       = useState(showPlayground);
  const contentAnim                           = useAnimation();

  useEffect(() => {
    if (!showPlayground) {
      void contentAnim.start({ opacity: 1, scale: 1, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } });
    }
  }, [showPlayground, contentAnim]);

  const [phase, setPhase]                     = useState<Phase>("welcome");
  const [ritualData, setRitualData]           = useState<RitualData>({});
  const [error, setError]                     = useState<string | null>(null);
  const [results, setResults]                 = useState<RecommendResponse | null>(null);
  const [vaultOpen, setVaultOpen]             = useState(false);
  const [bandOpen, setBandOpen]               = useState(false);
  const [signatureOpen, setSignatureOpen]     = useState(false);
  const [experienceSaved, setExperienceSaved] = useState(false);
  const [isDemoMode, setIsDemoMode]           = useState(false);
  const [orderModalOpen, setOrderModalOpen]   = useState(false);
  /** When the guest taps an upsell card, the order modal opens pre-loaded
   *  with that upgrade product instead of the default top recommendation.
   *  Cleared on modal close so the next tap defaults back to the match. */
  const [upgradeProduct, setUpgradeProduct]   = useState<ProductResult | null>(null);
  const [confirmedOrder, setConfirmedOrder]   = useState<{ id: string; type: OrderType } | null>(null);
  const [requestedItems, setRequestedItems]   = useState<Set<string>>(new Set());

  const [category, setCategory] = useState<"cigar" | "alcohol">("cigar");
  const [flavors, setFlavors]   = useState<string[]>([]);
  const [strength, setStrength] = useState<number>(3);
  const [mood, setMood]         = useState<string>("relaxed");
  /* Cigar Structure (vitola) selections — populated on Structure step
   * (formStep 1, cigar only) and forwarded to the engine via discover().
   * Defaults are sensible and harmless when category === "alcohol" since
   * the server scorer ignores them outside cigar requests. */
  const [cigarShape,   setCigarShape]   = useState<"robusto" | "corona" | "toro" | "churchill" | "torpedo" | "belicoso">("toro");
  const [cigarSession, setCigarSession] = useState<"quick" | "standard" | "extended" | "long">("standard");

  // Step wizard — formStep 0=Experience, 1=Structure (cigar only), 2=Flavor, 3=Strength, 4=Mood
  const [formStep,  setFormStep]  = useState<0|1|2|3|4>(0);
  const [slideDir,  setSlideDir]  = useState<1|-1>(1);
  const [orderTaken, setOrderTaken] = useState(false);
  const [bgKey,      setBgKey]      = useState("welcome");
  const [moodDone,   setMoodDone]   = useState(false);
  const [morphing,   setMorphing]   = useState(false);

  /* Sidebar slot computation. The sidebar exposes 4 abstract form slots
   * (Experience / Flavor / Strength / Mood) plus loading + results slots.
   * The Cigar Structure step (formStep 1) is treated as a sub-state of
   * Experience for the sidebar — it doesn't get its own slot, so the
   * existing 0–6 SidebarStep type stays unchanged. Mapping:
   *   formStep 0 (Experience)        → sidebar 0
   *   formStep 1 (Cigar Structure)   → sidebar 0  (still under Experience)
   *   formStep 2 (Flavor)            → sidebar 1
   *   formStep 3 (Strength)          → sidebar 2
   *   formStep 4 (Mood)              → sidebar 3                              */
  const sidebarFormStep = (formStep <= 1 ? 0 : formStep - 1) as SidebarStep;
  const activeStep: SidebarStep =
    phase === "loading" ? 4 :
    phase === "results" ? (orderTaken ? 6 : 5) :
    sidebarFormStep;
  const completedSteps = new Set<number>(
    Array.from({ length: activeStep }, (_, i) => i),
  );

  // ── Sensory layer: cached AudioContext + three layered tones ─────
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const audioBrokenRef = useRef(false);
  const getCtx = useCallback((): AudioContext | null => {
    if (audioBrokenRef.current) return null;
    try {
      if (!audioCtxRef.current) {
        const ACtx = window.AudioContext ?? (window as unknown as Record<string, typeof AudioContext>)["webkitAudioContext"];
        if (!ACtx) { audioBrokenRef.current = true; return null; }
        audioCtxRef.current = new ACtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === "suspended") {
        try { void ctx.resume(); } catch { /* ignore */ }
      }
      return ctx;
    } catch { audioBrokenRef.current = true; return null; }
  }, []);
  const playTone = useCallback((f0: number, f1: number, dur: number, peak = 0.05, type: OscillatorType = "sine") => {
    const ctx = getCtx();
    if (!ctx) return;
    try {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(f0, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(f1, ctx.currentTime + dur);
      gain.gain.setValueAtTime(peak, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + dur);
    } catch { audioBrokenRef.current = true; }
  }, [getCtx]);
  // Soft high tick — used for navigation/back/sidebar
  const playClick  = useCallback(() => playTone(1100, 550, 0.09, 0.055, "sine"),    [playTone]);
  // Deeper warm tap — used for hard selections
  const playSelect = useCallback(() => playTone(720,  360, 0.13, 0.07,  "triangle"),[playTone]);
  // Two-note rising chime — used to confirm step completion
  const playChime  = useCallback(() => {
    playTone(660, 880,  0.18, 0.06, "sine");
    setTimeout(() => playTone(880, 1320, 0.22, 0.05, "sine"), 90);
  }, [playTone]);

  // Idle attractor — shows "Touch to begin" hint after 6s on welcome
  const [showIdleHint, setShowIdleHint] = useState(false);
  useEffect(() => {
    setShowIdleHint(false);
    const t = setTimeout(() => setShowIdleHint(true), 6000);
    return () => clearTimeout(t);
  }, []);

  // Coach toast — momentary confirmation after each step
  const [coachMsg, setCoachMsg] = useState<string | null>(null);
  const coachTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showCoach = useCallback((msg: string) => {
    if (coachTimerRef.current) clearTimeout(coachTimerRef.current);
    setCoachMsg(msg);
    coachTimerRef.current = setTimeout(() => setCoachMsg(null), 1900);
  }, []);

  // ── Blend scoring (deterministic from selections) ────────────────
  const blendScore = useMemo(() => {
    let s = 72;
    s += Math.min(flavors.length, 5) * 3;
    s += Math.min(strength, 5) * 1.5;
    if (mood) s += 4;
    if (category === "cigar") s += 1.5;
    return Math.min(98, Math.round(s));
  }, [flavors.length, strength, mood, category]);

  const subScores = useMemo(() => {
    const has = (k: string) => flavors.some((f) => f.toLowerCase().includes(k));
    const clamp = (n: number) => Math.max(60, Math.min(99, Math.round(n)));
    return {
      smoothness: clamp(64 + (5 - strength) * 4 + (has("creamy") ? 8 : 0) + (has("sweet") ? 6 : 0) + (has("vanilla") ? 6 : 0)),
      boldness:   clamp(58 + strength * 6 + (has("smoky") ? 8 : 0) + (has("spicy") || has("pepper") ? 8 : 0) + (has("oak") ? 4 : 0)),
      balance:    clamp(72 + Math.min(flavors.length, 4) * 4 + (mood ? 4 : 0)),
    };
  }, [flavors, strength, mood]);

  const comparisonPct = useMemo(() => Math.max(3, 100 - blendScore + 5), [blendScore]);

  const personalizedTags = useMemo(() => {
    const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
    const out: string[] = [];
    if (flavors[0]) out.push(cap(flavors[0]));
    if (flavors[1]) out.push(cap(flavors[1]));
    out.push(strength <= 2 ? "Smooth" : strength >= 4 ? "Bold" : "Medium");
    if (mood) out.push(cap(mood));
    return out.slice(0, 4);
  }, [flavors, strength, mood]);

  // ── Progression meter ────────────────────────────────────────────
  const blendProgress = useMemo(() => {
    if (phase === "welcome") return 0;
    if (phase === "results") return 100;
    if (phase === "ready")   return 99;
    if (phase === "loading") return 96;
    if (moodDone)            return 92;
    return 20 + formStep * 18;
  }, [phase, formStep, moodDone]);

  const blendStatus = useMemo(() => {
    if (blendProgress < 30)  return "Choose your direction";
    if (blendProgress < 50)  return "Strong profile developing";
    if (blendProgress < 70)  return "Balanced pairing detected";
    if (blendProgress < 90)  return "Premium blend in progress";
    if (blendProgress < 100) return "Your blend is ready";
    return "Reveal complete";
  }, [blendProgress]);

  const goToStep = useCallback((step: 0|1|2|3|4) => {
    const forward = step > formStep;
    if (forward) playChime(); else playClick();
    setSlideDir(forward ? 1 : -1);
    setFormStep(step);
    const defaults: Record<number, string> = {
      0: `experience_${category}`,
      1: "experience_cigar",   // Structure step lives inside the cigar atmosphere
      2: "flavor_smoky",
      3: "strength_mild",
      4: "mood_relaxed",
    };
    setBgKey(defaults[step] ?? "default");
    if (step < 4) setMoodDone(false);
    if (forward) {
      /* Coach lines indexed by the step we just ARRIVED at. Index 0 unused
       * (we never go to step 0 forward). Cigar inserts a Structure line at
       * index 1; alcohol skips that index entirely (never enters step 1). */
      const lines = [
        "Good choice — let's begin",
        "Pick the cigar shape that fits your night",
        "Now choose your palate",
        "Excellent — building your experience",
        "Perfect — ready to reveal",
      ];
      showCoach(lines[Math.min(step, lines.length - 1)]);
    }
  }, [formStep, playClick, playChime, category, showCoach]);

  const {
    profile, isElite, justUnlockedElite, clearEliteUnlock,
    recordSession, recordSwipe, recordBlend,
    handleSaveExperience, handleRemoveExperience,
    handleSaveBlend, handleRemoveBlend,
    updateName, updateCigarProfile,
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
    /* Vitola intelligence — only forwarded to the engine on cigar requests
     * so the alcohol flow stays untouched. Server scorer applies a bounded
     * boost to products whose name contains the requested shape.            */
    cigarShape?:   "robusto" | "corona" | "toro" | "churchill" | "torpedo" | "belicoso";
    cigarSession?: "quick" | "standard" | "extended" | "long";
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
        ...(params.category === "cigar" && params.cigarShape ? {
          cigarShape:   params.cigarShape,
          cigarSession: params.cigarSession,
        } : {}),
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
    discover({
      category, flavors, strength, mood,
      ...(category === "cigar" ? { cigarShape, cigarSession } : {}),
    });
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
    if (results) setPhase("ready"); // hold at locked reveal gate
  };

  /* "Beat Your Last Score" — captured at reveal time so the badge holds the
   * value the user just walked into the reveal with. We snapshot previousBest
   * BEFORE recordBlend persists the new high (otherwise the comparison would
   * always tie itself).                                                      */
  const [revealBest,      setRevealBest]      = useState(0);
  const [revealIsNewBest, setRevealIsNewBest] = useState(false);

  const handleReveal = useCallback(() => {
    /* Cinematic build-up — the previous timing (620 ms) made guests miss
     * their own reveal. Now: a held low tone, a mid swell, the chime, then
     * the phase swap ~1.25 s in so the locked gate has time to "exhale"
     * and the eye is primed for the unfolding sequence on the results screen.
     */
    playTone(220, 700, 0.40, 0.05, "sine");
    setTimeout(() => playTone(440, 480, 0.32, 0.04, "sine"), 380);
    setTimeout(() => playChime(),                              900);
    setTimeout(() => {
      const { previousBest, isNewBest } = recordBlend(blendScore);
      setRevealBest(previousBest);
      setRevealIsNewBest(isNewBest);
      setPhase("results");
      recordSession();
    }, 1250);
  }, [playTone, playChime, recordSession, recordBlend, blendScore]);

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
      {/* Pre-craft Design Playground — full-screen fixed overlay, shown once per session */}
      <AnimatePresence>
        {showPlayground && (
          <DesignPlayground
            craft="smoke"
            config={SMOKE_PLAYGROUND_CONFIG}
            onComplete={() => {
              markPlaygroundSeen("smoke");
              setShowPlayground(false);
              setPhase("pin_gate");
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Scene 1 + 2: Cinematic Landing — full-screen obsidian overlay ── */}
      <AnimatePresence>
        {phase === "welcome" && !showPlayground && (
          <CinematicLanding
            key="cinematic-landing"
            onActivate={() => {
              playClick();
              setBgKey(`experience_${category}`);
              if (!hasSeenPlayground("smoke")) {
                setShowPlayground(true);
              } else {
                setPhase("pin_gate");
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Stage 2: Sovereign PIN Gate ─────────────────────────────── */}
      <AnimatePresence>
        {phase === "pin_gate" && (
          <PinGate
            key="pin-gate"
            onSuccess={() => setPhase("presence")}
          />
        )}
      </AnimatePresence>

      {/* ── Stage 2.5: NOVEE OS Presence Environment — E.A.T. Interface ── */}
      <AnimatePresence>
        {phase === "presence" && (
          <PresenceEnvironment
            key="presence-environment"
            onComplete={() => {
              setMorphing(true);
              setTimeout(() => setPhase("terroir"), 460);
              setTimeout(() => setMorphing(false), 980);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Material Morph Overlay — hardware-accelerated obsidian bridge ──
           GPU-composited: only transform + opacity are mutated.
           Expands from the center glass panel outward, holds, then dissolves
           into the Terroir phase — creating a single continuous material object
           rather than a page cut.                                              */}
      <AnimatePresence>
        {morphing && (
          <motion.div
            key="morph-overlay"
            initial={{ opacity: 0, scale: 0.62 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "fixed", inset: 0, zIndex: 175,
              background: "rgba(10,8,6,0.98)",
              backdropFilter: "blur(40px) saturate(0.4)",
              WebkitBackdropFilter: "blur(40px) saturate(0.4)",
              willChange: "transform, opacity",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {/* 135° amber/bronze chrome border */}
            <div style={{
              position: "absolute", inset: 0,
              border: "1px solid transparent",
              background: "linear-gradient(rgba(10,8,6,0.98), rgba(10,8,6,0.98)) padding-box, linear-gradient(135deg, rgba(212,175,55,0.5) 0%, rgba(80,60,15,0.08) 50%, rgba(212,175,55,0.45) 100%) border-box",
              pointerEvents: "none",
            }} />
            {/* amber pulse core */}
            <motion.div
              animate={{ scale: [1, 1.12, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.52, ease: "easeInOut" }}
              style={{
                width: 3, height: 3, borderRadius: "50%",
                background: "rgba(212,175,55,0.95)",
                boxShadow: "0 0 100px 50px rgba(212,175,55,0.12), 0 0 40px 18px rgba(212,175,55,0.22)",
                willChange: "transform, opacity",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stage 3: Terroir Architecture — Session 01 / Step 1 of 14 ── */}
      <AnimatePresence>
        {phase === "terroir" && (
          <TerroirArchitecture
            key="terroir-architecture"
            onComplete={() => {
              setMorphing(true);
              setTimeout(() => setPhase("ritual"), 460);
              setTimeout(() => setMorphing(false), 980);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Sessions 02–07: Sovereign Ritual Engine — Steps 2–7 / 14 ── */}
      <AnimatePresence>
        {phase === "ritual" && (
          <RitualEngine
            key="ritual-engine"
            onComplete={(data) => {
              setRitualData(data);
              setMorphing(true);
              setTimeout(() => setPhase("form"), 460);
              setTimeout(() => setMorphing(false), 980);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Session 08: Engineering of the Draw — Step 8 / 14 ────────── */}
      <AnimatePresence>
        {phase === "draw_engineering" && (
          <DrawEngineeringScene
            key="draw-engineering"
            onComplete={() => setPhase("results")}
            onExit={() => setPhase("results")}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={wasPlayground ? { opacity: 0.88, scale: 0.97 } : false}
        animate={contentAnim}
        style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
      >
      <DynamicBackground bgKey={bgKey} />

      {/* Kiosk picture-frame overlay — decorative gold border on lg+ */}
      <div
        aria-hidden
        className="hidden lg:block"
        style={{
          position: "fixed", inset: 14, pointerEvents: "none", zIndex: 100,
          borderRadius: 18,
          border: "1px solid rgba(212,139,0,0.22)",
          boxShadow:
            "inset 0 0 80px rgba(26,26,27,0.22), 0 0 0 14px #000, 0 0 60px rgba(212,139,0,0.06)",
        }}
      />

      {/* Progression meter — visible throughout buildup */}
      {(phase === "form" || phase === "loading" || phase === "ready") && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 55,
            pointerEvents: "none",
            padding: "12px 20px 10px",
            background: "linear-gradient(180deg, rgba(26,26,27,0.18) 0%, transparent 100%)",
          }}
        >
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
              <span style={{ fontSize: 9, color: "rgba(212,139,0,0.7)", letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 600 }}>
                {blendStatus}
              </span>
              <span style={{ fontSize: 10, color: "rgba(212,139,0,0.6)", letterSpacing: "0.18em", fontWeight: 600 }}>
                {blendProgress}%
              </span>
            </div>
            <div style={{ height: 3, borderRadius: 999, background: "rgba(212,139,0,0.12)", overflow: "hidden" }}>
              <motion.div
                animate={{ width: `${blendProgress}%` }}
                transition={{ duration: 0.6, ease: [0.22,1,0.36,1] }}
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg, rgba(212,139,0,0.7), rgba(245,205,90,0.95))",
                  boxShadow: "0 0 12px rgba(212,139,0,0.45)",
                }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Coach toast — fades in for 1.9s after each step completion */}
      <AnimatePresence>
        {coachMsg && (
          <motion.div
            key={coachMsg}
            initial={{ opacity: 0, y: -18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,   scale: 1    }}
            exit={{    opacity: 0, y: -14, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.22,1,0.36,1] }}
            style={{
              position: "fixed", top: 28, left: "50%",
              transform: "translateX(-50%)",
              zIndex: 60,
              background: "rgba(28,18,8,0.88)",
              border: "1px solid rgba(212,139,0,0.45)",
              color: "rgba(212,139,0,0.94)",
              padding: "11px 26px",
              borderRadius: 999,
              fontFamily: "var(--app-font-serif)",
              fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 500,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "0 10px 38px rgba(26,26,27,0.22), 0 0 50px rgba(212,139,0,0.18)",
              pointerEvents: "none",
              maxWidth: "calc(100vw - 40px)",
              textAlign: "center",
            }}
          >
            {coachMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Experience sidebar — self-positions fixed on lg+ screens */}
      <ExperienceSidebar
        activeStep={activeStep}
        completed={completedSteps}
        values={{ category, flavors, strength, mood } satisfies SidebarValues}
        onReset={phase === "results" ? handleStartOver : undefined}
        onStepClick={(s) => {
          if (phase !== "form") return;
          if (s <= activeStep) {
            // Sidebar uses 4 abstract steps (Experience/Flavor/Strength/Mood);
            // formStep has 5 with Structure inserted at index 1 (cigar only).
            // Reverse map: sidebar 0→0, 1→2, 2→3, 3→4. Never route Flavor→Structure.
            const formIdx = (s === 0 ? 0 : s + 1) as 0|1|2|3|4;
            goToStep(formIdx);
          }
        }}
      />

      {/* Elite ambient overlay */}
      {isElite && (
        <div className="fixed inset-0 pointer-events-none z-0"
          style={{ background: "radial-gradient(ellipse 100% 60% at 50% 0%, rgba(212,139,0,0.04) 0%, transparent 60%)" }} />
      )}

      {/* Offline + Install banners */}
      <OfflineBanner isOnline={isOnline} />
      <InstallBanner />

      {/* Top-left back-to-Hub button — fixed across all phases so the
          SmokeCraft experience is never a dead end. zIndex 60 keeps it
          above the locked-reveal gate (z=50) so guests can always exit.
          Styled to the dark/gold SmokeCraft palette rather than the
          olive/navy Profound Innovation palette (this is the SmokeCraft
          experience surface, not the entry portal). */}
      <button
        type="button"
        onClick={() => navigate("/")}
        data-testid="home-back-to-hub"
        aria-label="Back to Experience Hub"
        style={{
          position: "fixed", top: 18, left: 18, zIndex: 60,
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "9px 14px",
          background: "rgba(20,14,8,0.78)",
          color: "rgba(235,215,175,0.92)",
          border: "1px solid rgba(212,139,0,0.28)",
          borderRadius: 999,
          fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase",
          cursor: "pointer",
          backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
          boxShadow: "0 6px 24px rgba(26,26,27,0.14)",
          transition: "transform 250ms ease, opacity 250ms ease, border-color 250ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.borderColor = "rgba(212,139,0,0.55)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.borderColor = "rgba(212,139,0,0.28)";
        }}
      >
        <ArrowLeft size={12} />
        Experience Hub
      </button>

      <AnimatePresence>
        {phase === "loading" && <CigarBurnLoader onComplete={handleBurnComplete} />}
      </AnimatePresence>

      {/* ── Locked Reveal Gate ────────────────────────────────────── */}
      <AnimatePresence>
        {phase === "ready" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            style={{
              position: "fixed", inset: 0, zIndex: 50,
              display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
              background: "radial-gradient(ellipse at 50% 40%, rgba(60,30,8,0.5) 0%, rgba(0,0,0,0.86) 70%)",
              backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
            }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 22 }} animate={{ scale: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22,1,0.36,1] }}
              style={{
                position: "relative", maxWidth: 440, width: "100%",
                padding: "44px 32px 38px", borderRadius: 24,
                background: "rgba(20,14,8,0.9)",
                border: "1px solid rgba(212,139,0,0.32)",
                boxShadow: "0 30px 90px rgba(26,26,27,0.32), 0 0 80px rgba(212,139,0,0.16)",
                textAlign: "center",
              }}
            >
              {/* Blurred floating preview disc */}
              <motion.div
                animate={{ y: [0, -7, 0], rotate: [0, 1.6, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  width: 150, height: 150, borderRadius: "50%", margin: "0 auto 26px",
                  background: "radial-gradient(circle at 32% 30%, rgba(245,210,110,0.65), rgba(150,90,30,0.5) 45%, rgba(40,22,10,0.88))",
                  filter: "blur(7px)",
                  boxShadow: "0 0 70px rgba(212,139,0,0.32), inset 0 0 30px rgba(255,200,100,0.2)",
                }}
              />
              <p style={{ color: "rgba(212,139,0,0.7)", fontSize: 11, letterSpacing: "0.32em", textTransform: "uppercase", marginBottom: 12 }}>
                Crafted &amp; Locked
              </p>
              <h2 className="font-serif" style={{ fontSize: "clamp(1.7rem, 5vw, 2.3rem)", color: "rgba(245,235,221,0.96)", fontWeight: 300, marginBottom: 10, letterSpacing: "0.04em" }}>
                Your Blend is Ready
              </h2>
              <p style={{ color: "rgba(210,190,155,0.55)", fontSize: 13, marginBottom: 30, lineHeight: 1.55 }}>
                A {comparisonPct <= 20 ? "rare" : "refined"} pairing, scored against thousands of profiles.
              </p>
              <motion.button
                onClick={handleReveal}
                data-testid="btn-reveal"
                whileHover={{ scale: 1.02, boxShadow: "0 0 0 1px rgba(212,139,0,0.7), 0 18px 50px rgba(26,26,27,0.26), 0 0 80px rgba(212,139,0,0.32)" }}
                whileTap={{ scale: 0.95 }}
                style={{
                  minHeight: 64, padding: "0 40px", borderRadius: 6, border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg,hsl(43 75% 40%),hsl(45 85% 52%),hsl(43 75% 42%))",
                  color: "#1A1410", fontFamily: "var(--app-font-serif)",
                  fontSize: 16, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase",
                  boxShadow: "0 0 0 1px rgba(212,139,0,0.4), 0 12px 36px rgba(26,26,27,0.18), 0 0 60px rgba(212,139,0,0.2)",
                }}
              >
                Reveal My Blend
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {justUnlockedElite && <EliteUnlockAnimation onComplete={clearEliteUnlock} />}
      </AnimatePresence>

      <AnimatePresence>
        {orderModalOpen && (
          <OrderModal
            isOpen={orderModalOpen}
            cigar={upgradeProduct ?? results?.recommendations[0]}
            drink={results?.pairings[0]}
            food={results?.foodPairings[0]}
            craftType={category === "cigar" ? "smoke" : "pour"}
            onClose={() => { setOrderModalOpen(false); setUpgradeProduct(null); }}
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
            width:          320,                                        /* widened 300→320 for larger panel content */
            background:     "rgba(20,15,10,0.85)",                       /* lightened per UX brief */
            backdropFilter: "blur(20px) saturate(1.4)",
            WebkitBackdropFilter: "blur(20px) saturate(1.4)",
            borderLeft:     "1px solid rgba(212,139,0,0.18)",
            boxShadow:      "-6px 0 36px rgba(26,26,27,0.22)",
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
              <div className="h-px w-8" style={{ background: "linear-gradient(90deg, transparent, rgba(212,139,0,0.35))" }} />
              <p className="text-xs font-medium uppercase tracking-[0.32em]" style={{ color: "rgba(212,139,0,0.55)" }}>{venue.tagline}</p>
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
                style={{ color: "rgba(212,139,0,0.65)" }}
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
                  background: "linear-gradient(90deg, transparent, rgba(212,139,0,0.55), transparent)",
                  marginBottom: "2.8rem",
                }}
              />

              {/* Begin CTA */}
              <motion.button
                data-testid="btn-begin-experience"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.55 }}
                onClick={() => {
                  playClick();
                  setBgKey(`experience_${category}`);
                  if (!hasSeenPlayground("smoke")) {
                    setShowPlayground(true);
                  } else {
                    setPhase("pin_gate");
                  }
                }}
                whileHover={{
                  scale: 1.03,
                  boxShadow: "0 0 0 1px rgba(212,139,0,0.65), 0 16px 48px rgba(26,26,27,0.22), 0 0 80px rgba(212,139,0,0.22)",
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
                  boxShadow: "0 0 0 1px rgba(212,139,0,0.38), 0 10px 36px rgba(26,26,27,0.14), 0 0 55px rgba(212,139,0,0.12)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <motion.div
                  style={{
                    position: "absolute", inset: 0, pointerEvents: "none",
                    background: "linear-gradient(105deg, transparent 35%, rgba(26,26,27,0.16) 50%, transparent 65%)",
                    backgroundSize: "200% 100%",
                  }}
                  animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
                />
                Begin Your Experience
              </motion.button>

              {/* Idle attractor — appears after 6s of inactivity */}
              <AnimatePresence>
                {showIdleHint && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: [0, 0.85, 0.5, 0.85], y: 0 }}
                    exit={{    opacity: 0, y: 4 }}
                    transition={{ opacity: { duration: 3.4, repeat: Infinity, ease: "easeInOut" }, y: { duration: 0.6 } }}
                    style={{
                      marginTop: 14, textAlign: "center",
                      color: "rgba(212,139,0,0.7)",
                      fontSize: 11, letterSpacing: "0.32em", textTransform: "uppercase", fontWeight: 600,
                    }}
                  >
                    Touch to begin your experience
                  </motion.p>
                )}
              </AnimatePresence>

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
                    color: "rgba(107,94,78,0.38)",
                    fontSize: 11,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                  whileHover={{ color: "rgba(212,139,0,0.65)" }}
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
                        <p style={{ color: "rgba(212,139,0,0.65)", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 10 }}>Step 1 of {category === "cigar" ? 5 : 4}</p>
                        <h2 className="font-serif" style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)", color: "rgba(245,235,221,0.94)", fontWeight: 300 }}>Choose Your Experience</h2>
                      </div>

                      {/* ── Choose Your Experience: full-bleed image cards ──
                          Real luxury photography (cigar / whiskey on dark wood),
                          glass-wrapped, dominant on screen. Selected card gets
                          a gold border + soft pulse; the other dims to 0.55. */}
                      {(() => {
                        /* Each card holds an `images` chain — first URL is
                         * preferred, the rest are fallbacks if the primary
                         * 404s or is rate-limited (the previous cigar URL
                         * silently failed for some guests, leaving an empty
                         * card). The <img> element fires onError to advance
                         * through the chain. */
                        const CARDS = [
                          {
                            cat:      "cigar"   as const,
                            title:    "Cigar",
                            subtitle: "Handcrafted. Bold. Timeless.",
                            /* IMPORTANT: this card has rotted before — prior
                             * Unsplash IDs in the chain stopped resolving to
                             * cigars (one fell through to a VR-goggles photo
                             * on the kiosk). All three URLs below have been
                             * visually verified to render cigar / humidor
                             * content. Do NOT swap to new IDs without opening
                             * the URL and confirming the rendered image. */
                            images: [
                              "https://images.pexels.com/photos/1637114/pexels-photo-1637114.jpeg?auto=compress&cs=tinysrgb&w=1400",
                              "https://images.pexels.com/photos/14017014/pexels-photo-14017014.jpeg?auto=compress&cs=tinysrgb&w=1400",
                              "https://images.pexels.com/photos/6713596/pexels-photo-6713596.jpeg?auto=compress&cs=tinysrgb&w=1400",
                            ],
                          },
                          {
                            cat:      "alcohol" as const,
                            title:    "Spirits",
                            subtitle: "Smooth. Refined. Complex.",
                            images: [
                              "https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=1400&q=75",
                              "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1400&q=75",
                            ],
                          },
                        ];
                        const anySelected = CARDS.some((c) => category === c.cat);
                        return (
                          <div style={{
                            display: "grid", gridTemplateColumns: "1fr 1fr",
                            gap: 28, maxWidth: 880, margin: "0 auto", width: "100%",
                          }}>
                            {CARDS.map((c) => {
                              const isSel = category === c.cat;
                              const dim   = anySelected && !isSel;
                              return (
                                <motion.button
                                  key={c.cat}
                                  data-testid={`choice-${c.cat}`}
                                  onClick={() => {
                                    handleCategoryChange(c.cat);
                                    setBgKey(c.cat === "cigar" ? "experience_cigar" : "experience_spirits");
                                    playSelect();
                                  }}
                                  initial={{ opacity: 0, y: 18 }}
                                  animate={{
                                    opacity: dim ? 0.55 : 1,
                                    y:       0,
                                    scale:   isSel ? [1, 1.025, 1] : 1,
                                  }}
                                  transition={isSel
                                    ? { scale: { duration: 2.6, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.35 } }
                                    : { duration: 0.35 }
                                  }
                                  whileHover={{ scale: 1.03, boxShadow: "0 0 36px rgba(212,139,0,0.45), 0 18px 48px rgba(26,26,27,0.22)" }}
                                  whileTap={{   scale: 0.97 }}
                                  className="group"
                                  style={{
                                    position: "relative",
                                    height: "min(48vh, 360px)",
                                    minHeight: 280,
                                    borderRadius: 22,
                                    overflow: "hidden",
                                    cursor: "pointer",
                                    border: isSel
                                      ? "2px solid rgba(212,139,0,0.85)"
                                      : "1px solid rgba(212,139,0,0.25)",
                                    background: "rgba(26,26,27,0.07)",
                                    backdropFilter: "blur(12px)",
                                    WebkitBackdropFilter: "blur(12px)",
                                    boxShadow: isSel
                                      ? "0 0 0 4px rgba(212,139,0,0.18), 0 0 38px rgba(212,139,0,0.42), 0 18px 50px rgba(26,26,27,0.22)"
                                      : "0 8px 28px rgba(26,26,27,0.10)",
                                    appearance: "none",
                                    padding: 0,
                                  }}
                                >
                                  {/* Image layer — real <img> so we can detect
                                      load failures and fall back through the
                                      chain. Tinted dark-warm placeholder behind
                                      so empty cards never appear during load. */}
                                  <div
                                    style={{
                                      position: "absolute", inset: 0,
                                      background: c.cat === "cigar"
                                        ? "linear-gradient(135deg, #2a1608 0%, #4a2410 60%, #1a0d04 100%)"
                                        : "linear-gradient(135deg, #2a1c08 0%, #4a3010 60%, #1a1004 100%)",
                                      overflow: "hidden",
                                    }}
                                  >
                                    <img
                                      src={c.images[0]}
                                      alt=""
                                      loading="eager"
                                      onError={(e) => {
                                        const img  = e.currentTarget;
                                        const tried = Number(img.dataset.idx ?? 0);
                                        const next  = tried + 1;
                                        if (next < c.images.length) {
                                          img.dataset.idx = String(next);
                                          img.src = c.images[next];
                                        }
                                      }}
                                      style={{
                                        width: "100%", height: "100%",
                                        objectFit: "cover", objectPosition: "center",
                                        transition: "transform 0.6s ease, filter 0.4s ease",
                                        filter: isSel ? "brightness(1.08) saturate(1.08)" : "brightness(0.92) saturate(0.95)",
                                      }}
                                      className="group-hover:scale-110"
                                    />
                                  </div>
                                  {/* Dark gradient overlay (bottom 60% black per brief) */}
                                  <div
                                    style={{
                                      position: "absolute", inset: 0,
                                      background: isSel
                                        ? "linear-gradient(180deg, rgba(26,26,27,0.02) 0%, rgba(26,26,27,0.04) 40%, rgba(15,8,2,0.78) 100%)"
                                        : "linear-gradient(180deg, rgba(26,26,27,0.03) 0%, rgba(26,26,27,0.07) 40%, rgba(26,26,27,0.38) 100%)",
                                      transition: "background 0.4s ease",
                                    }}
                                  />
                                  {/* Selected gold corner mark */}
                                  {isSel && (
                                    <div style={{
                                      position: "absolute", top: 16, right: 16,
                                      width: 12, height: 12, borderRadius: 999,
                                      background: "linear-gradient(135deg, #b07c14, #D48B00)",
                                      boxShadow: "0 0 16px rgba(212,139,0,0.85)",
                                    }} />
                                  )}
                                  {/* Title + subtitle */}
                                  <div style={{
                                    position: "absolute", left: 0, right: 0, bottom: 0,
                                    padding: "22px 26px 26px",
                                    textAlign: "left",
                                  }}>
                                    <h3 className="font-serif" style={{
                                      fontSize: "clamp(1.85rem, 4.2vw, 2.5rem)",  /* ~30–40 px */
                                      fontWeight: 500,
                                      color: "#F5E6C8",
                                      letterSpacing: "0.03em",
                                      textShadow: "0 2px 12px rgba(26,26,27,0.45)",
                                      marginBottom: 6,
                                      lineHeight: 1.05,
                                    }}>
                                      {c.title}
                                    </h3>
                                    <p style={{
                                      fontSize: 15, fontWeight: 500,
                                      color: "rgba(232,212,172,0.92)",
                                      letterSpacing: "0.10em",
                                      textTransform: "uppercase",
                                      textShadow: "0 1px 8px rgba(26,26,27,0.45)",
                                    }}>
                                      {c.subtitle}
                                    </p>
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>
                        );
                      })()}

                      <motion.button
                        onClick={() => goToStep(category === "cigar" ? 1 : 2)}
                        whileHover={{ scale: 1.02, boxShadow: "0 0 0 1px rgba(212,139,0,0.6), 0 14px 44px rgba(26,26,27,0.22)" }}
                        whileTap={{ scale: 0.94 }}
                        style={{
                          minHeight: 64, width: "100%", borderRadius: 6, border: "none", cursor: "pointer",
                          background: "linear-gradient(135deg,hsl(43 75% 40%),hsl(45 85% 52%),hsl(43 75% 42%))",
                          color: "#1A1410", fontFamily: "var(--app-font-serif)", fontSize: 16,
                          fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase",
                          boxShadow: "0 0 0 1px rgba(212,139,0,0.35), 0 10px 36px rgba(26,26,27,0.14)",
                        }}
                      >
                        {category === "cigar" ? "Continue — Cigar Structure" : "Continue — Choose Flavors"}
                      </motion.button>
                    </motion.div>
                  )}

                  {/* STEP 1 — Cigar Structure (vitola + session length, cigar flow only).
                      Alcohol flow skips this step entirely; goToStep(2) is dispatched from
                      step 0's Continue button when category === "alcohol". */}
                  {formStep === 1 && category === "cigar" && (
                    <motion.div key="step-structure"
                      custom={slideDir} variants={SLIDE_VARIANTS}
                      initial="enter" animate="center" exit="exit"
                      transition={SLIDE_T}
                      style={{ display: "flex", flexDirection: "column", gap: 24 }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <p style={{ color: "rgba(212,139,0,0.65)", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 10 }}>Step 2 of 5</p>
                        <h2 className="font-serif" style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)", color: "rgba(245,235,221,0.94)", fontWeight: 300 }}>Cigar Structure</h2>
                        <p style={{ color: "rgba(210,190,155,0.52)", fontSize: 13, marginTop: 6 }}>Choose your shape and the time you have</p>
                      </div>
                      <CigarStructureStep
                        initialShape={profile.cigarProfile?.shape ?? cigarShape}
                        initialSession={profile.cigarProfile?.session ?? cigarSession}
                        onShapeFocus={() => setBgKey("experience_cigar")}
                        onComplete={(shape, session) => {
                          setCigarShape(shape);
                          setCigarSession(session);
                          /* Persist on profile so returning guests are pre-selected next visit. */
                          updateCigarProfile({ shape, session });
                          goToStep(2);
                        }}
                        onBack={() => goToStep(0)}
                      />
                    </motion.div>
                  )}

                  {/* STEP 2 — Flavor */}
                  {formStep === 2 && (
                    <motion.div key="step-flavor"
                      custom={slideDir} variants={SLIDE_VARIANTS}
                      initial="enter" animate="center" exit="exit"
                      transition={SLIDE_T}
                      style={{ display: "flex", flexDirection: "column", gap: 24 }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <p style={{ color: "rgba(212,139,0,0.65)", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 10 }}>{category === "cigar" ? "Step 3 of 5" : "Step 2 of 4"}</p>
                        <h2 className="font-serif" style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)", color: "rgba(245,235,221,0.94)", fontWeight: 300 }}>Your Palate</h2>
                        <p style={{ color: "rgba(210,190,155,0.52)", fontSize: 13, marginTop: 6 }}>Swipe right to add · left to skip</p>
                      </div>
                      <SwipeCardDeck
                        items={category === "cigar" ? CIGAR_FLAVORS : SPIRITS_FLAVORS}
                        multiSelect={true}
                        onComplete={(sel) => { setFlavors(sel.map(s => s.charAt(0).toUpperCase() + s.slice(1))); goToStep(3); }}
                        onCardFocus={(id) => setBgKey(`flavor_${id}`)}
                        rightLabel="Add"
                        leftLabel="Skip"
                      />
                      {/* Back: cigar returns to Structure (step 1), alcohol returns to Experience (step 0). */}
                      <button onClick={() => goToStep(category === "cigar" ? 1 : 0)} style={{ background:"transparent", border:"none", color:"rgba(210,190,155,0.4)", fontSize:12, letterSpacing:"0.2em", textTransform:"uppercase", cursor:"pointer", marginTop:44 }}>← Back</button>
                    </motion.div>
                  )}

                  {/* STEP 3 — Strength */}
                  {formStep === 3 && (
                    <motion.div key="step-strength"
                      custom={slideDir} variants={SLIDE_VARIANTS}
                      initial="enter" animate="center" exit="exit"
                      transition={SLIDE_T}
                      style={{ display: "flex", flexDirection: "column", gap: 24 }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <p style={{ color: "rgba(212,139,0,0.65)", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 10 }}>{category === "cigar" ? "Step 4 of 5" : "Step 3 of 4"}</p>
                        <h2 className="font-serif" style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)", color: "rgba(245,235,221,0.94)", fontWeight: 300 }}>Your Strength</h2>
                        <p style={{ color: "rgba(210,190,155,0.52)", fontSize: 13, marginTop: 6 }}>Swipe right to select · left for next</p>
                      </div>
                      <SwipeCardDeck
                        items={STRENGTH_CARDS}
                        multiSelect={false}
                        onComplete={(sel) => { setStrength(sel[0] === "mild" ? 1 : sel[0] === "medium" ? 3 : 5); goToStep(4); }}
                        onCardFocus={(id) => setBgKey(`strength_${id}`)}
                        rightLabel="Select"
                        leftLabel="Next"
                      />
                      <button onClick={() => goToStep(2)} style={{ background:"transparent", border:"none", color:"rgba(210,190,155,0.4)", fontSize:12, letterSpacing:"0.2em", textTransform:"uppercase", cursor:"pointer", marginTop:44 }}>← Back</button>
                    </motion.div>
                  )}

                  {/* STEP 4 — Mood */}
                  {formStep === 4 && (
                    <motion.div key="step-mood"
                      custom={slideDir} variants={SLIDE_VARIANTS}
                      initial="enter" animate="center" exit="exit"
                      transition={SLIDE_T}
                      style={{ display: "flex", flexDirection: "column", gap: 24 }}
                    >
                      {!moodDone ? (
                        <>
                          <div style={{ textAlign: "center" }}>
                            <p style={{ color: "rgba(212,139,0,0.65)", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 10 }}>{category === "cigar" ? "Step 5 of 5" : "Step 4 of 4"}</p>
                            <h2 className="font-serif" style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)", color: "rgba(245,235,221,0.94)", fontWeight: 300 }}>Your Atmosphere</h2>
                            <p style={{ color: "rgba(210,190,155,0.52)", fontSize: 13, marginTop: 6 }}>Swipe right when it resonates</p>
                          </div>
                          <SwipeCardDeck
                            items={MOOD_CARDS}
                            multiSelect={false}
                            onComplete={(sel) => { const m = sel[0] ?? "relaxed"; setMood(m); setMoodDone(true); setBgKey(`mood_${m}`); }}
                            onCardFocus={(id) => setBgKey(`mood_${id}`)}
                            rightLabel="This is Me"
                            leftLabel="Next"
                          />
                          <button onClick={() => goToStep(3)} style={{ background:"transparent", border:"none", color:"rgba(210,190,155,0.4)", fontSize:12, letterSpacing:"0.2em", textTransform:"uppercase", cursor:"pointer", marginTop:44 }}>← Back</button>
                        </>
                      ) : (
                        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.52, ease: [0.22,1,0.36,1] }}
                          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}
                        >
                          <div style={{ textAlign: "center" }}>
                            <p style={{ color: "rgba(212,139,0,0.72)", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 14 }}>Your experience is taking shape</p>
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
                              <span key={tag} style={{ padding: "7px 18px", borderRadius: 20, background: "rgba(212,139,0,0.1)", border: "1px solid rgba(212,139,0,0.32)", color: "rgba(212,139,0,0.88)", fontSize: 13, letterSpacing: "0.1em", fontWeight: 600 }}>{tag}</span>
                            ))}
                          </div>

                          <div style={{ height: 1, width: 80, background: "linear-gradient(90deg,transparent,rgba(212,139,0,0.48),transparent)" }} />

                          {/* Primary CTA */}
                          <motion.button data-testid="btn-discover" onClick={handleDiscover}
                            whileHover={{ scale: 1.02, boxShadow: "0 0 0 1px rgba(212,139,0,0.62), 0 16px 50px rgba(26,26,27,0.22), 0 0 75px rgba(212,139,0,0.22)" }}
                            whileTap={{ scale: 0.94 }}
                            style={{
                              minHeight: 68, minWidth: 300, padding: "0 44px", borderRadius: 6, border: "none", cursor: "pointer",
                              background: "linear-gradient(135deg,hsl(43 75% 40%),hsl(45 85% 52%),hsl(43 75% 42%))",
                              color: "#1A1410", fontFamily: "var(--app-font-serif)", fontSize: 18,
                              fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase",
                              boxShadow: "0 0 0 1px rgba(212,139,0,0.38), 0 10px 36px rgba(26,26,27,0.14), 0 0 55px rgba(212,139,0,0.1)",
                              position: "relative", overflow: "hidden",
                            }}
                          >
                            <motion.div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"linear-gradient(105deg,transparent 35%,rgba(26,26,27,0.17) 50%,transparent 65%)", backgroundSize:"200% 100%" }}
                              animate={{ backgroundPosition: ["200% 0","-200% 0"] }}
                              transition={{ duration: 3.5, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
                            />
                            Curate My Selection
                          </motion.button>

                          {/* Secondary buttons */}
                          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                            <motion.button data-testid="btn-start-presentation" onClick={startPresentation}
                              whileHover={{ borderColor: "rgba(212,139,0,0.55)", color: "rgba(212,139,0,0.9)" }}
                              whileTap={{ scale: 0.94 }}
                              style={{ padding:"11px 22px", background:"rgba(212,139,0,0.05)", border:"1px solid rgba(212,139,0,0.28)", color:"rgba(212,139,0,0.65)", borderRadius:6, cursor:"pointer", fontSize:11, letterSpacing:"0.22em", textTransform:"uppercase" }}
                            >
                              Guided Tour
                            </motion.button>
                            {venue.features.demoMode && (
                              <motion.button data-testid="btn-try-demo" onClick={handleTryDemo}
                                whileHover={{ color: "rgba(212,139,0,0.65)" }}
                                whileTap={{ scale: 0.94 }}
                                style={{ padding:"11px 22px", background:"transparent", border:"1px dashed rgba(212,139,0,0.2)", color:"rgba(107,94,78,0.40)", borderRadius:6, cursor:"pointer", fontSize:11, letterSpacing:"0.22em", textTransform:"uppercase" }}
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
                    background: "linear-gradient(135deg, rgba(212,139,0,0.08), rgba(212,139,0,0.04))",
                    border: "1px solid rgba(212,139,0,0.25)",
                    boxShadow: "0 0 30px rgba(212,139,0,0.06)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Crown size={11} style={{ color: "rgba(212,139,0,0.7)" }} />
                    <span className="text-[8px] uppercase tracking-[0.25em]" style={{ color: "rgba(212,139,0,0.55)" }}>
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
                      color: "#F5F2ED",
                    }}
                    whileHover={{ scale: 1.01, boxShadow: "0 0 24px rgba(212,139,0,0.2)" }}
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
                  style={{ color: "rgba(107,94,78,0.25)" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(212,139,0,0.45)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(107,94,78,0.25)")}
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
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col flex-1 w-full"
              style={{ position: "relative" }}
            >
              {/* Subtle smoke FX — two slow-drifting blurred plumes at the
                  top of the reveal panel. Pure CSS gradients on motion.divs,
                  GPU-only translate/opacity so it never costs frame time on
                  a kiosk. Pointer-events: none so it can't ever block taps. */}
              <motion.div
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4, duration: 1.6 }}
                style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 320,
                  pointerEvents: "none", zIndex: 4, overflow: "hidden",
                }}
              >
                {[0, 1].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ x: i ? "20%" : "-20%", y: 30, opacity: 0 }}
                    animate={{
                      x: i ? ["20%", "-10%", "30%"] : ["-20%", "10%", "-30%"],
                      y: [30, -10, 30],
                      opacity: [0, 0.32, 0.18, 0.32, 0],
                    }}
                    transition={{ delay: 1.6 + i * 0.6, duration: 9, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      position: "absolute",
                      top: i ? -40 : 0, left: i ? "30%" : "10%",
                      width: 360, height: 220,
                      background: "radial-gradient(ellipse at center, rgba(220,200,170,0.32) 0%, rgba(180,150,110,0.16) 40%, transparent 72%)",
                      filter: "blur(28px)",
                      mixBlendMode: "screen",
                    }}
                  />
                ))}
              </motion.div>
              {/* Curtain lift — a near-black overlay that fades out over the
                  first ~1.5 s so the reveal feels like a stage lighting up
                  instead of an instant page swap. Pointer-events: none so it
                  never blocks taps. */}
              <motion.div
                aria-hidden
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: "absolute", inset: 0,
                  background: "radial-gradient(ellipse at center, rgba(26,26,27,0.22) 0%, rgba(26,26,27,0.52) 80%)",
                  pointerEvents: "none", zIndex: 6,
                }}
              />
              {/* Light-sweep overlay — fires once on reveal entry. A diagonal
                  gold gleam crosses the panel, like sunlight catching a glass
                  bottle, then fades. Pure CSS gradient, GPU-only transform.
                  Slowed to 2.4 s so the eye actually catches it. */}
              <motion.div
                aria-hidden
                initial={{ x: "-120%", opacity: 0 }}
                animate={{ x: "120%",  opacity: [0, 0.85, 0] }}
                transition={{ delay: 0.6, duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 360,
                  pointerEvents: "none", zIndex: 5, mixBlendMode: "screen",
                  background:
                    "linear-gradient(105deg, transparent 38%, rgba(245,210,120,0.28) 48%, rgba(255,235,180,0.55) 50%, rgba(245,210,120,0.28) 52%, transparent 62%)",
                  filter: "blur(2px)",
                }}
              />
              <motion.div className="mb-8 text-center"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.9 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.32em", textTransform: "uppercase", color: "rgba(212,139,0,0.65)", marginBottom: 8 }}>
                  Step 7 of 7
                  {isDemoMode && <span style={{ marginLeft: 12, color: "rgba(212,139,0,0.50)" }}>· Demo</span>}
                </p>
                <h2 className="font-serif" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)", fontWeight: 700, color: "rgba(245,230,200,0.97)", letterSpacing: "0.04em", lineHeight: 1.1 }}>
                  Your Experience Is Ready
                </h2>
                <p style={{ fontSize: 14, color: "rgba(200,175,135,0.65)", marginTop: 8, letterSpacing: "0.04em" }}>
                  Crafted for your taste. Designed for the moment.
                </p>
              </motion.div>

              {/* SCORE + RATINGS + COMPARISON + PERSONALIZED */}
              <motion.div
                initial={{ opacity: 0, y: 14, scale: 0.96 }}
                animate={{ opacity: 1, y: 0,  scale: 1    }}
                transition={{ delay: 1.3, duration: 0.9, ease: [0.22,1,0.36,1] }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, marginBottom: 28 }}
              >
                {/* Beat-Your-Last-Score badge — shown only after the user has
                    at least one prior blend on this device. New personal best
                    swaps to a celebration line; otherwise renders the
                    challenge "Your best: X · Beat it" so the next round has
                    a target. Persisted via localStorage in storage.ts so it
                    survives reloads and tab closes. */}
                {(revealIsNewBest || revealBest > 0) && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0  }}
                    transition={{ delay: 2.0, duration: 0.7, ease: [0.22,1,0.36,1] }}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 10,
                      padding: "6px 14px", borderRadius: 999,
                      fontSize: 10.5, letterSpacing: "0.24em", textTransform: "uppercase", fontWeight: 700,
                      background: revealIsNewBest
                        ? "linear-gradient(135deg, rgba(212,139,0,0.22), rgba(212,139,0,0.12))"
                        : "rgba(40,28,14,0.55)",
                      border: revealIsNewBest
                        ? "1px solid rgba(245,205,90,0.55)"
                        : "1px solid rgba(212,139,0,0.18)",
                      color: revealIsNewBest ? "rgba(245,225,170,0.96)" : "rgba(200,175,135,0.72)",
                    }}
                  >
                    {revealIsNewBest ? (
                      <>
                        <span aria-hidden style={{ fontSize: 12 }}>★</span>
                        New Personal Best · Beat {revealBest}
                      </>
                    ) : (
                      <>
                        Your Best: {revealBest}
                        <span style={{ opacity: 0.5 }}>·</span>
                        <span style={{ color: "rgba(245,205,90,0.85)" }}>Beat it next blend</span>
                      </>
                    )}
                  </motion.div>
                )}
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 0 1px rgba(212,139,0,0.45), 0 0 30px rgba(212,139,0,0.18)",
                      "0 0 0 1px rgba(212,139,0,0.7), 0 0 60px rgba(212,139,0,0.38)",
                      "0 0 0 1px rgba(212,139,0,0.45), 0 0 30px rgba(212,139,0,0.18)",
                    ],
                  }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    display: "flex", alignItems: "baseline", gap: 6,
                    padding: "14px 30px", borderRadius: 999,
                    background: "linear-gradient(135deg, rgba(40,28,14,0.85), rgba(60,40,18,0.7))",
                  }}
                >
                  <AnimatedCount
                    to={blendScore}
                    delayMs={1400}
                    durationMs={1500}
                    className="font-serif"
                    style={{ fontSize: 38, fontWeight: 600, color: "rgba(212,139,0,0.96)", letterSpacing: "0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums", minWidth: 64, display: "inline-block", textAlign: "right" }}
                  />
                  <span style={{ fontSize: 15, color: "rgba(210,190,155,0.55)", letterSpacing: "0.1em" }}>/ 100</span>
                </motion.div>

                <div style={{ display: "flex", gap: 22, justifyContent: "center", flexWrap: "wrap" }}>
                  {[
                    { k: "Smoothness", v: subScores.smoothness },
                    { k: "Boldness",   v: subScores.boldness   },
                    { k: "Balance",    v: subScores.balance    },
                  ].map((m) => (
                    <div key={m.k} style={{ textAlign: "center", minWidth: 76 }}>
                      <div style={{ fontSize: 9, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(107,94,78,0.52)", marginBottom: 6 }}>
                        {m.k}
                      </div>
                      <div style={{ height: 4, width: 76, borderRadius: 2, background: "rgba(212,139,0,0.12)", overflow: "hidden" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${m.v}%` }}
                          transition={{ delay: 1.7, duration: 1.1, ease: [0.22,1,0.36,1] }}
                          style={{ height: "100%", background: "linear-gradient(90deg, rgba(212,139,0,0.85), rgba(245,205,90,0.95))" }}
                        />
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(212,139,0,0.78)", marginTop: 6, fontWeight: 600 }}>{m.v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, marginTop: 4 }}>
                  <p style={{ fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(212,139,0,0.72)" }}>
                    Top {comparisonPct}% of blends created
                  </p>
                  <p style={{ fontSize: 12, color: "rgba(210,190,155,0.55)", letterSpacing: "0.05em" }}>
                    Built for your taste · {personalizedTags.join(" • ")}
                  </p>
                </div>
              </motion.div>

              {/* ── Product spec strip ──────────────────────────────────────
                  Wrapper / Strength / Size / Cut / Burn time — derived from
                  the top recommendation. Honors the brief's request for an
                  at-a-glance "real cigar" detail block on the reveal. */}
              {(() => {
                const top = results.recommendations[0];
                if (!top) return null;
                // Heuristics — these surface specs even when the product row
                // doesn't carry them. Conservative defaults; never wrong-looking.
                const strengthIdx = Math.max(1, Math.min(5, Math.round(top.strength)));
                const strengthLabel =
                  strengthIdx <= 2 ? "Mild" : strengthIdx <= 3 ? "Medium" : "Full";
                const wrapper =
                  /maduro|oscuro/i.test(top.name)         ? "Maduro" :
                  /connecticut|claro|natural/i.test(top.name) ? "Connecticut" :
                  /habano|colorado|corojo/i.test(top.name) ? "Habano" :
                  strengthIdx >= 4 ? "Maduro" : strengthIdx >= 3 ? "Habano" : "Connecticut";
                const size =
                  /churchill/i.test(top.name) ? "Churchill" :
                  /robusto/i.test(top.name)   ? "Robusto"   :
                  /toro/i.test(top.name)      ? "Toro"      : "Toro";
                const cut = "Straight Cut";
                const burnMin =
                  size === "Churchill" ? "60–75 min" :
                  size === "Robusto"   ? "30–40 min" : "45–55 min";
                const isCigar = top.category === "cigar";
                const specs = isCigar
                  ? [
                      { k: "Wrapper",  v: wrapper      },
                      { k: "Strength", v: strengthLabel },
                      { k: "Size",     v: size          },
                      { k: "Cut",      v: cut           },
                      { k: "Burn",     v: burnMin       },
                    ]
                  : [
                      { k: "Style",    v: "Neat"        },
                      { k: "Body",     v: strengthLabel },
                      { k: "Finish",   v: strengthIdx >= 4 ? "Long" : "Smooth" },
                      { k: "Glass",    v: "Rocks"       },
                      { k: "Pour",     v: "2 oz"        },
                    ];
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0  }}
                    transition={{ delay: 2.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      display: "flex", justifyContent: "center", flexWrap: "wrap",
                      gap: 14, marginBottom: 22, padding: "16px 18px",
                      borderRadius: 14,
                      background: "linear-gradient(135deg, rgba(40,28,14,0.55), rgba(20,15,10,0.35))",
                      border: "1px solid rgba(212,139,0,0.18)",
                      boxShadow: "inset 0 1px 0 rgba(255,225,160,0.06), 0 8px 24px rgba(26,26,27,0.08)",
                    }}
                    data-testid="reveal-spec-strip"
                  >
                    {specs.map((s, i) => (
                      <div key={s.k} style={{
                        display: "flex", flexDirection: "column", alignItems: "center",
                        minWidth: 78, padding: "0 8px",
                        borderLeft: i === 0 ? "none" : "1px solid rgba(212,139,0,0.10)",
                      }}>
                        <span style={{
                          fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase",
                          color: "rgba(107,94,78,0.52)", marginBottom: 6,
                        }}>{s.k}</span>
                        <span className="font-serif" style={{
                          fontSize: 17, fontWeight: 500, color: "rgba(245,225,180,0.95)",
                          letterSpacing: "0.02em",
                        }}>{s.v}</span>
                      </div>
                    ))}
                  </motion.div>
                );
              })()}

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
                      background: "linear-gradient(135deg, rgba(212,139,0,0.18), rgba(212,139,0,0.09))",
                      border: "1px solid rgba(212,139,0,0.32)",
                      color: "rgba(212,139,0,0.8)",
                    }}
                    whileHover={{ boxShadow: "0 0 22px rgba(212,139,0,0.2)", borderColor: "rgba(212,139,0,0.55)" }}
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
                  style={{ background: "rgba(212,139,0,0.03)", border: "1px solid rgba(212,139,0,0.12)" }}
                >
                  <p className="text-[9px] uppercase tracking-[0.28em] mb-4" style={{ color: "rgba(212,139,0,0.4)" }}>
                    Not Available at This Venue · Request for Future Stock
                  </p>
                  <div className="space-y-2">
                    {results.outOfStock.map((item) => {
                      const requested = requestedItems.has(item.id);
                      return (
                        <div key={item.id}
                          className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl"
                          style={{ background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.08)" }}>
                          <div className="min-w-0">
                            <p className="font-serif text-sm truncate" style={{ color: "rgba(200,180,145,0.75)" }}>{item.name}</p>
                            <p className="text-[8px] uppercase tracking-[0.15em] mt-0.5" style={{ color: "rgba(107,94,78,0.35)" }}>
                              {item.category} · Not in stock
                            </p>
                          </div>
                          <motion.button
                            onClick={() => handleRequestItem(item)}
                            disabled={requested}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[9px] uppercase tracking-[0.15em] flex-shrink-0 transition-all duration-300"
                            style={requested
                              ? { background: "rgba(212,139,0,0.08)", border: "1px solid rgba(212,139,0,0.2)", color: "rgba(212,139,0,0.55)" }
                              : { background: "rgba(26,26,27,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(107,94,78,0.50)" }
                            }
                            whileHover={!requested ? { borderColor: "rgba(212,139,0,0.35)", color: "rgba(212,139,0,0.75)", background: "rgba(212,139,0,0.06)" } : {}}
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

              {/* Featured Selections — surfaced as "Upgrade Your Experience" */}
              <FeaturedSection
                featured={featured}
                onSelect={(p) => {
                  playClick();
                  trackEvent({ eventType: "product_selected", productId: p.id, metadata: { source: "upgrade_upsell" } });
                  setUpgradeProduct(p);
                  setOrderModalOpen(true);
                }}
              />

              {/* Alcohol pairings */}
              <div data-tour="tour-pairings">
                <PairingsSection pairings={results.pairings} />
              </div>

              {/* Food pairings */}
              {venue.features.foodPairing && <FoodSection foodPairings={foodPairings} />}

              {/* Sovereign Ascension entry — Image 10 trigger */}
              <motion.div
                className="mt-10 mb-2 flex flex-col items-center gap-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.2, duration: 0.7 }}
              >
                <p style={{
                  fontSize: 8, letterSpacing: "0.38em", fontWeight: 700,
                  color: "rgba(191,149,63,0.35)", fontFamily: "monospace",
                  textTransform: "uppercase", margin: 0,
                }}>
                  SOVEREIGN ASCENSION · STEP 8 / 14
                </p>
                <motion.button
                  data-testid="btn-sovereign-build"
                  onClick={() => { playClick(); setPhase("draw_engineering"); }}
                  whileHover={{
                    scale: 1.03,
                    boxShadow: "0 0 0 1px rgba(191,149,63,0.65), 0 0 55px rgba(191,149,63,0.18)",
                  }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    padding: "0 44px", height: 52,
                    background: "transparent",
                    border: "1px solid rgba(191,149,63,0.45)",
                    borderRadius: 3,
                    color: "rgba(191,149,63,0.82)",
                    fontFamily: "var(--app-font-serif, 'Cormorant Garamond', Georgia, serif)",
                    fontSize: 13, fontWeight: 600,
                    letterSpacing: "0.34em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    boxShadow: "0 0 24px rgba(191,149,63,0.06)",
                  }}
                >
                  BEGIN SOVEREIGN BUILD
                </motion.button>
              </motion.div>

              <motion.div className="mt-6 text-center pb-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 0.6 }}>
                <button data-testid="btn-start-over" onClick={handleStartOver}
                  className="inline-flex items-center gap-2.5 text-xs uppercase tracking-[0.25em] group transition-all duration-300"
                  style={{ color: "rgba(107,94,78,0.40)" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(212,139,0,0.7)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(107,94,78,0.40)")}>
                  <RotateCcw size={13} className="group-hover:-rotate-90 transition-transform duration-500" />
                  {isDemoMode ? "Exit Demo" : "Begin Anew"}
                </button>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
      </motion.div>
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
