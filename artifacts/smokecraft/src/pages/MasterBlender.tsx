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
    origin: "Dominican Republic",
    style: "Traditional Entubado Rolling",
    bio: "Mastery over smooth, complex profile layering with multi-generational Cuban seed descendants.",
    tag: "THE TRADITION",
    soilAffinity: "alluvial" as const,
  },
  {
    id: "sovereign",
    name: "Alejandro",
    origin: "Nicaragua",
    style: "Estelí Accordion Technique",
    bio: "Specializes in high-intensity, bold, spice-forward profiles utilizing volcanic soil properties.",
    tag: "THE MODERN SOVEREIGN",
    soilAffinity: "volcanic" as const,
  },
  {
    id: "cuban",
    name: "Don Salvador",
    origin: "Cuba",
    style: "Vuelta Abajo Press Method",
    bio: "Heir to the oldest living tobacco dynasty. Commands perfect balance of cedar, leather, and refined pepper.",
    tag: "THE CUBAN PURIST",
    soilAffinity: "volcanic" as const,
  },
  {
    id: "botanist",
    name: "Doña Rosa",
    origin: "Ecuador",
    style: "Highland Shade Cultivation",
    bio: "Cultivates under equatorial clouds producing ultra-silky, cream-forward wrappers with rare botanical nuance.",
    tag: "THE HIGHLAND BOTANIST",
    soilAffinity: "alluvial" as const,
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

type GatewayPhase = "intro" | "orientation" | "mentor" | "cultivation" | "blending";

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
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2 }}
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
      onMouseDown={() => playClick()}
      onTouchStart={() => playClick()}
      whileTap={{ scale: 0.96, y: 2, boxShadow: "inset 0px 4px 12px rgba(0,0,0,0.90), 0 0 0 1px rgba(212,175,55,0.30)" }}
      whileHover={{ scale: 1.04, y: -4 }}
      className="relative flex-shrink-0 flex flex-col overflow-hidden rounded-2xl cursor-pointer"
      style={{
        width:          160,
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
        <span className="text-xs font-bold tracking-wider uppercase"
          style={{ color: selected ? GOLD : "rgba(240,232,212,0.85)" }}>
          {item.label}
        </span>
        {"sub" in item && (
          <span className="text-[9px] leading-snug" style={{ color: "rgba(240,232,212,0.42)" }}>
            {(item as { sub?: string }).sub}
          </span>
        )}
        {"desc" in item && (
          <span className="text-[9px] leading-snug mt-1 italic" style={{ color: `${GOLD}60` }}>
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
    fontSize: "clamp(13px, 1.6vw, 15px)",
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
function GatewayIntro({ onNext }: { onNext: () => void }) {
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

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 pb-14 pt-16 w-full max-w-2xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 1.0 }}
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: "clamp(13px, 2vw, 15px)",
            letterSpacing: "0.35em",
            color: `${GOLD}90`,
            textTransform: "uppercase",
            marginBottom: "18px",
          }}
        >
          NOVEE OS · SMOKECRAFT 360
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 1.2 }}
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            background: "linear-gradient(180deg, #ffffff 0%, #dfba73 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: "clamp(2rem, 6vw, 3.5rem)",
            fontWeight: 300,
            letterSpacing: "0.08em",
            margin: "0 0 20px 0",
            textTransform: "uppercase",
            lineHeight: 1.1,
          }}
        >
          Welcome to SmokeCraft 360
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 1.0 }}
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: "clamp(16px, 2.2vw, 22px)",
            fontStyle: "italic",
            color: "rgba(255,252,245,0.82)",
            marginBottom: "40px",
            lineHeight: 1.6,
          }}
        >
          "A cigar is more than tobacco. It is atmosphere. Timing. Ritual. Presence."
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          style={GW.btn()}
          onClick={onNext}
        >
          Begin The Experience
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.0, duration: 1.0 }}
          style={{ color: `${GOLD}50`, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", marginTop: 20 }}
        >
          4-Stage Ritual · Private Reserve Protocol
        </motion.p>
      </div>
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
            <p style={{ ...GW.para, fontSize: 12, letterSpacing: "0.3em", color: `${GOLD}80`, textTransform: "uppercase", marginBottom: 10 }}>
              Sovereign Ritual · Phase 1
            </p>
            <h2 style={GW.title}>The SmokeCraft Masterclass Philosophy</h2>
            <p style={GW.para}>
              You are not configuring software — you are executing a precision ritual. Atmosphere, legacy assets, and a personal flavor blueprint.
            </p>
            <p style={GW.para}>
              Map your palate, choose a master mentor, cultivate your tobacco seed, and unlock the private Legacy Reserve Studio.
            </p>
            <p style={{ ...GW.para, color: `${GOLD}80`, fontSize: "clamp(13px, 1.5vw, 15px)", fontStyle: "italic" }}>
              Achieve Master Sommelier to commission bespoke physical assets: Cigar Box · Whiskey Decanter · Brew Vessel.
            </p>
          </div>

          {/* Reference image panels */}
          <div className="flex flex-col gap-3 flex-shrink-0 w-full lg:w-80">
            <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${GOLD}22` }}>
              <img
                src={imgSovereignMap}
                alt="Sovereign Roadmap of Prestige"
                className="w-full h-auto object-cover"
                style={{ filter: "brightness(0.85)", maxHeight: 180, objectFit: "cover", width: "100%" }}
              />
              <div style={{ background: "rgba(8,9,11,0.85)", padding: "6px 12px" }}>
                <p style={{ color: `${GOLD}70`, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", margin: 0 }}>
                  Sovereign Roadmap of Prestige
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
                  Cultivation & Harvest · Phase 2
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
            Select Your Master Mentor
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
        <p style={{ ...GW.para, fontSize: 12, letterSpacing: "0.3em", color: `${GOLD}80`, textTransform: "uppercase", marginBottom: 8 }}>
          Sovereign Ritual · Phase 2
        </p>
        <h2 style={GW.title}>Choose Country Authority & Rolling Style</h2>
        <p style={GW.para}>
          Your mentor establishes the baseline architecture, rolling technique, and draw profiles for your private reserve allocation.
        </p>

        {/* Mentor Studio reference image */}
        <div className="rounded-lg overflow-hidden mb-5" style={{ border: `1px solid ${GOLD}18`, maxHeight: 220 }}>
          <img
            src={imgMentorStudio}
            alt="Mentor Selection Studio"
            className="w-full object-cover object-top"
            style={{ maxHeight: 220, filter: "brightness(0.82)" }}
          />
        </div>

        {/* Mentor cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {MENTORS.map(m => (
            <motion.div
              key={m.id}
              style={GW.card(selected === m.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(m.id)}
            >
              <p style={{ color: GOLD, fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 4 }}>
                {m.tag}
              </p>
              <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(1.1rem, 2.5vw, 1.5rem)", color: "#fffcf5", margin: "0 0 4px 0", fontWeight: 500 }}>
                {m.name}
              </h3>
              <p style={{ color: GOLD, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{m.style}</p>
              <p style={{ color: "#cdd0d4", fontSize: "clamp(13px, 1.5vw, 15px)", lineHeight: 1.6 }}>{m.bio}</p>
              {selected === m.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ marginTop: 10, color: GOLD, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase" }}
                >
                  ✦ MENTOR CONFIRMED
                </motion.div>
              )}
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
            Confirm & Select Seed Base
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Gateway: Cultivation (Seed + Soil) ─────────────────────────────────────
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
    onXP(isMatch ? 5 : -1, e);
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
        <p style={{ ...GW.para, fontSize: 12, letterSpacing: "0.3em", color: `${GOLD}80`, textTransform: "uppercase", marginBottom: 8 }}>
          Sovereign Ritual · Phase 3 — Foundational Asset Sourcing
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
          <p style={{ color: `${GOLD}70`, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 4px 0" }}>
            Mentor Directive — {mentorObj?.name ?? "Your Mentor"} · {mentorObj?.origin}
          </p>
          <p style={{ color: "rgba(240,232,212,0.80)", fontSize: 13, lineHeight: 1.55, margin: 0, fontStyle: "italic" }}>
            "{mentorObj?.bio}"
          </p>
          <p style={{ color: `${GOLD}55`, fontSize: 11, margin: "8px 0 0 0" }}>
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
                  fontSize:      12,
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
                  <p style={{ color: "rgba(240,232,212,0.50)", fontSize: 11, margin: "3px 0 0 0" }}>
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
            <p style={{ color: `${GOLD}70`, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", margin: 0 }}>
              Active Tobacco Farm · Seed Bank
            </p>
          </div>
        </div>

        {/* Seed selection */}
        <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(1rem, 2vw, 1.3rem)", color: GOLD, marginBottom: 12 }}>
          1. Tobacco Varietal Selection
        </h3>
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
            <p style={{ color: `${GOLD}70`, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", margin: 0 }}>
              Terroir · Seed &amp; Soil Selection Protocol
            </p>
          </div>
        </div>

        {/* Soil selection — CHALLENGE GATE */}
        <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(1rem, 2vw, 1.3rem)", color: GOLD, marginBottom: 6 }}>
          2. Terroir Soil Environment
        </h3>
        <p style={{ color: `${GOLD}55`, fontSize: 11, letterSpacing: "0.14em", marginBottom: 12, textTransform: "uppercase" }}>
          Select the soil matching your mentor’s affinity — wrong choice incurs a penalty
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
              <p style={{ color: `${GOLD}70`, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 4 }}>
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
  sel, onRestart, finalScore,
}: { sel: Sel; onRestart: () => void; finalScore: number }) {
  const { speak } = useAudio();
  const { guestProfile, isReturning } = useGuestProfile();
  const [phase,   setPhase]   = useState<"scan" | "result">("scan");
  const [data,    setData]    = useState<PairingResult | null>(null);
  const [staffTab, setStaffTab] = useState(false);

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
  const [gateway,        setGateway]        = useState<GatewayPhase>("intro");
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null);
  const [selectedSeed,   setSelectedSeed]   = useState<string | null>(null);
  const [selectedSoil,   setSelectedSoil]   = useState<string | null>(null);

  const [step,   setStep]   = useState<0|1|2|3>(0);
  const [sel,    setSel]    = useState<Sel>({});
  const [xp,     setXp]     = useState(0);
  const [chips,  setChips]  = useState<XPFloat[]>([]);
  const [reveal, setReveal] = useState(false);
  const [smokeSlider, setSmokeSlider] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txId,         setTxId]         = useState<string | null>(null);

  // Scoring state
  const scoreFrozenRef             = useRef(false);
  const [scoreFrozen,            setScoreFrozenState]   = useState(false);
  const [mentorPenaltyFired,     setMentorPenaltyFired]    = useState(false);
  const [cultivationBonusGiven,  setCultivationBonusGiven] = useState(false);
  const [lastScoreDelta,         setLastScoreDelta]         = useState<number | null>(null);

  // ── Force Stage 1 on every fresh mount — prevents HMR state bleed ────────
  // Also wipes all legacy localStorage/sessionStorage keys so no prior session
  // can surface a returning-user state or bypass the gateway intro.
  useLayoutEffect(() => {
    setGateway("intro");
    setStep(0 as 0);
    setSel({});
    setReveal(false);
    setXp(0);
    setSelectedMentor(null);
    setSelectedSeed(null);
    setSelectedSoil(null);
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
    setGateway("blending");
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
  const canAdvance = !!sel[stepKeys[step]];

  const STEP_LABELS = ["TOBACCO LEAF", "WRAPPER", "VITOLA & SMOKE", "THE CUT"];
  const STEP_TITLES = [
    "Select Your Tobacco Leaf",
    "Choose the Wrapper",
    "Vitola & Smoke Time",
    "The Final Cut",
  ];

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: "#000000", fontFamily: "'Inter',sans-serif" }}
    >
      {/* ── Gateway overlay (intro → orientation → mentor → cultivation) ── */}
      <AnimatePresence mode="wait">
        {gateway !== "blending" && (
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
                <GatewayIntro key="intro" onNext={() => setGateway("orientation")} />
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
                  onNext={() => setGateway("cultivation")}
                  onBack={() => setGateway("orientation")}
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
                  onBack={() => setGateway("mentor")}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HTML5 canvas smoke particles */}
      <SmokeCanvas />
      <RippleCanvas />

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
            onRestart={() => {
              setReveal(false);
              setStep(0 as 0);
              setSel({});
              setXp(0);
              setGateway("intro");
              setSelectedMentor(null);
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

      {/* ── Synergy Halo ── */}
      <div className="relative z-10 flex justify-center flex-shrink-0 mt-0">
        <SynergyHalo synergy={synergy} />
      </div>

      {/* ── Step indicator ── */}
      <div className="relative z-10 flex justify-center gap-3 mt-1 flex-shrink-0">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div
              className="rounded-full transition-all duration-300"
              style={{
                width:     8, height: 8,
                background: i <= step ? GOLD : "rgba(212,175,55,0.20)",
                boxShadow:  i === step ? `0 0 10px ${GOLD}` : "none",
              }}
            />
            <span className="text-[7px] tracking-widest uppercase hidden sm:block"
              style={{ color: i === step ? GOLD : "rgba(212,175,55,0.35)" }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Step content ── */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden mt-3 px-4">
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
              <span className="text-[10px] tracking-[0.3em] uppercase" style={{ color: `${GOLD}70` }}>
                MOMENT {step + 1} OF 4
              </span>
              <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.7rem", fontWeight: 300, color: "rgba(240,232,212,0.95)", margin: 0, lineHeight: 1.1 }}>
                {STEP_TITLES[step]}
              </h2>
            </div>

            {/* ── Step 0: Leaf ── */}
            {step === 0 && (
              <div className="flex flex-col flex-1 gap-3 overflow-y-auto no-scrollbar">
                {/* Reference: Beneath the Wrapper anatomy + Bunching Protocol */}
                <div className="flex gap-2 flex-shrink-0">
                  <div className="flex-1 rounded-xl overflow-hidden relative" style={{ height: 120, border: `1px solid ${GOLD}18` }}>
                    <img src={imgBeneathWrapper} alt="Beneath the Wrapper" className="w-full h-full object-cover object-center" style={{ filter: "brightness(0.52)" }} />
                    <div className="absolute inset-0 flex items-end p-2" style={{ background: "linear-gradient(to top, rgba(5,3,0,0.88) 0%, transparent 60%)" }}>
                      <span style={{ color: `${GOLD}90`, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase" }}>Leaf Anatomy</span>
                    </div>
                  </div>
                  <div className="flex-1 rounded-xl overflow-hidden relative" style={{ height: 120, border: `1px solid ${GOLD}18` }}>
                    <img src={imgBunching} alt="Stripping & Bunching Protocol" className="w-full h-full object-cover object-top" style={{ filter: "brightness(0.52)" }} />
                    <div className="absolute inset-0 flex items-end p-2" style={{ background: "linear-gradient(to top, rgba(5,3,0,0.88) 0%, transparent 60%)" }}>
                      <span style={{ color: `${GOLD}90`, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase" }}>Bunching Protocol</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar items-start content-start">
                  {LEAVES.map(leaf => (
                    <SelectionCard
                      key={leaf.id}
                      item={leaf}
                      selected={sel.leaf?.id === leaf.id}
                      onClick={e => select("leaf", leaf, e)}
                    />
                  ))}
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
                    <span style={{ color: `${GOLD}90`, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase" }}>Wrapper Leaf Grades · Cut Size / Texture Pairing</span>
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
                    <span style={{ color: `${GOLD}90`, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase" }}>Vitola Constructor · Ring Gauge / Cigar Architecture</span>
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
                      <span className="text-[9px] tracking-[0.22em] uppercase" style={{ color: `${GOLD}70` }}>SMOKE TIME</span>
                      <span className="text-sm font-bold tabular-nums" style={{ color: GOLD }}>{smokeSlider} min</span>
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

      {/* ── Navigation strip ── */}
      <div className="relative z-10 flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(212,175,55,0.10)" }}>
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
          Back
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
            boxShadow:  canAdvance ? `0 4px 20px ${GOLD}44` : "none",
            cursor:     canAdvance ? "pointer" : "not-allowed",
            border:     "none",
          }}
        >
          {step === 3 ? "REVEAL MATCH" : "CONTINUE"}
        </motion.button>
      </div>

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
