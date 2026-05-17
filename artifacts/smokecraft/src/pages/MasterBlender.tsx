import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { useLocation } from "wouter";
import { AudioWaveToggle, useAudio } from "@/contexts/AudioContext";
import { useGuestProfile } from "@/contexts/GuestProfileContext";
import { getStaffLine } from "@/lib/CraftVoiceRouter";

// Velvet slide tone (Web Audio synth — no external file)
function velvetSlide(): void {
  try {
    type WinAC = typeof window & { webkitAudioContext?: typeof AudioContext };
    const AC = window.AudioContext ?? (window as WinAC).webkitAudioContext;
    if (!AC) return;
    const ctx  = new AC();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(210, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(130, ctx.currentTime + 0.22);
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch { /* blocked by browser policy — silent */ }
}

// Click tone — crisp tactile feedback for every selection
function playClick(): void {
  try {
    type WinAC = typeof window & { webkitAudioContext?: typeof AudioContext };
    const AC = window.AudioContext ?? (window as WinAC).webkitAudioContext;
    if (!AC) return;
    const ctx  = new AC();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(280, ctx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    setTimeout(() => ctx.close().catch(() => {}), 500);
  } catch { /* blocked by browser policy */ }
}

// Module-level ripple trigger (registered by RippleCanvas on mount)
let _rippleFn: ((x: number, y: number) => void) | null = null;
function triggerBlenderRipple(x: number, y: number): void { _rippleFn?.(x, y); }


// ── Reference images ────────────────────────────────────────────────────────
import imgGoldenBox      from "@assets/eff17e31-8450-48d0-af84-9bd221fa2b0c_1778884524142.jpeg";
import imgSovereignMap   from "@assets/IMG_5166_1778884524149.png";
import imgMentorStudio   from "@assets/IMG_5167_1778884524148.png";
import imgSeedBank       from "@assets/IMG_5178_1778884524143.png";
import imgSoilTablet     from "@assets/IMG_5177_1778884524144.png";
import imgBeneathWrapper from "@assets/IMG_5172_1778884524146.png";
import imgCutSpecs       from "@assets/IMG_5176_1778884524145.png";
import imgVitolaSpecs    from "@assets/IMG_5169_1778884524147.png";
import imgVitolaArch     from "@assets/IMG_5175_1778884524145.png";
import imgBoxArchitect   from "@assets/IMG_5188_1778884524139.jpeg";
import imgHumidor        from "@assets/IMG_5187_1778884524140.jpeg";
import imgCultivation    from "@assets/IMG_5179_1778884524139.png";
import imgBunching       from "@assets/IMG_5181_1778884524136.png";

// ── Constants ──────────────────────────────────────────────────────────────
const GOLD      = "#d4af37";

// ── Cigar Mastery Tier System ───────────────────────────────────────────────
const MASTERY_TIERS = [
  { rank: 1, name: "Just Curious",        min: 0,    max: 250,     color: "#8BC34A", sessionLabel: "Session I · 10 mins"   },
  { rank: 2, name: "Cultivated Beginner", min: 251,  max: 750,     color: GOLD,      sessionLabel: "Session II · 12 mins"  },
  { rank: 3, name: "Rising Aficionado",   min: 751,  max: 1500,    color: "#E8741A", sessionLabel: "Session III · 15 mins" },
  { rank: 4, name: "Master Sommelier",    min: 1501, max: Infinity, color: "#a78bfa", sessionLabel: "The Alchemy Chamber"        },
] as const;
type MasteryTier = (typeof MASTERY_TIERS)[number];
function getTier(xp: number): MasteryTier {
  return ([...MASTERY_TIERS] as MasteryTier[]).reverse().find(t => xp >= t.min) ?? MASTERY_TIERS[0];
}
const COUNTRY_FLAGS: Record<string, string> = {
  "Dominican Republic": "\u{1F1E9}\u{1F1F4}",
  "Nicaragua":          "\u{1F1F3}\u{1F1EE}",
  "Cuba":               "\u{1F1E8}\u{1F1FA}",
  "Ecuador":            "\u{1F1EA}\u{1F1E8}",
  "Honduras":           "\u{1F1ED}\u{1F1F3}",
  "Brazil":             "\u{1F1E7}\u{1F1F7}",
};
function persistCountry(country: string): void {
  try {
    const ex: string[] = JSON.parse(localStorage.getItem("blender_countries") ?? "[]");
    if (!ex.includes(country)) localStorage.setItem("blender_countries", JSON.stringify([...ex, country]));
  } catch { /* kiosk */ }
}
function loadVisitedCountries(): string[] {
  try { return JSON.parse(localStorage.getItem("blender_countries") ?? "[]"); } catch { return []; }
}

// ── Sensory Matrix — origin → product + culinary pairings ─────────────────
const SENSORY_MATRIX: Record<string, {
  cigar: string; spirit: string; spiritStyle: string;
  foods: [string, string]; descriptors: [string, string, string];
  accent: string;
}> = {
  "Dominican Republic": {
    cigar:       "Arturo Fuente Opus X",
    spirit:      "Highland Single Malt Scotch",
    spiritStyle: "12yr+ Aged",
    foods:       ["Prime Dry-Aged Ribeye", "Dark Chocolate Ganache"],
    descriptors: ["Smooth", "Cedar", "Cocoa"],
    accent:      "#C8860A",
  },
  "Nicaragua": {
    cigar:       "Padrón 1926 Series",
    spirit:      "Barrel-Proof Bourbon",
    spiritStyle: "Cask Strength",
    foods:       ["Charred Pepper NY Strip", "Espresso Smoked Brisket"],
    descriptors: ["Bold", "Espresso", "Spice"],
    accent:      "#8B3A0F",
  },
  "Ecuador": {
    cigar:       "Davidoff Nicaragua",
    spirit:      "Japanese Whisky",
    spiritStyle: "Single Malt",
    foods:       ["Pan-Seared Duck Breast", "Artisanal Charcuterie"],
    descriptors: ["Creamy", "Aromatic", "Shade-grown"],
    accent:      "#2E6B4F",
  },
  "Cuba": {
    cigar:       "Cohiba Behike 52",
    spirit:      "Ron Zacapa 23 Rum",
    spiritStyle: "Sistema Solera",
    foods:       ["Mojo-Glazed Pork Tenderloin", "Coconut Flan"],
    descriptors: ["Earthy", "Floral", "Honey"],
    accent:      "#7A4F1A",
  },
};

const HALO_R    = 88;
const HALO_CIRC = 2 * Math.PI * HALO_R;

// ── Flavor data ────────────────────────────────────────────────────────────
const LEAVES = [
  {
    id: "seco", label: "Seco", sub: "Air-cured · Light",
    xp: 15, img: "/images/cigar1.png", hue: "#c8a06a", synergy: 22,
    desc: "Delicate and smooth — the backbone of balance.",
    mentorNote: "Seco leaf burns cool and even. Guests who choose Seco are seekers of subtlety.",
  },
  {
    id: "viso", label: "Viso", sub: "Sun-grown · Medium Oily",
    xp: 20, img: "/images/cigar3.png", hue: "#8b5e30", synergy: 28,
    desc: "The equilibrium leaf — body meets finesse.",
    mentorNote: "Viso is the bridge. It carries complexity without aggression.",
  },
  {
    id: "ligero", label: "Ligero", sub: "Shade-grown · Full Power",
    xp: 25, img: "/images/cigar.png", hue: "#3d1f08", synergy: 25,
    desc: "The apex leaf — slow-burning, full-bodied intensity.",
    mentorNote: "Ligero is reserved for those who demand the full conversation.",
  },
];
const WRAPPERS = [
  {
    id: "candela", label: "Candela", sub: "Bright · Grassy · Mild",
    xp: 12, img: "/images/smoke/smoke_selection.png", synergy: 20,
    desc: "Flash-cured to lock in chlorophyll. Rare and vivid.",
    mentorNote: "Candela is the unexpected choice — bright, grassy, almost botanical.",
  },
  {
    id: "connecticut", label: "Connecticut", sub: "Silky · Creamy · Light",
    xp: 15, img: "/images/cigar1.png", synergy: 25,
    desc: "Shade-grown elegance. The silk of the tobacco world.",
    mentorNote: "Connecticut wrapper speaks to those who appreciate understated luxury.",
  },
  {
    id: "habano", label: "Habano", sub: "Earthy · Spiced · Medium",
    xp: 18, img: "/images/smoke/smoke_selection.png", synergy: 28,
    desc: "Cuban tradition meets modern construction.",
    mentorNote: "Habano is complexity in every draw — spice, leather, earth.",
  },
  {
    id: "maduro", label: "Maduro", sub: "Dark · Sweet · Full",
    xp: 22, img: "/images/cigar4.png", synergy: 25,
    desc: "Slow-fermented darkness. Cocoa, coffee, dark fruit.",
    mentorNote: "Maduro is the wrapper that needs no introduction. It commands the room.",
  },
  {
    id: "oscuro", label: "Oscuro", sub: "Blackest · Oily · Intense",
    xp: 25, img: "/images/cigar2.png", synergy: 22,
    desc: "Beyond Maduro — maximum fermentation, maximum expression.",
    mentorNote: "Oscuro is for the initiated. Tar, espresso, dark chocolate.",
  },
];
const VITOLAS = [
  { id: "robusto",   label: "Robusto",   smoke: 50,  img: "/images/cigar.png",  xp: 10, synergy: 22, ring: 50, length: 5.0 },
  { id: "toro",      label: "Toro",      smoke: 65,  img: "/images/cigar1.png", xp: 12, synergy: 25, ring: 50, length: 6.0 },
  { id: "churchill", label: "Churchill", smoke: 90,  img: "/images/cigar2.png", xp: 15, synergy: 28, ring: 47, length: 7.0 },
  { id: "belicoso",  label: "Belicoso",  smoke: 75,  img: "/images/cigar3.png", xp: 14, synergy: 25, ring: 52, length: 6.125 },
  { id: "lancero",   label: "Lancero",   smoke: 120, img: "/images/cigar4.png", xp: 18, synergy: 25, ring: 38, length: 7.5 },
];
const CUTS = [
  { id: "straight", label: "Straight Cut", sub: "Clean · Classic · Full Draw",      xp: 8,  synergy: 33 },
  { id: "vcut",     label: "V-Cut",        sub: "Focused · Concentrated · Intense", xp: 12, synergy: 37 },
  { id: "punch",    label: "Punch Cut",    sub: "Circular · Controlled · Smooth",   xp: 10, synergy: 30 },
];

const STEP_MENTOR: string[] = [
  "Welcome to the ritual. Choose your tobacco leaf — the soul of every great blend.",
  "Now choose your wrapper. The wrapper is the first thing the world sees, and the last thing it forgets.",
  "Select your vitola — the shape and smoke time define the rhythm of the experience.",
  "The final cut. How you begin the draw determines everything that follows.",
];

// ── Gateway data ────────────────────────────────────────────────────────────
const MENTORS = [
  {
    id: "tradition",
    name: "Don Manuel",
    flag: "🇩🇴",
    origin: "Dominican Republic",
    style: "Traditional Entubado Rolling",
    bio: "Mastery over smooth, complex profile layering with multi-generational Cibao Valley seed descendants. His blends carry cedar warmth, cream body, and a long, clean white ash finish.",
    tag: "THE TRADITION",
    soilAffinity: "alluvial" as const,
    guidance: "In the Cibao Valley we speak of balance as a living force — not a calculation. Observe every priming tier before you. The tobacco leaf will confirm when your hand has made the right choice. Proceed with precision; your blend reveals your character.",
    portrait: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "sovereign",
    name: "Alejandro",
    flag: "🇳🇮",
    origin: "Nicaragua",
    style: "Estílí Accordion Technique",
    bio: "Specializes in high-intensity, bold, spice-forward profiles utilizing volcanic soil properties. Dark chocolate, pepper, and earth are his signature hallmarks.",
    tag: "THE MODERN SOVEREIGN",
    soilAffinity: "volcanic" as const,
    guidance: "The volcano demands conviction. In Esteli we do not deliberate — we commit. Every decision here must carry the weight of intention. Half-measures produce forgettable blends. Choose boldly, or return to the beginning.",
    portrait: "https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "botanist",
    name: "Doña Rosa",
    flag: "🇪🇨",
    origin: "Ecuador",
    style: "Highland Shade Cultivation",
    bio: "Cultivates under equatorial clouds producing ultra-silky, cream-forward wrappers with rare botanical nuance. Her profiles are floral, refined, and deceptively powerful.",
    tag: "THE HIGHLAND BOTANIST",
    soilAffinity: "alluvial" as const,
    guidance: "Beneath Andean clouds, I learned that complexity is earned through restraint. Study what is before you carefully — the elegant answer is rarely the obvious one. In the highlands, we trust the process, and the process rewards only those who listen.",
    portrait: "https://images.unsplash.com/photo-1511113202302-ef60000a6e87?auto=format&fit=crop&w=600&q=80",
  },
];
const SEEDS = [
  { id: "corojo",  name: "Corojo Premium", detail: "Robust, spicy intensity with classic rich pepper notes and long-leaf burn character." },
  { id: "criollo", name: "Criollo '98",    detail: "Earthy, smooth complexity balancing wood, sweet cream, and refined body." },
];

const SOILS = [
  { id: "volcanic", name: "Volcanic Ash",    region: "Estelí, Nicaragua",  detail: "High mineral composition giving intense spice and deep structural strength." },
  { id: "alluvial", name: "Alluvial Valley", region: "Cibao, D.R.",         detail: "Nutrient-dense loam creating silky wrapper leaves and refined, mellow body." },
];

type GatewayPhase = "cockpit" | "intro" | "orientation" | "mentor" | "terroir" | "seed_biology" | "cultivation" | "gate_movement_1" | "harvest" | "curing" | "rolling_bench" | "priming_matrix" | "gate_movement_2" | "vitola_science" | "gate_movement_3" | "blending";

type XPFloat  = { id: number; amount: number; x: number; y: number };
type Sel      = {
  leaf?: typeof LEAVES[0];
  wrapper?: typeof WRAPPERS[0];
  vitola?: typeof VITOLAS[0];
  cut?: typeof CUTS[0];
};

interface PairingResult {
  alchemyText:     string;
  descriptors:     string[];
  confidence:      number;
  primaryCategory: string;
  spiritPairings:  { id: string; name: string; priceCents: number | null; imageUrl: string | null; category: string }[];
  beerPairings:    { id: string; name: string; priceCents: number | null; imageUrl: string | null; category: string }[];
  staffNudge: {
    flavorProfile:    string;
    confidenceScore:  number;
    suggestedWording: string;
    upsellLine:       string;
  };
  mentorLines: string[];
}

// ── Smoke drift background ─────────────────────────────────────────────────
function SmokeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    type Particle = { x: number; y: number; vx: number; vy: number; r: number; alpha: number; grow: number };
    const particles: Particle[] = [];
    const MAX = 50;
    function spawn() {
      particles.push({
        x:     Math.random() * canvas!.width,
        y:     canvas!.height + 30,
        vx:    (Math.random() - 0.5) * 0.55,
        vy:    -(Math.random() * 0.55 + 0.18),
        r:     Math.random() * 55 + 35,
        alpha: Math.random() * 0.065 + 0.018,
        grow:  Math.random() * 0.14 + 0.04,
      });
    }
    let frame = 0;
    let raf: number;
    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      if (frame % 5 === 0 && particles.length < MAX) spawn();
      frame++;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!;
        p.x += p.vx; p.y += p.vy; p.r += p.grow; p.alpha -= 0.00035;
        if (p.alpha <= 0 || p.y < -p.r * 2) { particles.splice(i, 1); continue; }
        const g = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0,   `rgba(190,155,90,${p.alpha.toFixed(4)})`);
        g.addColorStop(0.5, `rgba(130,100,55,${(p.alpha * 0.45).toFixed(4)})`);
        g.addColorStop(1,   "rgba(0,0,0,0)");
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = g;
        ctx!.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9996 }}
    />
  );
}


// RippleCanvas — full-screen HTML5 canvas; renders expanding gold ripple rings
// when triggerBlenderRipple(x, y) is called (module-level setter pattern).
function RippleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    _rippleFn = (cx: number, cy: number) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const maxR   = Math.hypot(canvas.width, canvas.height) * 0.88;
      const start  = performance.now();
      const dur    = 1150;
      let   raf    = 0;

      const draw = (now: number) => {
        const t = Math.min((now - start) / dur, 1);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Three staggered concentric rings
        for (let wave = 0; wave < 3; wave++) {
          const wt = Math.max(0, t - wave * 0.13);
          if (wt <= 0) continue;
          const r     = wt * maxR;
          const alpha = (1 - wt) * 0.5;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(212,175,55,${alpha.toFixed(3)})`;
          ctx.lineWidth   = Math.max(0.5, 2.5 * (1 - wt));
          ctx.stroke();
        }

        // Central amber shock-glow (first 40% of animation)
        if (t < 0.4) {
          const glowR = t * 200;
          const grad  = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
          grad.addColorStop(0, `rgba(212,175,55,${((0.4 - t) * 0.6).toFixed(3)})`);
          grad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.beginPath();
          ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        if (t < 1) {
          raf = requestAnimationFrame(draw);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      };

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };

    return () => {
      window.removeEventListener("resize", resize);
      _rippleFn = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9990 }}
    />
  );
}

// ── Synergy Halo ──────────────────────────────────────────────────────────
function SynergyHalo({ synergy }: { synergy: number }) {
  const spring   = useSpring(0, { stiffness: 60, damping: 18 });
  const offset   = useTransform(spring, v => HALO_CIRC * (1 - v / 100));
  const at100    = synergy >= 100;
  spring.set(Math.min(synergy, 100));

  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      <AnimatePresence>
        {at100 && (
          <motion.div
            key="halo-glow"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ boxShadow: `0 0 60px 20px ${GOLD}55, 0 0 120px 40px ${GOLD}22` }}
          />
        )}
      </AnimatePresence>
      <svg width={180} height={180} className="absolute inset-0 -rotate-90" style={{ overflow: "visible" }}>
        <circle cx={90} cy={90} r={HALO_R} fill="none" stroke="rgba(212,175,55,0.12)" strokeWidth={8} />
        <motion.circle
          cx={90} cy={90} r={HALO_R}
          fill="none"
          stroke={at100 ? GOLD : `url(#haloGrad)`}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={HALO_CIRC}
          style={{ strokeDashoffset: offset }}
        />
        <defs>
          <linearGradient id="haloGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#d4af37" />
            <stop offset="100%" stopColor="#f5d980" />
          </linearGradient>
        </defs>
      </svg>
      <div className="relative z-10 flex flex-col items-center">
        <motion.span
          key={Math.floor(synergy)}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          className="font-bold leading-none tabular-nums"
          style={{ fontSize: 32, color: at100 ? GOLD : "rgba(240,232,212,0.92)", fontFamily: "'Cormorant Garamond',serif" }}
        >
          {Math.min(Math.round(synergy), 100)}
        </motion.span>
        <span className="text-[9px] tracking-[0.22em] uppercase mt-0.5" style={{ color: `${GOLD}88` }}>
          {at100 ? "PERFECT" : "SYNERGY"}
        </span>
      </div>
    </div>
  );
}

// ── Floating +XP chip ──────────────────────────────────────────────────────
function XPChip({ chip }: { chip: XPFloat }) {
  const isNeg = chip.amount < 0;
  return (
    <motion.div
      key={chip.id}
      initial={{ opacity: 1, y: 0, scale: 0.8, x: chip.x }}
      animate={{ opacity: 0, y: isNeg ? 60 : -80, scale: 1.15 }}
      transition={{ duration: 1.1, ease: "easeOut" }}
      className="fixed z-[9999] pointer-events-none"
      style={{ top: chip.y, left: 0 }}
    >
      <span className="text-sm font-bold tracking-widest px-3 py-1 rounded-full"
        style={{
          color:      isNeg ? "#ef4444" : GOLD,
          background: isNeg ? "rgba(239,68,68,0.15)" : "rgba(212,175,55,0.15)",
          border:     `1px solid ${isNeg ? "#ef444444" : GOLD + "44"}`,
        }}>
        {isNeg ? chip.amount : `+${chip.amount}`} {isNeg ? "PTS" : "XP"}
      </span>
    </motion.div>
  );
}

// ── Selection card ─────────────────────────────────────────────────────────
function SelectionCard<T extends { id: string; label: string; sub?: string; desc?: string; img: string; xp: number }>({
  item, selected, onClick,
}: { item: T; selected: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <motion.button
      onClick={onClick}
      onTouchStart={() => playClick()}
      whileTap={{ scale: 0.96, y: 2, boxShadow: "inset 0px 4px 12px rgba(0,0,0,0.90), 0 0 0 1px rgba(212,175,55,0.30)" }}
      whileHover={{ scale: 1.04, y: -4 }}
      className="relative flex-shrink-0 flex flex-col overflow-hidden rounded-2xl cursor-pointer"
      style={{
        width:          210,
        border:         `1px solid ${selected ? GOLD : "rgba(212,175,55,0.18)"}`,
        background:     selected
          ? `linear-gradient(160deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.06) 100%)`
          : "rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
        boxShadow:      selected ? `0 0 28px ${GOLD}44, inset 0 1px 0 ${GOLD}22` : "none",
        outline:        "none",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
    >
      <div className="w-full overflow-hidden" style={{ height: 120 }}>
        <img
          src={item.img}
          alt={item.label}
          className="w-full h-full object-cover"
          style={{
            filter:     selected ? "brightness(1.15) saturate(1.2)" : "brightness(0.65) saturate(0.7)",
            transition: "filter 0.3s",
          }}
        />
        {/* Gradient shelf overlay */}
        <div className="absolute inset-x-0 bottom-0" style={{
          height:     70,
          background: "linear-gradient(to top, rgba(5,3,0,0.92) 0%, transparent 100%)",
          top:        60,
        }} />
      </div>

      <div className="flex flex-col items-start px-3 py-2.5 gap-0.5">
        <span className="font-bold tracking-wider uppercase" style={{ fontSize: 16, color: selected ? GOLD : "rgba(240,232,212,0.85)" }}>
          {item.label}
        </span>
        {"sub" in item && (
          <span style={{ fontSize: 13, lineHeight: 1.4, color: "rgba(240,232,212,0.60)" }}>
            {(item as { sub?: string }).sub}
          </span>
        )}
        {"desc" in item && (
          <span style={{ fontSize: 13, lineHeight: 1.45, marginTop: 4, fontStyle: "italic", color: `${GOLD}80` }}>
            {(item as { desc?: string }).desc}
          </span>
        )}
      </div>

      {selected && (
        <motion.div
          layoutId={`sel-ring-${item.id}`}
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ border: `2px solid ${GOLD}`, boxShadow: `inset 0 0 16px ${GOLD}18` }}
        />
      )}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute top-2 right-2 rounded-full flex items-center justify-center"
            style={{ width: 20, height: 20, background: GOLD }}
          >
            <svg width={11} height={8} viewBox="0 0 11 8" fill="none">
              <path d="M1 4l3 3 6-6" stroke="#0a0700" strokeWidth={2} strokeLinecap="round"/>
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ── Interactive Vitola SVG ─────────────────────────────────────────────────
function CigarSilhouette({ vitola, smokeTime }: { vitola: typeof VITOLAS[0]; smokeTime: number }) {
  const pct    = (smokeTime - 30) / 90;               // 0–1
  const width  = 180 + pct * 120;                      // 180px (Robusto) → 300px (Lancero)
  const height = vitola.ring / 4.5;                    // ring gauge → px height
  const capR   = height / 2;

  return (
    <motion.div className="flex justify-center items-center my-2">
      <motion.svg
        width={width + capR * 2}
        height={height + 8}
        animate={{ width: width + capR * 2 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id="cigarGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#3d1f08" />
            <stop offset="15%"  stopColor="#8b5e30" />
            <stop offset="50%"  stopColor="#c8a06a" />
            <stop offset="85%"  stopColor="#8b5e30" />
            <stop offset="100%" stopColor="#f5d9a0" />
          </linearGradient>
          <linearGradient id="cigarSheen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.25)" />
            <stop offset="50%"  stopColor="rgba(255,255,255,0.0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
          </linearGradient>
          <filter id="cigarGlow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {/* Main body */}
        <rect
          x={capR}
          y={4}
          width={width}
          height={height}
          rx={height / 6}
          fill="url(#cigarGrad)"
          filter="url(#cigarGlow)"
        />
        {/* Sheen */}
        <rect
          x={capR}
          y={4}
          width={width}
          height={height}
          rx={height / 6}
          fill="url(#cigarSheen)"
        />
        {/* Cap (lit end) */}
        <ellipse cx={capR} cy={4 + height / 2} rx={capR} ry={height / 2}
          fill="#f5d9a0" />
        {/* Foot (burn end glow) */}
        <ellipse cx={capR + width} cy={4 + height / 2} rx={capR * 0.7} ry={height * 0.45}
          fill="#e85520" opacity={0.85} />
        <motion.ellipse
          cx={capR + width} cy={4 + height / 2}
          rx={capR * 0.4} ry={height * 0.28}
          fill="#ffaa44"
          animate={{ opacity: [0.9, 0.4, 0.9], rx: [capR * 0.4, capR * 0.55, capR * 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Band ring */}
        <rect
          x={capR + width * 0.22}
          y={4}
          width={width * 0.12}
          height={height}
          fill="none"
          stroke={GOLD}
          strokeWidth={1.5}
          opacity={0.7}
        />
      </motion.svg>
    </motion.div>
  );
}

// ── Shared gateway styles ───────────────────────────────────────────────────
const GW = {
  bg: {
    background: "radial-gradient(ellipse at 50% 0%, rgba(255,176,0,0.04) 0%, transparent 60%), #000000",
    minHeight: "100%",
    width: "100%",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 24px",
    color: "#f5f6f7",
    position: "relative" as const,
    overflow: "hidden" as const,
  },
  chamber: {
    background: "rgba(15,15,15,0.72)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(212,175,55,0.15)",
    boxShadow: "0 24px 64px rgba(0,0,0,0.90)",
    borderRadius: "8px",
    width: "100%",
    maxWidth: "860px",
    padding: "40px 36px",
    zIndex: 10,
    margin: "0 auto",
  },
  title: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: "clamp(1.5rem, 4vw, 2.4rem)",
    color: "#D4AF37",
    fontWeight: 400,
    marginBottom: "20px",
    borderBottom: "1px solid rgba(212,175,55,0.15)",
    paddingBottom: "12px",
  },
  para: {
    fontSize: "clamp(14px, 1.5vw, 16px)",
    lineHeight: "1.6",
    color: "#E5E5E5",
    fontWeight: 400,
    marginBottom: "16px",
    letterSpacing: "0.02em",
  },
  btn: (dim?: boolean) => ({
    background: dim
      ? "rgba(212,175,55,0.08)"
      : "linear-gradient(180deg, #2e3136 0%, #111214 100%)",
    border: dim ? "1px solid rgba(255,255,255,0.14)" : "1px solid #dfba73",
    boxShadow: dim ? "none" : "inset 0 1px 0 rgba(255,255,255,0.08), 0 6px 20px rgba(0,0,0,0.55)",
    color: dim ? "rgba(240,232,212,0.45)" : "#fffcf5",
    padding: "16px 36px",
    fontSize: "clamp(16px, 1.8vw, 18px)",
    fontWeight: 600,
    letterSpacing: "0.28em",
    textTransform: "uppercase" as const,
    borderRadius: "4px",
    cursor: dim ? "not-allowed" : "pointer",
    transition: "all 0.3s ease",
    fontFamily: "'Inter',sans-serif",
  }),
  card: (sel: boolean) => ({
    background: sel ? "rgba(20,18,12,0.88)" : "rgba(12,12,12,0.70)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: sel ? `1px solid rgba(212,175,55,0.55)` : "1px solid rgba(212,175,55,0.12)",
    borderRadius: "6px",
    padding: "24px",
    cursor: "pointer",
    transition: "all 0.28s ease",
    boxShadow: sel ? `0 0 28px rgba(212,175,55,0.18)` : "none",
  }),
};

// ── Gateway: Intro ──────────────────────────────────────────────────────────
// ── Cockpit Idle View — NOVEE OS craft portal ────────────────────────────────
// ── Boot sequence — levels 0→1→2→3 before cockpit ─────────────────────────
function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<0|1|2|3>(0);
  const GOLD = "#d4af37";
  useEffect(() => {
    const t0 = setTimeout(() => setPhase(1), 1350);
    const t1 = setTimeout(() => setPhase(2), 2650);
    const t2 = setTimeout(() => setPhase(3), 3750);
    const t3 = setTimeout(() => onComplete(), 4500);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <AnimatePresence>
      {phase < 3 && (
        <motion.div
          key="boot-seq"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.75 }}
          style={{ position: "fixed", inset: 0, background: "#000000", zIndex: 99999,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
        >
          <AnimatePresence mode="wait">
            {phase === 0 && (
              <motion.div key="l0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.7 }} style={{ textAlign: "center" }}>
                <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(1.2rem,2.8vw,2rem)", fontWeight: 300,
                  color: "rgba(255,255,255,0.82)", letterSpacing: "0.22em", margin: 0, textTransform: "uppercase" as const }}>Profound Innovations LLC</p>
                <motion.div animate={{ scaleX: [0, 1] }} transition={{ delay: 0.4, duration: 0.8 }}
                  style={{ height: 1, width: 80, background: `linear-gradient(to right, transparent, ${GOLD}, transparent)`, margin: "18px auto 0" }} />
              </motion.div>
            )}
            {phase === 1 && (
              <motion.div key="l1" initial={{ x: "40%", opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: "-40%", opacity: 0 }}
                transition={{ duration: 0.55, ease: [0.22,1,0.36,1] }} style={{ textAlign: "center" }}>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(0.55rem,1.1vw,0.72rem)", letterSpacing: "0.5em",
                  color: "rgba(212,175,55,0.55)", textTransform: "uppercase" as const, margin: "0 0 12px" }}>Operating System Layer</p>
                <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(3rem,6.5vw,5.5rem)", fontWeight: 300,
                  color: "#ffffff", letterSpacing: "0.15em", margin: 0 }}>NOVEÈ OS</h1>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: "clamp(0.5rem,0.9vw,0.65rem)", letterSpacing: "0.3em",
                  color: "rgba(255,255,255,0.22)", textTransform: "uppercase" as const, margin: "10px 0 0" }}>Luxury Experience Terminal — V4.2</p>
              </motion.div>
            )}
            {phase === 2 && (
              <motion.div key="l2" initial={{ scale: 0.87, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.52, ease: [0.22,1,0.36,1] }}
                style={{ background: "linear-gradient(135deg, rgba(15,15,15,0.93) 0%, rgba(5,5,5,0.82) 100%)",
                  backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)",
                  border: "1px solid rgba(212,175,55,0.22)", borderRadius: 18,
                  padding: "48px 64px", textAlign: "center",
                  minWidth: "min(460px, 88vw)",
                  boxShadow: "0 30px 80px rgba(0,0,0,0.95), 0 0 60px rgba(212,175,55,0.06)" }}>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 8, letterSpacing: "0.44em",
                  color: "rgba(212,175,55,0.52)", textTransform: "uppercase" as const, margin: "0 0 14px" }}>Centralized Core</p>
                <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(2.2rem,4.5vw,3.6rem)", fontWeight: 300,
                  color: "#ffffff", letterSpacing: "0.12em", margin: "0 0 6px" }}>CraftHub</h2>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, letterSpacing: "0.18em",
                  color: "rgba(255,255,255,0.28)", textTransform: "uppercase" as const, margin: "0 0 24px" }}>Operational Dashboard</p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" as const }}>
                  {["INVENTORY", "RESERVATIONS", "SESSIONS", "TELEMETRY"].map(s => (
                    <span key={s} style={{ fontFamily: "'Inter',sans-serif", fontSize: 8, letterSpacing: "0.2em",
                      color: "rgba(212,175,55,0.48)", padding: "5px 10px",
                      border: "1px solid rgba(212,175,55,0.16)", borderRadius: 3 }}>{s}</span>
                  ))}
                </div>
                <motion.p animate={{ opacity: [0.28, 0.85, 0.28] }} transition={{ duration: 1.3, repeat: Infinity }}
                  style={{ fontFamily: "'Inter',sans-serif", fontSize: 8, letterSpacing: "0.3em",
                    color: "rgba(212,175,55,0.42)", textTransform: "uppercase" as const, margin: "26px 0 0" }}
                >INITIALIZING PORTFOLIO MATRIX…</motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CockpitIdleView({ onSmokeCraft }: { onSmokeCraft: () => void }) {
  const [ambering, setAmbering] = useState(false);
  const GOLD = "#d4af37";
  function playClick() {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 3400; o.type = "sine";
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.11, ctx.currentTime + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.08);
    } catch {}
  }
  const crafts: { id: string; label: string; sub: string; active: boolean; img: string }[] = [
    { id: "smoke", label: "SMOKECRAFT 360", sub: "The Art of the Cigar",   active: true,  img: "/images/scenes/smokecraft-card.jpg" },
    { id: "pour",  label: "POURCRAFT 360",  sub: "The Craft of the Pour",  active: false, img: "/images/scenes/pourcraft-card.jpg" },
    { id: "beer",  label: "BEERCRAFT 360",  sub: "The Craft of the Brew",  active: false, img: "/images/scenes/brewcraft-card.jpg" },
    { id: "wine",  label: "WINECRAFT 360",  sub: "The Craft of the Vine",  active: false, img: "/images/scenes/vapecraft-card.jpg" },
  ];
  return (
    <div
      style={{ position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 65% 45% at 50% 56%, rgba(255,176,0,0.042) 0%, #000000 68%)",
        display: "flex", flexDirection: "column" as const }}
    >
      {/* 1.9s amber transitional pulse */}
      <AnimatePresence>
        {ambering && (
          <motion.div
            key="amber-pulse"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.65, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.9, times: [0, 0.25, 0.65, 1], ease: "easeInOut" }}
            style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 999,
              background: "radial-gradient(circle at 50% 50%, rgba(255,176,0,0.30) 0%, rgba(212,175,55,0.12) 40%, rgba(0,0,0,0) 78%)" }}
          />
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 56, zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 22px",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, transparent 100%)",
        pointerEvents: "none" }}>
        <button
          onClick={() => window.location.assign("/novee/")}
          style={{ pointerEvents: "all", background: "transparent",
            border: "1px solid rgba(212,175,55,0.38)", color: "rgba(212,175,55,0.72)",
            padding: "9px 18px", borderRadius: 4, fontSize: 10, fontWeight: 700,
            letterSpacing: "0.24em", textTransform: "uppercase" as const,
            cursor: "pointer", fontFamily: "'Inter',sans-serif" }}
        >← NOVEE OS</button>
        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 9, letterSpacing: "0.44em",
          color: "rgba(212,175,55,0.38)", textTransform: "uppercase" as const, margin: 0 }}>CRAFT SELECT</p>
      </div>

      {/* 4 edge-to-edge landscape strips */}
      {crafts.map((c, i) => (
        <motion.button
          key={c.id}
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.18 + i * 0.1, duration: 0.85 }}
          whileHover={c.active ? { backgroundColor: "rgba(212,175,55,0.04)" } : {}}
          whileTap={c.active ? { scale: 0.995 } : {}}
          onTouchStart={() => c.active && !ambering && playClick()}
          onClick={() => { if (c.active && !ambering) { playClick(); setAmbering(true); setTimeout(() => onSmokeCraft(), 1900); } }}
          style={{ flex: 1, position: "relative", border: "none", padding: 0,
            cursor: c.active ? "pointer" : "default", display: "block",
            overflow: "hidden", background: "transparent",
            borderBottom: i < crafts.length - 1 ? "1px solid rgba(212,175,55,0.07)" : "none",
            outline: "none" }}
        >
          {/* Background scene image */}
          <img
            src={c.img} alt={c.label}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover",
              opacity: c.active ? 0.68 : 0.22,
              filter: c.active ? "saturate(1.1) brightness(0.78)" : "saturate(0.25) brightness(0.45)" }}
          />
          {/* Glassmorphic dark overlay */}
          <div style={{ position: "absolute", inset: 0,
            background: c.active
              ? "linear-gradient(90deg, rgba(5,3,0,0.85) 0%, rgba(14,10,0,0.48) 55%, rgba(5,3,0,0.20) 100%)"
              : "linear-gradient(90deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.65) 55%, rgba(0,0,0,0.30) 100%)" }} />
          {/* Strip content — horizontal layout */}
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center",
            padding: "0 56px", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 8, fontWeight: 700,
                letterSpacing: "0.38em", textTransform: "uppercase" as const,
                color: c.active ? "rgba(212,175,55,0.75)" : "rgba(255,255,255,0.22)",
                margin: "0 0 8px" }}>{c.active ? "ACTIVE" : "COMING SOON"}</p>
              <h2 style={{ fontFamily: "'Cormorant Garamond',serif",
                fontSize: "clamp(1.6rem,3.2vw,2.6rem)", fontWeight: 400,
                color: c.active ? GOLD : "rgba(255,255,255,0.30)",
                margin: "0 0 6px", letterSpacing: "0.06em" }}>{c.label}</h2>
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 400,
                color: c.active ? "rgba(255,252,245,0.58)" : "rgba(255,255,255,0.18)",
                margin: 0, letterSpacing: "0.18em", textTransform: "uppercase" as const }}>{c.sub}</p>
            </div>
            {c.active && (
              <motion.span
                animate={{ x: [0, 6, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(1.4rem,2.8vw,2.2rem)",
                  color: "rgba(212,175,55,0.50)", letterSpacing: "0.1em", display: "block" }}
              >→</motion.span>
            )}
          </div>
        </motion.button>
      ))}
    </div>
  );
}

function GatewayIntro({ onEnterNew, onBack, onStartSession }: {
  onEnterNew: () => void;
  onBack: () => void;
  onStartSession: (xp: number) => void;
}) {
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [lastName,    setLastName]    = useState("");
  const [phoneLast4,  setPhoneLast4]  = useState("");
  const [loading,     setLoading]     = useState(false);
  const [errMsg,      setErrMsg]      = useState<string | null>(null);

  function playClick() {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 3400; o.type = "sine";
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.11, ctx.currentTime + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  async function handleLookup() {
    if (!lastName.trim() || phoneLast4.trim().length !== 4) return;
    setLoading(true); setErrMsg(null);
    try {
      const res = await fetch("/api/auth/guest-return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastName: lastName.trim(), phoneLast4: phoneLast4.trim() }),
      });
      if (!res.ok) { setErrMsg("Profile not found. Please check your details."); setLoading(false); return; }
      const profile = await res.json() as { totalMastery?: number };
      setLoading(false);
      onStartSession(profile.totalMastery ?? 0);
    } catch { setErrMsg("Connection error. Try again."); setLoading(false); }
  }

  return (
    <motion.div
      key="gw-intro"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 1.2 }}
      style={{ ...GW.bg, justifyContent: "flex-end", padding: 0 }}
      className="relative flex flex-col"
    >
      {/* Full-bleed hero */}
      <div className="absolute inset-0">
        <img
          src={imgGoldenBox}
          alt="Sovereign Humidor"
          className="w-full h-full object-cover"
          style={{ filter: "brightness(0.38) saturate(1.1)" }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(5,3,0,0.97) 0%, rgba(5,3,0,0.55) 45%, rgba(5,3,0,0.2) 100%)",
        }} />
      </div>

      {/* Burning cigar — anchored at bottom, tied to SmokeCanvas layer */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex",
        justifyContent: "center", alignItems: "flex-end", pointerEvents: "none", zIndex: 8, paddingBottom: 0 }}>
        <div style={{ position: "relative", width: 340, height: 108 }}>
          {/* Cigar body */}
          <div style={{ position: "absolute", bottom: 10, left: 10, right: 52, height: 22,
            borderRadius: "14px 3px 3px 14px",
            background: "linear-gradient(to bottom, #8B4A32 0%, #4E2016 50%, #7A3D28 100%)",
            boxShadow: "0 4px 14px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,200,150,0.10)" }} />
          {/* Wrapper band */}
          <div style={{ position: "absolute", bottom: 7, left: 160, width: 4, height: 28,
            background: "rgba(212,175,55,0.52)", borderRadius: 2 }} />
          {/* Ember glow */}
          <motion.div
            animate={{ boxShadow: [
              "0 0 12px 5px rgba(255,90,0,0.42), 0 0 26px 10px rgba(255,60,0,0.20)",
              "0 0 22px 10px rgba(255,120,0,0.62), 0 0 50px 20px rgba(255,80,0,0.32)",
              "0 0 15px 6px rgba(255,95,0,0.48), 0 0 34px 13px rgba(255,70,0,0.26)"
            ] }}
            transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "absolute", bottom: 11, right: 40, width: 22, height: 20,
              borderRadius: "2px 8px 8px 2px",
              background: "radial-gradient(ellipse at 58% 50%, #FF8500, #FF3800 38%, #1E0600 80%)" }}
          />
          {/* Ash tip */}
          <div style={{ position: "absolute", bottom: 12, right: 28, width: 14, height: 18,
            borderRadius: "0 8px 8px 0", background: "rgba(215,205,192,0.72)" }} />
          {/* Rising smoke wisps */}
          {[0, 1, 2].map(wi => (
            <motion.div key={wi}
              animate={{ y: [-8, -60 - wi*10], x: [0, (wi-1)*12], opacity: [0.52, 0], scale: [0.55, 1.5] }}
              transition={{ duration: 1.9 + wi*0.5, repeat: Infinity, delay: wi*0.65, ease: "easeOut" }}
              style={{ position: "absolute", bottom: 32, right: 44 + wi*4, width: 12, height: 12,
                borderRadius: "50%", background: "rgba(180,160,130,0.45)", filter: "blur(4px)" }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 pb-12 pt-10 w-full max-w-2xl mx-auto min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: "linear-gradient(135deg, rgba(15,15,15,0.85) 0%, rgba(5,5,5,0.70) 100%)",
            backdropFilter: "blur(30px)",
            WebkitBackdropFilter: "blur(30px)",
            border: "1px solid rgba(212,175,55,0.15)",
            borderRadius: 14,
            padding: "44px 40px 40px",
            width: "100%",
            textAlign: "left" as const,
            marginBottom: 28,
          }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 1.1 }}
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              background: "linear-gradient(180deg, #ffffff 0%, #dfba73 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontSize: "clamp(2.4rem, 5vw, 3.6rem)",
              fontWeight: 300,
              letterSpacing: "0.06em",
              margin: "0 0 30px 0",
              lineHeight: 1.1,
            }}
          >
            The Art of the Cigar
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 1.1 }}
            style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}
          >
            <p style={{ fontSize: "clamp(18px, 2.4vw, 22px)", lineHeight: 1.8, color: "rgba(255,252,245,0.90)", fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, margin: 0 }}>
              SmokeCraft was designed to help you experience cigars differently.
            </p>
            <p style={{ fontSize: "clamp(18px, 2.4vw, 22px)", lineHeight: 1.8, color: "rgba(255,252,245,0.80)", fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, margin: 0 }}>
              Not just by smoking them &mdash; but by understanding them.
            </p>
            <p style={{ fontSize: "clamp(18px, 2.4vw, 22px)", lineHeight: 1.8, color: "rgba(255,252,245,0.80)", fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, margin: 0 }}>
              Learn how tobacco leaves are cultivated, how blends are crafted, how wrappers change flavor, and how pairings elevate the experience.
            </p>
            <p style={{ fontSize: "clamp(18px, 2.4vw, 22px)", lineHeight: 1.8, color: "rgba(255,252,245,0.80)", fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, margin: 0 }}>
              Then build your own personalized cigar profile guided by master mentors, flavor science, and luxury pairing recommendations.
            </p>
            <p style={{ fontSize: "clamp(20px, 2.6vw, 24px)", lineHeight: 1.75, color: "rgba(212,175,55,0.88)", fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontWeight: 300, margin: 0, marginTop: 4 }}>
              Your journey into cigar culture begins here.
            </p>
          </motion.div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.9 }}
          style={{ display: "flex", flexDirection: "column" as const, alignItems: "stretch", gap: 14, width: "100%" }}
        >
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: "0 0 48px rgba(212,175,55,0.38), 0 0 90px rgba(212,175,55,0.14), inset 0 1px 0 rgba(255,255,255,0.10)" }}
            whileTap={{ scale: 0.96, y: 2, boxShadow: "inset 0px 4px 12px rgba(0,0,0,0.80)" }}
            style={{
              ...GW.btn(),
              minHeight: 62,
              fontSize: "clamp(13px, 1.8vw, 15px)",
              letterSpacing: "0.36em",
              boxShadow: "0 0 28px rgba(212,175,55,0.24), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
            onTouchStart={() => playClick()}
            onClick={() => { playClick(); onEnterNew(); }}
          >
            BEGIN JOURNEY
          </motion.button>
          <button
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(212,175,55,0.55)",
              padding: "10px 20px",
              minHeight: 44,
              fontSize: "clamp(10px, 1.2vw, 11px)",
              fontWeight: 500,
              letterSpacing: "0.32em",
              textTransform: "uppercase" as const,
              cursor: "pointer",
              fontFamily: "'Inter',sans-serif",
              textDecoration: "underline",
              textDecorationColor: "rgba(212,175,55,0.24)",
              textUnderlineOffset: "5px",
              transition: "all 0.25s ease",
            }}
            onTouchStart={() => playClick()}
            onClick={() => { playClick(); setDrawerOpen(true); }}
          >
            RETURNING MASTERCLASS GUEST
          </button>
          <button
            style={{
              background: "transparent",
              border: "1px solid rgba(212,175,55,0.28)",
              color: "rgba(212,175,55,0.50)",
              padding: "12px 40px",
              minHeight: 44,
              fontSize: "clamp(10px, 1.2vw, 11px)",
              fontWeight: 600,
              letterSpacing: "0.28em",
              textTransform: "uppercase" as const,
              borderRadius: 4,
              cursor: "pointer",
              fontFamily: "'Inter',sans-serif",
              transition: "all 0.25s ease",
            }}
            onTouchStart={() => playClick()}
            onClick={() => { playClick(); onBack(); }}
          >
            ← BACK
          </button>
        </motion.div>
      </div>

      {/* Returning guest slide-up drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            style={{
              position: "fixed", bottom: 0, left: 0, right: 0,
              background: "rgba(8,6,2,0.96)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderTop: "1px solid rgba(212,175,55,0.35)",
              borderRadius: "20px 20px 0 0",
              padding: "36px 32px 48px",
              zIndex: 9999998,
            }}
          >
            <div style={{ maxWidth: 480, margin: "0 auto" }}>
              <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(1.4rem,2.4vw,1.85rem)", color: "#d4af37", fontWeight: 300, margin: "0 0 6px", letterSpacing: "0.04em" }}>Returning Guest Access</p>
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: "rgba(255,252,245,0.45)", letterSpacing: "0.18em", textTransform: "uppercase" as const, margin: "0 0 28px" }}>Verify your identity to resume your journey</p>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 14, marginBottom: 20 }}>
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={e => { setLastName(e.target.value); setErrMsg(null); }}
                  style={{
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.30)",
                    borderRadius: 6, padding: "16px 18px", color: "#fff",
                    fontSize: 15, fontFamily: "'Inter',sans-serif", outline: "none", width: "100%",
                    boxSizing: "border-box" as const,
                  }}
                />
                <input
                  type="tel"
                  placeholder="Last 4 of phone"
                  maxLength={4}
                  value={phoneLast4}
                  onChange={e => { setPhoneLast4(e.target.value.replace(/\D/g, "").slice(0, 4)); setErrMsg(null); }}
                  style={{
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.30)",
                    borderRadius: 6, padding: "16px 18px", color: "#fff",
                    fontSize: 15, fontFamily: "'Inter',sans-serif", outline: "none", width: "100%",
                    boxSizing: "border-box" as const,
                  }}
                />
              </div>
              {errMsg && <p style={{ color: "#f87171", fontSize: 12, fontFamily: "'Inter',sans-serif", margin: "0 0 14px" }}>{errMsg}</p>}
              <div style={{ display: "flex", gap: 12 }}>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleLookup}
                  disabled={loading || !lastName.trim() || phoneLast4.length !== 4}
                  style={{
                    flex: 1, ...GW.btn(), minHeight: 54, fontSize: "clamp(11px,1.5vw,13px)",
                    letterSpacing: "0.28em",
                    opacity: (!lastName.trim() || phoneLast4.length !== 4) ? 0.45 : 1,
                    cursor: (!lastName.trim() || phoneLast4.length !== 4) ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "SEARCHING\u2026" : "CONFIRM IDENTITY"}
                </motion.button>
                <button
                  onClick={() => { setDrawerOpen(false); setErrMsg(null); setLastName(""); setPhoneLast4(""); }}
                  style={{
                    background: "transparent", border: "1px solid rgba(212,175,55,0.28)",
                    color: "rgba(212,175,55,0.55)", padding: "14px 22px", borderRadius: 4,
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase" as const,
                    cursor: "pointer", fontFamily: "'Inter',sans-serif",
                  }}
                >CANCEL</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Gateway: Orientation ────────────────────────────────────────────────────
function GatewayOrientation({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <motion.div
      key="gw-orientation"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.9 }}
      style={GW.bg}
    >
      <div style={GW.chamber} className="flex flex-col gap-0 overflow-y-auto">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Text block */}
          <div className="flex-1 min-w-0">
            <p style={{ ...GW.para, fontSize: 16, letterSpacing: "0.18em", color: `${GOLD}90`, textTransform: "uppercase", marginBottom: 10 }}>
              SmokeCraft · Your Cigar Journey
            </p>
            <h2 style={GW.title}>From Leaf to Legacy</h2>
            <p style={GW.para}>
              Every great cigar begins long before the first draw — in the soil, the sun, and the hands of the craftspeople who shaped it.
            </p>
            <p style={GW.para}>
              Here, you will explore the world’s great tobacco regions, discover the art of the blend, and find the master mentor who matches your palate.
            </p>
            <p style={{ ...GW.para, color: `${GOLD}80`, fontSize: "clamp(13px, 1.5vw, 15px)", fontStyle: "italic" }}>
              This is not a tutorial. This is an immersion into the culture, craft, and pleasure of the cigar.
            </p>
          </div>

          {/* Reference image panels */}
          <div className="flex flex-col gap-3 flex-shrink-0 w-full lg:w-80">
            <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${GOLD}22` }}>
              <img
                src={imgSovereignMap}
                alt="Private Lounge"
                className="w-full h-auto object-cover"
                style={{ filter: "brightness(0.85)", maxHeight: 180, objectFit: "cover", width: "100%" }}
              />
              <div style={{ background: "rgba(8,9,11,0.85)", padding: "6px 12px" }}>
                <p style={{ color: `${GOLD}70`, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", margin: 0 }}>
                  Private Lounge · Reserve Experience
                </p>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${GOLD}22` }}>
              <img
                src={imgCultivation}
                alt="Cultivation & Harvest Protocol"
                className="w-full object-cover"
                style={{ filter: "brightness(0.82)", maxHeight: 150, objectFit: "cover", width: "100%" }}
              />
              <div style={{ background: "rgba(8,9,11,0.85)", padding: "6px 12px" }}>
                <p style={{ color: `${GOLD}70`, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", margin: 0 }}>
                  The Art of Cultivation
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-6 gap-4">
          <button style={GW.btn(true)} onClick={onBack}>Back</button>
          <motion.button
            style={GW.btn()}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onNext}
          >
            Meet Your Mentor
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Gateway: Mentor Selection ───────────────────────────────────────────────
function GatewayMentor({
  selected, onSelect, onNext, onBack,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { speak, stopSpeak } = useAudio();
  const [voiceMuted, setVoiceMuted] = useState(false);
  const prevSelected = useRef<string | null>(null);
  const GOLD = "#d4af37";

  useEffect(() => {
    if (selected && selected !== prevSelected.current && !voiceMuted) {
      const m = MENTORS.find(x => x.id === selected);
      if (m) speak(`${m.name}. ${m.bio}`);
    }
    prevSelected.current = selected;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, voiceMuted]);

  function handleMuteToggle() {
    setVoiceMuted(v => { if (!v) stopSpeak(); return !v; });
  }

  return (
    <motion.div
      key="gw-mentor"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9 }}
      style={GW.bg}
    >
      <div style={GW.chamber} className="overflow-y-auto">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <p style={{ ...GW.para, fontSize: 10, letterSpacing: "0.38em", color: `${GOLD}80`, textTransform: "uppercase" as const, margin: "0 0 6px" }}>
              Movement I · Phase 1
            </p>
            <h2 style={{ ...GW.title, margin: "0 0 6px" }}>Master Mentor Council</h2>
            <p style={{ ...GW.para, margin: 0 }}>
              Select your craft authority. Their technique, regional terroir, and tobacco lineage define your entire build arc.
            </p>
          </div>
          <button
            onClick={handleMuteToggle}
            style={{
              flexShrink: 0, marginLeft: 18, marginTop: 4,
              background: voiceMuted ? "rgba(255,255,255,0.05)" : "rgba(212,175,55,0.12)",
              border: `1px solid ${voiceMuted ? "rgba(255,255,255,0.15)" : "rgba(212,175,55,0.45)"}`,
              color: voiceMuted ? "rgba(255,255,255,0.35)" : GOLD,
              borderRadius: 4, padding: "7px 14px",
              fontSize: 9, fontWeight: 700, letterSpacing: "0.25em",
              textTransform: "uppercase" as const, cursor: "pointer",
              fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" as const,
            }}
          >
            {voiceMuted ? "VOICE OFF" : "MUTE"}
          </button>
        </div>

        {/* Portrait grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, margin: "24px 0 28px" }}>
          {MENTORS.map((m, idx) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + idx * 0.1, duration: 0.7 }}
              whileHover={{ scale: 1.025, boxShadow: `0 0 40px rgba(212,175,55,${selected === m.id ? "0.30" : "0.14"})` }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(m.id)}
              style={{
                borderRadius: 12, overflow: "hidden",
                border: selected === m.id ? "1.5px solid rgba(212,175,55,0.70)" : "1px solid rgba(212,175,55,0.14)",
                background: "linear-gradient(135deg, rgba(15,15,15,0.88) 0%, rgba(5,5,5,0.75) 100%)",
                backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)",
                boxShadow: selected === m.id
                  ? "0 0 36px rgba(212,175,55,0.22), 0 25px 60px rgba(0,0,0,0.95)"
                  : "0 25px 60px rgba(0,0,0,0.95)",
                cursor: "pointer", position: "relative" as const,
              }}
            >
              {/* Cinematic portrait */}
              <div style={{ position: "relative", height: 210, overflow: "hidden" }}>
                <img
                  src={m.portrait}
                  alt={m.name}
                  style={{
                    width: "100%", height: "100%",
                    objectFit: "cover", objectPosition: "top center",
                    filter: "brightness(0.68) saturate(0.85) contrast(1.08)",
                    display: "block",
                  }}
                />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "55%",
                  background: "linear-gradient(to top, rgba(5,5,5,0.92) 0%, transparent 100%)" }} />
                <div style={{ position: "absolute", bottom: 12, left: 14 }}>
                  <span style={{ fontSize: 20, lineHeight: 1 }}>{m.flag}</span>
                  <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 9, letterSpacing: "0.22em",
                    color: "rgba(212,175,55,0.75)", textTransform: "uppercase" as const, margin: "4px 0 0" }}>{m.origin}</p>
                </div>
                {selected === m.id && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ position: "absolute", inset: 0, border: "2px solid rgba(212,175,55,0.55)",
                      borderRadius: 12, pointerEvents: "none" }}
                  />
                )}
              </div>
              {/* Info panel */}
              <div style={{ padding: "16px 18px 20px" }}>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 9, letterSpacing: "0.32em",
                  color: `${GOLD}70`, textTransform: "uppercase" as const, margin: "0 0 5px" }}>{m.tag}</p>
                <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(1.15rem,2.2vw,1.45rem)",
                  color: "#fffcf5", margin: "0 0 4px", fontWeight: 500 }}>{m.name}</h3>
                <p style={{ color: GOLD, fontSize: 11, fontWeight: 600, margin: "0 0 10px" }}>{m.style}</p>
                <p style={{ color: "rgba(205,208,212,0.82)", fontSize: "clamp(12px,1.4vw,13px)", lineHeight: 1.65, margin: 0 }}>{m.bio}</p>
                {selected === m.id && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    style={{ marginTop: 12, color: GOLD, fontSize: 9, letterSpacing: "0.3em", textTransform: "uppercase" as const }}
                  >
                    ✶ MENTOR CONFIRMED
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-between gap-4">
          <button style={GW.btn(true)} onClick={onBack}>Back</button>
          <motion.button
            style={GW.btn(!selected)}
            whileHover={selected ? { scale: 1.03 } : {}}
            whileTap={selected ? { scale: 0.97 } : {}}
            onClick={() => selected && onNext()}
          >
            Confirm &amp; Select Seed Base
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Gateway: Cultivation (Seed + Soil) ─────────────────────────────────────
// -- Gateway: Tobacco Terroir & Craft (Stage 3a) ---------------------------
// ── Settle & Order Now — sensory matrix + KDS push ─────────────────────
function SettleOrderPanel({ currentCountry, finalScore }: {
  currentCountry: string | null; finalScore: number;
}) {
  const [orderSent, setOrderSent] = useState(false);
  const [sending,   setSending]   = useState(false);

  const visited    = loadVisitedCountries();
  const allVisited = currentCountry
    ? [...new Set([...visited, currentCountry])]
    : visited;
  const isUnlocked = allVisited.length >= 2;
  const matrix     = currentCountry ? SENSORY_MATRIX[currentCountry] ?? null : null;

  async function handleSettle() {
    if (!isUnlocked || sending || orderSent) return;
    setSending(true);
    try {
      await fetch("/api/pos/settle-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          country: currentCountry, cigar: matrix?.cigar,
          spirit:  matrix?.spirit, foods: matrix?.foods, finalScore,
        }),
      });
      setOrderSent(true);
    } catch { /* offline */ } finally { setSending(false); }
  }

  const btnBorder = `1.5px solid ${isUnlocked ? GOLD : 'rgba(255,255,255,0.14)'}`;
  const btnBg     = orderSent
    ? "rgba(74,222,128,0.12)"
    : isUnlocked
      ? `linear-gradient(135deg,${GOLD}18,rgba(0,0,0,0.55))`
      : "rgba(255,255,255,0.04)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0  }}
      transition={{ delay: 0.6, duration: 0.7 }}
      style={{
        background: "rgba(0,0,0,0.58)", border: `1px solid ${GOLD}30`,
        borderRadius: 12, padding: "20px 22px", marginBottom: 20,
        backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)",
        width: "100%", maxWidth: 448,
      }}
    >
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center",
        justifyContent:"space-between", marginBottom:14,
        flexWrap:"wrap" as const, gap:8 }}>
        <span style={{ color:`${GOLD}90`, fontSize:9, fontWeight:800,
          letterSpacing:"0.34em", textTransform:"uppercase" as const }}>
          Origin Sensory Matrix
        </span>
        {currentCountry && (
          <span style={{ color:GOLD, fontSize:11, fontWeight:700, letterSpacing:"0.16em" }}>
            {COUNTRY_FLAGS[currentCountry] ?? ""} {currentCountry}
          </span>
        )}
      </div>

      {/* Product trio */}
      {matrix ? (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
          gap:8, marginBottom:16 }}>
          {[
            { label:"Cigar",   icon:"\u{1F6AC}", name:matrix.cigar,    sub:matrix.descriptors.join(" · ") },
            { label:"Spirit",  icon:"\u{1F943}", name:matrix.spirit,   sub:matrix.spiritStyle },
            { label:"Cuisine", icon:"\u{1F356}", name:matrix.foods[0], sub:matrix.foods[1] },
          ].map(col => (
            <div key={col.label} style={{
              background:`rgba(212,175,55,0.07)`, border:`1px solid ${GOLD}22`,
              borderRadius:8, padding:"10px 8px", textAlign:"center" as const }}>
              <div style={{ color:`${GOLD}60`, fontSize:8, letterSpacing:"0.26em",
                textTransform:"uppercase" as const, marginBottom:6 }}>{col.label}</div>
              <div style={{ fontSize:20, marginBottom:5 }}>{col.icon}</div>
              <div style={{ color:"rgba(240,232,212,0.90)", fontSize:10,
                fontWeight:700, lineHeight:1.35 }}>{col.name}</div>
              <div style={{ color:`${GOLD}50`, fontSize:8, marginTop:4,
                lineHeight:1.4 }}>{col.sub}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color:"rgba(240,232,212,0.30)", fontSize:13,
          textAlign:"center" as const, padding:"16px 0", letterSpacing:"0.08em" }}>
          Select your origin terroir to reveal your sensory pairing
        </div>
      )}

      {/* Settle & Order button */}
      <motion.button
        whileHover={isUnlocked && !orderSent ? { scale:1.02 } : {}}
        whileTap={isUnlocked  && !orderSent ? { scale:0.97 } : {}}
        onClick={handleSettle}
        disabled={!isUnlocked || orderSent || sending}
        style={{
          width:"100%", padding:"14px 20px", borderRadius:8,
          border: btnBorder, background: btnBg,
          cursor: isUnlocked && !orderSent ? "pointer" : "default",
          display:"flex", alignItems:"center", justifyContent:"center", gap:10,
          backdropFilter:"blur(12px)",
        }}
      >
        {orderSent ? (
          <><span style={{ color:"#4ade80", fontSize:16 }}>✓</span>
            <span style={{ color:"#4ade80", fontSize:13, fontWeight:700,
              letterSpacing:"0.16em", textTransform:"uppercase" as const }}>
              Kitchen &amp; Bar Notified</span></>
        ) : sending ? (
          <span style={{ color:`${GOLD}80`, fontSize:13,
            letterSpacing:"0.14em", textTransform:"uppercase" as const }}>
            Sending to Terminal…
          </span>
        ) : isUnlocked ? (
          <><span style={{ fontSize:18 }}>{"\u{1F4B3}"}</span>
            <span style={{ color:GOLD, fontSize:13, fontWeight:700,
              letterSpacing:"0.18em", textTransform:"uppercase" as const }}>
              Settle &amp; Order Now</span></>
        ) : (
          <><span style={{ fontSize:16 }}>{"\u{1F512}"}</span>
            <span style={{ color:"rgba(240,232,212,0.35)", fontSize:12,
              letterSpacing:"0.14em", textTransform:"uppercase" as const }}>
              Complete 2nd Origin to Unlock</span></>
        )}
      </motion.button>

      {!isUnlocked && (
        <p style={{ color:"rgba(212,175,55,0.38)", fontSize:11,
          textAlign:"center" as const, margin:"10px 0 0", letterSpacing:"0.08em" }}>
          {allVisited.length}/2 origins completed — return for a second masterclass
        </p>
      )}
    </motion.div>
  );
}

// ── Mastery Progress Lock Banner (fixed top, blending phase only) ───────────────
function ProgressLockBanner({ xp }: { xp: number }) {
  const tier   = getTier(xp);
  const tiers  = [...MASTERY_TIERS] as MasteryTier[];
  const next   = tiers.find(t => t.rank === tier.rank + 1);
  const pct    = next ? Math.min(((xp - tier.min) / (next.min - tier.min)) * 100, 100) : 100;
  const remain = next ? Math.max(next.min - xp, 0) : 0;
  return (
    <motion.div initial={{ y: -48, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{ position:"fixed", top:0, left:0, right:0, zIndex:9994,
        background:"rgba(0,0,0,0.88)", backdropFilter:"blur(20px)",
        borderBottom:`1px solid ${tier.color}28`, padding:"10px 22px",
        display:"flex", alignItems:"center", gap:18, flexWrap:"wrap" as const }} >
      <div style={{ display:"flex", flexDirection:"column" as const, minWidth:155 }}>
        <span style={{ color:tier.color, fontSize:11, fontWeight:800,
          letterSpacing:"0.28em", textTransform:"uppercase" as const }}>{tier.name}</span>
        <span style={{ color:"rgba(240,232,212,0.44)", fontSize:11,
          letterSpacing:"0.08em" }}>{tier.sessionLabel}</span>
      </div>
      <div style={{ flex:1, maxWidth:300 }}>
        <div style={{ height:4, borderRadius:2, background:"rgba(255,255,255,0.07)",
          overflow:"hidden", marginBottom:4 }}>
          <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }}
            transition={{ duration:1.3, ease:"easeOut" }}
            style={{ height:"100%", borderRadius:2,
              background:`linear-gradient(90deg,${tier.color},${tier.color}80)` }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <span style={{ color:`${GOLD}70`, fontSize:11 }}>{xp} XP</span>
          {next
            ? <span style={{ color:"rgba(240,232,212,0.37)", fontSize:11 }}>
                {remain} pts to <span style={{ color:next.color }}>{next.name}</span>
              </span>
            : <span style={{ color:tier.color, fontSize:11 }}>★ MAX TIER</span>}
        </div>
      </div>
      <div style={{ display:"flex", gap:5, alignItems:"center" }}>
        {tiers.map(t => (
          <div key={t.rank} title={t.name} style={{ width:9, height:9, borderRadius:"50%",
            transition:"background 0.4s",
            background: xp >= t.min ? t.color : "rgba(255,255,255,0.10)",
            border: xp >= t.min ? "none" : `1px solid ${t.color}35` }} />
        ))}
      </div>
      {next && <span style={{ color:"rgba(240,232,212,0.35)", fontSize:11,
        letterSpacing:"0.06em", whiteSpace:"nowrap" as const }}>
        {remain} more XP to unlock {next.sessionLabel}</span>}
    </motion.div>
  );
}

// ── Country Passport Tracker (dual-flag split, localStorage-backed) ─────────────
function CountryTracker({ currentCountry }: { currentCountry: string | null }) {
  const [allVisited, setAllVisited] = useState<string[]>([]);
  useEffect(() => { setAllVisited(loadVisitedCountries()); }, []);
  const combined = currentCountry ? [...new Set([...allVisited, currentCountry])] : allVisited;
  const hasTwo   = combined.length >= 2;
  const slot1    = combined[0] ?? null;
  const slot2    = combined[1] ?? null;
  return (
    <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
      transition={{ delay:0.45, duration:0.6 }}
      style={{ background: hasTwo ? "rgba(212,175,55,0.06)" : "rgba(0,0,0,0.45)",
        border:`1px solid ${hasTwo ? GOLD+"38" : "rgba(255,255,255,0.10)"}`,
        borderRadius:10, padding:"16px 20px", marginBottom:20,
        backdropFilter:"blur(20px)" }} >
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14,
        flexWrap:"wrap" as const }}>
        <span style={{ color: hasTwo ? GOLD : "rgba(240,232,212,0.50)", fontSize:12,
          fontWeight:800, letterSpacing:"0.24em", textTransform:"uppercase" as const }}>
          Origin Passport — {combined.length}/2 Countries
        </span>
        {hasTwo && <motion.span initial={{ scale:0 }} animate={{ scale:1 }}
          style={{ color:"#4ade80", fontSize:18, lineHeight:1 }}>✓</motion.span>}
      </div>
      <div style={{ display:"flex", gap:12, flexWrap:"wrap" as const }}>
        {([slot1, slot2] as (string|null)[]).map((country, i) => (
          <div key={i} style={{ flex:1, minWidth:140,
            background: country ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.015)",
            border:`1.5px solid ${country ? GOLD+"38" : "rgba(255,255,255,0.09)"}`,
            borderRadius:8, padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
            {country ? (
              <>
                <span style={{ fontSize:28, lineHeight:1 }}>{COUNTRY_FLAGS[country] ?? "\u{1F33F}"}</span>
                <div>
                  <div style={{ color:GOLD, fontSize:14, fontWeight:700 }}>{country}</div>
                  <div style={{ color:"#4ade80", fontSize:11, letterSpacing:"0.14em", marginTop:3 }}>✓ PROFILE LOCKED</div>
                </div>
              </>
            ) : (
              <>
                <div style={{ width:30, height:30, borderRadius:"50%", flexShrink:0,
                  border:"1.5px dashed rgba(212,175,55,0.28)",
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ color:"rgba(212,175,55,0.38)", fontSize:14 }}>?</span>
                </div>
                <div>
                  <div style={{ color:"rgba(240,232,212,0.35)", fontSize:14 }}>Country {i + 1}</div>
                  <div style={{ color:"rgba(212,175,55,0.32)", fontSize:11, marginTop:3,
                    letterSpacing:"0.12em", textTransform:"uppercase" as const }}>
                    {i === 0 ? "Select Terroir" : "Return to Unlock"}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <p style={{ color: hasTwo ? "#4ade80" : "rgba(240,232,212,0.40)",
        fontSize:14, lineHeight:1.55, margin:"12px 0 0", letterSpacing:"0.03em" }}>
        {hasTwo
          ? "★ Dual-origin mastery achieved — Golden Box Vault access granted."
          : "Complete a second origin masterclass to unlock the Golden Box Vault and Master Sommelier status."}
      </p>
    </motion.div>
  );
}

// ── Mentor Assist Overlay — slides up on each intermediate phase ──────────────────
function MentorAssistOverlay({ mentorId, onAcknowledge }: {
  mentorId: string | null;
  onAcknowledge: () => void;
}) {
  const mentor = MENTORS.find(m => m.id === mentorId);
  if (!mentor) return null;
  return (
    <motion.div
      key={`ma-${mentorId}`}
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ delay: 0.65, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50000,
        background: "linear-gradient(to top, rgba(4,2,0,0.99) 0%, rgba(10,7,2,0.97) 100%)",
        backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
        borderTop: "1px solid rgba(212,175,55,0.40)",
        borderRadius: "22px 22px 0 0",
        padding: "24px 28px 40px",
        boxShadow: "0 -28px 80px rgba(0,0,0,0.90)",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 8, letterSpacing: "0.48em",
          color: "rgba(212,175,55,0.48)", textTransform: "uppercase" as const, margin: "0 0 16px" }}>
          MASTER MENTOR ASSIST • GUIDANCE MODE
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 18 }}>
          <img src={mentor.portrait} alt={mentor.name}
            style={{ width: 70, height: 70, borderRadius: "50%", objectFit: "cover",
              border: "2px solid rgba(212,175,55,0.50)",
              boxShadow: "0 0 30px rgba(212,175,55,0.24), 0 8px 20px rgba(0,0,0,0.85)" }} />
          <div>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.5rem",
              color: "#ffffff", fontWeight: 300, margin: "0 0 4px", letterSpacing: "0.04em" }}>
              {mentor.flag} {mentor.name}
            </p>
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 8, letterSpacing: "0.28em",
              color: "rgba(212,175,55,0.50)", textTransform: "uppercase" as const, margin: 0 }}>
              {mentor.tag}
            </p>
          </div>
        </div>
        <div style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.18)",
          borderRadius: 10, padding: "16px 20px", marginBottom: 22 }}>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.08rem", lineHeight: 1.78,
            color: "rgba(240,232,212,0.90)", margin: 0, fontStyle: "italic" }}>
            &ldquo;{mentor.guidance}&rdquo;
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96, y: 2 }}
          onClick={onAcknowledge}
          style={{ width: "100%", ...GW.btn(), minHeight: 56,
            fontSize: "clamp(11px,1.6vw,13px)", letterSpacing: "0.34em",
            background: "linear-gradient(135deg, rgba(212,175,55,0.20) 0%, rgba(180,145,30,0.16) 100%)",
            border: "1px solid rgba(212,175,55,0.58)", color: GOLD }}
        >
          I UNDERSTAND — CONTINUE
        </motion.button>
      </div>
    </motion.div>
  );
}

function GatewayTerroir({ onNext, onBack, onCountrySelect }: {
  onNext: () => void; onBack: () => void; onCountrySelect?: (country: string) => void;
}) {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const REGIONS = [
    {
      region: "Dominican Republic", abbr: "D.R.", flag: "🇩🇴",
      soil: "Volcanic loam \u2014 Cibao Valley", altitude: "400\u2013900 m",
      cure: "Air-cured 45\u201360 days",
      note: "Mild cedar sweetness. Long white ash. Don Manuel\u2019s homeland leaf.",
    },
    {
      region: "Nicaragua", abbr: "NIC", flag: "🇳🇮",
      soil: "Rich black silt \u2014 Jalapa & Estel\u00ed", altitude: "600\u20131 400 m",
      cure: "Double-fermented 90 days",
      note: "Volcanic spice with earth undercurrent. Cocoa finish. Alejandro\u2019s native leaf.",
    },
    {
      region: "Cuba", abbr: "CUB", flag: "🇨🇺",
      soil: "Red laterite \u2014 Vuelta Abajo", altitude: "Sea level",
      cure: "Sun-cured \u2014 pil\u00f3n method",
      note: "The sovereign archetype. Unrivalled complexity. Don Salvador\u2019s legacy territory.",
    },
    {
      region: "Ecuador", abbr: "ECU", flag: "🇪🇨",
      soil: "Andean cloud-forest humus", altitude: "1 200\u20131 800 m",
      cure: "Shade-grown 60 days",
      note: "Silky cream and white pepper. Do\u00f1a Rosa\u2019s signature wrapper origin.",
    },
  ];
  const CURES = [
    { name: "Air Cure",  desc: "Passive barn ventilation 45\u201390 days. Preserves natural sweetness and oils." },
    { name: "Sun Cure",  desc: "Solar dehydration on bamboo racks. Traditional Cuban pil\u00f3n heritage." },
    { name: "Fire Cure", desc: "Open hardwood smoke. Deep penetration. Nicotiana rustica lineage." },
    { name: "Flue Cure", desc: "Indirect heat channels lock glucose. Bright, light body character." },
  ];
  return (
    <motion.div
      key="gw-terroir"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={GW.bg}
    >
      {/* Macro tobacco leaf terrain backdrop */}
      <div className="absolute inset-0" style={{ zIndex: 0, pointerEvents: "none" }}>
        <img
          src="https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=1200&q=80"
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: "brightness(0.18) saturate(0.70)" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 40%, rgba(212,175,55,0.07) 0%, rgba(0,0,0,0.82) 100%)" }} />
      </div>

      <div style={GW.chamber} className="overflow-y-auto">
        <p style={{ ...GW.para, fontSize: 16, letterSpacing: "0.18em", color: `${GOLD}90`, textTransform: "uppercase" as const, marginBottom: 10 }}>
          Tobacco Origins &middot; The Terroir Codex
        </p>
        <h2 style={GW.title}>Tobacco Terroir &amp; Craft</h2>
        <p style={{ color: "rgba(240,232,212,0.65)", fontSize: 17, lineHeight: 1.6, marginBottom: 18, maxWidth: 520 }}>
          Every great cigar starts with its homeland. Tap a region below to discover its soil, altitude, and curing secrets.
        </p>

        {/* Regional terroir grid — TAP TO SELECT */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 22 }}>
          {REGIONS.map(t => {
            const isSelected = selectedRegion === t.region;
            return (
              <motion.div
                key={t.region}
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => { setSelectedRegion(t.region); }}
                style={{
                  background: isSelected ? "rgba(212,175,55,0.13)" : "rgba(212,175,55,0.04)",
                  border: isSelected ? `2px solid ${GOLD}` : `1px solid ${GOLD}22`,
                  borderRadius: 10,
                  padding: "20px 18px",
                  backdropFilter: "blur(12px)",
                  cursor: "pointer",
                  boxShadow: isSelected ? `0 0 28px rgba(212,175,55,0.22)` : "none",
                  transition: "box-shadow 0.3s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 30, lineHeight: "1", flexShrink: 0 }}>{t.flag}</span>
                  <div>
                    <span style={{
                      color: GOLD, fontSize: 13, fontWeight: 700, letterSpacing: "0.06em",
                      background: "rgba(212,175,55,0.15)", border: `1px solid ${GOLD}35`,
                      borderRadius: 3, padding: "3px 8px", display: "inline-block", marginBottom: 4,
                    }}>
                      {t.abbr}
                    </span>
                    <div style={{ color: "rgba(245,235,215,0.90)", fontSize: 16, letterSpacing: "0.08em", fontWeight: 600, textTransform: "uppercase" as const }}>
                      {t.region}
                    </div>
                  </div>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      style={{ marginLeft: "auto", color: GOLD, fontSize: 22, fontWeight: 700 }}
                    >✓</motion.div>
                  )}
                </div>
                {([ ["Soil", t.soil], ["Altitude", t.altitude], ["Cure", t.cure] ] as [string, string][]).map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
                    <span style={{ color: `${GOLD}65`, fontSize: 14, letterSpacing: "0.12em", textTransform: "uppercase" as const, flexShrink: 0 }}>{label}</span>
                    <span style={{ color: "rgba(240,232,212,0.80)", fontSize: 14, textAlign: "right" as const }}>{value}</span>
                  </div>
                ))}
                <motion.p
                  animate={{ maxHeight: isSelected ? 200 : 60, opacity: isSelected ? 1 : 0.55 }}
                  transition={{ duration: 0.35 }}
                  style={{ color: isSelected ? "rgba(240,232,212,0.85)" : "rgba(240,232,212,0.50)", fontSize: isSelected ? 15 : 13, fontStyle: "italic", marginTop: 10, lineHeight: 1.6, overflow: "hidden" }}
                >
                  {t.note}
                </motion.p>
              </motion.div>
            );
          })}
        </div>

        {/* Global curing traditions */}
        <div style={{ background: "rgba(212,175,55,0.03)", border: `1px solid ${GOLD}15`, borderRadius: 8, padding: "14px 16px", marginBottom: 22 }}>
          <p style={{ color: `${GOLD}85`, fontSize: 14, letterSpacing: "0.22em", textTransform: "uppercase" as const, marginBottom: 12 }}>
            Global Curing Traditions
          </p>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 12 }}>
            {CURES.map(c => (
              <div key={c.name} style={{ flex: "1 1 160px" }}>
                <span style={{ color: GOLD, fontSize: 17, fontWeight: 700, letterSpacing: "0.08em", display: "block", marginBottom: 5 }}>{c.name}</span>
                <span style={{ color: "rgba(240,232,212,0.65)", fontSize: 15, lineHeight: 1.6 }}>{c.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <button
            style={GW.btn(true)}
            onTouchStart={() => playClick()}
            onClick={onBack}
          >
            Back
          </button>
          <motion.button
            style={{
              ...GW.btn(!selectedRegion),
              ...(selectedRegion ? {} : { opacity: 0.45, cursor: "not-allowed" }),
            }}
            onTouchStart={() => selectedRegion && playClick()}
            whileHover={selectedRegion ? { scale: 1.03 } : {}}
            whileTap={selectedRegion ? { scale: 0.97, y: 2 } : {}}
            onClick={() => { if (!selectedRegion) return; onCountrySelect?.(selectedRegion); onNext(); }}
          >
            {selectedRegion ? `${selectedRegion} Selected — Continue →` : "Select a Region to Continue"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// -- Gateway: Seed Biology & Priming (Stage 3b) ----------------------------
function GatewaySeedBiology({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [selectedLeaf, setSelectedLeaf] = useState<string | null>(null);
  const LEAVES = [
    {
      id: "volado", pos: "Bottom \u2014 Volado", strength: 14,
      profile: "Light body \u00b7 Combustion agent", color: "#8BC34A",
      note: "Lowest nicotine density. Ensures even burn throughout the smoke. Mild cereal and hay notes. Every master blend needs at least 20% Volado filler for reliable combustion.",
    },
    {
      id: "seco", pos: "Mid \u2014 Seco", strength: 52,
      profile: "Medium body \u00b7 Flavor bridge", color: GOLD,
      note: "The architect\u2019s leaf. Primary flavor expression: cedar, leather, cocoa, or spice. Constitutes 40\u201360% of premium blends. Air-cured to preserve aromatic compounds.",
    },
    {
      id: "ligero", pos: "Crown \u2014 Ligero", strength: 94,
      profile: "Full power \u00b7 Strength apex", color: "#E8741A",
      note: "The sovereign leaf. Highest nicotine density \u2014 requires 18\u201324 months minimum aging. One Ligero filler transforms any blend to full-body. Deploy with measured precision.",
    },
  ];
  const VARIETALS = [
    { name: "Criollo 98",        origin: "Cuba",            body: "Full",  note: "The heritage benchmark" },
    { name: "Corojo 99",         origin: "Cuba / Honduras", body: "Med+",  note: "Spice & red pepper finish" },
    { name: "Habano 2000",       origin: "Nicaragua",       body: "Full",  note: "Earth, cocoa, volcanic mineral" },
    { name: "Connecticut Shade", origin: "Ecuador / USA",   body: "Mild",  note: "Cream, cedar, subtle sweetness" },
    { name: "Broadleaf",         origin: "Connecticut, USA",body: "Full+", note: "Dark wrapper gold standard" },
  ];
  return (
    <motion.div
      key="gw-seed-bio"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={GW.bg}
    >
      {/* Tobacco terrain backdrop - deeper burn for contrast with bars */}
      <div className="absolute inset-0" style={{ zIndex: 0, pointerEvents: "none" }}>
        <img
          src="https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=1200&q=80"
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: "brightness(0.13) saturate(0.55)" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 60%, rgba(255,176,0,0.06) 0%, rgba(0,0,0,0.88) 100%)" }} />
      </div>

      <div style={GW.chamber} className="overflow-y-auto">
        <p style={{ ...GW.para, fontSize: 16, letterSpacing: "0.18em", color: `${GOLD}90`, textTransform: "uppercase" as const, marginBottom: 10 }}>
          Seed &amp; Leaf &middot; The Biology of Flavor
        </p>
        <h2 style={GW.title}>Seed Biology &amp; Priming</h2>
        <p style={{ color: "rgba(240,232,212,0.65)", fontSize: 17, lineHeight: 1.6, marginBottom: 18 }}>
          A cigar's soul lives in the leaf's position on the stalk. Tap each position to reveal its character.
        </p>

        {/* Leaf position architecture */}
        <p style={{ color: `${GOLD}80`, fontSize: 15, letterSpacing: "0.20em", textTransform: "uppercase" as const, marginBottom: 14 }}>
          Leaf Position Architecture &mdash; Flavor Intensity Scale
        </p>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 14, marginBottom: 24 }}>
          {LEAVES.map(leaf => {
            const isOpen = selectedLeaf === leaf.id;
            return (
              <motion.div
                key={leaf.id}
                onClick={() => setSelectedLeaf(isOpen ? null : leaf.id)}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: isOpen ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.025)",
                  border: isOpen ? `1.5px solid ${leaf.color}55` : "1px solid rgba(212,175,55,0.15)",
                  borderRadius: 10, padding: "18px 20px", cursor: "pointer",
                  boxShadow: isOpen ? `0 0 24px ${leaf.color}18` : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap" as const, gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ color: leaf.color, fontSize: 18, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const }}>{leaf.pos}</span>
                    <span style={{ color: "rgba(240,232,212,0.55)", fontSize: 15 }}>{leaf.profile}</span>
                  </div>
                  <span style={{ color: leaf.color, fontSize: 20, fontWeight: 700 }}>{leaf.strength}%</span>
                </div>
                {/* Animated strength bar */}
                <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, marginBottom: 10, overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${leaf.strength}%` }}
                    transition={{ delay: 0.35, duration: 1.0, ease: "easeOut" }}
                    style={{ height: "100%", background: leaf.color, borderRadius: 3 }}
                  />
                </div>
                <AnimatePresence>
                  {isOpen && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ color: "rgba(240,232,212,0.80)", fontSize: 16, lineHeight: 1.65, margin: 0, overflow: "hidden" }}
                    >{leaf.note}</motion.p>
                  )}
                </AnimatePresence>
                {!isOpen && (
                  <p style={{ color: "rgba(240,232,212,0.45)", fontSize: 15, lineHeight: 1.5, margin: 0 }}>Tap to reveal the full character of this leaf position.</p>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Seed varietals */}
        <div style={{ background: "rgba(212,175,55,0.03)", border: `1px solid ${GOLD}13`, borderRadius: 8, padding: "14px 16px", marginBottom: 22 }}>
          <p style={{ color: `${GOLD}85`, fontSize: 14, letterSpacing: "0.20em", textTransform: "uppercase" as const, marginBottom: 12 }}>
            Seed Varietals &amp; Heritage Lines
          </p>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
            {VARIETALS.map(v => (
              <div
                key={v.name}
                style={{ flex: "1 1 150px", background: "rgba(255,255,255,0.02)", borderRadius: 6, padding: "10px 12px", border: `1px solid ${GOLD}0F` }}
              >
                <span style={{ color: GOLD, fontSize: 16, fontWeight: 700, display: "block", marginBottom: 4 }}>{v.name}</span>
                <span style={{ color: "rgba(240,232,212,0.55)", fontSize: 14, display: "block", marginBottom: 4 }}>{v.origin} &middot; {v.body} body</span>
                <span style={{ color: "rgba(240,232,212,0.70)", fontSize: 14, fontStyle: "italic" }}>{v.note}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <button
            style={GW.btn(true)}
            onTouchStart={() => playClick()}
            onClick={onBack}
          >
            Back
          </button>
          <motion.button
            style={GW.btn()}
            onTouchStart={() => playClick()}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97, y: 2 }}
            onClick={onNext}
          >
            Begin Cultivation &rarr;
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}


function GatewayCultivation({
  selectedSeed, selectedSoil, selectedMentor,
  onSeed, onSoil, onXP,
  onNext, onBack,
}: {
  selectedSeed:   string | null;
  selectedSoil:   string | null;
  selectedMentor: string | null;
  onSeed: (id: string) => void;
  onSoil: (id: string) => void;
  onXP:   (amount: number, e: React.MouseEvent) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const affinityMap: Record<string, string> = {
    tradition: "alluvial",
    botanist:  "alluvial",
    sovereign: "volcanic",
    cuban:     "volcanic",
  };
  const expectedSoil = affinityMap[selectedMentor ?? ""] ?? "";
  const soilIsMatch  = selectedSoil !== null && selectedSoil === expectedSoil;
  const canAdvance   = !!selectedSeed && soilIsMatch;

  const [soilFeedback, setSoilFeedback] = useState<"none" | "match" | "miss">("none");

  const mentorObj     = MENTORS.find(m => m.id === selectedMentor);
  const affinityLabel = expectedSoil === "volcanic"
    ? "Volcanic Ash — Estelí, Nicaragua"
    : "Alluvial Valley — Cibao, D.R.";

  function handleSoilClick(id: string, e: React.MouseEvent) {
    onSoil(id);
    const isMatch = id === expectedSoil;
    setSoilFeedback(isMatch ? "match" : "miss");
    onXP(isMatch ? 5 : -2, e);
  }

  return (
    <motion.div
      key="gw-cultivation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9 }}
      style={GW.bg}
    >
      <div style={GW.chamber} className="overflow-y-auto">
        <p style={{ ...GW.para, fontSize: 16, letterSpacing: "0.18em", color: `${GOLD}90`, textTransform: "uppercase", marginBottom: 8 }}>
          The Growing Season · Cultivation Begins
        </p>
        <h2 style={GW.title}>Seed &amp; Soil Architecture</h2>
        <p style={GW.para}>
          Every premier blend owes its life to terroir and genetics. Your mentor demands precision — match the soil to their affinity field to unlock the Blending Chamber.
        </p>

        {/* Mentor directive challenge banner */}
        <div style={{
          background:   `${GOLD}07`,
          border:       `1px solid ${GOLD}25`,
          borderRadius: 6,
          padding:      "12px 16px",
          marginBottom: 16,
        }}>
          <p style={{ color: `${GOLD}80`, fontSize: 15, letterSpacing: "0.16em", textTransform: "uppercase", margin: "0 0 6px 0" }}>
            Mentor Directive — {mentorObj?.name ?? "Your Mentor"} · {mentorObj?.origin}
          </p>
          <p style={{ color: "rgba(240,232,212,0.90)", fontSize: 17, lineHeight: 1.65, margin: 0, fontStyle: "italic" }}>
            "{mentorObj?.bio}"
          </p>
          <p style={{ color: `${GOLD}70`, fontSize: 16, margin: "10px 0 0 0" }}>
            Match your soil selection to this mentor’s terroir affinity to earn the cultivation bonus.
          </p>
        </div>

        {/* Soil match feedback */}
        <AnimatePresence mode="wait">
          {soilFeedback !== "none" && (
            <motion.div
              key={soilFeedback}
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.32 }}
              style={{
                background:   soilFeedback === "match" ? "rgba(74,222,128,0.07)" : "rgba(239,68,68,0.07)",
                border:       `1px solid ${soilFeedback === "match" ? "rgba(74,222,128,0.30)" : "rgba(239,68,68,0.30)"}`,
                borderRadius: 6,
                padding:      "10px 16px",
                marginBottom: 14,
                display:      "flex",
                alignItems:   "center",
                gap:          10,
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>
                {soilFeedback === "match" ? "✓" : "✗"}
              </span>
              <div>
                <p style={{
                  color:         soilFeedback === "match" ? "#4ade80" : "#ef4444",
                  fontSize:      16,
                  fontWeight:    700,
                  margin:        0,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}>
                  {soilFeedback === "match"
                    ? "+5 XP — Soil Affinity Aligned · Chamber Unlocked"
                    : "-1 PTS — Terroir Mismatch · Reconsider Your Selection"}
                </p>
                {soilFeedback === "miss" && (
                  <p style={{ color: "rgba(240,232,212,0.65)", fontSize: 15, margin: "5px 0 0 0" }}>
                    Hint: {mentorObj?.name} cultivates on {affinityLabel}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Seed bank reference image */}
        <div className="rounded-lg overflow-hidden mb-5" style={{ border: `1px solid ${GOLD}18`, maxHeight: 200 }}>
          <img
            src={imgSeedBank}
            alt="Tobacco Farm &amp; Seed Bank"
            className="w-full object-cover object-center"
            style={{ maxHeight: 200, filter: "brightness(0.8)" }}
          />
          <div style={{ background: "rgba(8,9,11,0.85)", padding: "6px 12px" }}>
            <p style={{ color: `${GOLD}80`, fontSize: 14, letterSpacing: "0.18em", textTransform: "uppercase", margin: 0 }}>
              Active Tobacco Farm · Seed Bank
            </p>
          </div>
        </div>

        {/* Seed selection */}
        <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)", color: GOLD, marginBottom: 12 }}>
          1. Heritage Seed Line
        </h3>
        <p style={{ color: "rgba(240,232,212,0.60)", fontSize: 16, lineHeight: 1.6, marginBottom: 14 }}>
          Choose the genetic lineage that defines your blend's character.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {SEEDS.map(s => (
            <motion.div
              key={s.id}
              style={GW.card(selectedSeed === s.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSeed(s.id)}
            >
              <h4 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(1rem, 2vw, 1.25rem)", color: "#fffcf5", margin: "0 0 8px 0", fontWeight: 500 }}>
                {s.name}
              </h4>
              <p style={{ color: "#cdd0d4", fontSize: "clamp(13px, 1.5vw, 15px)", lineHeight: 1.6 }}>{s.detail}</p>
            </motion.div>
          ))}
        </div>

        {/* Soil reference image */}
        <div className="rounded-lg overflow-hidden mb-5" style={{ border: `1px solid ${GOLD}18`, maxHeight: 180 }}>
          <img
            src={imgSoilTablet}
            alt="Terroir Soil Architecture"
            className="w-full object-cover object-top"
            style={{ maxHeight: 180, filter: "brightness(0.78)" }}
          />
          <div style={{ background: "rgba(8,9,11,0.85)", padding: "6px 12px" }}>
            <p style={{ color: `${GOLD}80`, fontSize: 14, letterSpacing: "0.16em", textTransform: "uppercase", margin: 0 }}>
              Terroir · Seed &amp; Soil Selection Protocol
            </p>
          </div>
        </div>

        {/* Soil selection — CHALLENGE GATE */}
        <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)", color: GOLD, marginBottom: 6 }}>
          2. Terroir Soil Match
        </h3>
        <p style={{ color: `${GOLD}75`, fontSize: 16, letterSpacing: "0.06em", marginBottom: 14 }}>
          Select the soil that matches your mentor’s terroir affinity. A wrong choice incurs a penalty.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {SOILS.map(so => (
            <motion.div
              key={so.id}
              style={{
                ...GW.card(selectedSoil === so.id),
                ...(selectedSoil === so.id && soilIsMatch
                  ? { border: "1px solid rgba(74,222,128,0.50)", boxShadow: "0 0 22px rgba(74,222,128,0.12)" }
                  : selectedSoil === so.id && !soilIsMatch
                  ? { border: "1px solid rgba(239,68,68,0.45)", boxShadow: "0 0 22px rgba(239,68,68,0.10)" }
                  : {}),
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={e => handleSoilClick(so.id, e)}
            >
              <p style={{ color: `${GOLD}80`, fontSize: 15, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
                {so.region}
              </p>
              <h4 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(1rem, 2vw, 1.25rem)", color: "#fffcf5", margin: "0 0 8px 0", fontWeight: 500 }}>
                {so.name}
              </h4>
              <p style={{ color: "#cdd0d4", fontSize: "clamp(13px, 1.5vw, 15px)", lineHeight: 1.6 }}>{so.detail}</p>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-between gap-4 mt-2">
          <button style={GW.btn(true)} onClick={onBack}>Back</button>
          <motion.button
            style={{
              ...GW.btn(!canAdvance),
              ...(canAdvance ? { background: "linear-gradient(180deg,#2a6b2a 0%,#1a4a1a 100%)", border: "1px solid rgba(74,222,128,0.45)", color: "#d4f7d4" } : {}),
            }}
            whileHover={canAdvance ? { scale: 1.03 } : {}}
            whileTap={canAdvance ? { scale: 0.97 } : {}}
            onClick={() => canAdvance && onNext()}
          >
            {canAdvance ? "✓ CHAMBER UNLOCKED — Enter" : "Match Your Mentor’s Terroir First"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}


// ── Movement Progress Badge ─────────────────────────────────────────────────────
type MovNum = "I" | "II" | "III";
const MOV_COLORS: Record<MovNum, string> = { I: "#8BC34A", II: GOLD, III: "#E8741A" };
const MOV_LABELS: Record<MovNum, string> = {
  I:   "The Origin · Minutes 0–5",
  II:  "The Craft · Minutes 5–10",
  III: "The Finish · Minutes 10–15",
};

function MovementBadge({ movement }: { movement: MovNum }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
      padding: "12px 18px", borderRadius: 8,
      background: "rgba(212,175,55,0.04)", border: `1px solid ${MOV_COLORS[movement]}28`,
      flexWrap: "wrap" as const }}>
      <div>
        <span style={{ color: MOV_COLORS[movement], fontSize: 11, fontWeight: 800,
          letterSpacing: "0.30em", textTransform: "uppercase" as const, display: "block" }}>
          MOVEMENT {movement}
        </span>
        <span style={{ color: "rgba(240,232,212,0.58)", fontSize: 14, letterSpacing: "0.06em" }}>
          {MOV_LABELS[movement]}
        </span>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
        {(["I","II","III"] as MovNum[]).map(m => (
          <div key={m} style={{ width: 28, height: 4, borderRadius: 2,
            background: m === movement ? MOV_COLORS[movement] : "rgba(255,255,255,0.10)",
            transition: "background 0.3s" }} />
        ))}
      </div>
    </div>
  );
}

// ── Read Timer gate — prevents rapid click-through on educational screens ─────
function ReadTimer({ seconds, onReady }: { seconds: number; onReady: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (elapsed >= seconds) { firedRef.current = true; onReady(); return; }
    const t = setTimeout(() => setElapsed(e => e + 1), 1000);
    return () => clearTimeout(t);
  }, [elapsed, seconds, onReady]);

  const pct  = Math.min(elapsed / seconds, 1);
  const rem  = Math.max(seconds - elapsed, 0);
  const R    = 14;
  const circ = 2 * Math.PI * R;

  if (pct >= 1) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <svg width={34} height={34} style={{ flexShrink: 0, transform: "rotate(-90deg)" }}>
        <circle cx={17} cy={17} r={R} fill="none" stroke="rgba(212,175,55,0.14)" strokeWidth={2.5} />
        <motion.circle cx={17} cy={17} r={R} fill="none" stroke={GOLD} strokeWidth={2.5}
          strokeLinecap="round" strokeDasharray={circ}
          animate={{ strokeDashoffset: circ * (1 - pct) }}
          transition={{ duration: 0.9, ease: "linear" }} />
      </svg>
      <span style={{ color: `${GOLD}58`, fontSize: 13, letterSpacing: "0.12em" }}>Reading: {rem}s</span>
    </motion.div>
  );
}

// ── Movement II · Screen 1: Leaf Harvest & Primings ─────────────────────
function GatewayHarvest({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [readyToAdvance, setReadyToAdvance] = useState(false);
  const [quizAnswer,     setQuizAnswer]     = useState<string | null>(null);
  const [quizRevealed,   setQuizRevealed]   = useState(false);

  const PRIMINGS = [
    { id: "volado", pos: "1st Priming — Volado", color: "#8BC34A", pct: 14,
      note: "Highest natural sugars. Bottom leaves absorb maximum soil potassium. Ensures even combustion throughout. The structural backbone every master blend requires." },
    { id: "seco",   pos: "2nd Priming — Seco",   color: GOLD,       pct: 52,
      note: "Primary flavor expression: cedar, leather, cocoa, spice. Air-cured 45–60 days to lock in aromatic oils. Constitutes 40–60% of premium blends worldwide." },
    { id: "viso",   pos: "3rd Priming — Viso",   color: "#E8741A",  pct: 71,
      note: "Elevated oils create rich, supple texture. Medium-to-full body. Prized by master rollers for pliability during construction under the chaveta." },
    { id: "ligero", pos: "4th Priming — Ligero", color: "#ef4444",  pct: 94,
      note: "Maximum nicotine density. Demands 18–24 months minimum aging to mellow peak alkaloids. One Ligero filler transforms any blend to full-body intensity." },
  ];

  return (
    <motion.div key="gw-harvest"
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={GW.bg}>
      <div className="absolute inset-0" style={{ zIndex: 0, pointerEvents: "none" }}>
        <img
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80"
          alt="" className="w-full h-full object-cover"
          style={{ filter: "brightness(0.13) saturate(0.55) sepia(0.35)" }} />
        <div style={{ position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 50% 30%, rgba(232,116,26,0.09) 0%, rgba(0,0,0,0.90) 100%)" }} />
      </div>
      <div style={GW.chamber} className="overflow-y-auto">
        <MovementBadge movement="II" />
        <p style={{ ...GW.para, fontSize: 15, letterSpacing: "0.18em", color: `${GOLD}88`,
          textTransform: "uppercase" as const, marginBottom: 10 }}>
          The Growing Season · Priming Science
        </p>
        <h2 style={GW.title}>Leaf Harvest &amp; Primings</h2>
        <p style={{ color: "rgba(240,232,212,0.70)", fontSize: 17, lineHeight: 1.65, marginBottom: 22 }}>
          A tobacco plant is harvested in <strong style={{ color: GOLD }}>4 timed stages called primings</strong>.
          Each position on the stalk produces a leaf with distinct flavor intensity, combustion physics,
          and nicotine density. Potassium levels dictate combustion — the higher the Volado ratio,
          the more even the burn.
        </p>

        <div style={{ display: "flex", flexDirection: "column" as const, gap: 14, marginBottom: 26 }}>
          {PRIMINGS.map((p, i) => (
            <motion.div key={p.id}
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.11 }}
              style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${p.color}22`,
                borderRadius: 10, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 8, flexWrap: "wrap" as const, gap: 8 }}>
                <span style={{ color: p.color, fontSize: 16, fontWeight: 700,
                  letterSpacing: "0.10em", textTransform: "uppercase" as const }}>{p.pos}</span>
                <span style={{ color: p.color, fontSize: 20, fontWeight: 700 }}>{p.pct}%</span>
              </div>
              <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3,
                marginBottom: 10, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${p.pct}%` }}
                  transition={{ delay: 0.4 + i * 0.12, duration: 1.1, ease: "easeOut" }}
                  style={{ height: "100%", background: p.color, borderRadius: 3 }} />
              </div>
              <p style={{ color: "rgba(240,232,212,0.68)", fontSize: 15, lineHeight: 1.6, margin: 0 }}>{p.note}</p>
            </motion.div>
          ))}
        </div>

        <div style={{ background: `${GOLD}06`, border: `1px solid ${GOLD}25`,
          borderRadius: 10, padding: "20px 22px", marginBottom: 24 }}>
          <p style={{ color: GOLD, fontSize: 16, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 14 }}>
            Master Blender Challenge
          </p>
          <p style={{ color: "rgba(240,232,212,0.80)", fontSize: 17, lineHeight: 1.6, marginBottom: 16 }}>
            Which priming position produces the highest natural sugar content,
            ensuring even combustion throughout the smoke?
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {PRIMINGS.map(p => {
              const correct  = p.id === "volado";
              const isSel    = quizAnswer === p.id;
              return (
                <motion.button key={p.id} whileTap={{ scale: 0.97 }}
                  onClick={() => { if (!quizRevealed) { setQuizAnswer(p.id); setQuizRevealed(true); playClick(); } }}
                  style={{
                    background: quizRevealed && isSel ? (correct ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.10)") : isSel ? `${GOLD}12` : "rgba(255,255,255,0.04)",
                    border: quizRevealed && isSel ? `1.5px solid ${correct ? "#4ade80" : "#ef4444"}` : isSel ? `1.5px solid ${GOLD}` : "1px solid rgba(212,175,55,0.18)",
                    borderRadius: 8, padding: "14px 16px",
                    cursor: quizRevealed ? "default" : "pointer",
                    textAlign: "left" as const,
                  }}>
                  <span style={{
                    color: isSel ? (quizRevealed ? (correct ? "#4ade80" : "#ef4444") : GOLD) : "rgba(240,232,212,0.75)",
                    fontSize: 15, fontWeight: isSel ? 700 : 400
                  }}>
                    {p.pos.split(" — ")[1]}
                  </span>
                </motion.button>
              );
            })}
          </div>
          {quizRevealed && (
            <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ color: quizAnswer === "volado" ? "#4ade80" : "#f97316",
                fontSize: 15, lineHeight: 1.6, margin: 0 }}>
              {quizAnswer === "volado"
                ? "✓ Correct. Volado’s elevated potassium and sugar content drive reliable combustion physics."
                : "Volado (1st priming) carries the highest natural sugars — proximity to roots delivers peak soil nutrients and potassium, which govern burn consistency."}
            </motion.p>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <button style={GW.btn(true)} onTouchStart={() => playClick()} onClick={onBack}>Back</button>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <ReadTimer seconds={45} onReady={() => setReadyToAdvance(true)} />
            <motion.button
              style={{ ...GW.btn(!readyToAdvance),
                ...(readyToAdvance ? {} : { opacity: 0.45, cursor: "not-allowed" }) }}
              whileHover={readyToAdvance ? { scale: 1.03 } : {}}
              whileTap={readyToAdvance ? { scale: 0.97 } : {}}
              onTouchStart={() => readyToAdvance && playClick()}
              onClick={() => readyToAdvance && onNext()}>
              {readyToAdvance ? "Curing Barn →" : "Reading…"}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Movement II · Screen 2: Curing Barns & Fermentation ──────────────────
function GatewayCuring({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [readyToAdvance, setReadyToAdvance] = useState(false);
  const [activeTemp,     setActiveTemp]     = useState<70 | 90 | 110 | 130>(70);

  type TempStep = { f: 70|90|110|130; label: string; desc: string; color: string };
  const TEMPS: TempStep[] = [
    { f: 70,  label: "70°F", color: "#8BC34A",
      desc: "Pre-fermentation. Initial air-cure phase. Chlorophyll breaking down, leaf color shifting green → amber. Moisture content still high." },
    { f: 90,  label: "90°F", color: GOLD,
      desc: "Seco activation. Optimal for medium-body leaf. Volatile oils begin concentrating. Cedar and cocoa notes emerge from cellular breakdown." },
    { f: 110, label: "110°F", color: "#E8741A",
      desc: "Viso intensity reached. Rich, oily compounds form. Spice and leather complexity develops. Rotate the pilón now to equalize heat." },
    { f: 130, label: "130°F", color: "#ef4444",
      desc: "Ligero fullness unlocked. Maximum alkaloid transformation. Ammonia fully expelled. Dark chocolate and deep earth notes permanently sealed." },
  ];

  const active = TEMPS.find(t => t.f === activeTemp) ?? TEMPS[0];

  return (
    <motion.div key="gw-curing"
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={GW.bg}>
      <div className="absolute inset-0" style={{ zIndex: 0, pointerEvents: "none" }}>
        <img
          src="https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=1200&q=80"
          alt="" className="w-full h-full object-cover"
          style={{ filter: "brightness(0.10) saturate(0.30) sepia(0.60)" }} />
        <div style={{ position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 40% 60%, rgba(180,80,20,0.10) 0%, rgba(0,0,0,0.92) 100%)" }} />
      </div>
      <div style={GW.chamber} className="overflow-y-auto">
        <MovementBadge movement="II" />
        <p style={{ ...GW.para, fontSize: 15, letterSpacing: "0.18em", color: `${GOLD}88`,
          textTransform: "uppercase" as const, marginBottom: 10 }}>
          The Curing Barn · Pilón Fermentation
        </p>
        <h2 style={GW.title}>Curing &amp; Fermentation Science</h2>
        <p style={{ color: "rgba(240,232,212,0.70)", fontSize: 17, lineHeight: 1.65, marginBottom: 20 }}>
          After harvest, leaves hang in <strong style={{ color: GOLD }}>traditional curing barns for 45–90 days</strong>.
          Then they are stacked into a <em>pilón</em> — a tightly compressed bulk that generates intense internal heat.
          Fermentation expels ammonia, transforms alkaloids, and builds the complex flavor architecture
          that defines premium tobacco.
        </p>

        <div style={{ background: "rgba(232,116,26,0.05)", border: "1px solid rgba(232,116,26,0.20)",
          borderRadius: 10, padding: "20px 22px", marginBottom: 22 }}>
          <p style={{ color: "#E8741A", fontSize: 14, fontWeight: 700, letterSpacing: "0.16em",
            textTransform: "uppercase" as const, marginBottom: 16 }}>
            Interactive Pilón — Tap a Fermentation Temperature
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, gap: 8, flexWrap: "wrap" as const }}>
            {TEMPS.map(t => (
              <button key={t.f}
                onClick={() => { setActiveTemp(t.f); playClick(); }}
                style={{
                  background: activeTemp === t.f ? `${t.color}18` : "rgba(255,255,255,0.03)",
                  border: `1.5px solid ${activeTemp === t.f ? t.color : "rgba(255,255,255,0.12)"}`,
                  borderRadius: 8, padding: "10px 14px", cursor: "pointer", flex: 1,
                }}>
                <span style={{ color: activeTemp === t.f ? t.color : "rgba(240,232,212,0.55)",
                  fontSize: 16, fontWeight: 700 }}>{t.label}</span>
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={activeTemp}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
              style={{ background: "rgba(0,0,0,0.35)", borderRadius: 8,
                padding: "14px 18px", border: `1px solid ${active.color}28` }}>
              <p style={{ color: active.color, fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                {active.label} — Fermentation Stage
              </p>
              <p style={{ color: "rgba(240,232,212,0.80)", fontSize: 16, lineHeight: 1.65, margin: 0 }}>
                {active.desc}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
          {[
            { title: "Air Cure", sub: "45–90 days", color: "#8BC34A",
              body: "Barn ventilation preserves natural sweetness and oils. Reduces chlorophyll. Foundation for Connecticut and Seco leaves." },
            { title: "Pilón Stack", sub: "Fermentation bulk", color: GOLD,
              body: "3–4 ft compressed stacks generate 100–130°F. Rotated every 3–4 days to equalize heat and prevent spontaneous combustion." },
            { title: "Ammonia Release", sub: "Alkaloid transformation", color: "#E8741A",
              body: "Fermentation expels harsh ammonia compounds. Converts raw nicotine into smooth, complex alkaloids. Critical quality marker." },
            { title: "Rest Cycle", sub: "Post-fermentation", color: "#a78bfa",
              body: "Leaves rest 30+ days post-pilón. Final moisture equilibration. Completes the aromatic profile before rolling begins." },
          ].map(c => (
            <div key={c.title} style={{ background: "rgba(255,255,255,0.025)",
              border: `1px solid ${c.color}20`, borderRadius: 8, padding: "16px 18px" }}>
              <p style={{ color: c.color, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{c.title}</p>
              <p style={{ color: `${GOLD}58`, fontSize: 12, letterSpacing: "0.10em",
                textTransform: "uppercase" as const, marginBottom: 8 }}>{c.sub}</p>
              <p style={{ color: "rgba(240,232,212,0.65)", fontSize: 15, lineHeight: 1.6, margin: 0 }}>{c.body}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <button style={GW.btn(true)} onTouchStart={() => playClick()} onClick={onBack}>Back</button>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <ReadTimer seconds={50} onReady={() => setReadyToAdvance(true)} />
            <motion.button
              style={{ ...GW.btn(!readyToAdvance),
                ...(readyToAdvance ? {} : { opacity: 0.45, cursor: "not-allowed" }) }}
              whileHover={readyToAdvance ? { scale: 1.03 } : {}}
              whileTap={readyToAdvance ? { scale: 0.97 } : {}}
              onTouchStart={() => readyToAdvance && playClick()}
              onClick={() => readyToAdvance && onNext()}>
              {readyToAdvance ? "Rolling Bench →" : "Reading…"}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Movement II · Screen 3: Rolling Bench & Construction ──────────────────
function GatewayRollingBench({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [readyToAdvance, setReadyToAdvance] = useState(false);
  const [activeLayer,    setActiveLayer]    = useState<string | null>(null);

  const LAYERS = [
    { id: "filler",  label: "Filler",       color: "#8BC34A", icon: "●",
      detail: "The bunched core. Composed of 2–4 leaves folded in a ‘booking’ or ‘accordion’ pattern to create draw channels. Determines body strength and burn speed. Always includes Volado for combustion insurance." },
    { id: "binder",  label: "Binder",       color: GOLD,      icon: "○",
      detail: "The structural holding leaf. Wraps the filler bunch tightly. Selected for tensile strength and elasticity. Directly impacts draw resistance and overall construction integrity." },
    { id: "wrapper", label: "Wrapper",      color: "#E8741A", icon: "★",
      detail: "The outer presentation leaf. Can represent 60% of total leaf cost. Cut with a chaveta on a dark walnut bench. Governs visual, aromatic, and initial flavor impression." },
    { id: "cap",     label: "Triple Cap",   color: "#a78bfa", icon: "▲",
      detail: "Three small circular cuts of wrapper sealing the head. The gold standard of premium construction. A single cap indicates machine-made. Triple cap confirms handcrafted artisan work." },
  ];

  return (
    <motion.div key="gw-rolling"
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={GW.bg}>
      <div className="absolute inset-0" style={{ zIndex: 0, pointerEvents: "none" }}>
        <img
          src="https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=1200&q=80"
          alt="" className="w-full h-full object-cover"
          style={{ filter: "brightness(0.11) saturate(0.20) sepia(0.65)" }} />
        <div style={{ position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 60% 40%, rgba(120,80,30,0.12) 0%, rgba(0,0,0,0.92) 100%)" }} />
      </div>
      <div style={GW.chamber} className="overflow-y-auto">
        <MovementBadge movement="II" />
        <p style={{ ...GW.para, fontSize: 15, letterSpacing: "0.18em", color: `${GOLD}88`,
          textTransform: "uppercase" as const, marginBottom: 10 }}>
          The Artisan’s Table · Construction Anatomy
        </p>
        <h2 style={GW.title}>Rolling Bench &amp; Construction</h2>
        <p style={{ color: "rgba(240,232,212,0.70)", fontSize: 17, lineHeight: 1.65, marginBottom: 22 }}>
          Every premium cigar is hand-constructed on a <strong style={{ color: GOLD }}>dark walnut rolling bench</strong>
          using a half-moon <em>chaveta</em> blade. The three-part architecture of Wrapper, Binder, and Filler
          determines draw resistance, burn temperature, and the physical sensation in your hands.
        </p>

        <p style={{ color: `${GOLD}70`, fontSize: 14, letterSpacing: "0.18em",
          textTransform: "uppercase" as const, marginBottom: 16 }}>
          Tap each construction layer to reveal its role
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
          {LAYERS.map(l => {
            const isOpen = activeLayer === l.id;
            return (
              <motion.div key={l.id}
                onClick={() => { setActiveLayer(isOpen ? null : l.id); playClick(); }}
                whileTap={{ scale: 0.97 }}
                style={{
                  background: isOpen ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.025)",
                  border: `1.5px solid ${isOpen ? l.color : l.color + "28"}`,
                  borderRadius: 10, padding: "18px 18px", cursor: "pointer",
                  boxShadow: isOpen ? `0 0 22px ${l.color}14` : "none",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10,
                  marginBottom: isOpen ? 12 : 0 }}>
                  <span style={{ color: l.color, fontSize: 22 }}>{l.icon}</span>
                  <span style={{ color: isOpen ? l.color : "rgba(240,232,212,0.80)",
                    fontSize: 18, fontWeight: 700 }}>{l.label}</span>
                  <span style={{ marginLeft: "auto", color: `${l.color}70`, fontSize: 16 }}>
                    {isOpen ? "▼" : "▶"}
                  </span>
                </div>
                <AnimatePresence>
                  {isOpen && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ color: "rgba(240,232,212,0.80)", fontSize: 15,
                        lineHeight: 1.65, margin: 0, overflow: "hidden" }}>
                      {l.detail}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        <div style={{ background: `${GOLD}05`, border: `1px solid ${GOLD}20`,
          borderRadius: 10, padding: "18px 20px", marginBottom: 24 }}>
          <p style={{ color: GOLD, fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
            The Chaveta &amp; Bunching Technique
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { name: "Booking Fold", body: "Leaves folded flat like pages. Creates uniform draw channels. Preferred for robust, full-body blends where consistent resistance is paramount." },
              { name: "Accordion Fold", body: "Leaves folded in alternating directions. Creates a porous draw. Preferred for lighter, airy Connecticut-style blends needing effortless pull." },
            ].map(f => (
              <div key={f.name}>
                <p style={{ color: `${GOLD}78`, fontSize: 14, fontWeight: 700,
                  letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 6 }}>{f.name}</p>
                <p style={{ color: "rgba(240,232,212,0.65)", fontSize: 15, lineHeight: 1.6, margin: 0 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <button style={GW.btn(true)} onTouchStart={() => playClick()} onClick={onBack}>Back</button>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <ReadTimer seconds={55} onReady={() => setReadyToAdvance(true)} />
            <motion.button
              style={{ ...GW.btn(!readyToAdvance),
                ...(readyToAdvance ? {} : { opacity: 0.45, cursor: "not-allowed" }) }}
              whileHover={readyToAdvance ? { scale: 1.03 } : {}}
              whileTap={readyToAdvance ? { scale: 0.97 } : {}}
              onTouchStart={() => readyToAdvance && playClick()}
              onClick={() => readyToAdvance && onNext()}>
              {readyToAdvance ? "Vitola Science →" : "Reading…"}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Movement III · Screen 1: Vitola Science & Draw Physics ──────────────
function GatewayVitolaScience({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [readyToAdvance, setReadyToAdvance] = useState(false);
  const [selectedCut,    setSelectedCut]    = useState<string | null>(null);

  const CUTS = [
    { id: "straight", label: "Straight Cut", icon: "|—|", color: "#8BC34A",
      best: "Robusto · Corona · Churchill",
      draw: "Full open draw. Maximum smoke volume. Preserves full flavor surface area of the cap. Best for ring gauges 46–54." },
    { id: "vcut",     label: "V-Cut (Wedge)", icon: "V",      color: GOLD,
      best: "Torpedo · Figurado · Perfecto",
      draw: "Concentrated draw channel. Intensifies flavor. Best for tapered shapes 52–56 RG. Reduces loose tobacco debris." },
    { id: "punch",    label: "Punch Cut",     icon: "●", color: "#E8741A",
      best: "Gordo · Presidente · Gigante",
      draw: "Smallest aperture. Coolest, smoothest draw. Best for large ring gauges 58+. Preserves maximum wrapper leaf integrity." },
  ];

  const VITOLAS = [
    { name: "Robusto",      ring: 50, length: "5”",    profile: "The universal standard. Perfect balance of smoke time (45 min) and flavor development." },
    { name: "Churchill",    ring: 47, length: "7”",    profile: "Extended journey (90 min). Full flavor evolution from light cedar to rich earth across three thirds." },
    { name: "Torpedo",      ring: 52, length: "6.25”", profile: "Tapered head concentrates draw. Complex aromatic layers. Artisan construction required." },
    { name: "Gordo",        ring: 60, length: "6”",    profile: "Widest common gauge. Maximum smoke volume. Cooler burn temperature. Punchy draw physics." },
    { name: "Lancero",      ring: 38, length: "7.5”",  profile: "Thinnest premium gauge. Precision rolling. Wrapper leaf dominates flavor at 70%+." },
    { name: "Petit Corona", ring: 42, length: "4.5”",  profile: "30-minute smoke. Condensed intensity. High filler-to-wrapper ratio. Ideal introduction." },
  ];

  return (
    <motion.div key="gw-vitola-sci"
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={GW.bg}>
      <div className="absolute inset-0" style={{ zIndex: 0, pointerEvents: "none" }}>
        <img
          src="https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=1200&q=80"
          alt="" className="w-full h-full object-cover"
          style={{ filter: "brightness(0.10) saturate(0.15) sepia(0.20)" }} />
        <div style={{ position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 50% 50%, rgba(212,175,55,0.08) 0%, rgba(0,0,0,0.92) 100%)" }} />
      </div>
      <div style={GW.chamber} className="overflow-y-auto">
        <MovementBadge movement="III" />
        <p style={{ ...GW.para, fontSize: 15, letterSpacing: "0.18em", color: `${GOLD}88`,
          textTransform: "uppercase" as const, marginBottom: 10 }}>
          Draw Physics · Ring Gauge Science
        </p>
        <h2 style={GW.title}>Vitola Science &amp; Precision Cuts</h2>
        <p style={{ color: "rgba(240,232,212,0.70)", fontSize: 17, lineHeight: 1.65, marginBottom: 22 }}>
          Ring gauge is measured in <strong style={{ color: GOLD }}>64ths of an inch</strong>.
          A 50 RG cigar = 50/64” diameter. Gauge directly governs draw resistance, smoke volume,
          burn temperature, and grip balance. Your cut choice creates the aperture that determines
          every draw from first light to final third.
        </p>

        <div style={{ display: "flex", flexDirection: "column" as const, gap: 11, marginBottom: 24 }}>
          {VITOLAS.map((v, i) => (
            <motion.div key={v.name}
              initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              style={{ display: "flex", alignItems: "center", gap: 14,
                background: "rgba(255,255,255,0.025)", border: `1px solid ${GOLD}18`,
                borderRadius: 8, padding: "13px 18px" }}>
              <div style={{ flexShrink: 0, textAlign: "center" as const, minWidth: 44 }}>
                <div style={{ color: GOLD, fontSize: 20, fontWeight: 700 }}>{v.ring}</div>
                <div style={{ color: `${GOLD}50`, fontSize: 11, letterSpacing: "0.12em" }}>RG</div>
              </div>
              <div style={{ width: 1, height: 38, background: `${GOLD}18`, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
                  <span style={{ color: "rgba(240,232,212,0.90)", fontSize: 16, fontWeight: 700 }}>{v.name}</span>
                  <span style={{ color: `${GOLD}58`, fontSize: 14 }}>{v.length}</span>
                </div>
                <p style={{ color: "rgba(240,232,212,0.58)", fontSize: 14, lineHeight: 1.5, margin: 0 }}>{v.profile}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <p style={{ color: `${GOLD}78`, fontSize: 15, fontWeight: 700, letterSpacing: "0.12em",
          textTransform: "uppercase" as const, marginBottom: 14 }}>
          Select Your Cut Profile — Carries into Your Blend
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {CUTS.map(c => {
            const isSel = selectedCut === c.id;
            return (
              <motion.div key={c.id}
                onClick={() => { setSelectedCut(c.id); playClick(); }}
                whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }}
                style={{
                  background: isSel ? `${c.color}12` : "rgba(255,255,255,0.03)",
                  border: `1.5px solid ${isSel ? c.color : c.color + "30"}`,
                  borderRadius: 10, padding: "18px 14px", cursor: "pointer",
                  textAlign: "center" as const,
                  boxShadow: isSel ? `0 0 24px ${c.color}18` : "none",
                }}>
                <div style={{ fontSize: 26, marginBottom: 8, color: c.color }}>{c.icon}</div>
                <p style={{ color: isSel ? c.color : "rgba(240,232,212,0.80)",
                  fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{c.label}</p>
                <p style={{ color: `${GOLD}62`, fontSize: 12, letterSpacing: "0.08em",
                  marginBottom: 8, textTransform: "uppercase" as const }}>{c.best}</p>
                <p style={{ color: "rgba(240,232,212,0.58)", fontSize: 14, lineHeight: 1.55, margin: 0 }}>{c.draw}</p>
                {isSel && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    style={{ marginTop: 10, color: c.color, fontSize: 15, fontWeight: 700 }}>
                    ✓ Selected
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <button style={GW.btn(true)} onTouchStart={() => playClick()} onClick={onBack}>Back</button>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <ReadTimer seconds={50} onReady={() => setReadyToAdvance(true)} />
            <motion.button
              style={{
                ...GW.btn(!readyToAdvance),
                ...(readyToAdvance
                  ? { background: "linear-gradient(135deg,#c8950a,#9e7208)", border: `1px solid ${GOLD}` }
                  : { opacity: 0.45, cursor: "not-allowed" }),
              }}
              whileHover={readyToAdvance ? { scale: 1.03 } : {}}
              whileTap={readyToAdvance ? { scale: 0.97 } : {}}
              onTouchStart={() => readyToAdvance && playClick()}
              onClick={() => readyToAdvance && onNext()}>
              {readyToAdvance ? "★ Enter The Blending Chamber" : "Reading…"}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Movement II · Priming Matrix (after Rolling Bench) ───────────────────
function GatewayPrimingMatrix({ onNext, onBack, onPrimingChange }: {
  onNext: () => void;
  onBack: () => void;
  onPrimingChange?: (v: number, sv: number, l: number) => void;
}) {
  const [volado,       setVolado]       = useState(30);
  const [secoViso,     setSecoViso]     = useState(50);
  const [open1,        setOpen1]        = useState(false);
  const [open2,        setOpen2]        = useState(false);
  const [open3,        setOpen3]        = useState(false);
  const [penaltyFlash, setPenaltyFlash] = useState(false);

  const ligero   = Math.max(0, 100 - volado - secoViso);
  const total    = volado + secoViso + ligero;
  const valid    = total === 100 && ligero >= 0;
  const dominant = (volado >= secoViso && volado >= ligero) ? "volado"
    : (secoViso >= ligero) ? "seco" : "ligero";

  useEffect(() => {
    onPrimingChange?.(volado, secoViso, ligero);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volado, secoViso, ligero]);

  function clampV(v: number, sv: number): [number, number] {
    if (v + sv > 100) return [v, 100 - v];
    return [v, sv];
  }
  function handleVolado(val: number) {
    const [nv, nsv] = clampV(val, secoViso); setVolado(nv); setSecoViso(nsv);
  }
  function handleSecoViso(val: number) {
    const [nv, nsv] = clampV(volado, val); setVolado(nv); setSecoViso(nsv);
  }
  function playError() {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 640;
      o.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.30);
      o.type = "sine";
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.38);
      o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.40);
    } catch {}
  }

  const PRIMINGS = [
    { id: "volado",    label: "Volado",    sub: "Bottom Tiers",  color: "#8BC34A", pct: volado,   set: handleVolado,
      role: "Regulates burn chemistry and combustion stability. The lowest leaves absorb maximum soil sugars, ensuring an even, cool draw from first light to final third.",
      open: open1, setOpen: setOpen1 },
    { id: "seco_viso", label: "Seco/Viso", sub: "Middle Tiers",  color: GOLD,      pct: secoViso, set: handleSecoViso,
      role: "Dictates the aromatic flavor bloom. Air-cured 45\u201360 days, these mid-priming leaves lock in cedar, leather, cocoa, and spice oils that define your blend's signature.",
      open: open2, setOpen: setOpen2 },
    { id: "ligero",    label: "Ligero",    sub: "Top Tiers",     color: "#ef4444", pct: ligero,   set: () => {},
      role: "Delivers raw nicotine strength, body, and heavy oil density. Auto-calculated. Top-canopy leaves require 18\u201324 months minimum aging to tame peak alkaloid intensity.",
      open: open3, setOpen: setOpen3 },
  ];
  const LEAF_VISUALS = [
    { id: "volado", pct: volado,   color: "#8BC34A", label: "Volado",
      img: "https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=700&q=80",
      desc: "High-sugar base leaf \u00b7 Burn stability" },
    { id: "seco",   pct: secoViso, color: GOLD,      label: "Seco / Viso",
      img: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=700&q=80",
      desc: "Aromatic bloom layer \u00b7 Flavor expression" },
    { id: "ligero", pct: ligero,   color: "#ef4444", label: "Ligero",
      img: "https://images.unsplash.com/photo-1533779183510-8738c1c4bab0?auto=format&fit=crop&w=700&q=80",
      desc: "Crown-tier strength \u00b7 Raw intensity" },
  ];

  return (
    <motion.div key="gw-priming-matrix"
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={GW.bg}>
      <div className="absolute inset-0" style={{ zIndex: 0, pointerEvents: "none" }}>
        <img src="https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=1200&q=80"
          alt="" className="w-full h-full object-cover"
          style={{ filter: "brightness(0.09) saturate(0.18) sepia(0.70)" }} />
        <div style={{ position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 50% 20%, rgba(212,175,55,0.07) 0%, rgba(0,0,0,0.94) 100%)" }} />
      </div>

      {/* Bad-planning penalty flash */}
      <AnimatePresence>
        {penaltyFlash && (
          <motion.div key="penalty-flash"
            initial={{ opacity: 0, scale: 0.90 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ position: "fixed", inset: 0, zIndex: 99998,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(239,68,68,0.06)", pointerEvents: "none" }}>
            <div style={{ background: "rgba(239,68,68,0.14)",
              border: "1.5px solid rgba(239,68,68,0.72)",
              borderRadius: 16, padding: "28px 52px", textAlign: "center" as const,
              boxShadow: "0 0 70px rgba(239,68,68,0.35)" }}>
              <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "2rem",
                color: "#ef4444", fontWeight: 300, margin: "0 0 6px",
                letterSpacing: "0.05em" }}>BLEND IMBALANCE DETECTED</p>
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 9, letterSpacing: "0.28em",
                color: "rgba(239,68,68,0.78)", textTransform: "uppercase" as const, margin: 0 }}>
                −2 PTS — Contradicts mentor philosophy
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Horizontal split chamber */}
      <div style={{ ...GW.chamber, maxWidth: 1020, display: "flex", flexDirection: "row" as const,
        gap: 26, padding: "30px 26px", alignItems: "stretch", minHeight: 0 }}>

        {/* LEFT: Slider control panel */}
        <div style={{ flex: "0 0 54%", display: "flex", flexDirection: "column" as const,
          overflowY: "auto" as const }}>
          <MovementBadge movement="II" />
          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, letterSpacing: "0.24em",
            color: `${GOLD}88`, textTransform: "uppercase" as const, marginBottom: 4 }}>
            Leaf Architecture · Priming Ratios
          </p>
          <h2 style={{ ...GW.title, marginBottom: 10 }}>The Priming Matrix</h2>

          {/* Ratio total indicator */}
          <motion.div
            animate={{ borderColor: valid ? `${GOLD}50` : "#ef444450" }}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: valid ? "rgba(212,175,55,0.05)" : "rgba(239,68,68,0.05)",
              border: `1px solid ${valid ? GOLD + "40" : "#ef444440"}`,
              borderRadius: 8, padding: "7px 14px", marginBottom: 14,
            }}>
            <span style={{ color: "rgba(240,232,212,0.55)", fontSize: 11, letterSpacing: "0.12em" }}>TOTAL RATIO</span>
            <motion.span key={total} initial={{ scale: 1.18 }} animate={{ scale: 1 }}
              style={{ color: valid ? GOLD : "#ef4444", fontSize: 22, fontWeight: 800 }}>
              {total}%
            </motion.span>
            {valid && (
              <motion.span initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                style={{ color: "#8BC34A", fontSize: 12, fontWeight: 700, letterSpacing: "0.14em" }}>
                LOCKED ✓
              </motion.span>
            )}
          </motion.div>

          {/* Sliders */}
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 14, marginBottom: 14 }}>
            {PRIMINGS.map((p) => (
              <div key={p.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                  <div>
                    <span style={{ color: p.color, fontSize: 14, fontWeight: 700 }}>{p.label}</span>
                    <span style={{ color: "rgba(240,232,212,0.42)", fontSize: 10,
                      letterSpacing: "0.14em", textTransform: "uppercase" as const, marginLeft: 8 }}>{p.sub}</span>
                  </div>
                  <motion.span key={p.pct} initial={{ scale: 1.2 }} animate={{ scale: 1 }}
                    style={{ color: p.color, fontSize: 20, fontWeight: 800 }}>{p.pct}%</motion.span>
                </div>
                <div style={{ position: "relative", height: 34, display: "flex", alignItems: "center" }}>
                  <div style={{ position: "absolute", left: 0, right: 0, height: 6,
                    background: "rgba(255,255,255,0.07)", borderRadius: 3 }} />
                  <div style={{ position: "absolute", left: 0, width: `${p.pct}%`, height: 6,
                    background: `linear-gradient(90deg, ${p.color}60, ${p.color})`,
                    borderRadius: 3, transition: "width 0.08s",
                    boxShadow: `0 0 10px ${p.color}40` }} />
                  <input type="range" min={0} max={100} value={p.pct}
                    disabled={p.id === "ligero"}
                    onChange={e => p.set(Number(e.target.value))}
                    style={{ position: "absolute", left: 0, right: 0, width: "100%",
                      height: 34, opacity: 0,
                      cursor: p.id === "ligero" ? "not-allowed" : "pointer",
                      margin: 0, padding: 0 }} />
                  <motion.div animate={{ left: `calc(${p.pct}% - 10px)` }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    style={{ position: "absolute", width: 20, height: 20, borderRadius: "50%",
                      background: p.id === "ligero" ? "#333" : p.color,
                      border: `2px solid ${p.id === "ligero" ? "#444" : p.color}`,
                      boxShadow: p.id === "ligero" ? "none" : `0 0 12px ${p.color}60`,
                      pointerEvents: "none", top: "50%", transform: "translateY(-50%)" }} />
                </div>
                <motion.button whileTap={{ scale: 0.98 }}
                  onClick={() => { p.setOpen(!p.open); playClick(); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "none",
                    border: "none", cursor: "pointer", padding: "3px 0", marginTop: 2 }}>
                  <span style={{ color: `${p.color}60`, fontSize: 10, letterSpacing: "0.18em",
                    textTransform: "uppercase" as const }}>
                    {p.open ? "▼ Hide" : "► Learn"}
                  </span>
                </motion.button>
                <AnimatePresence>
                  {p.open && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: "hidden", background: `${p.color}08`,
                        border: `1px solid ${p.color}18`, borderRadius: 8,
                        padding: "10px 14px", marginTop: 4 }}>
                      <p style={{ color: "rgba(240,232,212,0.78)", fontSize: 13, lineHeight: 1.65, margin: 0 }}>{p.role}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Ratio bar */}
          <div style={{ display: "flex", height: 7, borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
            <motion.div animate={{ width: `${volado}%` }} transition={{ type: "spring", stiffness: 300 }}
              style={{ background: "#8BC34A", height: "100%" }} />
            <motion.div animate={{ width: `${secoViso}%` }} transition={{ type: "spring", stiffness: 300 }}
              style={{ background: GOLD, height: "100%" }} />
            <motion.div animate={{ width: `${ligero}%` }} transition={{ type: "spring", stiffness: 300 }}
              style={{ background: "#ef4444", height: "100%" }} />
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
            {[{ l: "Volado", c: "#8BC34A" }, { l: "Seco/Viso", c: GOLD }, { l: "Ligero", c: "#ef4444" }].map(x => (
              <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: x.c }} />
                <span style={{ color: "rgba(240,232,212,0.50)", fontSize: 11 }}>{x.l}</span>
              </div>
            ))}
          </div>

          {/* Buttons — pinned to bottom */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: "auto" }}>
            <button style={{ ...GW.btn(true), flexShrink: 0 }}
              onTouchStart={() => playClick()} onClick={onBack}>Back</button>
            <motion.button
              style={{
                ...GW.btn(!valid), flex: 1,
                ...(valid
                  ? { background: "linear-gradient(135deg,#c8950a,#9e7208)", border: `1px solid ${GOLD}` }
                  : { opacity: 0.45, cursor: "not-allowed" }),
              }}
              whileHover={valid ? { scale: 1.03 } : {}}
              whileTap={valid ? { scale: 0.96, y: 2 } : {}}
              onTouchStart={() => valid && playClick()}
              onClick={() => {
                if (!valid) return;
                playClick();
                if (ligero > 48) {
                  playError();
                  setPenaltyFlash(true);
                  setTimeout(() => setPenaltyFlash(false), 1900);
                }
                onNext();
              }}>
              {valid ? "Vitola Science →" : `Balance to 100% (${total}%)`}
            </motion.button>
          </div>
        </div>

        {/* RIGHT: Real-time leaf visual gallery */}
        <div style={{ flex: 1, position: "relative" as const, borderRadius: 12,
          overflow: "hidden", minHeight: 320,
          background: "rgba(0,0,0,0.45)",
          border: "1px solid rgba(212,175,55,0.09)" }}>
          {/* Stacked leaf images — opacity & scale driven by ratios */}
          {LEAF_VISUALS.map((lv) => (
            <motion.div key={lv.id}
              animate={{
                opacity: Math.max(0.05, lv.pct / 100),
                scale: dominant === lv.id ? 1.06 : 0.99,
              }}
              transition={{ type: "spring", stiffness: 110, damping: 22 }}
              style={{ position: "absolute", inset: 0 }}>
              <img src={lv.img} alt={lv.label}
                style={{ width: "100%", height: "100%", objectFit: "cover",
                  filter: dominant === lv.id
                    ? "saturate(1.35) brightness(0.70)"
                    : "saturate(0.50) brightness(0.38)" }} />
              {dominant === lv.id && (
                <motion.div
                  animate={{ boxShadow: [
                    `inset 0 0 50px 18px ${lv.color}18`,
                    `inset 0 0 90px 36px ${lv.color}35`,
                    `inset 0 0 60px 22px ${lv.color}22`,
                  ] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  style={{ position: "absolute", inset: 0, borderRadius: 12 }} />
              )}
            </motion.div>
          ))}
          {/* Dominant leaf info — bottom overlay */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2,
            background: "linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0) 100%)",
            padding: "50px 18px 18px", borderRadius: "0 0 12px 12px" }}>
            {LEAF_VISUALS.filter(lv => lv.id === dominant).map(lv => (
              <motion.div key={lv.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 8, letterSpacing: "0.36em",
                  color: `${lv.color}65`, textTransform: "uppercase" as const, margin: "0 0 5px" }}>DOMINANT LEAF</p>
                <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.4rem",
                  color: lv.color, fontWeight: 300, margin: "0 0 4px" }}>{lv.label}</p>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, letterSpacing: "0.14em",
                  color: "rgba(240,232,212,0.48)", margin: 0 }}>{lv.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Movement Completion Gate I · The Cultivation Crucible ────────────────
function GatewayMovement1Gate({
  onNext,
  selectedTerroir,
  selectedSeed,
  xp,
}: {
  onNext: () => void;
  selectedTerroir: string | null;
  selectedSeed: string | null;
  xp: number;
}) {
  const country = selectedTerroir ?? "Dominican Republic";
  const [suggestion, setSuggestion] = useState<{ cigar: string; spirit: string; spiritStyle: string; liveItems: Array<{ name: string; image_url: string | null }> } | null>(null);

  useEffect(() => {
    fetch(`/api/master-blender/humidor-suggestions?country=${encodeURIComponent(country)}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { fallback: { cigar: string; spirit: string; spiritStyle: string }; liveItems: Array<{ name: string; image_url: string | null }> } | null) => {
        if (!d) return;
        const cigar = d.liveItems?.[0]?.name ?? d.fallback.cigar;
        setSuggestion({ cigar, spirit: d.fallback.spirit, spiritStyle: d.fallback.spiritStyle, liveItems: d.liveItems });
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flag = (COUNTRY_FLAGS as Record<string, string>)[country] ?? "🌿";
  const seedName = selectedSeed === "corojo" ? "Corojo Premium" : selectedSeed === "criollo" ? "Criollo '98" : selectedSeed ?? "Unknown";

  return (
    <motion.div key="gw-gate-1"
      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      style={GW.bg}>
      <div className="absolute inset-0" style={{ zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 50% 20%, rgba(139,195,74,0.08) 0%, rgba(0,0,0,0.97) 100%)" }} />
      </div>
      <div style={{ ...GW.chamber, maxWidth: 700 }} className="overflow-y-auto">
        {/* Achievement header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ textAlign: "center" as const, marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🌱</div>
          <p style={{ color: "#8BC34A", fontSize: 11, letterSpacing: "0.38em",
            textTransform: "uppercase" as const, marginBottom: 6 }}>
            MOVEMENT I COMPLETE
          </p>
          <h2 style={{ ...GW.title, textAlign: "center" as const, borderBottom: "none", marginBottom: 4 }}>
            The Cultivation Crucible
          </h2>
          <p style={{ color: "rgba(240,232,212,0.50)", fontSize: 14, letterSpacing: "0.08em" }}>
            Origin locked. Seed lineage confirmed. Terroir sealed.
          </p>
        </motion.div>

        {/* Score flash */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
          style={{
            display: "flex", justifyContent: "center", alignItems: "center", gap: 12,
            background: "rgba(139,195,74,0.08)", border: "1px solid rgba(139,195,74,0.30)",
            borderRadius: 12, padding: "16px 24px", marginBottom: 22,
          }}>
          <span style={{ color: "#8BC34A", fontSize: 32, fontWeight: 800 }}>+{xp} XP</span>
          <div style={{ width: 1, height: 32, background: "rgba(139,195,74,0.25)" }} />
          <span style={{ color: "rgba(240,232,212,0.65)", fontSize: 14, lineHeight: 1.4 }}>
            Movement I<br/>Achievement Score
          </span>
        </motion.div>

        {/* Origin summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}18`,
            borderRadius: 10, padding: "16px 18px" }}>
            <p style={{ color: `${GOLD}60`, fontSize: 10, letterSpacing: "0.28em",
              textTransform: "uppercase" as const, marginBottom: 6 }}>Origin Country</p>
            <p style={{ color: "rgba(240,232,212,0.90)", fontSize: 18, fontWeight: 700, margin: 0 }}>
              {flag} {country}
            </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}18`,
            borderRadius: 10, padding: "16px 18px" }}>
            <p style={{ color: `${GOLD}60`, fontSize: 10, letterSpacing: "0.28em",
              textTransform: "uppercase" as const, marginBottom: 6 }}>Seed Lineage</p>
            <p style={{ color: "rgba(240,232,212,0.90)", fontSize: 18, fontWeight: 700, margin: 0 }}>
              {seedName}
            </p>
          </div>
        </motion.div>

        {/* Live humidor suggestion */}
        {suggestion && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            style={{
              background: `${GOLD}06`, border: `1px solid ${GOLD}28`,
              borderRadius: 12, padding: "18px 20px", marginBottom: 24,
            }}>
            <p style={{ color: `${GOLD}80`, fontSize: 10, letterSpacing: "0.28em",
              textTransform: "uppercase" as const, marginBottom: 10 }}>
              🏛 Humidor Suggestion for {country}
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" as const }}>
              <div>
                <p style={{ color: "rgba(240,232,212,0.50)", fontSize: 11, letterSpacing: "0.14em",
                  textTransform: "uppercase" as const, marginBottom: 3 }}>Cigar</p>
                <p style={{ color: GOLD, fontSize: 16, fontWeight: 700, margin: 0 }}>{suggestion.cigar}</p>
              </div>
              <div>
                <p style={{ color: "rgba(240,232,212,0.50)", fontSize: 11, letterSpacing: "0.14em",
                  textTransform: "uppercase" as const, marginBottom: 3 }}>Pairing Spirit</p>
                <p style={{ color: "rgba(240,232,212,0.88)", fontSize: 15, fontWeight: 600, margin: 0 }}>
                  {suggestion.spirit}
                </p>
                <p style={{ color: `${GOLD}60`, fontSize: 12, margin: 0 }}>{suggestion.spiritStyle}</p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.button
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          style={{
            ...GW.btn(),
            width: "100%",
            background: "linear-gradient(135deg, #6a9a30, #4a7020)",
            border: "1px solid #8BC34A50",
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onTouchStart={() => playClick()}
          onClick={() => { playClick(); onNext(); }}>
          ENTER MOVEMENT II: THE CRAFT →
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Movement Completion Gate II · Structural Integrity Summary ───────────
function GatewayMovement2Gate({
  onNext,
  onBack,
  volado,
  secoViso,
  ligero,
  xp,
}: {
  onNext: () => void;
  onBack: () => void;
  volado: number;
  secoViso: number;
  ligero: number;
  xp: number;
}) {
  return (
    <motion.div key="gw-gate-2"
      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      style={GW.bg}>
      <div className="absolute inset-0" style={{ zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0,
          background: `radial-gradient(ellipse at 50% 20%, ${GOLD}10 0%, rgba(0,0,0,0.97) 100%)` }} />
      </div>
      <div style={{ ...GW.chamber, maxWidth: 700 }} className="overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ textAlign: "center" as const, marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⚗️</div>
          <p style={{ color: GOLD, fontSize: 11, letterSpacing: "0.38em",
            textTransform: "uppercase" as const, marginBottom: 6 }}>
            MOVEMENT II COMPLETE
          </p>
          <h2 style={{ ...GW.title, textAlign: "center" as const, borderBottom: "none", marginBottom: 4 }}>
            The Structural Integrity Summary
          </h2>
          <p style={{ color: "rgba(240,232,212,0.50)", fontSize: 14 }}>
            Construction mastered. Priming ratio locked.
          </p>
        </motion.div>

        {/* Score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
          style={{
            display: "flex", justifyContent: "center", alignItems: "center", gap: 12,
            background: `${GOLD}08`, border: `1px solid ${GOLD}30`,
            borderRadius: 12, padding: "16px 24px", marginBottom: 24,
          }}>
          <span style={{ color: GOLD, fontSize: 32, fontWeight: 800 }}>{xp} XP</span>
          <div style={{ width: 1, height: 32, background: `${GOLD}25` }} />
          <span style={{ color: "rgba(240,232,212,0.65)", fontSize: 14, lineHeight: 1.4 }}>
            Running Score<br/>Movement II Locked
          </span>
        </motion.div>

        {/* Priming ratio visual */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD}15`,
            borderRadius: 12, padding: "20px 22px", marginBottom: 22 }}>
          <p style={{ color: `${GOLD}70`, fontSize: 10, letterSpacing: "0.28em",
            textTransform: "uppercase" as const, marginBottom: 16 }}>
            Custom Priming Ratio
          </p>
          <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", marginBottom: 14 }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${volado}%` }} transition={{ delay: 0.6, duration: 0.8 }}
              style={{ background: "#8BC34A", height: "100%" }} />
            <motion.div initial={{ width: 0 }} animate={{ width: `${secoViso}%` }} transition={{ delay: 0.8, duration: 0.8 }}
              style={{ background: GOLD, height: "100%" }} />
            <motion.div initial={{ width: 0 }} animate={{ width: `${ligero}%` }} transition={{ delay: 1.0, duration: 0.8 }}
              style={{ background: "#ef4444", height: "100%" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[
              { label: "Volado", pct: volado, color: "#8BC34A", role: "Burn Stability" },
              { label: "Seco/Viso", pct: secoViso, color: GOLD, role: "Flavor Bloom" },
              { label: "Ligero", pct: ligero, color: "#ef4444", role: "Strength & Body" },
            ].map(p => (
              <div key={p.label} style={{ textAlign: "center" as const }}>
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: 0.9, type: "spring" }}
                  style={{ color: p.color, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>
                  {p.pct}%
                </motion.div>
                <div style={{ color: "rgba(240,232,212,0.70)", fontSize: 14, fontWeight: 700 }}>{p.label}</div>
                <div style={{ color: `${p.color}60`, fontSize: 11, letterSpacing: "0.1em" }}>{p.role}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <div style={{ display: "flex", gap: 12 }}>
          <button style={{ ...GW.btn(true), flex: "0 0 auto" }}
            onTouchStart={() => playClick()} onClick={onBack}>Back</button>
          <motion.button
            style={{ ...GW.btn(), flex: 1,
              background: `linear-gradient(135deg,#c8950a,#9e7208)`,
              border: `1px solid ${GOLD}` }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onTouchStart={() => playClick()}
            onClick={() => { playClick(); onNext(); }}>
            ENTER MOVEMENT III: THE FINISH →
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Movement Completion Gate III · The Masterclass Verdict ───────────────
function GatewayMovement3Gate({
  onNext,
  onBack,
  xp,
  selectedTerroir,
  volado,
  secoViso,
  ligero,
}: {
  onNext: () => void;
  onBack: () => void;
  xp: number;
  selectedTerroir: string | null;
  volado: number;
  secoViso: number;
  ligero: number;
}) {
  const country = selectedTerroir ?? "Dominican Republic";
  const [nightlyData, setNightlyData] = useState<{ avg: number; count: number } | null>(null);
  const [suggestion, setSuggestion]   = useState<{ spirit: string; spiritStyle: string; descriptors: string[] } | null>(null);

  useEffect(() => {
    fetch("/api/master-blender/nightly-average")
      .then(r => r.ok ? r.json() : null)
      .then((d: { avg: number; count: number } | null) => { if (d) setNightlyData(d); })
      .catch(() => {});
    fetch(`/api/master-blender/humidor-suggestions?country=${encodeURIComponent(country)}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { fallback: { spirit: string; spiritStyle: string; descriptors: string[] } } | null) => {
        if (d) setSuggestion({ spirit: d.fallback.spirit, spiritStyle: d.fallback.spiritStyle, descriptors: d.fallback.descriptors });
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nightlyAvg = nightlyData?.avg ?? 0;
  const tierLabel  = nightlyAvg >= 90 ? "Master Blender" : nightlyAvg >= 70 ? "Senior Blend" : nightlyAvg >= 50 ? "Journeyman" : "Novice Aficionado";
  const placement  = nightlyAvg > 0 ? (xp >= nightlyAvg ? "above" : "below") : null;

  return (
    <motion.div key="gw-gate-3"
      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      style={GW.bg}>
      <div className="absolute inset-0" style={{ zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 50% 20%, rgba(232,116,26,0.08) 0%, rgba(0,0,0,0.97) 100%)" }} />
      </div>
      <div style={{ ...GW.chamber, maxWidth: 700 }} className="overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ textAlign: "center" as const, marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🏆</div>
          <p style={{ color: "#E8741A", fontSize: 11, letterSpacing: "0.38em",
            textTransform: "uppercase" as const, marginBottom: 6 }}>
            MOVEMENT III · ENTERING FINAL STAGE
          </p>
          <h2 style={{ ...GW.title, textAlign: "center" as const, borderBottom: "none", marginBottom: 4 }}>
            The Masterclass Verdict
          </h2>
          <p style={{ color: "rgba(240,232,212,0.50)", fontSize: 14 }}>
            Your finalized blend is cross-referenced against tonight's lounge.
          </p>
        </motion.div>

        {/* Score vs Nightly Average */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
          <div style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}30`,
            borderRadius: 12, padding: "18px 20px", textAlign: "center" as const }}>
            <p style={{ color: `${GOLD}60`, fontSize: 10, letterSpacing: "0.24em",
              textTransform: "uppercase" as const, marginBottom: 6 }}>Your Score</p>
            <motion.div
              initial={{ scale: 0.5 }} animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
              style={{ color: GOLD, fontSize: 40, fontWeight: 800 }}>{xp}</motion.div>
            <p style={{ color: "rgba(240,232,212,0.45)", fontSize: 12, margin: 0 }}>XP</p>
          </div>
          <div style={{ background: "rgba(232,116,26,0.05)", border: "1px solid rgba(232,116,26,0.25)",
            borderRadius: 12, padding: "18px 20px", textAlign: "center" as const }}>
            <p style={{ color: "rgba(232,116,26,0.65)", fontSize: 10, letterSpacing: "0.24em",
              textTransform: "uppercase" as const, marginBottom: 6 }}>Nightly Avg</p>
            <div style={{ color: "#E8741A", fontSize: 40, fontWeight: 800 }}>
              {nightlyData ? Math.round(nightlyAvg) : "—"}
            </div>
            {nightlyData && (
              <p style={{ color: "rgba(240,232,212,0.45)", fontSize: 12, margin: 0 }}>
                {nightlyData.count} sessions · {tierLabel}
              </p>
            )}
          </div>
        </motion.div>

        {placement && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            style={{
              background: placement === "above" ? "rgba(139,195,74,0.08)" : "rgba(239,68,68,0.06)",
              border: `1px solid ${placement === "above" ? "rgba(139,195,74,0.30)" : "rgba(239,68,68,0.25)"}`,
              borderRadius: 10, padding: "12px 18px", marginBottom: 18, textAlign: "center" as const,
            }}>
            <p style={{ color: placement === "above" ? "#8BC34A" : "#f87171",
              fontSize: 15, fontWeight: 700, margin: 0 }}>
              {placement === "above"
                ? `✓ You ranked above tonight's lounge average by ${xp - Math.round(nightlyAvg)} pts`
                : `${Math.round(nightlyAvg) - xp} pts below tonight's lounge average — the Blending Chamber awaits`}
            </p>
          </motion.div>
        )}

        {/* Spirit pairing */}
        {suggestion && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            style={{ background: `${GOLD}06`, border: `1px solid ${GOLD}25`,
              borderRadius: 12, padding: "18px 20px", marginBottom: 22 }}>
            <p style={{ color: `${GOLD}70`, fontSize: 10, letterSpacing: "0.28em",
              textTransform: "uppercase" as const, marginBottom: 10 }}>
              Definitive Spirit Pairing · {country}
            </p>
            <p style={{ color: GOLD, fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
              {suggestion.spirit}
            </p>
            <p style={{ color: `${GOLD}60`, fontSize: 13, marginBottom: 10 }}>{suggestion.spiritStyle}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
              {suggestion.descriptors.map(d => (
                <span key={d} style={{
                  background: `${GOLD}10`, border: `1px solid ${GOLD}20`,
                  borderRadius: 20, padding: "4px 12px", color: `${GOLD}78`,
                  fontSize: 12, letterSpacing: "0.1em",
                }}>{d}</span>
              ))}
            </div>
          </motion.div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button style={{ ...GW.btn(true), flex: "0 0 auto" }}
            onTouchStart={() => playClick()} onClick={onBack}>Back</button>
          <motion.button
            style={{ ...GW.btn(), flex: 1,
              background: "linear-gradient(135deg, #a05010, #7a3a0a)",
              border: "1px solid rgba(232,116,26,0.60)" }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onTouchStart={() => playClick()}
            onClick={() => { playClick(); onNext(); }}>
            ★ ENTER THE BLENDING CHAMBER
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Alchemy Reveal ─────────────────────────────────────────────────────────
const HUMIDOR_RECS: Record<string, { cigar: string; spirit: string; note: string }> = {
  "seco|connecticut":    { cigar: "Davidoff Grand Cru No.3",  spirit: "Macallan 12 Sherry Oak",   note: "Silky body + honeyed single malt" },
  "seco|habano":         { cigar: "Montecristo No.2",          spirit: "Glenfiddich 15 Yr",         note: "Cedar spice opens Speyside oak" },
  "seco|maduro":         { cigar: "Oliva Serie O Robusto",     spirit: "Bulleit Bourbon",           note: "Earth + wood echoed in wheated grain" },
  "seco|oscuro":         { cigar: "CAO Cx2 Robusto",           spirit: "Woodford Reserve",          note: "Dark notes matched by rich rye" },
  "ligero|connecticut":  { cigar: "My Father Le Bijou 1922",   spirit: "Hennessy VSOP Cognac",      note: "Full strength softened by brandy" },
  "ligero|habano":       { cigar: "Padrón 1964 Monarca", spirit: "Don Julio 1942 Añejo", note: "Volcanic intensity + aged agave" },
  "ligero|maduro":       { cigar: "Liga Privada No.9 Robusto", spirit: "Pappy Van Winkle 12 Yr",   note: "Broadleaf dark chocolate + rare bourbon" },
  "ligero|oscuro":       { cigar: "Plasencia Alma Fuerte",     spirit: "Johnnie Walker Blue",       note: "Ultra-bold met with pinnacle Scotch" },
  "viso|connecticut":    { cigar: "Arturo Fuente Hemingway",   spirit: "Dewar's 18 Year Blended",  note: "Balance between bold and refined" },
  "viso|habano":         { cigar: "Romeo y Julieta Churchill", spirit: "Jameson 18 Year",           note: "Spice finds counterpart in Irish oak" },
  "viso|maduro":         { cigar: "CAO Flathead V554",         spirit: "Elijah Craig Barrel Proof", note: "Earth + caramel finish aligned" },
  "viso|oscuro":         { cigar: "Perdomo Double Aged",       spirit: "Ron Zacapa 23 Solera",      note: "Bold aged leaf meets Guatemalan rum" },
  "candela|connecticut": { cigar: "Nat Sherman Timeless",      spirit: "Hendrick's Gin & Tonic",   note: "Botanical + grassy meets floral gin" },
  "candela|habano":      { cigar: "Punch Gran Puro",           spirit: "Aperol Spritz",             note: "Bright vegetal refreshed by citrus" },
  "candela|maduro":      { cigar: "Gurkha Cellar Reserve",     spirit: "Templeton Rye Whiskey",     note: "Grass meets unexpected spicy rye" },
  "candela|oscuro":      { cigar: "La Gloria Cubana Serie R",  spirit: "Laphroaig 10 Year",         note: "Intense terroir + peated Islay Scotch" },
};
const DEFAULT_HUMIDOR = {
  cigar:  "Private Reserve Blend",
  spirit: "Macallan Double Cask 12",
  note:   "A curated pairing awaits your final selection",
};

function HumidorPanel({ sel, synergy }: { sel: Sel; synergy: number }) {
  const [open, setOpen] = useState(true);
  const key      = `${sel.leaf?.id ?? ""}|${sel.wrapper?.id ?? ""}`;
  const rec       = HUMIDOR_RECS[key] ?? DEFAULT_HUMIDOR;
  const hasMatch  = !!sel.leaf && !!sel.wrapper;
  const alignLabel = synergy >= 80 ? "+2 XP ALIGNMENT" : synergy >= 60 ? "+1 XP ALIGNMENT" : null;

  return (
    <div style={{
      position:      "fixed",
      right:         0,
      top:           "50%",
      transform:     "translateY(-50%)",
      zIndex:        9000,
      display:       "flex",
      alignItems:    "stretch",
      pointerEvents: "auto",
    }}>
      {/* Toggle tab */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width:          22,
          background:     "rgba(10,7,0,0.88)",
          border:         `1px solid ${GOLD}30`,
          borderRight:    "none",
          borderRadius:   "6px 0 0 6px",
          cursor:         "pointer",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "16px 0",
          color:          `${GOLD}90`,
          fontSize:       9,
          letterSpacing:  "0.08em",
          writingMode:    "vertical-rl" as const,
          backdropFilter: "blur(12px)",
          textTransform:  "uppercase" as const,
          fontFamily:     "'Inter',sans-serif",
          outline:        "none",
          flexShrink:     0,
        }}
      >
        {open ? "›" : "HUMIDOR"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 210, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.32 }}
            style={{ overflow: "hidden", flexShrink: 0 }}
          >
            <div style={{
              width:                210,
              background:           "rgba(8,6,0,0.88)",
              backdropFilter:       "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border:               `1px solid ${GOLD}22`,
              borderRight:          "none",
              padding:              "14px",
              display:              "flex",
              flexDirection:        "column",
              gap:                  10,
              boxShadow:            `-6px 0 36px rgba(0,0,0,0.65), inset 0 1px 0 ${GOLD}14`,
            }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 8, borderBottom: `1px solid ${GOLD}14` }}>
                <motion.div
                  animate={{ opacity: [0.35, 1, 0.35] }}
                  transition={{ duration: 2.2, repeat: Infinity }}
                  style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, flexShrink: 0 }}
                />
                <span style={{ color: GOLD, fontSize: 9, letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 700 }}>
                  Live Humidor
                </span>
                <span style={{ color: `${GOLD}40`, fontSize: 8, letterSpacing: "0.12em", marginLeft: "auto", textTransform: "uppercase" }}>
                  AI ACTIVE
                </span>
              </div>

              {/* Cigar match */}
              <div>
                <p style={{ color: `${GOLD}50`, fontSize: 8, letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 5px 0" }}>
                  {hasMatch ? "Inventory Match" : "Awaiting Selections"}
                </p>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 5  }}
                    animate={{ opacity: 1, y: 0  }}
                    exit={{    opacity: 0, y: -5 }}
                    transition={{ duration: 0.28 }}
                  >
                    <p style={{
                      color:      "rgba(240,232,212,0.92)",
                      fontSize:   12,
                      fontFamily: "'Cormorant Garamond',serif",
                      fontWeight: 500,
                      margin:     "0 0 3px 0",
                      lineHeight: 1.3,
                    }}>
                      {rec.cigar}
                    </p>
                    <p style={{ color: `${GOLD}50`, fontSize: 10, margin: 0, fontStyle: "italic", lineHeight: 1.4 }}>
                      {rec.note}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Spirit pairing */}
              <div style={{
                padding:      "8px 10px",
                background:   `${GOLD}07`,
                borderRadius: 4,
                border:       `1px solid ${GOLD}14`,
              }}>
                <p style={{ color: `${GOLD}50`, fontSize: 8, letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 3px 0" }}>
                  Spirit Pairing
                </p>
                <p style={{ color: "rgba(240,232,212,0.80)", fontSize: 11, margin: 0, fontFamily: "'Cormorant Garamond',serif" }}>
                  {rec.spirit}
                </p>
              </div>

              {/* Alignment bonus */}
              <AnimatePresence>
                {alignLabel && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      background:   "rgba(74,222,128,0.07)",
                      border:       "1px solid rgba(74,222,128,0.20)",
                      borderRadius: 4,
                      padding:      "6px 10px",
                      textAlign:    "center",
                    }}
                  >
                    <span style={{ color: "#4ade80", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em" }}>
                      {alignLabel}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Synergy bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 2, borderTop: `1px solid ${GOLD}10` }}>
                <div style={{ flex: 1, height: 2, background: `${GOLD}12`, borderRadius: 1, overflow: "hidden" }}>
                  <motion.div
                    animate={{ width: `${Math.min(synergy, 100)}%` }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                    style={{ height: "100%", background: `linear-gradient(90deg, ${GOLD}, #f5d980)`, borderRadius: 1 }}
                  />
                </div>
                <span style={{ color: GOLD, fontSize: 9, fontWeight: 700, minWidth: 28, textAlign: "right" }}>
                  {Math.round(synergy)}%
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


function AlchemyReveal({
  sel, onRestart, finalScore, currentCountry,
}: { sel: Sel; onRestart: () => void; finalScore: number; currentCountry?: string | null }) {
  const { speak } = useAudio();
  const { guestProfile, isReturning } = useGuestProfile();
  const [phase,       setPhase]       = useState<"scan" | "result">("scan");
  const [data,        setData]        = useState<PairingResult | null>(null);
  const [staffTab,    setStaffTab]    = useState(false);
  const [nightlyData, setNightlyData] = useState<{ avg: number; count: number; tier: string } | null>(null);

  // Persist session country when reveal opens
  useEffect(() => {
    if (currentCountry) persistCountry(currentCountry);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch("/api/master-blender/nightly-average")
      .then(r => r.ok ? r.json() : null)
      .then((d: { avg: number; count: number } | null) => {
        if (!d) return;
        const tier = d.avg >= 90 ? "Master Blender" : d.avg >= 70 ? "Senior Blend" : d.avg >= 50 ? "Journeyman" : "Novice Aficionado";
        setNightlyData({ ...d, tier });
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sessionCount  = guestProfile?.sessionCount ?? 0;
  const flavorHistory = guestProfile?.flavorHistory ?? [];
  const isPalateEvolution = isReturning && sessionCount > 1;
  const staffMode     = isPalateEvolution ? "PALATE EVOLUTION" : "EDUCATION";
  const staffModeColor = isPalateEvolution ? "#a78bfa" : "#4ade80";
  const staffLine     = getStaffLine("smoke", isPalateEvolution, sessionCount);
  const topFlavors    = [...flavorHistory]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  useEffect(() => {
    const body = {
      leaf:         sel.leaf?.id    ?? "viso",
      wrapper:      sel.wrapper?.id ?? "habano",
      vitola:       sel.vitola?.id  ?? "robusto",
      cut:          sel.cut?.id     ?? "straight",
      wrapperLabel: sel.wrapper?.label,
      vitolaLabel:  sel.vitola?.label,
    };

    fetch("/api/master-blender/resolve", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    })
      .then(r => r.json())
      .then((d: PairingResult) => {
        setData(d);
        setTimeout(() => setPhase("result"), 2200);
      })
      .catch(() => {
        setTimeout(() => setPhase("result"), 2200);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === "result" && data?.alchemyText) {
      const t = setTimeout(() => speak(data.alchemyText), 800);
      return () => clearTimeout(t);
    }
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, data]);

  const blendLabel = `${sel.vitola?.label ?? "Robusto"} ${sel.wrapper?.label ?? "Maduro"}`;
  const tagline    = data
    ? `A ${data.descriptors.slice(0, 2).join(", ")} blend — ${data.primaryCategory} is the companion of choice.`
    : `A ${sel.leaf?.sub ?? "full-body"} smoke ideal for the contemplative hour.`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[9990] flex flex-col overflow-y-auto"
      style={{ background: "rgba(4,2,0,0.97)", backdropFilter: "blur(20px)" }}
    >
      <AnimatePresence mode="wait">
        {phase === "scan" ? (
          <motion.div
            key="scan"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-screen gap-6"
          >
            <div className="relative" style={{ width: 200, height: 200 }}>
              <div className="absolute inset-0 rounded-full" style={{ border: `2px solid ${GOLD}30` }} />
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: `2px solid ${GOLD}` }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute left-1/2 top-0 bottom-0 w-0.5 origin-bottom"
                style={{ background: `linear-gradient(to top, ${GOLD}, transparent)`, marginLeft: -1 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] tracking-[0.3em] uppercase text-center" style={{ color: `${GOLD}80` }}>
                  SCANNING<br/>HUMIDOR
                </span>
              </div>
            </div>
            <div className="w-64 flex flex-col gap-1.5">
              {["ANALYZING LEAF SYNERGY", "CROSS-REFERENCING VITOLA", "RESOLVING INVENTORY PAIRINGS"].map((t, i) => (
                <motion.div
                  key={t}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.45 }}
                  className="flex items-center gap-2"
                >
                  <motion.div
                    className="rounded-full flex-shrink-0"
                    style={{ width: 6, height: 6, background: GOLD }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.2 }}
                  />
                  <span className="text-[9px] tracking-widest uppercase" style={{ color: `${GOLD}60` }}>{t}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-5 px-5 py-8 text-center min-h-screen"
          >
            {/* Confidence badge */}
            {data && (
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full"
                style={{ background: "rgba(212,175,55,0.12)", border: `1px solid ${GOLD}40` }}
              >
                <div className="rounded-full" style={{ width: 6, height: 6, background: GOLD }} />
                <span className="text-[9px] tracking-widest uppercase" style={{ color: GOLD }}>
                  {data.confidence}% Palate Confidence
                </span>
              </motion.div>
            )}

            {/* Hero cigar image */}
            <motion.div
              animate={{ boxShadow: [`0 0 0 ${GOLD}00`, `0 0 60px ${GOLD}66`, `0 0 0 ${GOLD}00`] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="rounded-full overflow-hidden"
              style={{ width: 148, height: 148, border: `3px solid ${GOLD}`, flexShrink: 0 }}
            >
              <img
                src={sel.vitola?.img ?? "/images/cigar.png"}
                alt="match"
                className="w-full h-full object-cover"
                style={{ filter: "brightness(1.1) saturate(1.15)" }}
              />
            </motion.div>

            {/* Title */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] tracking-[0.3em] uppercase" style={{ color: `${GOLD}88` }}>YOUR PERFECT MATCH</span>
              <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "2rem", fontWeight: 300, color: "#f0e8d4", lineHeight: 1.1, margin: 0 }}>
                {blendLabel}
              </h2>
              <p className="text-sm italic mt-1 px-4" style={{ color: `${GOLD}90` }}>
                {tagline}
              </p>
            </div>

            {/* Alchemy text */}
            {data?.alchemyText && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-2xl px-5 py-4 text-left max-w-md w-full"
                style={{ background: "rgba(212,175,55,0.07)", border: `1px solid ${GOLD}28`, backdropFilter: "blur(12px)" }}
              >
                <span className="text-[9px] tracking-widest uppercase block mb-2" style={{ color: `${GOLD}70` }}>
                  ✦ THE ALCHEMY
                </span>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(240,232,212,0.80)" }}>
                  {data.alchemyText}
                </p>
              </motion.div>
            )}

            {/* Ritual Score Panel — sealed score + milestone breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="w-full max-w-md rounded-2xl px-5 py-4"
              style={{
                background:           "rgba(212,175,55,0.06)",
                border:               `1px solid ${GOLD}28`,
                backdropFilter:       "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] tracking-widest uppercase" style={{ color: `${GOLD}70` }}>
                  RITUAL SCORE — SEALED
                </span>
                <motion.span
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6, type: "spring", stiffness: 200, damping: 14 }}
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: GOLD, fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {finalScore} <span className="text-sm font-normal">XP</span>
                </motion.span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[8px] tracking-widest uppercase px-2 py-0.5 rounded-full"
                  style={{ color: "#4ade80", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)" }}>
                  +M1 Cultivation Bonus
                </span>
                <span className="text-[8px] tracking-widest uppercase px-2 py-0.5 rounded-full"
                  style={{ color: "#ef4444", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
                  −1 Mentor Challenge
                </span>
                <span className="text-[8px] tracking-widest uppercase px-2 py-0.5 rounded-full"
                  style={{ color: "#4ade80", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)" }}>
                  +M3 Harmony Bonus
                </span>
              </div>
            </motion.div>

            {/* Spirit Pairings */}
            {(data?.spiritPairings?.length ?? 0) > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="w-full max-w-md"
              >
                <span className="text-[9px] tracking-widest uppercase block mb-2 text-left" style={{ color: `${GOLD}70` }}>
                  SPIRIT PAIRINGS — LIVE INVENTORY
                </span>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {data!.spiritPairings.map((s, i) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + i * 0.12 }}
                      className="flex-shrink-0 rounded-xl overflow-hidden flex flex-col"
                      style={{
                        width:          120,
                        background:     "rgba(212,175,55,0.08)",
                        border:         `1px solid ${GOLD}28`,
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      <div style={{ height: 70, background: "rgba(212,175,55,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {s.imageUrl ? (
                          <img src={s.imageUrl} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: 9, letterSpacing: "0.18em", color: `${GOLD}55`, textTransform: "uppercase" }}>SPIRIT</span>
                        )}
                      </div>
                      <div className="px-2 py-2">
                        <p className="text-[9px] font-bold leading-tight" style={{ color: "rgba(240,232,212,0.90)" }}>{s.name}</p>
                        {s.priceCents && (
                          <p className="text-[9px] mt-0.5" style={{ color: GOLD }}>${(s.priceCents / 100).toFixed(0)}</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Beer Pairings */}
            {(data?.beerPairings?.length ?? 0) > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="w-full max-w-md"
              >
                <span className="text-[9px] tracking-widest uppercase block mb-2 text-left" style={{ color: `${GOLD}70` }}>
                  BEER PAIRINGS
                </span>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {data!.beerPairings.map((b, i) => (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.75 + i * 0.12 }}
                      className="flex-shrink-0 rounded-xl overflow-hidden flex flex-col"
                      style={{
                        width:          120,
                        background:     "rgba(212,175,55,0.08)",
                        border:         `1px solid ${GOLD}28`,
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      <div style={{ height: 70, background: "rgba(212,175,55,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 9, letterSpacing: "0.18em", color: `${GOLD}55`, textTransform: "uppercase" }}>BEER</span>
                      </div>
                      <div className="px-2 py-2">
                        <p className="text-[9px] font-bold leading-tight" style={{ color: "rgba(240,232,212,0.90)" }}>{b.name}</p>
                        {b.priceCents && (
                          <p className="text-[9px] mt-0.5" style={{ color: GOLD }}>${(b.priceCents / 100).toFixed(0)}</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Staff Nudge Toggle */}
            {data?.staffNudge && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85 }}
                className="w-full max-w-md"
              >
                <button
                  onClick={() => setStaffTab(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{
                    background:     "rgba(42,42,42,0.80)",
                    border:         `1px solid ${staffModeColor}38`,
                    backdropFilter: "blur(12px)",
                    cursor:         "pointer",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="rounded-full" style={{ width: 6, height: 6, background: staffModeColor }} />
                    <span className="text-[9px] tracking-[0.22em] uppercase font-bold" style={{ color: "rgba(240,232,212,0.70)" }}>
                      STAFF INTELLIGENCE
                    </span>
                    <span className="text-[8px] tracking-widest uppercase font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `${staffModeColor}20`, color: staffModeColor, border: `1px solid ${staffModeColor}40` }}>
                      {staffMode}
                    </span>
                  </div>
                  <span style={{ color: `${GOLD}80`, fontSize: 10 }}>{staffTab ? "▲ HIDE" : "▼ SHOW"}</span>
                </button>

                <AnimatePresence>
                  {staffTab && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="rounded-b-xl p-4 flex flex-col gap-3 text-left"
                        style={{
                          background:     "rgba(28,24,16,0.96)",
                          border:         `1px solid ${staffModeColor}25`,
                          borderTop:      "none",
                          backdropFilter: "blur(12px)",
                        }}
                      >
                        {/* Mode header line */}
                        <div className="rounded-lg px-3 py-2" style={{ background: `${staffModeColor}10`, border: `1px solid ${staffModeColor}25` }}>
                          <span className="text-[9px] tracking-widest uppercase block mb-1" style={{ color: staffModeColor }}>
                            {isPalateEvolution ? "✦ RETURNING REGULAR" : "✦ FIRST-TIME EXPLORER"}
                          </span>
                          <p className="text-xs leading-relaxed italic" style={{ color: "rgba(240,232,212,0.75)" }}>
                            {staffLine}
                          </p>
                        </div>

                        {/* Palate Evolution: show flavor history tags */}
                        {isPalateEvolution && topFlavors.length > 0 && (
                          <div>
                            <span className="text-[9px] tracking-widest uppercase block mb-1.5" style={{ color: `${staffModeColor}80` }}>
                              KNOWN PALATE HISTORY
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {topFlavors.map(f => (
                                <span key={f.tag} className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider flex items-center gap-1"
                                  style={{ background: `${staffModeColor}15`, border: `1px solid ${staffModeColor}35`, color: staffModeColor }}>
                                  {f.tag}
                                  <span style={{ opacity: 0.55 }}>×{f.count}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Education mode: explain today's blend */}
                        {!isPalateEvolution && (
                          <div>
                            <span className="text-[9px] tracking-widest uppercase block mb-1" style={{ color: "rgba(212,175,55,0.60)" }}>
                              HOW TO EXPLAIN THIS BLEND
                            </span>
                            <p className="text-xs leading-relaxed" style={{ color: "rgba(240,232,212,0.72)" }}>
                              Start with the wrapper — it's what the guest can see and feel. Then guide them through the body (the leaf), and finish with why the smoke time matters. Keep it sensory, not technical.
                            </p>
                          </div>
                        )}

                        {/* Flavor profile tags */}
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] tracking-widest uppercase" style={{ color: `${GOLD}70` }}>TODAY'S FLAVOR PROFILE</span>
                          <span className="text-[9px] font-bold" style={{ color: "#4ade80" }}>
                            {data.staffNudge.confidenceScore}% MATCH
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {data.staffNudge.flavorProfile.split(" · ").map(d => (
                            <span key={d} className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider"
                              style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}30`, color: GOLD }}>
                              {d}
                            </span>
                          ))}
                        </div>

                        {/* Suggested wording */}
                        <div>
                          <span className="text-[9px] tracking-widest uppercase block mb-1" style={{ color: "rgba(212,175,55,0.60)" }}>
                            SUGGESTED WORDING
                          </span>
                          <p className="text-xs leading-relaxed" style={{ color: "rgba(240,232,212,0.72)" }}>
                            {data.staffNudge.suggestedWording}
                          </p>
                        </div>

                        {/* Upsell line */}
                        <div className="rounded-lg px-3 py-2" style={{ background: "rgba(212,175,55,0.06)", border: `1px solid ${GOLD}20` }}>
                          <span className="text-[9px] tracking-widest uppercase block mb-1" style={{ color: `${GOLD}60` }}>
                            PREMIUM UPSELL
                          </span>
                          <p className="text-[11px] italic leading-relaxed" style={{ color: "rgba(240,232,212,0.65)" }}>
                            {data.staffNudge.upsellLine}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── Legacy Reserve & Humidor finale images ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.9 }}
              className="w-full max-w-md"
            >
              <p style={{ color: `${GOLD}65`, fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", textAlign: "center", marginBottom: 10 }}>
                ✦ Legacy Reserve · Sovereign Attained
              </p>
              <div className="flex gap-3 rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD}22` }}>
                <div className="flex-1 overflow-hidden" style={{ maxHeight: 150 }}>
                  <img
                    src={imgHumidor}
                    alt="Private Humidor Reserve"
                    className="w-full h-full object-cover"
                    style={{ filter: "brightness(0.75)" }}
                  />
                </div>
                <div className="flex-1 overflow-hidden" style={{ maxHeight: 150 }}>
                  <img
                    src={imgBoxArchitect}
                    alt="Signature Studio Box Architect"
                    className="w-full h-full object-cover"
                    style={{ filter: "brightness(0.75)" }}
                  />
                </div>
              </div>
              <p style={{ color: `${GOLD}50`, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", textAlign: "center", marginTop: 8 }}>
                Signature Humidor Studio · Box Architect Tier 2
              </p>
            </motion.div>

            {/* Sensory Matrix + Settle & Order Now */}
            <SettleOrderPanel currentCountry={currentCountry ?? null} finalScore={finalScore} />

            {/* Origin Passport */}
            <CountryTracker currentCountry={currentCountry ?? null} />

            {/* Nightly Lounge Leaderboard */}
            {nightlyData && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                style={{
                  background: "rgba(0,0,0,0.72)",
                  border: `1px solid ${GOLD}30`,
                  borderRadius: 10,
                  padding: "18px 22px",
                  marginBottom: 18,
                  backdropFilter: "blur(18px)",
                }}
              >
                <p style={{ color: `${GOLD}80`, fontSize: 12, letterSpacing: "0.30em", textTransform: "uppercase", marginBottom: 12 }}>
                  Nightly Lounge Leaderboard
                </p>
                <div style={{ display: "flex", gap: 20, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 14 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: GOLD, fontSize: 38, fontWeight: 700, lineHeight: 1, fontFamily: "'Cormorant Garamond',serif" }}>
                      {finalScore}
                    </div>
                    <div style={{ color: "rgba(240,232,212,0.55)", fontSize: 12, letterSpacing: "0.14em", marginTop: 4 }}>YOUR XP</div>
                  </div>
                  <div style={{ width: 1, height: 48, background: `${GOLD}25`, flexShrink: 0 }} />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "rgba(240,232,212,0.70)", fontSize: 32, fontWeight: 400, lineHeight: 1, fontFamily: "'Cormorant Garamond',serif" }}>
                      {nightlyData.avg.toFixed(0)}
                    </div>
                    <div style={{ color: "rgba(240,232,212,0.40)", fontSize: 12, letterSpacing: "0.14em", marginTop: 4 }}>
                      LOUNGE AVG ({nightlyData.count} sessions)
                    </div>
                  </div>
                  <div style={{ marginLeft: "auto", textAlign: "center" }}>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.9, type: "spring", stiffness: 220 }}
                      style={{
                        background: finalScore >= nightlyData.avg
                          ? "linear-gradient(135deg,rgba(212,175,55,0.22),rgba(212,175,55,0.06))"
                          : "rgba(255,255,255,0.04)",
                        border: `1px solid ${finalScore >= nightlyData.avg ? GOLD : "rgba(255,255,255,0.14)"}`,
                        borderRadius: 8, padding: "10px 16px",
                      }}
                    >
                      <div style={{ color: finalScore >= nightlyData.avg ? GOLD : "rgba(240,232,212,0.55)", fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                        {finalScore >= nightlyData.avg ? "★ Above Average" : "Below Average"}
                      </div>
                    </motion.div>
                    <div style={{ color: `${GOLD}90`, fontSize: 11, letterSpacing: "0.16em", marginTop: 8, textTransform: "uppercase" }}>
                      {nightlyData.tier}
                    </div>
                  </div>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((finalScore / Math.max(nightlyData.avg * 1.4, 1)) * 100, 100)}%` }}
                    transition={{ delay: 0.8, duration: 1.2, ease: "easeOut" }}
                    style={{ height: "100%", background: `linear-gradient(90deg,${GOLD},#f97316)`, borderRadius: 2 }}
                  />
                </div>
              </motion.div>
            )}

            {/* Nightly Lounge Leaderboard */}
            {nightlyData && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                style={{
                  background: "rgba(0,0,0,0.70)",
                  border: `1px solid ${GOLD}28`,
                  borderRadius: 10,
                  padding: "18px 22px",
                  marginBottom: 20,
                  backdropFilter: "blur(18px)",
                }}
              >
                <p style={{ color: `${GOLD}75`, fontSize: 11, letterSpacing: "0.30em", textTransform: "uppercase", marginBottom: 12 }}>
                  Nightly Lounge Leaderboard
                </p>
                <div style={{ display: "flex", gap: 20, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 14 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: GOLD, fontSize: 38, fontWeight: 700, lineHeight: 1, fontFamily: "'Cormorant Garamond',serif" }}>{finalScore}</div>
                    <div style={{ color: "rgba(240,232,212,0.45)", fontSize: 11, letterSpacing: "0.14em", marginTop: 4 }}>YOUR XP</div>
                  </div>
                  <div style={{ width: 1, height: 44, background: `${GOLD}20`, flexShrink: 0 }} />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "rgba(240,232,212,0.65)", fontSize: 30, fontWeight: 400, lineHeight: 1, fontFamily: "'Cormorant Garamond',serif" }}>
                      {nightlyData.avg.toFixed(0)}
                    </div>
                    <div style={{ color: "rgba(240,232,212,0.35)", fontSize: 11, letterSpacing: "0.14em", marginTop: 4 }}>
                      LOUNGE AVG ({nightlyData.count} sessions tonight)
                    </div>
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.9, type: "spring", stiffness: 220 }}
                      style={{
                        background: finalScore >= nightlyData.avg
                          ? "linear-gradient(135deg,rgba(212,175,55,0.20),rgba(212,175,55,0.05))"
                          : "rgba(255,255,255,0.04)",
                        border: `1px solid ${finalScore >= nightlyData.avg ? GOLD : "rgba(255,255,255,0.12)"}`,
                        borderRadius: 8, padding: "10px 16px", textAlign: "center",
                      }}
                    >
                      <div style={{ color: finalScore >= nightlyData.avg ? GOLD : "rgba(240,232,212,0.50)", fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                        {finalScore >= nightlyData.avg ? "★ Above Average" : "Below Average"}
                      </div>
                      <div style={{ color: `${GOLD}80`, fontSize: 11, letterSpacing: "0.16em", marginTop: 6, textTransform: "uppercase" }}>
                        {nightlyData.tier}
                      </div>
                    </motion.div>
                  </div>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((finalScore / Math.max(nightlyData.avg * 1.5, 1)) * 100, 100)}%` }}
                    transition={{ delay: 0.8, duration: 1.2, ease: "easeOut" }}
                    style={{ height: "100%", background: `linear-gradient(90deg,${GOLD},#f97316)`, borderRadius: 2 }}
                  />
                </div>
              </motion.div>
            )}

            {/* Blend Again */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={onRestart}
              className="mt-2 px-10 py-3 rounded-full font-bold tracking-widest uppercase text-sm"
              style={{ background: `linear-gradient(135deg, ${GOLD}, #c8951a)`, color: "#0a0700", letterSpacing: "0.18em" }}
            >
              Blend Again
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function MasterBlender() {
  const [, nav]       = useLocation();
  const { speak, stopSpeak } = useAudio();
  const { guestProfile, evolveMastery } = useGuestProfile();

  // ── Gateway state ────────────────────────────────────────────────────────
  const [bootDone, setBootDone] = useState(false);
  const [mentorAcknowledged, setMentorAcknowledged] = useState(false);
  const [gateway,        setGateway]        = useState<GatewayPhase>("cockpit");
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null);
  const [selectedSeed,   setSelectedSeed]   = useState<string | null>(null);
  const [selectedSoil,    setSelectedSoil]    = useState<string | null>(null);
  const [selectedTerroir, setSelectedTerroir] = useState<string | null>(null);

  const [step,   setStep]   = useState<0|1|2|3>(0);
  const [sel,    setSel]    = useState<Sel>({});
  const [xp,     setXp]     = useState(0);
  const [chips,  setChips]  = useState<XPFloat[]>([]);
  const [reveal, setReveal] = useState(false);
  const [smokeSlider, setSmokeSlider] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txId,         setTxId]         = useState<string | null>(null);
  const [primingVolado,   setPrimingVolado]   = useState(30);
  const [primingSecoViso, setPrimingSecoViso] = useState(50);
  const [primingLigero,   setPrimingLigero]   = useState(20);
  // Blending chamber Step-0 allocation sliders (must sum to 100)
  const [blendSeco,    setBlendSeco]    = useState(34);
  const [blendViso,    setBlendViso]    = useState(33);
  const [blendLigero,  setBlendLigero]  = useState(33);
  const [accordionOpen, setAccordionOpen] = useState<string | null>(null);

  // Scoring state
  const scoreFrozenRef             = useRef(false);
  const [scoreFrozen,            setScoreFrozenState]   = useState(false);
  const [mentorPenaltyFired,     setMentorPenaltyFired]    = useState(false);
  const [cultivationBonusGiven,  setCultivationBonusGiven] = useState(false);
  const [lastScoreDelta,         setLastScoreDelta]         = useState<number | null>(null);

  // ── Reset mentor overlay when entering a new phase that requires it ───────
  useEffect(() => {
    const OVERLAY_PHASES: GatewayPhase[] = ["terroir","seed_biology","harvest","curing","rolling_bench","vitola_science"];
    if ((OVERLAY_PHASES as string[]).includes(gateway)) setMentorAcknowledged(false);
  }, [gateway]);

  // ── Force Stage 1 on every fresh mount — prevents HMR state bleed ────────
  // Also wipes all legacy localStorage/sessionStorage keys so no prior session
  // can surface a returning-user state or bypass the gateway intro.
  useLayoutEffect(() => {
    setGateway("cockpit");
    setStep(0 as 0);
    setSel({});
    setReveal(false);
    setXp(0);
    setSelectedMentor(null);
    setSelectedSeed(null);
    setPrimingVolado(30);
    setPrimingSecoViso(50);
    setPrimingLigero(20);
    setSelectedSoil(null);
    setSelectedTerroir(null);
    scoreFrozenRef.current = false;
    setScoreFrozenState(false);
    setMentorPenaltyFired(false);
    setCultivationBonusGiven(false);
    setLastScoreDelta(null);
    try {
      // Legacy keys (older builds)
      localStorage.removeItem("titan_ritual_complete");
      localStorage.removeItem("smokeCraftStage");
      localStorage.removeItem("currentStage");
      // Session keys — ensure no returning-user profile bleeds into a fresh entry
      sessionStorage.removeItem("smokecraft_guest");
      sessionStorage.removeItem("axiom_eeis_journey");
      sessionStorage.removeItem("axiom_experience_level");
      sessionStorage.removeItem("axiom_craft_build");
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const chipId = useRef(0);

  const synergy = Math.min(
    (sel.leaf?.synergy    ?? 0) +
    (sel.wrapper?.synergy ?? 0) +
    (sel.vitola?.synergy  ?? 0) +
    (sel.cut?.synergy     ?? 0),
    100,
  );

  // Mentor narration on step change
  useEffect(() => {
    stopSpeak();
    const t = setTimeout(() => speak(STEP_MENTOR[step] ?? ""), 600);
    return () => { clearTimeout(t); stopSpeak(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Sync slider when vitola changes
  useEffect(() => {
    if (sel.vitola) setSmokeSlider(sel.vitola.smoke);
  }, [sel.vitola]);

  // spawnXPAt: coordinate-based, reads scoreFrozenRef — safe in setTimeout closures
  const spawnXPAt = useCallback((amount: number, x: number, y: number) => {
    if (scoreFrozenRef.current) return;
    const id = ++chipId.current;
    setChips(c => [...c, { id, amount, x: x - 30, y: y - 40 }]);
    setTimeout(() => setChips(c => c.filter(ch => ch.id !== id)), 1200);
    setXp(v => v + amount);
    setLastScoreDelta(amount);
    setTimeout(() => setLastScoreDelta(null), 1600);
  }, []);

  const spawnXP = useCallback((amount: number, e: React.MouseEvent) => {
    spawnXPAt(amount, e.clientX, e.clientY);
  }, [spawnXPAt]);

  function select<T extends { id: string; xp: number }>(key: keyof Sel, item: T, e: React.MouseEvent) {
    playClick();
    setSel(s => ({ ...s, [key]: item }));
    spawnXP(item.xp, e);
    if ("mentorNote" in item) {
      setTimeout(() => speak(String((item as unknown as typeof LEAVES[0]).mentorNote ?? "")), 400);
    }
    // M2: Mentor challenge penalty — fires once after first leaf pick
    if (key === "leaf" && !mentorPenaltyFired) {
      setMentorPenaltyFired(true);
      const px = e.clientX;
      const py = e.clientY;
      setTimeout(() => spawnXPAt(-1, px, py + 30), 1400);
    }
    // M3: Cut harmony bonus — synergy-gated pairing award
    if (key === "cut") {
      const cutSynergy    = (item as unknown as { synergy?: number }).synergy ?? 0;
      const totalSynergy  = (sel.leaf?.synergy ?? 0) + (sel.wrapper?.synergy ?? 0) + (sel.vitola?.synergy ?? 0) + cutSynergy;
      const px = e.clientX;
      const py = e.clientY;
      if (totalSynergy >= 80) {
        setTimeout(() => spawnXPAt(2, px, py - 60), 900);
      } else if (totalSynergy >= 60) {
        setTimeout(() => spawnXPAt(1, px, py - 60), 900);
      }
    }
  }

  function nextStep() {
    if (step === 3) { stopSpeak(); setReveal(true); return; }
    setStep(s => (s + 1) as 0|1|2|3);
  }
  function prevStep() { if (step > 0) setStep(s => (s - 1) as 0|1|2|3); }

  // M1: Cultivation milestone — awards bonus based on mentor/soil affinity match
  function handleCultivationNext() {
    setGateway("gate_movement_1");
  }

  async function handleRevealMatch(e: React.MouseEvent) {
    if (!canAdvance) return;
    if (step !== 3) { nextStep(); return; }

    // Stage 14: capture and freeze score before any async work
    const finalXP = xp;
    scoreFrozenRef.current = true;
    setScoreFrozenState(true);

    const x = e.clientX;
    const y = e.clientY;

    // Fire visual + audio layers synchronously — user sees immediate response
    triggerBlenderRipple(x, y);
    velvetSlide();

    // Advance to reveal overlay immediately (optimistic)
    nextStep();

    // Persist frozen score to guest ledger (fire-and-forget)
    void evolveMastery(finalXP, { craftType: "smoke" });

    // Background ledger submit — data hits Command Center as screen dissolves
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/novee/transaction/submit", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blendSelected:   sel.leaf?.label   ?? "Unknown",
          vitola:          sel.vitola?.label  ?? "Unknown",
          customEngraving: sel.cut?.label     ?? "",
          guestId:         guestProfile?.firstName ?? "guest",
          finalScore:      finalXP,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { transactionId: string };
        setTxId(data.transactionId);
      }
    } catch { /* non-fatal — reveal overlay already shown */ } finally {
      setIsSubmitting(false);
    }
  }

  const stepKeys: (keyof Sel)[] = ["leaf","wrapper","vitola","cut"];
  const blendTotal = blendSeco + blendViso + blendLigero;
  const canAdvance = step === 0
    ? !!sel.leaf && blendTotal === 100
    : !!sel[stepKeys[step]];

  const STEP_LABELS = ["FILLER LEAF", "WRAPPER", "VITOLA & SMOKE", "THE CUT"];
  const STEP_TITLES = [
    "Choose Your Filler Leaf",
    "Choose the Wrapper",
    "Vitola & Smoke Time",
    "The Final Cut",
  ];



  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: "#000000", fontFamily: "'Inter',sans-serif" }}
    >
      {/* ── Boot sequence — plays once on mount ── */}
      {!bootDone && <BootSequence onComplete={() => setBootDone(true)} />}

      {/* ── Cockpit — solid top-layer portal, rendered independently ── */}
      {gateway === "cockpit" && (
        <div style={{ position: "fixed", inset: 0, background: "#000000", zIndex: 99998, display: "flex", flexDirection: "column" }}>
          <CockpitIdleView onSmokeCraft={() => setGateway("intro")} />
        </div>
      )}

      {/* ── Gateway overlay (intro → orientation → mentor → cultivation) ── */}
      <AnimatePresence mode="wait">
        {gateway !== "blending" && gateway !== "cockpit" && (
          <motion.div
            key="gateway-overlay"
            className="absolute inset-0 z-[9995] overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4 }}
          >
            <AnimatePresence mode="wait">
              {gateway === "intro" && (
                <GatewayIntro
                  key="intro"
                  onEnterNew={() => setGateway("orientation")}
                  onBack={() => setGateway("cockpit")}
                  onStartSession={(seedXp) => { setXp(seedXp); setGateway("blending"); }}
                />
              )}
              {gateway === "orientation" && (
                <GatewayOrientation
                  key="orientation"
                  onNext={() => setGateway("mentor")}
                  onBack={() => setGateway("intro")}
                />
              )}
              {gateway === "mentor" && (
                <GatewayMentor
                  key="mentor"
                  selected={selectedMentor}
                  onSelect={setSelectedMentor}
                  onNext={() => setGateway("terroir")}
                  onBack={() => setGateway("orientation")}
                />
              )}
              {gateway === "terroir" && (
                <GatewayTerroir
                  key="terroir"
                  onNext={() => setGateway("seed_biology")}
                  onBack={() => setGateway("mentor")}
                  onCountrySelect={(country) => {
                    setSelectedTerroir(country);
                    persistCountry(country);
                  }}
                />
              )}
              {gateway === "seed_biology" && (
                <GatewaySeedBiology
                  key="seed_biology"
                  onNext={() => setGateway("cultivation")}
                  onBack={() => setGateway("terroir")}
                />
              )}
              {gateway === "cultivation" && (
                <GatewayCultivation
                  key="cultivation"
                  selectedSeed={selectedSeed}
                  selectedSoil={selectedSoil}
                  selectedMentor={selectedMentor}
                  onSeed={setSelectedSeed}
                  onSoil={setSelectedSoil}
                  onXP={spawnXP}
                  onNext={handleCultivationNext}
                  onBack={() => setGateway("seed_biology")}
                />
              )}
            {gateway === "harvest" && (
                <GatewayHarvest
                  key="harvest"
                  onNext={() => setGateway("curing")}
                  onBack={() => setGateway("cultivation")}
                />
              )}
              {gateway === "curing" && (
                <GatewayCuring
                  key="curing"
                  onNext={() => setGateway("rolling_bench")}
                  onBack={() => setGateway("harvest")}
                />
              )}
              {gateway === "gate_movement_1" && (
                <GatewayMovement1Gate
                  key="gate_movement_1"
                  onNext={() => setGateway("harvest")}
                  selectedTerroir={selectedTerroir}
                  selectedSeed={selectedSeed}
                  xp={xp}
                />
              )}
              {gateway === "harvest" && (
                <GatewayHarvest
                  key="harvest"
                  onNext={() => setGateway("curing")}
                  onBack={() => setGateway("gate_movement_1")}
                />
              )}
              {gateway === "curing" && (
                <GatewayCuring
                  key="curing"
                  onNext={() => setGateway("rolling_bench")}
                  onBack={() => setGateway("harvest")}
                />
              )}
              {gateway === "rolling_bench" && (
                <GatewayRollingBench
                  key="rolling_bench"
                  onNext={() => setGateway("priming_matrix")}
                  onBack={() => setGateway("curing")}
                />
              )}
              {gateway === "priming_matrix" && (
                <GatewayPrimingMatrix
                  key="priming_matrix"
                  onNext={() => setGateway("gate_movement_2")}
                  onBack={() => setGateway("rolling_bench")}
                  onPrimingChange={(v, sv, l) => { setPrimingVolado(v); setPrimingSecoViso(sv); setPrimingLigero(l); }}
                />
              )}
              {gateway === "gate_movement_2" && (
                <GatewayMovement2Gate
                  key="gate_movement_2"
                  onNext={() => setGateway("vitola_science")}
                  onBack={() => setGateway("priming_matrix")}
                  volado={primingVolado}
                  secoViso={primingSecoViso}
                  ligero={primingLigero}
                  xp={xp}
                />
              )}
              {gateway === "vitola_science" && (
                <GatewayVitolaScience
                  key="vitola_science"
                  onNext={() => setGateway("gate_movement_3")}
                  onBack={() => setGateway("gate_movement_2")}
                />
              )}
              {gateway === "gate_movement_3" && (
                <GatewayMovement3Gate
                  key="gate_movement_3"
                  onNext={() => setGateway("blending")}
                  onBack={() => setGateway("vitola_science")}
                  xp={xp}
                  selectedTerroir={selectedTerroir}
                  volado={primingVolado}
                  secoViso={primingSecoViso}
                  ligero={primingLigero}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mentor Assist Overlay — gate-locked until acknowledged ── */}
      <AnimatePresence>
        {!mentorAcknowledged && !!selectedMentor &&
          (["terroir","seed_biology","harvest","curing","rolling_bench","vitola_science"] as GatewayPhase[]).includes(gateway) && (
          <MentorAssistOverlay
            mentorId={selectedMentor}
            onAcknowledge={() => setMentorAcknowledged(true)}
          />
        )}
      </AnimatePresence>

      {/* HTML5 canvas smoke particles */}
      <SmokeCanvas />
      <RippleCanvas />

      {/* Mastery Progress Lock Banner — blending phase only */}
      {gateway === "blending" && !reveal && <ProgressLockBanner xp={xp} />}

      {/* Live Humidor Panel — blending phase only */}
      {gateway === "blending" && !reveal && (
        <HumidorPanel sel={sel} synergy={synergy} />
      )}

      {/* XP float chips */}
      <AnimatePresence>
        {chips.map(chip => <XPChip key={chip.id} chip={chip} />)}
      </AnimatePresence>

      {/* Alchemy reveal overlay */}
      <AnimatePresence>
        {reveal && (
          <AlchemyReveal
            sel={sel}
            finalScore={xp}
            currentCountry={selectedTerroir}
            onRestart={() => {
              setReveal(false);
              setStep(0 as 0);
              setSel({});
              setXp(0);
              setGateway("intro");
              setSelectedMentor(null);
              setPrimingVolado(30);
              setPrimingSecoViso(50);
              setPrimingLigero(20);
              setSelectedSeed(null);
              setSelectedSoil(null);
              scoreFrozenRef.current = false;
              setScoreFrozenState(false);
              setMentorPenaltyFired(false);
              setCultivationBonusGiven(false);
              setLastScoreDelta(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-2 flex-shrink-0">
        <button
          onClick={() => nav("/")}
          className="text-[9px] tracking-[0.28em] uppercase flex items-center gap-2"
          style={{ color: `${GOLD}70`, background: "none", border: "none", cursor: "pointer" }}
        >
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7l5 5" stroke={`${GOLD}70`} strokeWidth={1.5} strokeLinecap="round"/>
          </svg>
          NOVEE OS
        </button>

        <div className="flex items-center gap-2">
          <AudioWaveToggle />
          <motion.div
            key={xp}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: scoreFrozen ? "rgba(239,68,68,0.10)" : "rgba(212,175,55,0.10)",
              border:     `1px solid ${scoreFrozen ? "#ef4444" : GOLD}30`,
            }}
          >
            <div className="rounded-full" style={{ width: 6, height: 6, background: scoreFrozen ? "#ef4444" : GOLD }} />
            <span className="text-xs font-bold tabular-nums" style={{ color: scoreFrozen ? "#ef4444" : GOLD }}>
              {scoreFrozen ? "SEALED · " : ""}{xp} XP
            </span>
          </motion.div>
        </div>
      </div>

      {/* ── Cinematic journey progress bar — blending chamber ── */}
      {gateway === "blending" && !reveal && (
        <div style={{ position: "relative", zIndex: 10, padding: "10px 24px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            {(["FILLER LEAF","WRAPPER","SHAPE & SIZE","THE CUT"] as const).map((label, i) => (
              <div key={label} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 5 }}>
                  <motion.div
                    animate={{
                      background: i < step ? GOLD : i === step ? "rgba(212,175,55,0.18)" : "rgba(255,255,255,0.04)",
                      boxShadow: i === step ? `0 0 16px ${GOLD}99, 0 0 6px ${GOLD}60` : "none",
                    }}
                    transition={{ duration: 0.4 }}
                    style={{ width: 28, height: 28, borderRadius: "50%",
                      border: i <= step ? `1.5px solid ${GOLD}BB` : "1.5px solid rgba(255,255,255,0.10)",
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {i < step
                      ? <span style={{ color: "#0a0700", fontSize: 11, fontWeight: 800 }}>✓</span>
                      : <span style={{ color: i === step ? GOLD : "rgba(255,255,255,0.22)", fontSize: 10, fontWeight: 700 }}>{i + 1}</span>
                    }
                  </motion.div>
                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 7, letterSpacing: "0.22em",
                    color: i === step ? GOLD : "rgba(255,255,255,0.24)",
                    textTransform: "uppercase" as const, whiteSpace: "nowrap" as const }}>{label}</span>
                </div>
                {i < 3 && (
                  <motion.div
                    animate={{ background: i < step ? GOLD : "rgba(255,255,255,0.08)" }}
                    transition={{ duration: 0.4 }}
                    style={{ width: 44, height: 1, margin: "0 6px", marginBottom: 18 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Step content ── */}
      <div className="relative z-10 flex-1 flex flex-col overflow-y-auto mt-3 px-4" style={{ paddingBottom: 80 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 60, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: 0,  filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -60, filter: "blur(4px)" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col h-full"
          >
            {/* Ritual moment title */}
            <div className="flex flex-col mb-3">
              <span className="text-[14px] tracking-[0.22em] uppercase" style={{ color: `${GOLD}80` }}>
                MOMENT {step + 1} OF 4
              </span>
              <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.7rem", fontWeight: 300, color: "rgba(240,232,212,0.95)", margin: 0, lineHeight: 1.1 }}>
                {STEP_TITLES[step]}
              </h2>
            </div>

            {/* ── Step 0: Leaf Selection — Cinematic 60/40 Split ── */}
            {step === 0 && (
              <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8, minHeight: 0 }}>
                {/* Spec subtext */}
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, lineHeight: 1.65,
                  color: "rgba(240,232,212,0.52)", margin: 0 }}>
                  The filler leaf shapes body, strength, burn speed, and overall character.
                  Each leaf contributes distinct flavor notes — select the foundation that matches your desired experience.
                </p>

                {/* 60 / 40 horizontal split */}
                <div style={{ display: "flex", gap: 12, flex: 1, minHeight: 0 }}>

                  {/* LEFT 60%: column — cards row + blend meter + accordions */}
                  <div style={{ flex: "0 0 59%", display: "flex", flexDirection: "column" as const, gap: 8 }}>
                    {/* Cards row */}
                    <div style={{ display: "flex", gap: 8, alignItems: "stretch", flex: 1, minHeight: 0 }}>
                    {([
                      { id: "seco",   label: "Seco",
                        body: "Light Body \u00b7 Smooth Burn",
                        flavors: ["Cream","Cedar","Toasted Almond"],
                        exp: "Balanced and approachable with a cooler burn and softer finish.",
                        bestFor: "Relaxed evenings and smoother whiskey pairings.",
                        indicator: "BEGINNER", ic: "#8BC34A", c: "#c8a06a",
                        leafImg: "https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=600&q=80" },
                      { id: "viso",   label: "Viso",
                        body: "Medium Body \u00b7 Aromatic Balance",
                        flavors: ["Earth","Cocoa","Spice"],
                        exp: "Adds complexity and layered aroma while maintaining smooth balance.",
                        bestFor: "Classic lovers wanting fuller flavor without overpowering strength.",
                        indicator: "INTERMEDIATE", ic: GOLD, c: "#b88a28",
                        leafImg: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80" },
                      { id: "ligero", label: "Ligero",
                        body: "Full Body \u00b7 Slow Burn",
                        flavors: ["Pepper","Espresso","Dark Chocolate"],
                        exp: "The strongest leaf delivering bold intensity and rich smoke density.",
                        bestFor: "Experienced smokers and stronger bourbon pairings.",
                        indicator: "EXPERT", ic: "#ef4444", c: "#9b3a1a",
                        leafImg: "https://images.unsplash.com/photo-1533779183510-8738c1c4bab0?auto=format&fit=crop&w=600&q=80" },
                    ] as { id: string; label: string; body: string; flavors: string[]; exp: string;
                              bestFor: string; indicator: string; ic: string; c: string; leafImg: string }[]).map((spec) => {
                      const leaf = LEAVES.find(l => l.id === spec.id);
                      if (!leaf) return null;
                      const isSel = sel.leaf?.id === spec.id;
                      return (
                        <motion.div
                          key={spec.id}
                          whileTap={{ scale: 0.96, y: 2 }}
                          onTouchStart={() => playClick()}
                          onClick={e => select("leaf", leaf, e as unknown as React.MouseEvent)}
                          style={{
                            flex: 1, borderRadius: 14, cursor: "pointer",
                            border: isSel ? `1.5px solid ${spec.c}BB` : "1px solid rgba(255,255,255,0.08)",
                            background: isSel
                              ? `linear-gradient(160deg,${spec.c}14 0%,${spec.c}07 100%)`
                              : "rgba(255,255,255,0.025)",
                            backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
                            boxShadow: isSel ? `0 0 28px ${spec.c}44,inset 0 0 20px ${spec.c}0C` : "none",
                            padding: "14px 11px", display: "flex",
                            flexDirection: "column" as const, gap: 7,
                            transition: "border 0.25s,box-shadow 0.25s",
                          }}
                        >
                          {/* Header */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
                            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.2rem",
                              color: isSel ? spec.c : "rgba(240,232,212,0.90)", fontWeight: 300 }}>{spec.label}</span>
                            <span style={{ background: `${spec.ic}16`, border: `1px solid ${spec.ic}38`,
                              color: spec.ic, fontSize: 7, letterSpacing: "0.18em",
                              padding: "3px 7px", borderRadius: 20, whiteSpace: "nowrap" as const,
                              flexShrink: 0 }}>{spec.indicator}</span>
                          </div>
                          {/* Body descriptor */}
                          <p style={{ color: "rgba(240,232,212,0.58)", fontSize: 9, letterSpacing: "0.14em",
                            textTransform: "uppercase" as const, margin: 0 }}>{spec.body}</p>
                          {/* Flavor pills */}
                          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 3 }}>
                            {spec.flavors.map(f => (
                              <span key={f} style={{ background: `${spec.c}10`, border: `1px solid ${spec.c}28`,
                                color: "rgba(240,232,212,0.58)", fontSize: 8, letterSpacing: "0.10em",
                                padding: "3px 6px", borderRadius: 12 }}>{f}</span>
                            ))}
                          </div>
                          {/* Experience */}
                          <p style={{ color: "rgba(240,232,212,0.50)", fontSize: 11, lineHeight: 1.55, margin: 0 }}>
                            {spec.exp}
                          </p>
                          {/* Best For */}
                          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 7, marginTop: "auto" }}>
                            <p style={{ color: `${spec.c}80`, fontSize: 8, letterSpacing: "0.14em",
                              textTransform: "uppercase" as const, margin: "0 0 3px" }}>BEST FOR</p>
                            <p style={{ color: "rgba(240,232,212,0.44)", fontSize: 10, lineHeight: 1.50, margin: 0 }}>
                              {spec.bestFor}
                            </p>
                          </div>
                          {/* ── Blend allocation slider ── */}
                          <div
                            onClick={e => e.stopPropagation()}
                            onTouchStart={e => e.stopPropagation()}
                            style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 7 }}>
                            <div style={{ display: "flex", justifyContent: "space-between",
                              alignItems: "center", marginBottom: 4 }}>
                              <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 7,
                                letterSpacing: "0.22em", textTransform: "uppercase" as const,
                                color: "rgba(240,232,212,0.38)" }}>BLEND RATIO</span>
                              <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12,
                                fontWeight: 700, fontVariantNumeric: "tabular-nums",
                                color: spec.ic }}>
                                {spec.id === "seco" ? blendSeco : spec.id === "viso" ? blendViso : blendLigero}%
                              </span>
                            </div>
                            <input
                              type="range" min={0} max={100} step={1}
                              value={spec.id === "seco" ? blendSeco : spec.id === "viso" ? blendViso : blendLigero}
                              onChange={e => {
                                const v = Number(e.target.value);
                                if (spec.id === "seco") setBlendSeco(v);
                                else if (spec.id === "viso") setBlendViso(v);
                                else setBlendLigero(v);
                              }}
                              style={{ width: "100%", accentColor: spec.ic, cursor: "pointer" }}
                            />
                          </div>
                          {/* Selection pulse */}
                          {isSel && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                                borderTop: `1px solid ${spec.c}30`, paddingTop: 6 }}>
                              <motion.div animate={{ scale: [1, 1.5, 1] }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                                style={{ width: 5, height: 5, borderRadius: "50%", background: spec.c }} />
                              <span style={{ color: spec.c, fontSize: 7, letterSpacing: "0.26em", fontWeight: 700 }}>SELECTED</span>
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                    </div>{/* end cards row */}

                    {/* ── Blend total allocation meter ── */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "7px 12px", borderRadius: 10, flexShrink: 0,
                      background: blendTotal === 100 ? "rgba(74,222,128,0.05)" : "rgba(239,68,68,0.05)",
                      border: `1px solid ${blendTotal === 100 ? "rgba(74,222,128,0.20)" : "rgba(239,68,68,0.18)"}` }}>
                      <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 7.5,
                        letterSpacing: "0.24em", textTransform: "uppercase" as const,
                        color: "rgba(240,232,212,0.45)" }}>ALLOCATION TOTAL</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          color: blendTotal === 100 ? "#4ade80" : "#ef4444" }}>
                          {blendTotal}%
                        </span>
                        <span style={{ fontSize: 7, letterSpacing: "0.22em", textTransform: "uppercase" as const,
                          color: blendTotal === 100 ? "#4ade80" : "rgba(239,68,68,0.65)" }}>
                          {blendTotal === 100 ? "✓ BALANCED" : blendTotal > 100 ? "▲ OVER" : "▼ UNDER"}
                        </span>
                      </div>
                    </div>

                    {/* ── Collapsible accordions ── */}
                    {([
                      { id: "anatomy",  label: "Leaf Anatomy",
                        content: "The filler bundle is composed of 2\u20134 leaves folded in a \u2018booking\u2019 or accordion pattern to create draw channels. This determines body strength and burn consistency. Volado (low-nicotine) is always included for reliable combustion integrity." },
                      { id: "bunching", label: "Bunching Protocol",
                        content: "Master bunchers select leaves by tactile feel \u2014 assessing elasticity, moisture, and vein thickness. The bunch is formed using the \u2018pil\u00f3n\u2019 technique: leaves are arranged around a central spine, rolled into a cylinder, then wrapped by the binder leaf before pressing." },
                    ] as { id: string; label: string; content: string }[]).map(acc => (
                      <div key={acc.id} style={{ borderRadius: 10, overflow: "hidden", flexShrink: 0,
                        border: "1px solid rgba(212,175,55,0.10)",
                        background: "rgba(255,255,255,0.015)" }}>
                        <button
                          onClick={e => { e.stopPropagation(); setAccordionOpen(o => o === acc.id ? null : acc.id); playClick(); }}
                          style={{ width: "100%", display: "flex", justifyContent: "space-between",
                            alignItems: "center", padding: "9px 12px",
                            background: "none", border: "none", cursor: "pointer" }}>
                          <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 8, letterSpacing: "0.22em",
                            textTransform: "uppercase" as const, color: `${GOLD}80` }}>{acc.label}</span>
                          <motion.span animate={{ rotate: accordionOpen === acc.id ? 180 : 0 }}
                            transition={{ duration: 0.22 }}
                            style={{ display: "inline-block", color: `${GOLD}60`, fontSize: 10,
                              lineHeight: 1 }}>▾</motion.span>
                        </button>
                        <AnimatePresence>
                          {accordionOpen === acc.id && (
                            <motion.div key={acc.id}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: "easeInOut" }}
                              style={{ overflow: "hidden" }}>
                              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, lineHeight: 1.65,
                                color: "rgba(240,232,212,0.52)", margin: 0, padding: "0 12px 10px" }}>
                                {acc.content}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>{/* end left panel */}

                  {/* RIGHT 41%: anatomy diagram + selected leaf showcase */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, gap: 8, minHeight: 0 }}>
                    {/* Anatomy diagram — shown when nothing selected */}
                    {!sel.leaf && (
                      <div style={{ flex: 1, borderRadius: 14,
                        background: "rgba(255,255,255,0.015)", border: "1px solid rgba(212,175,55,0.09)",
                        display: "flex", flexDirection: "column" as const,
                        alignItems: "center", justifyContent: "center", padding: "18px 14px" }}>
                        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 7, letterSpacing: "0.40em",
                          color: "rgba(212,175,55,0.40)", textTransform: "uppercase" as const, margin: "0 0 14px" }}>
                          CIGAR ANATOMY
                        </p>
                        <svg width="100%" viewBox="0 0 280 140" style={{ overflow: "visible", maxWidth: 260 }}>
                          <ellipse cx="140" cy="70" rx="132" ry="56"
                            fill="rgba(212,175,55,0.03)" stroke="rgba(212,175,55,0.42)" strokeWidth="1.5"/>
                          <ellipse cx="140" cy="70" rx="110" ry="42"
                            fill="rgba(180,130,50,0.03)" stroke="rgba(180,130,50,0.28)"
                            strokeWidth="1" strokeDasharray="4 3"/>
                          <ellipse cx="140" cy="70" rx="84" ry="28"
                            fill="rgba(160,110,40,0.08)" stroke="rgba(160,110,40,0.26)" strokeWidth="1"/>
                          <text x="244" y="18" fontFamily="Inter,sans-serif" fontSize="7.5"
                            fill="rgba(212,175,55,0.72)" letterSpacing="1.8" textAnchor="middle">WRAPPER</text>
                          <line x1="244" y1="23" x2="244" y2="35"
                            stroke="rgba(212,175,55,0.30)" strokeWidth="0.8"/>
                          <circle cx="244" cy="38" r="2.5" fill="rgba(212,175,55,0.58)"/>
                          <text x="240" y="62" fontFamily="Inter,sans-serif" fontSize="7.5"
                            fill="rgba(180,130,50,0.68)" letterSpacing="1.8" textAnchor="middle">BINDER</text>
                          <line x1="224" y1="65" x2="208" y2="70"
                            stroke="rgba(180,130,50,0.30)" strokeWidth="0.8"/>
                          <circle cx="204" cy="70" r="2.2" fill="rgba(180,130,50,0.52)"/>
                          <text x="140" y="104" fontFamily="Inter,sans-serif" fontSize="7.5"
                            fill="rgba(212,175,55,0.80)" letterSpacing="1.5" textAnchor="middle">FILLER (YOU)</text>
                          <line x1="140" y1="99" x2="140" y2="86"
                            stroke="rgba(212,175,55,0.30)" strokeWidth="0.8"/>
                          <circle cx="140" cy="70" r="3.5" fill="rgba(212,175,55,0.65)"/>
                        </svg>
                        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, lineHeight: 1.60,
                          color: "rgba(240,232,212,0.35)", margin: "12px 0 0", textAlign: "center" as const }}>
                          Select a filler leaf to see its profile
                        </p>
                      </div>
                    )}
                    {/* Selected leaf macro visual */}
                    {sel.leaf && (() => {
                      const leafImgMap: Record<string,string> = {
                        seco:   "https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=600&q=80",
                        viso:   "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80",
                        ligero: "https://images.unsplash.com/photo-1533779183510-8738c1c4bab0?auto=format&fit=crop&w=600&q=80",
                      };
                      return (
                        <motion.div key={sel.leaf.id}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          transition={{ duration: 0.4 }}
                          style={{ flex: 1, borderRadius: 14, overflow: "hidden",
                            position: "relative" as const,
                            border: `1px solid ${sel.leaf.hue}55`, minHeight: 120 }}>
                          <img src={leafImgMap[sel.leaf.id] ?? sel.leaf.img} alt={sel.leaf.label}
                            style={{ width: "100%", height: "100%", objectFit: "cover",
                              filter: "saturate(1.18) brightness(0.60)" }} />
                          <div style={{ position: "absolute", inset: 0,
                            background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 55%)" }} />
                          <motion.div
                            animate={{ boxShadow: [
                              `inset 0 0 40px 14px ${sel.leaf.hue}18`,
                              `inset 0 0 72px 28px ${sel.leaf.hue}32`,
                              `inset 0 0 50px 18px ${sel.leaf.hue}20`,
                            ]}}
                            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                            style={{ position: "absolute", inset: 0, borderRadius: 14 }} />
                          <div style={{ position: "absolute", bottom: 12, left: 14, right: 14 }}>
                            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.35rem",
                              color: "rgba(240,232,212,0.95)", fontWeight: 300, margin: "0 0 4px" }}>
                              {sel.leaf.label}
                            </p>
                            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11,
                              color: "rgba(240,232,212,0.58)", lineHeight: 1.55, margin: 0 }}>
                              {sel.leaf.desc}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })()}

                    {/* ── Featured Humidor & Spirit Pairing ── */}
                    {sel.leaf && (() => {
                      const HUM: Record<string, { cigar: string; ring: string; vitola: string; spirit: string; note: string }> = {
                        seco:   { cigar: "Cohiba Siglo I",                ring: "40", vitola: "Petit Corona",
                                  spirit: "Macallan 12 Sherry Oak",       note: "Highland Single Malt — light smoke and dried-fruit complement" },
                        viso:   { cigar: "Arturo Fuente Hemingway",       ring: "52", vitola: "Figurado",
                                  spirit: "Woodford Reserve Bourbon",     note: "Kentucky Straight — cocoa and vanilla finish harmony" },
                        ligero: { cigar: "Padr\u00f3n 1926 Serie No. 1",  ring: "54", vitola: "Figurado",
                                  spirit: "Balvenie PortWood 21",         note: "Port-cask Scotch \u2014 dark chocolate and dried-plum synergy" },
                      };
                      const m = HUM[sel.leaf.id];
                      if (!m) return null;
                      return (
                        <motion.div key={`hum-${sel.leaf.id}`}
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.28 }}
                          style={{ borderRadius: 12, padding: "12px 14px", flexShrink: 0,
                            background: "rgba(212,175,55,0.045)",
                            border: `1px solid ${GOLD}1C`,
                            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
                          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 7, letterSpacing: "0.38em",
                            textTransform: "uppercase" as const, color: `${GOLD}50`, margin: "0 0 7px" }}>
                            FROM THE HUMIDOR
                          </p>
                          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.1rem",
                            color: "rgba(240,232,212,0.92)", fontWeight: 300, margin: "0 0 2px" }}>
                            {m.cigar}
                          </p>
                          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 8,
                            color: "rgba(240,232,212,0.38)", margin: "0 0 10px",
                            letterSpacing: "0.10em", textTransform: "uppercase" as const }}>
                            Ring {m.ring} · {m.vitola}
                          </p>
                          <div style={{ borderTop: "1px solid rgba(212,175,55,0.08)", paddingTop: 8 }}>
                            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 7, letterSpacing: "0.32em",
                              textTransform: "uppercase" as const, color: `${GOLD}45`, margin: "0 0 4px" }}>
                              SPIRIT PAIRING
                            </p>
                            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1rem",
                              color: "rgba(240,232,212,0.85)", fontWeight: 300, margin: "0 0 3px" }}>
                              {m.spirit}
                            </p>
                            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 9,
                              color: "rgba(240,232,212,0.38)", lineHeight: 1.55, margin: 0 }}>
                              {m.note}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 1: Wrapper ── */}
            {step === 1 && (
              <div className="flex flex-col flex-1 gap-3 overflow-y-auto no-scrollbar">
                {/* Reference: Vitola Arch shows cut size / wrapper alignment */}
                <div className="rounded-xl overflow-hidden flex-shrink-0 relative" style={{ height: 130, border: `1px solid ${GOLD}18` }}>
                  <img src={imgVitolaArch} alt="Cut Size & Wrapper Alignment" className="w-full h-full object-cover object-top" style={{ filter: "brightness(0.55)" }} />
                  <div className="absolute inset-0 flex items-end p-3" style={{ background: "linear-gradient(to top, rgba(5,3,0,0.88) 0%, transparent 60%)" }}>
                    <span style={{ color: `${GOLD}90`, fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase" }}>Wrapper Leaf Grades · Cut Size / Texture Pairing</span>
                  </div>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar items-start content-start">
                  {WRAPPERS.map(w => (
                    <SelectionCard
                      key={w.id}
                      item={w}
                      selected={sel.wrapper?.id === w.id}
                      onClick={e => select("wrapper", w, e)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 2: Vitola + interactive smoke time ── */}
            {step === 2 && (
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto no-scrollbar">
                {/* Reference: Vitola & Architectural Specs */}
                <div className="rounded-xl overflow-hidden flex-shrink-0 relative" style={{ height: 130, border: `1px solid ${GOLD}18` }}>
                  <img src={imgVitolaSpecs} alt="Vitola & Architectural Specs" className="w-full h-full object-cover object-top" style={{ filter: "brightness(0.52)" }} />
                  <div className="absolute inset-0 flex items-end p-3" style={{ background: "linear-gradient(to top, rgba(5,3,0,0.88) 0%, transparent 60%)" }}>
                    <span style={{ color: `${GOLD}90`, fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase" }}>Vitola Constructor · Ring Gauge / Cigar Architecture</span>
                  </div>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                  {VITOLAS.map(v => (
                    <SelectionCard
                      key={v.id}
                      item={v}
                      selected={sel.vitola?.id === v.id}
                      onClick={e => select("vitola", v, e)}
                    />
                  ))}
                </div>

                {sel.vitola && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-4 flex flex-col gap-3"
                    style={{ background: "rgba(212,175,55,0.06)", border: `1px solid ${GOLD}20`, backdropFilter: "blur(14px)" }}
                  >
                    {/* Cinematic cigar silhouette */}
                    <CigarSilhouette vitola={sel.vitola} smokeTime={smokeSlider} />

                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: 14, letterSpacing: "0.18em", textTransform: "uppercase", color: `${GOLD}80` }}>SMOKE TIME</span>
                      <span style={{ fontSize: 17, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: GOLD }}>{smokeSlider} min</span>
                    </div>

                    {/* Range slider */}
                    <input
                      type="range"
                      min={30}
                      max={120}
                      step={5}
                      value={smokeSlider}
                      onChange={e => setSmokeSlider(Number(e.target.value))}
                      style={{
                        width:  "100%",
                        cursor: "pointer",
                        accentColor: GOLD,
                      }}
                    />
                    <div className="flex justify-between text-[8px] tracking-widest uppercase" style={{ color: "rgba(212,175,55,0.35)" }}>
                      <span>30 min</span>
                      <span>75 min</span>
                      <span>120 min</span>
                    </div>
                    <p className="text-[10px] italic text-center" style={{ color: `${GOLD}55` }}>
                      {smokeSlider <= 50 ? "A focused ritual — ideal for the golden hour."
                        : smokeSlider <= 80 ? "A contemplative experience — unhurried and deliberate."
                        : "A master's smoke — reserve this for an evening without demands."}
                    </p>
                  </motion.div>
                )}
              </div>
            )}

            {/* ── Step 3: Cut ── */}
            {step === 3 && (
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto no-scrollbar">
                {/* Reference: Marathon Ritual Quiz — cut selection */}
                <div className="rounded-xl overflow-hidden flex-shrink-0 relative" style={{ height: 130, border: `1px solid ${GOLD}18` }}>
                  <img src={imgCutSpecs} alt="Ritual Cut Selection" className="w-full h-full object-cover object-top" style={{ filter: "brightness(0.52)" }} />
                  <div className="absolute inset-0 flex items-end p-3" style={{ background: "linear-gradient(to top, rgba(5,3,0,0.88) 0%, transparent 60%)" }}>
                    <span style={{ color: `${GOLD}90`, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase" }}>Ritual Cut Protocol · V-Cut / Punch / Straight</span>
                  </div>
                </div>
                <div className="flex gap-4 flex-wrap justify-center flex-1 items-center">
                  {CUTS.map(cut => (
                    <motion.button
                      key={cut.id}
                      onClick={e => select("cut", cut, e)}
                      whileTap={{ scale: 0.9 }}
                      whileHover={{ scale: 1.06, y: -4 }}
                      className="flex flex-col items-center gap-3 cursor-pointer"
                      style={{ background: "none", border: "none", outline: "none" }}
                    >
                      {/* Cut icon card — macro close-up feel */}
                      <div
                        className="relative flex flex-col items-center justify-center rounded-2xl overflow-hidden"
                        style={{
                          width:          130,
                          height:         130,
                          border:         sel.cut?.id === cut.id ? `2px solid ${GOLD}` : `1px solid ${GOLD}25`,
                          boxShadow:      sel.cut?.id === cut.id ? `0 0 32px ${GOLD}55, inset 0 0 24px ${GOLD}12` : "none",
                          backdropFilter: "blur(12px)",
                          background:     sel.cut?.id === cut.id
                            ? `radial-gradient(circle at 50% 50%, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.04) 80%)`
                            : "rgba(255,255,255,0.03)",
                          transition:     "all 0.3s",
                        }}
                      >
                        {/* Macro texture overlay */}
                        <div style={{
                          position: "absolute", inset: 0,
                          background: "repeating-linear-gradient(0deg, rgba(212,175,55,0.03) 0px, rgba(212,175,55,0.03) 1px, transparent 1px, transparent 4px)",
                        }} />

                        {/* Cut icon — SVG */}
                        {cut.id === "straight" && (
                          <svg width={38} height={8} viewBox="0 0 38 8" fill="none" style={{ color: sel.cut?.id === cut.id ? GOLD : "rgba(240,232,212,0.5)", transition: "color 0.3s" }}>
                            <rect x="0" y="3" width="38" height="2" rx="1" fill="currentColor"/>
                          </svg>
                        )}
                        {cut.id === "vcut" && (
                          <svg width={30} height={26} viewBox="0 0 30 26" fill="none" style={{ color: sel.cut?.id === cut.id ? GOLD : "rgba(240,232,212,0.5)", transition: "color 0.3s" }}>
                            <path d="M2 2 L15 24 L28 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {cut.id === "punch" && (
                          <svg width={34} height={34} viewBox="0 0 34 34" fill="none" style={{ color: sel.cut?.id === cut.id ? GOLD : "rgba(240,232,212,0.5)", transition: "color 0.3s" }}>
                            <circle cx="17" cy="17" r="13" stroke="currentColor" strokeWidth="2"/>
                            <circle cx="17" cy="17" r="5" fill="currentColor"/>
                          </svg>
                        )}

                        {/* Selected glow */}
                        {sel.cut?.id === cut.id && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 rounded-2xl pointer-events-none"
                            style={{ background: `radial-gradient(circle, ${GOLD}22 0%, transparent 70%)` }}
                          />
                        )}
                      </div>

                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-xs font-bold tracking-wider uppercase"
                          style={{ color: sel.cut?.id === cut.id ? GOLD : "rgba(240,232,212,0.65)" }}>
                          {cut.label}
                        </span>
                        <span className="text-[9px] text-center max-w-28" style={{ color: "rgba(240,232,212,0.38)" }}>
                          {cut.sub}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Navigation strip — position:fixed z:999999, always touch-responsive ── */}
      {gateway === "blending" && !reveal && (
      <div style={{ position: "fixed", bottom: 26, left: 0, right: 0, zIndex: 999999,
        pointerEvents: "auto", display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "12px 20px",
        background: "rgba(4,2,0,0.97)", backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(212,175,55,0.14)" }}>
        <motion.button
          onClick={prevStep}
          whileTap={{ scale: 0.92 }}
          disabled={step === 0}
          className="px-5 py-2.5 rounded-full text-xs tracking-widest uppercase font-bold"
          style={{
            background: "rgba(212,175,55,0.08)",
            border:     `1px solid ${GOLD}25`,
            color:      step === 0 ? "rgba(212,175,55,0.25)" : `${GOLD}80`,
            cursor:     step === 0 ? "not-allowed" : "pointer",
          }}
        >
          BACK
        </motion.button>

        <div className="text-[9px] tracking-[0.22em] uppercase" style={{ color: `${GOLD}45` }}>
          {canAdvance ? "SELECTION LOCKED" : "MAKE A SELECTION"}
        </div>

        <motion.button
          onClick={handleRevealMatch}
          whileTap={{ scale: 0.93 }}
          whileHover={{ scale: canAdvance ? 1.03 : 1 }}
          disabled={!canAdvance}
          className="px-6 py-2.5 rounded-full text-xs tracking-widest uppercase font-bold"
          style={{
            background: canAdvance ? `linear-gradient(135deg, ${GOLD}, #c8951a)` : "rgba(212,175,55,0.10)",
            color:      canAdvance ? "#0a0700" : "rgba(212,175,55,0.28)",
            boxShadow:  canAdvance ? `0 0 28px ${GOLD}77, 0 4px 18px ${GOLD}55, inset 0 0 18px rgba(212,175,55,0.10)` : "none",
            cursor:     canAdvance ? "pointer" : "not-allowed",
            border:     "none",
          }}
        >
          {step === 3 ? "CONFIRM BLEND" : "CONTINUE"}
        </motion.button>
      </div>)}

      {/* Glassmorphic pairing ticker with live score delta micro-animations */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: 26, background: "rgba(0,0,0,0.95)", borderTop: `1px solid ${GOLD}`,
        display: "flex", alignItems: "center", overflow: "hidden",
        zIndex: 9998, pointerEvents: "none",
      }}>
        <motion.div
          className="flex gap-12 whitespace-nowrap text-[8px] tracking-[0.25em] uppercase"
          style={{ color: GOLD, fontWeight: 600 }}
          animate={{ x: [0, -800] }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        >
          {Array.from({ length: 6 }).flatMap(() => [
            "NOVEE OS", "MASTER BLENDER: ACTIVE", "SYNERGY ENGINE: ONLINE",
            "HUMIDOR AI: SCANNING", "PALATE CALIBRATION: LIVE",
          ]).map((t, i) => (
            <span key={i}>{t} ///</span>
          ))}
        </motion.div>

        {/* Score freeze seal badge */}
        {scoreFrozen && (
          <div style={{
            position: "absolute", right: 8, top: 0, bottom: 0,
            display: "flex", alignItems: "center", gap: 4,
            background: "rgba(0,0,0,0.92)", paddingLeft: 10,
            pointerEvents: "none",
          }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444" }} />
            <span style={{ color: "#ef4444", fontSize: 8, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700, whiteSpace: "nowrap" }}>
              SCORE SEALED
            </span>
          </div>
        )}

        {/* Live score delta micro-animation */}
        <AnimatePresence mode="wait">
          {lastScoreDelta !== null && (
            <motion.div
              key={String(lastScoreDelta ?? 0) + chipId.current}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: lastScoreDelta < 0 ? 10 : -10 }}
              transition={{ duration: 1.1, ease: "easeOut" }}
              style={{
                position:      "absolute",
                right:         scoreFrozen ? 110 : 8,
                top:           "50%",
                transform:     "translateY(-50%)",
                fontSize:      10,
                fontWeight:    700,
                letterSpacing: "0.16em",
                color:         lastScoreDelta < 0 ? "#ef4444" : "#4ade80",
                pointerEvents: "none",
              }}
            >
              {lastScoreDelta < 0 ? lastScoreDelta : `+${lastScoreDelta}`}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
