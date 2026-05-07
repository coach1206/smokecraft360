/**
 * Intro — full-screen brand selector for the 360 Experience Platform.
 *
 * Three premium cards (SmokeCraft / PourCraft / VapeCraft). On tap:
 *   1. card scales + glows
 *   2. soft synthesized click (no asset bundling — WebAudio)
 *   3. card "expands" while siblings fade
 *   4. wouter navigates to /:theme
 *
 * The dynamic `/:theme` route in App.tsx already handles each destination,
 * so this page only needs to navigate by slug.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useBrowserSpeech } from "@/hooks/useBrowserSpeech";

interface RippleItem { id: number; x: number; y: number; size: number; color: string }
let _rippleId = 0;

/* Locked experience-card imagery. Bundled by Vite via the @assets alias so
 * the welcome screen can NEVER drift to the wrong photo (e.g. the prior
 * Unsplash/Pexels/Imgix URLs were unstable — third-party hosts returned
 * unrelated stock or 404'd, breaking the brand identity per visual rules).
 * Each PNG is hand-vetted to satisfy:
 *   • SmokeCraft → real people + lit cigars + smoke + warm gold/amber lounge
 *   • PourCraft  → whiskey pour + crystal glass + rich brown contrast (no people)
 *   • VapeCraft  → cool blue/purple vapor on pure black (no warm tones, no
 *                  cigars, no whiskey, no people)
 * To replace any image, regenerate the file at the same path — no code edit
 * needed. Do NOT swap to network URLs; the Cloudinary cloud is empty today
 * and any fallback chain has historically caused brand-breaking misfires
 * (see "Wizard Card Imagery (Locked)" in replit.md). */
import smokecraftImg from "@assets/locked_cards/experience_smokecraft.png";
import pourcraftImg  from "@assets/locked_cards/experience_pourcraft.png";
import vapecraftImg  from "@assets/locked_cards/experience_vapecraft.png";
/* BrewCraft hero — AI-generated frosty pint of cold lager (37th brief).
 * Lives outside locked_cards/ because it isn't part of the original
 * locked photography set; if/when a real photograph is locked, swap the
 * import path and delete this generated file. */
import brewcraftImg  from "@assets/generated_images/brewcraft_beer.png";

/**
 * Time-of-day mode for the kiosk. Drives copy + overlay opacity + (when
 * generated assets are present) the looping background video. Determined
 * once on mount from the local hour; kiosks reload nightly so a static
 * snapshot is fine and avoids re-renders chasing the wall clock.
 */
type TimeOfDay = "day" | "evening" | "night";
function timeOfDayFromHour(hour: number): TimeOfDay {
  if (hour >= 6  && hour < 17) return "day";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

const SPLASH_DURATION_MS  = 4200;
const STARTUP_CHIME_DELAY = 1200;
const IDLE_THRESHOLD_MS   = 8000;   // no input for 8s on the selector → attract mode
const DEMO_CYCLE_MS       = 2500;   // attract-mode beat cadence
const DEMO_BEATS          = 4;      // 3 card-highlight beats + 1 reveal beat
const REVEAL_BEAT         = 3;      // index of the reveal beat in the cycle

/**
 * Per-beat caption keys for the attract narrative. Resolved through i18n at
 * render time so language switches mid-attract update text instantly. Index
 * aligned with the cycle (0=smokecraft … 3=reveal).
 */
const DEMO_CAPTION_KEYS = [
  "intro.demo_caption_0",
  "intro.demo_caption_1",
  "intro.demo_caption_2",
  "intro.demo_caption_3",
] as const;

/**
 * Sample inputs for the attract-mode preview scorecard. Mirrors the
 * /api/scoring contract (flavor/strength/pairing ∈ [0,10]).
 */
const DEMO_SAMPLE = { flavor: 8.5, strength: 7.5, pairing: 9.0 };

/**
 * Cigar build-stage assets shown during the attract narrative. Index aligned
 * with the cycle: 0=unlit, 1=just-lit, 2=ember+small ash, 3=full ash + smoke.
 * Files live in artifacts/smokecraft/public/images/ (served at /images/...).
 */
const CIGAR_STAGES = [
  "images/cigar1.png",
  "images/cigar2.png",
  "images/cigar3.png",
  "images/cigar4.png",
] as const;
const WHISKEY_GLASS = "images/whiskey.png";

/**
 * Client-side mirror of the server's /api/scoring formula:
 *     score = flavor*0.4 + strength*0.3 + pairing*0.3
 *
 * Kept in lockstep with artifacts/api-server/src/routes/scoring.ts so the
 * attract loop can preview a realistic score without any network traffic.
 */
function previewScore(s: typeof DEMO_SAMPLE): { score: number; label: string } {
  const score = Number((s.flavor * 0.4 + s.strength * 0.3 + s.pairing * 0.3).toFixed(2));
  const label =
    score >= 8.5 ? "exceptional"
    : score >= 7 ? "excellent"
    : score >= 5 ? "balanced"
    : score >= 3 ? "modest"
    :              "weak";
  return { score, label };
}

type ThemeKey = "smokecraft" | "pourcraft" | "vapecraft" | "brewcraft";

interface Experience {
  key:        ThemeKey;
  title:      string;
  descriptor: string;
  image:      string;
  accent:     string;   // hex used for glow + accent text
  gradient:   string;   // overlay gradient on the card
}

/**
 * Browser-TTS ambient voice cues for the entry portal. Kept short + literal
 * so OS voices read them clearly without intonation drift. Resolved per
 * ThemeKey so the same maps cover all four cards. Hover cooldown in the
 * component prevents rapid re-entry from re-speaking. */
const VOICE_HOVER: Record<ThemeKey, string> = {
  smokecraft: "SmokeCraft. Cigar experience system.",
  pourcraft:  "PourCraft. Spirits and pairing system.",
  vapecraft:  "VapeCraft. Vapor experience system.",
  brewcraft:  "BrewCraft. Beer experience system.",
};
const VOICE_PICK: Record<ThemeKey, string> = {
  smokecraft: "Entering SmokeCraft.",
  pourcraft:  "Entering PourCraft.",
  vapecraft:  "Entering VapeCraft.",
  brewcraft:  "Entering BrewCraft.",
};
/** Minimum gap between consecutive hover cues so jittery mouse movement
 *  doesn't re-trigger speech every frame. */
const HOVER_COOLDOWN_MS = 1200;
/** sessionStorage flag — once-per-session entry-screen voice cue. */
const VOICE_INTRO_SESSION_KEY = "pi_voice_intro_cue";

const EXPERIENCES: Experience[] = [
  {
    key:        "smokecraft",
    title:      "SmokeCraft 360",
    descriptor: "Cigars · Spirits · Lounge",
    image:      smokecraftImg,
    accent:     "#D48B00",
    gradient:   "linear-gradient(180deg, rgba(20,12,4,0.15) 0%, rgba(20,12,4,0.85) 100%)",
  },
  {
    key:        "pourcraft",
    title:      "PourCraft 360",
    descriptor: "Wine · Cocktails · Bar",
    image:      pourcraftImg,
    accent:     "#B91C3C",
    gradient:   "linear-gradient(180deg, rgba(40,8,12,0.15) 0%, rgba(40,8,12,0.85) 100%)",
  },
  /* 37th brief reorder: BrewCraft now sits next to PourCraft (slot 2),
   * VapeCraft moved to slot 3 (where BrewCraft used to be). Final order
   * across the row: SmokeCraft · PourCraft · BrewCraft · VapeCraft.
   * BrewCraft also gets a real hero image now (cold beer in a glass)
   * instead of the gradient-only placeholder. */
  {
    key:        "brewcraft",
    title:      "BrewCraft 360",
    descriptor: "Beer · Pairings · Quick",
    image:      brewcraftImg,
    accent:     "#E8A04A",
    /* Lighter top-of-card gradient lets the foam + glass read clearly;
     * heavier bottom keeps the title legible over the dark bar bokeh. */
    gradient:
      "linear-gradient(180deg, rgba(20,12,4,0.10) 0%, rgba(20,12,4,0.85) 100%)",
  },
  {
    key:        "vapecraft",
    title:      "VapeCraft 360",
    descriptor: "Vapor · Flavor · Modern",
    image:      vapecraftImg,
    accent:     "#7DD3FC",
    gradient:   "linear-gradient(180deg, rgba(8,18,32,0.15) 0%, rgba(8,18,32,0.85) 100%)",
  },
];

/**
 * Click sound. Prefers the bundled asset at /public/sounds/click.mp3
 * (resolved through Vite's BASE_URL so it works under the artifact's
 * subpath proxy). Falls back to a synthesized WebAudio click if the
 * asset 404s or audio playback is blocked.
 */
function useClickSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef   = useRef<AudioContext | null>(null);

  // Pre-warm the <audio> element so the first tap is instant (no network race).
  useEffect(() => {
    const a = new Audio(`${import.meta.env.BASE_URL}sounds/click.mp3`);
    a.volume = 0.3;
    a.preload = "auto";
    audioRef.current = a;
  }, []);

  return useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.then === "function") {
        /* If click.mp3 fails to play (404, autoplay block, decode error)
         * we deliberately stay silent. The previous fallback called
         * playSynth() which created a literal sine-wave oscillator —
         * that's the buzzing the 33rd brief flagged. Silence > buzz. */
        p.catch(() => { /* swallow */ });
      }
    } catch { /* sound is non-essential */ }
  }, []);
  /* ctxRef intentionally unused now; kept declared so future re-introduction
   * of a percussive feedback layer can wire through the same plumbing. */
  void ctxRef;
}

/* playSynth() removed — was the source of the persistent buzz reported in
 * the 33rd brief. AudioContext oscillators produce raw tones that read as
 * "buzzy" by nature, and on systems where click.mp3 fails to load (iframe
 * 404s, autoplay blocks, asset path issues) the synth was firing on every
 * tap. The bundled click.mp3 is the only acceptable click feedback now. */

export default function Intro() {
  const { t } = useTranslation();
  const [, navigate]       = useLocation();
  const [stage, setStage]      = useState<"splash" | "select">("splash");
  const [selected, setSel]     = useState<ThemeKey | null>(null);
  const [isIdle, setIsIdle]    = useState(false);
  const [attractIdx, setAttractIdx] = useState(0);
  const [cardRipples, setCardRipples] = useState<RippleItem[]>([]);
  const [tod]                  = useState<TimeOfDay>(() => timeOfDayFromHour(new Date().getHours()));
  const playClick              = useClickSound();
  /* Browser-native TTS for ambient entry-portal cues. Distinct from
   * useVoice (server ElevenLabs) — this is for low-latency atmosphere,
   * not narrator content. Auto-respects prefers-reduced-motion. */
  const { speak: speakCue }    = useBrowserSpeech();
  /* Last hover-cue timestamp; gates HOVER_COOLDOWN_MS to suppress
   * re-speaks from jittery cursor movement. */
  const hoverCooldownRef       = useRef<number>(0);

  // Time-of-day driven copy + overlay opacity. Night gets the most
  // atmospheric framing; day is the lightest read.
  const headline = tod === "night" ? t("intro.headline_night") : t("intro.headline_day");
  const overlayAlpha = tod === "day" ? 0.4 : tod === "evening" ? 0.6 : 0.8;

  // Refs for the idle countdown + demo cycle so handlers can reset them
  // without re-creating closures.
  const idleTimerRef = useRef<number | null>(null);
  const demoTimerRef = useRef<number | null>(null);

  // Attract-mode lifecycle: starts after the splash, resets on any user
  // input, and dims/cycles cards once IDLE_THRESHOLD_MS elapses with no
  // interaction. Only active on the select stage and never while a card
  // selection is in flight (selected !== null).
  useEffect(() => {
    if (stage !== "select" || selected) return;

    const stopDemo = () => {
      if (demoTimerRef.current !== null) {
        window.clearInterval(demoTimerRef.current);
        demoTimerRef.current = null;
      }
    };
    const startDemo = () => {
      stopDemo();
      let i = 0;
      setAttractIdx(i);
      demoTimerRef.current = window.setInterval(() => {
        i = (i + 1) % DEMO_BEATS;
        setAttractIdx(i);
      }, DEMO_CYCLE_MS);
    };
    const armIdle = () => {
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => {
        setIsIdle(true);
        startDemo();
      }, IDLE_THRESHOLD_MS);
    };
    const onActivity = () => {
      setIsIdle(false);
      stopDemo();
      armIdle();
    };

    armIdle();
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown",     onActivity);
    window.addEventListener("touchstart",  onActivity, { passive: true });

    return () => {
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
      stopDemo();
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown",     onActivity);
      window.removeEventListener("touchstart",  onActivity);
    };
  }, [stage, selected]);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    const chime     = new Audio(`${base}sounds/startup.mp3`);
    chime.volume    = 0.3;
    const chimeT    = window.setTimeout(
      () => void chime.play().catch(() => {}),
      STARTUP_CHIME_DELAY,
    );
    const stageT = window.setTimeout(() => setStage("select"), SPLASH_DURATION_MS);
    return () => {
      window.clearTimeout(chimeT);
      window.clearTimeout(stageT);
    };
  }, []);

  /* Once-per-session entry cue — speaks "Select your experience." shortly
   * after the splash dissolves so it lands during the cards' fade-in. The
   * sessionStorage flag prevents re-prompting on SPA back-nav within the
   * same kiosk session. */
  useEffect(() => {
    if (stage !== "select") return;
    let alreadyFired = false;
    try { alreadyFired = sessionStorage.getItem(VOICE_INTRO_SESSION_KEY) === "1"; }
    catch { /* private mode — just speak once per mount */ }
    if (alreadyFired) return;
    try { sessionStorage.setItem(VOICE_INTRO_SESSION_KEY, "1"); } catch { /* ignore */ }
    const t = window.setTimeout(() => speakCue("Select your experience."), 600);
    return () => window.clearTimeout(t);
  }, [stage, speakCue]);

  /* Hover cue — speaks the per-card descriptor on first hover, with a
   * cooldown so wiggling between two cards doesn't queue speech. Skipped
   * during attract mode (cards animate themselves; voice would clash) and
   * once a selection is in flight. */
  const onHoverCard = useCallback((key: ThemeKey) => {
    if (selected) return;
    if (isIdle)   return;
    const now = Date.now();
    if (now - hoverCooldownRef.current < HOVER_COOLDOWN_MS) return;
    hoverCooldownRef.current = now;
    speakCue(VOICE_HOVER[key]);
  }, [selected, isIdle, speakCue]);

  const onPick = (key: ThemeKey) => {
    if (selected) return;
    playClick();
    speakCue(VOICE_PICK[key]);
    setSel(key);
    // Persist choice so loadTheme() picks it up on the next page.
    try { localStorage.setItem("smokecraft_theme", key); } catch { /* ignore */ }
    setTimeout(() => navigate("/" + key), 520);
  };

  return (
    <div
      data-testid="intro-page"
      style={{
        position: "fixed", inset: 0, overflow: "hidden",
        background: "#0a0604",
        backgroundImage:
          "radial-gradient(ellipse at top left, rgba(60,30,10,0.55), transparent 60%)," +
          "radial-gradient(ellipse at bottom right, rgba(20,8,30,0.45), transparent 60%)," +
          "linear-gradient(135deg, rgba(8,4,2,0.95), rgba(2,2,6,0.98))",
        color: "#F5EBDD",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "5vh 4vw",
      }}
    >
      {/* Language switcher — top-right, above all overlays. Available on the
          select stage so kiosk operators / guests can flip locale before
          choosing a journey. Persists via localStorage["pi_language"]. */}
      {stage === "select" && (
        <div style={{ position: "fixed", top: 16, right: 20, zIndex: 50 }}>
          <LanguageSwitcher variant="full" />
        </div>
      )}

      {/* Time-of-day ambient lounge video — muted/looped/autoplay. One clip
          per mode (day/evening/night), held in public/videos/. Sits at the
          bottom of the stack (zIndex 0) under the tint and the attract scene
          imagery, so it reads as ambient atmosphere rather than the hero.
          Holding off until the splash has cleared keeps decoding cheap during
          the brand reveal. `key` forces a fresh load if `tod` ever changes. */}
      {stage === "select" && (
        <video
          key={`bg-${tod}`}
          data-testid="intro-bg-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          src={`${import.meta.env.BASE_URL}videos/lounge-${tod}.mp4`}
          style={{
            position: "absolute", inset: 0, zIndex: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Time-of-day tint — a single fixed overlay sitting just above the
          base wrapper background and the scene/video layers. Day kiosks
          read brightly (alpha 0.4), evening medium (0.6), night the deepest
          (0.8). Sits below all interactive UI (zIndex 2) and above scene
          imagery (zIndex 0–1). */}
      <div
        aria-hidden
        data-testid="intro-tod-tint"
        style={{
          position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
          background: `rgba(0,0,0,${overlayAlpha})`,
          transition: "background 600ms ease",
        }}
      />

      {/* Cinematic background scene — cycles through the 3 product images
          on attract beats (one image per beat); the reveal beat fades to a
          neutral darkness so the scorecard takes center stage. Ken Burns
          slow-zoom is applied per scene to give the kiosk subtle motion
          even when no one is interacting. Reuses the already-vetted card
          image URLs to avoid introducing new broken assets. */}
      <AnimatePresence>
        {isIdle && !selected && stage === "select" && attractIdx !== REVEAL_BEAT && (
          <motion.div
            key={`scene-${attractIdx}`}
            data-testid="intro-demo-scene"
            initial={{ opacity: 0, scale: 1.0 }}
            animate={{ opacity: 0.42, scale: 1.08 }}
            exit={{ opacity: 0, scale: 1.12 }}
            transition={{
              opacity: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
              scale:   { duration: DEMO_CYCLE_MS / 1000 + 0.5, ease: "linear" },
            }}
            style={{
              position: "absolute", inset: 0, zIndex: 0,
              backgroundImage:    `url(${EXPERIENCES[attractIdx].image})`,
              backgroundSize:     "cover",
              backgroundPosition: "center",
              filter: "saturate(0.85) contrast(1.05)",
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>
      {/* Vignette over scene to keep foreground UI legible. */}
      {isIdle && !selected && stage === "select" && attractIdx !== REVEAL_BEAT && (
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
            background:
              "radial-gradient(ellipse at center, rgba(10,6,4,0.35) 0%, rgba(10,6,4,0.85) 75%)",
          }}
        />
      )}

      {/* Splash — Profound Innovations premium brand intro sequence */}
      <AnimatePresence>
        {stage === "splash" && (
          <motion.div
            key="splash"
            data-testid="intro-splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
            style={{ zIndex: 60 }}
          >
            {/* Deep navy-to-black radial gradient background */}
            <div
              className="absolute inset-0"
              style={{
                background: "radial-gradient(ellipse at 50% 40%, #020617 0%, #000000 70%)",
              }}
            />

            {/* Noise overlay — brushed metal texture */}
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
                backgroundRepeat: "repeat",
                backgroundSize: "128px 128px",
              }}
            />

            {/* Pulsing cyan glow — center ambient */}
            <motion.div
              className="absolute pointer-events-none"
              animate={{ opacity: [0.12, 0.28, 0.12], scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: "60vw", height: "60vw", maxWidth: 600, maxHeight: 600,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(34,211,238,0.18) 0%, transparent 70%)",
                top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />

            {/* THE SWOOSH — 3D chevron SVG enters from far left */}
            <motion.div
              initial={{ x: "-100vw", opacity: 0, filter: "blur(20px)" }}
              animate={{ x: 0, opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.8, ease: [0, 0.55, 0.45, 1] }}
              className="relative z-10 mb-6"
            >
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="chevGrad" x1="10" y1="10" x2="70" y2="70" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="50%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#0891b2" />
                  </linearGradient>
                  <filter id="chevGlow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <g filter="url(#chevGlow)">
                  <path d="M20 12 L52 40 L20 68" stroke="url(#chevGrad)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <path d="M36 18 L62 40 L36 62" stroke="url(#chevGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
                  <path d="M48 24 L68 40 L48 56" stroke="url(#chevGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.3" />
                </g>
              </svg>
            </motion.div>

            {/* BRAND EMERGENCE — masked wipe from center */}
            <div className="relative z-10 overflow-hidden">
              <motion.h1
                initial={{ clipPath: "inset(0 100% 0 0)" }}
                animate={{ clipPath: "inset(0 0% 0 0)" }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.8 }}
                className="relative"
                style={{
                  fontFamily: "'Inter', 'Montserrat', system-ui, sans-serif",
                  fontSize: "clamp(28px, 4.5vw, 52px)",
                  fontWeight: 800,
                  fontStyle: "italic",
                  letterSpacing: "0.08em",
                  color: "#e2e8f0",
                  textShadow: "0 1px 2px rgba(148,163,184,0.4), 0 0 30px rgba(34,211,238,0.15)",
                  margin: 0,
                  whiteSpace: "nowrap",
                }}
              >
                PROFOUND INNOVATIONS
              </motion.h1>

              {/* Shimmer / lens-flare sweep across text */}
              <motion.div
                initial={{ x: "-120%" }}
                animate={{ x: "220%" }}
                transition={{ duration: 1.2, ease: "easeInOut", delay: 1.6 }}
                className="absolute inset-0 pointer-events-none"
                style={{
                  width: "40%",
                  background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)",
                  transform: "skewX(-15deg)",
                }}
              />
            </div>

            {/* TAGLINE — fades in after logo settles */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 0.7, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 1.8 }}
              className="relative z-10 mt-6 max-w-md text-center"
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: "clamp(11px, 1.2vw, 14px)",
                fontWeight: 300,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                lineHeight: 1.8,
                color: "rgba(148,163,184,0.85)",
              }}
            >
              Profound Innovations builds smart systems that turn everyday
              environments into interactive, revenue-generating experiences.
            </motion.p>

            {/* Hairline accent */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 100, opacity: 0.5 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 2.2 }}
              className="relative z-10 mt-8"
              style={{
                height: 1,
                background: "linear-gradient(90deg, transparent, #22d3ee, transparent)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Headline */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: selected ? 0 : 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          textAlign: "center", marginBottom: "4vh", maxWidth: 900,
          // Lift above the time-of-day tint (z=2) so the headline never
          // gets darkened along with the background.
          position: "relative", zIndex: 3,
        }}
      >
        <h1
          style={{
            fontFamily: "var(--app-font-serif, Georgia, serif)",
            fontSize: "clamp(36px, 5.5vw, 64px)",
            fontWeight: 300,
            letterSpacing: "0.04em",
            margin: 0,
            background: "linear-gradient(180deg, #F5EBDD 0%, #D48B00 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor:  "transparent",
            backgroundClip: "text",
          }}
        >
          {headline}
        </h1>
        <p
          style={{
            marginTop: 12, fontSize: "clamp(14px, 1.6vw, 18px)",
            letterSpacing: "0.32em", textTransform: "uppercase",
            color: "rgba(245,235,221,0.55)",
          }}
        >
          {t("intro.select_prompt")}
        </p>
      </motion.header>

      {/* Cards */}
      <div
        style={{
          flex: 1, width: "100%", maxWidth: 1400,
          display: "grid",
          /* 36th-brief tuning: lowered min track from 300px → 220px so
           * all 4 experience cards (smoke/pour/vape/brew) fit on one
           * row at typical kiosk/desktop widths (≥ ~1000px container).
           * At narrower widths auto-fit still wraps responsively. */
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 28,
          alignItems: "stretch",
          // Lift above the time-of-day tint (z=2) so cards stay legible
          // and only the background atmosphere is darkened by the tint.
          position: "relative", zIndex: 3,
        }}
      >
        {EXPERIENCES.map((exp, i) => {
          const isSel       = selected === exp.key;
          const isOther     = selected !== null && !isSel;
          const isAttractOn = isIdle && !selected;
          // On reveal beat, dim all cards equally so the scorecard takes focus.
          const isAttractMe = isAttractOn && attractIdx !== REVEAL_BEAT && i === attractIdx;
          return (
            <motion.button
              key={exp.key}
              data-testid={`intro-card-${exp.key}`}
              type="button"
              onClick={(e: React.MouseEvent) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const size = Math.max(rect.width, rect.height) * 2;
                const id = ++_rippleId;
                setCardRipples((p) => [...p, { id, x, y, size, color: `${exp.accent}30` }]);
                setTimeout(() => setCardRipples((p) => p.filter((r) => r.id !== id)), 500);
                onPick(exp.key);
              }}
              onHoverStart={() => onHoverCard(exp.key)}
              onFocus={() => onHoverCard(exp.key)}
              disabled={selected !== null}
              initial={{ opacity: 0, y: 30 }}
              animate={{
                opacity: isOther ? 0 : 1,
                y:       0,
                scale:   isSel ? 1.04 : isAttractMe ? 1.02 : isAttractOn ? 0.95 : 1,
                filter:  isAttractOn ? (isAttractMe ? "brightness(1.1)" : "brightness(0.55)") : "brightness(1)",
              }}
              whileHover={selected ? undefined : { scale: 1.02 }}
              whileTap={selected ? undefined : { scale: 0.96 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "relative", overflow: "hidden",
                minHeight: 460, borderRadius: 22,
                border: `1px solid ${exp.accent}33`,
                cursor: selected ? "default" : "pointer",
                padding: 0, color: "inherit",
                background: "#0a0604",
                boxShadow: isSel
                  ? `0 0 0 2px ${exp.accent}, 0 30px 80px ${exp.accent}55`
                  : `0 18px 50px rgba(26,26,27,0.22)`,
                transition: "box-shadow 0.4s ease",
              }}
            >
              {/* Background image */}
              <motion.div
                animate={{ scale: isSel ? 1.18 : 1 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: "absolute", inset: 0,
                  backgroundImage: `url(${exp.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              {/* Gradient overlay */}
              <div
                style={{
                  position: "absolute", inset: 0,
                  background: exp.gradient,
                }}
              />
              {/* Ripple touch effect */}
              <AnimatePresence>
                {cardRipples.map((r) => (
                  <motion.span
                    key={r.id}
                    initial={{ opacity: 0.5, scale: 0 }}
                    animate={{ opacity: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    style={{
                      position: "absolute", left: r.x - r.size / 2, top: r.y - r.size / 2,
                      width: r.size, height: r.size, borderRadius: "50%",
                      background: r.color, pointerEvents: "none", zIndex: 10,
                    }}
                  />
                ))}
              </AnimatePresence>
              {/* Glow halo on select/hover */}
              <motion.div
                animate={{ opacity: isSel ? 1 : 0 }}
                transition={{ duration: 0.4 }}
                style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  background: `radial-gradient(circle at 50% 60%, ${exp.accent}40, transparent 65%)`,
                }}
              />
              {/* Card content */}
              <div
                style={{
                  position: "relative", height: "100%",
                  display: "flex", flexDirection: "column",
                  justifyContent: "flex-end",
                  padding: "32px 28px",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 36, height: 2, marginBottom: 18,
                    background: `linear-gradient(90deg, ${exp.accent}, transparent)`,
                  }}
                />
                <h2
                  style={{
                    fontFamily: "var(--app-font-serif, Georgia, serif)",
                    fontSize: "clamp(24px, 2.4vw, 32px)",
                    fontWeight: 600, margin: 0,
                    color: "#F5EBDD",
                    letterSpacing: "0.02em",
                  }}
                >
                  {t(`intro.${exp.key}_title`, exp.title)}
                </h2>
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 13, letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    color: exp.accent,
                  }}
                >
                  {t(`intro.${exp.key}_descriptor`, exp.descriptor)}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Attract-mode product stage — REMOVED per 32nd brief ("cigars popping
          up randomly"). The cigar build-stage progression + whiskey glass
          reveal was visually too aggressive on the entry portal. The bg
          scene image cycling, captions, and scorecard reveal still run so
          the kiosk continues to demonstrate the product on idle, just
          without the foreground cigar pop-ins. */}
      {false && (() => {
        const base = import.meta.env.BASE_URL;
        return (
          <AnimatePresence>
            {isIdle && !selected && stage === "select" && (
              <motion.div
                key="attract-stage"
                data-testid="intro-product-stage"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: "fixed", left: "50%", top: "26vh",
                  transform: "translateX(-50%)",
                  zIndex: 38, pointerEvents: "none",
                  display: "flex", alignItems: "flex-end",
                  gap: 24,
                  filter: "drop-shadow(0 24px 50px rgba(26,26,27,0.30))",
                }}
              >
                {/* Hidden preloaders so all 4 cigar stages and the glass are
                    decoded before the cycle reaches them. */}
                <div
                  aria-hidden
                  style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
                >
                  {CIGAR_STAGES.map((src) => (
                    <img key={src} src={`${base}${src}`} alt="" />
                  ))}
                  <img src={`${base}${WHISKEY_GLASS}`} alt="" />
                </div>

                {/* Cigar — cross-fades between stages, advancing one per beat. */}
                <AnimatePresence mode="wait">
                  <motion.img
                    key={`cigar-${attractIdx}`}
                    src={`${base}${CIGAR_STAGES[attractIdx]}`}
                    alt=""
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      width: "clamp(200px, 26vw, 360px)",
                      height: "auto",
                      display: "block",
                    }}
                  />
                </AnimatePresence>

                {/* Whiskey glass — only on the reveal beat, slides in from
                    the right with a slight bounce. */}
                <AnimatePresence>
                  {attractIdx === REVEAL_BEAT && (
                    <motion.img
                      key="whiskey"
                      src={`${base}${WHISKEY_GLASS}`}
                      alt=""
                      initial={{ opacity: 0, x: 40, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        width: "clamp(110px, 13vw, 180px)",
                        height: "auto",
                        display: "block",
                      }}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        );
      })()}

      {/* Attract-mode beat caption — narrates the demo sequence above the cards
          so the kiosk visibly explains what the product does (mood → flavor →
          pairing → reveal) instead of just blinking. Re-mounts per beat so
          AnimatePresence cross-fades the text. */}
      <AnimatePresence mode="wait">
        {isIdle && !selected && stage === "select" && (
          <motion.div
            key={`caption-${attractIdx}`}
            data-testid="intro-demo-caption"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "fixed", left: 0, right: 0, top: "16vh",
              textAlign: "center", pointerEvents: "none",
              zIndex: 39,
              fontFamily: "var(--app-font-serif, Georgia, serif)",
              fontSize: "clamp(18px, 2vw, 26px)",
              letterSpacing: "0.06em",
              color: "#F5EBDD",
              textShadow: "0 0 32px rgba(26,26,27,0.22)",
            }}
          >
            {t(DEMO_CAPTION_KEYS[attractIdx])}
            <span style={{ opacity: 0.55, marginLeft: 4 }}>
              {attractIdx < REVEAL_BEAT ? "…" : ""}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attract-mode preview scorecard — visible during the reveal beat.
          Uses the same weighted formula as /api/scoring so the displayed
          result is always consistent with the live engine, but computed
          client-side to avoid hammering the API from idle kiosks.
          38th brief: HIDDEN. The "8.35 EXCELLENT" card was popping up
          mid-screen during attract mode and partly obscuring the
          experience cards (BrewCraft in particular). Gated off with a
          `false &&` rather than ripped out so the previewScore + DEMO_SAMPLE
          machinery (still imported) can be re-enabled by flipping the
          flag if a future brief wants the attract scorecard back. */}
      <AnimatePresence>
        {false && isIdle && !selected && stage === "select" && attractIdx === REVEAL_BEAT && (() => {
          const { score, label } = previewScore(DEMO_SAMPLE);
          return (
            <motion.div
              key="attract-scorecard"
              data-testid="intro-demo-scorecard"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "fixed", left: "50%", bottom: "14vh",
                transform: "translateX(-50%)",
                zIndex: 41, pointerEvents: "none",
                padding: "16px 28px", borderRadius: 14,
                border: "1px solid rgba(212,139,0,0.35)",
                background: "rgba(10,6,4,0.78)",
                backdropFilter: "blur(8px)",
                color: "#F5EBDD", textAlign: "center",
                boxShadow: "0 14px 50px rgba(26,26,27,0.26)",
                minWidth: 280,
              }}
            >
              <div
                style={{
                  fontSize: 11, letterSpacing: "0.4em",
                  textTransform: "uppercase",
                  color: "rgba(212,139,0,0.8)",
                  marginBottom: 8,
                }}
              >
                Elite Experience Ready
              </div>
              <div
                style={{
                  fontFamily: "var(--app-font-serif, Georgia, serif)",
                  fontSize: 30, fontWeight: 600,
                  color: "#D48B00", lineHeight: 1.1,
                }}
              >
                {score.toFixed(2)}
              </div>
              <div
                style={{
                  marginTop: 4, fontSize: 13,
                  letterSpacing: "0.28em", textTransform: "uppercase",
                  color: "#F5EBDD", opacity: 0.7,
                }}
              >
                {label}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Attract-mode progress bar — fills across the 4-beat cycle so the
          kiosk visibly conveys "something is happening" between beats. Uses
          framer-motion's repeat to loop as long as attract mode is active. */}
      <AnimatePresence>
        {isIdle && !selected && stage === "select" && (
          <div
            aria-hidden
            style={{
              position: "fixed", left: "50%", bottom: "10vh",
              transform: "translateX(-50%)",
              width: "min(360px, 60vw)", height: 2,
              background: "rgba(245,235,221,0.12)",
              borderRadius: 2, overflow: "hidden",
              zIndex: 41, pointerEvents: "none",
            }}
          >
            <motion.div
              key="attract-progress"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{
                duration: (DEMO_CYCLE_MS * DEMO_BEATS) / 1000,
                ease: "linear",
                repeat: Infinity,
              }}
              style={{
                height: "100%",
                background: "linear-gradient(90deg, transparent, #D48B00 50%, transparent)",
              }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Attract-mode "TAP TO BEGIN" pulse — appears after IDLE_THRESHOLD_MS
          of no interaction on the selector. Disappears on any input. */}
      <AnimatePresence>
        {isIdle && !selected && stage === "select" && (
          <motion.div
            key="attract-pulse"
            data-testid="intro-attract-pulse"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: [0.4, 1, 0.4], y: 0 }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
              y:       { duration: 0.5 },
            }}
            style={{
              position: "fixed", left: 0, right: 0, bottom: "6vh",
              textAlign: "center", pointerEvents: "none",
              fontSize: "clamp(14px, 1.4vw, 18px)",
              letterSpacing: "0.4em", textTransform: "uppercase",
              color: "#D48B00", zIndex: 40,
              textShadow: "0 0 24px rgba(212,139,0,0.45)",
            }}
          >
            Tap to Begin
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection lock overlay — fades the whole screen as we navigate. */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="lock"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            style={{
              position: "fixed", inset: 0,
              background: "#0a0604",
              pointerEvents: "none",
              zIndex: 50,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
