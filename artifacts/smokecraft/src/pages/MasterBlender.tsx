import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { useLocation } from "wouter";
import { AudioWaveToggle, useAudio } from "@/contexts/AudioContext";
import { useGuestProfile } from "@/contexts/GuestProfileContext";
import { getStaffLine } from "@/lib/CraftVoiceRouter";

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
  { id: "straight", label: "Straight Cut", sub: "Clean · Classic · Full Draw",      xp: 8,  synergy: 33, icon: "━━━" },
  { id: "vcut",     label: "V-Cut",        sub: "Focused · Concentrated · Intense", xp: 12, synergy: 37, icon: "◁▷" },
  { id: "punch",    label: "Punch Cut",    sub: "Circular · Controlled · Smooth",   xp: 10, synergy: 30, icon: "◉" },
];

const STEP_MENTOR: string[] = [
  "Welcome to the ritual. Choose your tobacco leaf — the soul of every great blend.",
  "Now choose your wrapper. The wrapper is the first thing the world sees, and the last thing it forgets.",
  "Select your vitola — the shape and smoke time define the rhythm of the experience.",
  "The final cut. How you begin the draw determines everything that follows.",
];

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
function SmokeDrift() {
  const blobs = [
    { x: "10%",  y: "20%", w: 320, dur: 18, del: 0    },
    { x: "60%",  y: "10%", w: 260, dur: 22, del: 3    },
    { x: "30%",  y: "55%", w: 400, dur: 26, del: 6    },
    { x: "75%",  y: "40%", w: 290, dur: 20, del: 9    },
    { x: "5%",   y: "70%", w: 350, dur: 24, del: 12   },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity: 0.28 }}>
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left:            b.x,
            top:             b.y,
            width:           b.w,
            height:          b.w * 0.6,
            background:      `radial-gradient(ellipse, rgba(212,175,55,0.18) 0%, rgba(180,120,30,0.08) 50%, transparent 100%)`,
            filter:          "blur(15px)",
          }}
          animate={{
            x:       [0, 40, -20, 30, 0],
            y:       [0, -20, 30, -10, 0],
            scale:   [1, 1.15, 0.9, 1.05, 1],
            opacity: [0.5, 0.9, 0.6, 0.85, 0.5],
          }}
          transition={{
            duration:   b.dur,
            delay:      b.del,
            repeat:     Infinity,
            ease:       "easeInOut",
            repeatType: "mirror",
          }}
        />
      ))}
    </div>
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
  return (
    <motion.div
      key={chip.id}
      initial={{ opacity: 1, y: 0, scale: 0.8, x: chip.x }}
      animate={{ opacity: 0, y: -80, scale: 1.15 }}
      transition={{ duration: 1.1, ease: "easeOut" }}
      className="fixed z-[9999] pointer-events-none"
      style={{ top: chip.y, left: 0 }}
    >
      <span className="text-sm font-bold tracking-widest px-3 py-1 rounded-full"
        style={{ color: GOLD, background: "rgba(212,175,55,0.15)", border: `1px solid ${GOLD}44` }}>
        +{chip.amount} XP
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
      whileTap={{ scale: 0.93 }}
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

// ── Alchemy Reveal ─────────────────────────────────────────────────────────
function AlchemyReveal({
  sel, onRestart,
}: { sel: Sel; onRestart: () => void }) {
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
                          <span style={{ fontSize: 28 }}>🥃</span>
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
                        <span style={{ fontSize: 28 }}>🍺</span>
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
  const [step,   setStep]   = useState<0|1|2|3>(0);
  const [sel,    setSel]    = useState<Sel>({});
  const [xp,     setXp]     = useState(0);
  const [chips,  setChips]  = useState<XPFloat[]>([]);
  const [reveal, setReveal] = useState(false);
  const [smokeSlider, setSmokeSlider] = useState(50);
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

  const spawnXP = useCallback((amount: number, e: React.MouseEvent) => {
    const id = ++chipId.current;
    setChips(c => [...c, { id, amount, x: e.clientX - 30, y: e.clientY - 40 }]);
    setTimeout(() => setChips(c => c.filter(ch => ch.id !== id)), 1200);
    setXp(v => v + amount);
  }, []);

  function select<T extends { id: string; xp: number }>(key: keyof Sel, item: T, e: React.MouseEvent) {
    setSel(s => ({ ...s, [key]: item }));
    spawnXP(item.xp, e);
    if ("mentorNote" in item) {
      setTimeout(() => speak(String((item as unknown as typeof LEAVES[0]).mentorNote ?? "")), 400);
    }
  }

  function nextStep() {
    if (step === 3) { stopSpeak(); setReveal(true); return; }
    setStep(s => (s + 1) as 0|1|2|3);
  }
  function prevStep() { if (step > 0) setStep(s => (s - 1) as 0|1|2|3); }

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
      style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.09) 0%, #060400 60%)", fontFamily: "'Inter',sans-serif" }}
    >
      {/* Drifting smoke ambient */}
      <SmokeDrift />

      {/* XP float chips */}
      <AnimatePresence>
        {chips.map(chip => <XPChip key={chip.id} chip={chip} />)}
      </AnimatePresence>

      {/* Alchemy reveal overlay */}
      <AnimatePresence>
        {reveal && (
          <AlchemyReveal
            sel={sel}
            onRestart={() => {
              setReveal(false);
              setStep(0);
              setSel({});
              setXp(0);
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
          AXIOM OS
        </button>

        <div className="flex items-center gap-2">
          <AudioWaveToggle />
          <motion.div
            key={xp}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(212,175,55,0.10)", border: `1px solid ${GOLD}30` }}
          >
            <div className="rounded-full" style={{ width: 6, height: 6, background: GOLD }} />
            <span className="text-xs font-bold tabular-nums" style={{ color: GOLD }}>{xp} XP</span>
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
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col h-full"
          >
            {/* Step title */}
            <div className="flex flex-col mb-3">
              <span className="text-[10px] tracking-[0.3em] uppercase" style={{ color: `${GOLD}70` }}>
                STEP {step + 1} OF 4
              </span>
              <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.7rem", fontWeight: 300, color: "rgba(240,232,212,0.95)", margin: 0, lineHeight: 1.1 }}>
                {STEP_TITLES[step]}
              </h2>
            </div>

            {/* ── Step 0: Leaf ── */}
            {step === 0 && (
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar flex-1 items-start content-start">
                {LEAVES.map(leaf => (
                  <SelectionCard
                    key={leaf.id}
                    item={leaf}
                    selected={sel.leaf?.id === leaf.id}
                    onClick={e => select("leaf", leaf, e)}
                  />
                ))}
              </div>
            )}

            {/* ── Step 1: Wrapper ── */}
            {step === 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar flex-1 items-start content-start">
                {WRAPPERS.map(w => (
                  <SelectionCard
                    key={w.id}
                    item={w}
                    selected={sel.wrapper?.id === w.id}
                    onClick={e => select("wrapper", w, e)}
                  />
                ))}
              </div>
            )}

            {/* ── Step 2: Vitola + interactive smoke time ── */}
            {step === 2 && (
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto no-scrollbar">
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
              <div className="flex flex-col gap-3 flex-1 items-center justify-center">
                <div className="flex gap-4 flex-wrap justify-center">
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

                        {/* Cut icon */}
                        <span style={{
                          fontSize:   cut.id === "straight" ? 28 : cut.id === "vcut" ? 24 : 32,
                          color:      sel.cut?.id === cut.id ? GOLD : "rgba(240,232,212,0.5)",
                          lineHeight: 1,
                          letterSpacing: "0.1em",
                          transition: "color 0.3s",
                          fontFamily: "monospace",
                          fontWeight: "bold",
                        }}>
                          {cut.icon}
                        </span>

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
          onClick={nextStep}
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
          {step === 3 ? "REVEAL MATCH →" : "CONTINUE →"}
        </motion.button>
      </div>

      {/* Gold ticker */}
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
      </div>
    </div>
  );
}
