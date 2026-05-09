import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { useLocation } from "wouter";

// ── Constants ──────────────────────────────────────────────────────────────
const GOLD      = "#d4af37";
const HALO_R    = 88;
const HALO_CIRC = 2 * Math.PI * HALO_R; // 552.9

// ── Data ───────────────────────────────────────────────────────────────────
const LEAVES = [
  { id: "seco",   label: "Seco",   sub: "Air-cured · Light",       xp: 15, img: "/images/cigar1.png",   hue: "#c8a06a", synergy: 22 },
  { id: "viso",   label: "Viso",   sub: "Sun-grown · Medium Oily", xp: 20, img: "/images/cigar3.png",   hue: "#8b5e30", synergy: 28 },
  { id: "ligero", label: "Ligero", sub: "Shade-grown · Full Power",xp: 25, img: "/images/cigar.png",    hue: "#3d1f08", synergy: 25 },
];
const WRAPPERS = [
  { id: "candela",     label: "Candela",     sub: "Bright · Grassy · Mild",   xp: 12, img: "/images/smoke/smoke_lounge.png",    synergy: 20 },
  { id: "connecticut", label: "Connecticut", sub: "Silky · Creamy · Light",   xp: 15, img: "/images/smoke/smoke_solo.png",      synergy: 25 },
  { id: "habano",      label: "Habano",      sub: "Earthy · Spiced · Medium", xp: 18, img: "/images/smoke/smoke_woman.png",     synergy: 28 },
  { id: "maduro",      label: "Maduro",      sub: "Dark · Sweet · Full",      xp: 22, img: "/images/smoke/smoke_group.png",     synergy: 25 },
  { id: "oscuro",      label: "Oscuro",      sub: "Blackest · Oily · Intense",xp: 25, img: "/images/smoke/smoke_urban.png",     synergy: 22 },
];
const VITOLAS = [
  { id: "robusto",   label: "Robusto",   smoke: 50,  img: "/images/cigar.png",  xp: 10, synergy: 22 },
  { id: "toro",      label: "Toro",      smoke: 65,  img: "/images/cigar1.png", xp: 12, synergy: 25 },
  { id: "churchill", label: "Churchill", smoke: 90,  img: "/images/cigar2.png", xp: 15, synergy: 28 },
  { id: "belicoso",  label: "Belicoso",  smoke: 75,  img: "/images/cigar3.png", xp: 14, synergy: 25 },
  { id: "lancero",   label: "Lancero",   smoke: 120, img: "/images/cigar4.png", xp: 18, synergy: 25 },
];
const CUTS = [
  { id: "straight", label: "Straight Cut", sub: "Clean · Classic",     xp: 8,  img: "/images/cigar.png",  synergy: 33 },
  { id: "vcut",     label: "V-Cut",        sub: "Focused · Penetrating",xp: 12, img: "/images/cigar1.png", synergy: 37 },
  { id: "punch",    label: "Punch Cut",    sub: "Concentrated Draw",   xp: 10, img: "/images/cigar2.png", synergy: 30 },
];

type XPFloat  = { id: number; amount: number; x: number; y: number };
type Sel      = { leaf?: typeof LEAVES[0]; wrapper?: typeof WRAPPERS[0]; vitola?: typeof VITOLAS[0]; cut?: typeof CUTS[0] };

// ── Synergy Halo ──────────────────────────────────────────────────────────
function SynergyHalo({ synergy }: { synergy: number }) {
  const spring   = useSpring(0, { stiffness: 60, damping: 18 });
  const offset   = useTransform(spring, v => HALO_CIRC * (1 - v / 100));
  const at100    = synergy >= 100;

  // drive the spring
  spring.set(Math.min(synergy, 100));

  return (
    <div className="relative flex items-center justify-center" style={{ width: 204, height: 204 }}>
      {/* Outer gold glow when complete */}
      <AnimatePresence>
        {at100 && (
          <motion.div
            key="halo-glow"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              boxShadow: `0 0 60px 20px ${GOLD}55, 0 0 120px 40px ${GOLD}22`,
              animation: "halo-pulse 1.8s ease-in-out infinite",
            }}
          />
        )}
      </AnimatePresence>

      {/* SVG ring */}
      <svg width={204} height={204} className="absolute inset-0 -rotate-90" style={{ overflow: "visible" }}>
        {/* Track */}
        <circle cx={102} cy={102} r={HALO_R} fill="none" stroke="rgba(212,175,55,0.12)" strokeWidth={10} />
        {/* Progress */}
        <motion.circle
          cx={102} cy={102} r={HALO_R}
          fill="none"
          stroke={at100 ? GOLD : `url(#haloGrad)`}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={HALO_CIRC}
          style={{ strokeDashoffset: offset }}
          filter={at100 ? "url(#haloBloom)" : undefined}
        />
        <defs>
          <linearGradient id="haloGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#d4af37" />
            <stop offset="100%" stopColor="#f5d980" />
          </linearGradient>
          <filter id="haloBloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
      </svg>

      {/* Center label */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.span
          key={Math.floor(synergy)}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          className="font-bold leading-none tabular-nums"
          style={{ fontSize: 38, color: at100 ? GOLD : "rgba(240,232,212,0.92)", fontFamily: "'Cormorant Garamond',serif" }}
        >
          {Math.min(Math.round(synergy), 100)}
        </motion.span>
        <span className="text-[9px] tracking-[0.22em] uppercase mt-1" style={{ color: `${GOLD}88` }}>
          {at100 ? "PERFECT" : "SYNERGY"}
        </span>
      </div>
    </div>
  );
}

// ── Floating +XP chip ─────────────────────────────────────────────────────
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
      <span
        className="text-sm font-bold tracking-widest px-3 py-1 rounded-full"
        style={{ color: GOLD, background: "rgba(212,175,55,0.15)", border: `1px solid ${GOLD}44` }}
      >
        +{chip.amount} XP
      </span>
    </motion.div>
  );
}

// ── Leaf/Wrapper carousel card ────────────────────────────────────────────
function SelectionCard<T extends { id: string; label: string; sub?: string; img: string; xp: number }>({
  item, selected, onClick,
}: { item: T; selected: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.93 }}
      whileHover={{ scale: 1.04, y: -4 }}
      className="relative flex-shrink-0 flex flex-col overflow-hidden rounded-2xl border cursor-pointer"
      style={{
        width: 148,
        borderColor: selected ? GOLD : "rgba(212,175,55,0.18)",
        background:  selected
          ? `linear-gradient(160deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.06) 100%)`
          : "rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
        boxShadow: selected ? `0 0 24px ${GOLD}44, inset 0 1px 0 ${GOLD}22` : "none",
        outline: "none",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
    >
      {/* Image — aspect-square object-cover */}
      <div className="w-full aspect-square overflow-hidden">
        <img
          src={item.img}
          alt={item.label}
          className="w-full h-full object-cover"
          style={{ filter: selected ? "brightness(1.15) saturate(1.2)" : "brightness(0.75) saturate(0.8)" }}
        />
      </div>

      {/* Label shelf */}
      <div className="flex flex-col items-start px-3 py-2 gap-0.5">
        <span className="text-xs font-bold tracking-wider uppercase" style={{ color: selected ? GOLD : "rgba(240,232,212,0.80)" }}>
          {item.label}
        </span>
        {"sub" in item && (
          <span className="text-[9px] leading-snug" style={{ color: "rgba(240,232,212,0.42)" }}>
            {(item as { sub?: string }).sub}
          </span>
        )}
      </div>

      {/* Selected glow ring */}
      {selected && (
        <motion.div
          layoutId={`sel-ring-${item.id}`}
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ border: `2px solid ${GOLD}`, boxShadow: `inset 0 0 16px ${GOLD}18` }}
        />
      )}

      {/* Float-in when selected */}
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

// ── Alchemy Reveal ─────────────────────────────────────────────────────────
function AlchemyReveal({ sel, onRestart }: { sel: Sel; onRestart: () => void }) {
  const [phase, setPhase] = useState<"scan"|"result">("scan");

  // auto-advance scan → result
  useState(() => {
    const t = setTimeout(() => setPhase("result"), 2200);
    return () => clearTimeout(t);
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[9990] flex flex-col items-center justify-center"
      style={{ background: "rgba(4,2,0,0.97)", backdropFilter: "blur(20px)" }}
    >
      <AnimatePresence mode="wait">
        {phase === "scan" ? (
          <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6">
            {/* Scan sweep */}
            <div className="relative" style={{ width: 220, height: 220 }}>
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
                <span className="text-[10px] tracking-[0.3em] uppercase" style={{ color: `${GOLD}80` }}>
                  SCANNING HUMIDOR
                </span>
              </div>
            </div>
            {/* Scanlines */}
            <div className="w-64 flex flex-col gap-1.5">
              {["ANALYZING LEAF SYNERGY","CROSS-REFERENCING VITOLA","COMPUTING PERFECT MATCH"].map((t, i) => (
                <motion.div
                  key={t}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.4 }}
                  className="flex items-center gap-2"
                >
                  <motion.div
                    className="rounded-full"
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
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-6 px-8 text-center"
          >
            <motion.div
              animate={{ boxShadow: [`0 0 0 ${GOLD}00`, `0 0 60px ${GOLD}66`, `0 0 0 ${GOLD}00`] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="rounded-full overflow-hidden"
              style={{ width: 140, height: 140, border: `3px solid ${GOLD}` }}
            >
              <img src={sel.vitola?.img ?? "/images/cigar.png"} alt="match" className="w-full h-full object-cover" />
            </motion.div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] tracking-[0.3em] uppercase" style={{ color: `${GOLD}88` }}>PERFECT MATCH</span>
              <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "2.2rem", fontWeight: 300, color: "#f0e8d4", lineHeight: 1.1 }}>
                {sel.vitola?.label ?? "Robusto"} {sel.wrapper?.label ?? "Maduro"}
              </h2>
              <p className="text-sm italic mt-1" style={{ color: `${GOLD}90` }}>
                A {sel.leaf?.sub ?? "full-body"} smoke ideal for the contemplative hour.
              </p>
            </div>

            {/* Pairing note */}
            <div
              className="rounded-xl px-5 py-3 text-left"
              style={{ background: "rgba(212,175,55,0.08)", border: `1px solid ${GOLD}30`, maxWidth: 340 }}
            >
              <span className="text-[9px] tracking-widest uppercase block mb-1" style={{ color: `${GOLD}70` }}>SPIRIT PAIRING</span>
              <span className="text-sm" style={{ color: "rgba(240,232,212,0.75)" }}>
                {sel.wrapper?.id === "maduro" || sel.wrapper?.id === "oscuro"
                  ? "Aged Bourbon · Rich chocolate, vanilla, and dark caramel notes."
                  : sel.wrapper?.id === "habano"
                  ? "Single-Malt Scotch · Peated smoke mirrors the earthy wrapper profile."
                  : "Highland Scotch · The lighter wrapper calls for a crisp, honeyed dram."}
              </span>
            </div>

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
  const [step,   setStep]   = useState<0|1|2|3>(0);
  const [sel,    setSel]    = useState<Sel>({});
  const [xp,     setXp]     = useState(0);
  const [chips,  setChips]  = useState<XPFloat[]>([]);
  const [reveal, setReveal] = useState(false);
  const chipId = useRef(0);

  // Synergy: sum of selected item synergy values, capped 100
  const synergy = Math.min(
    (sel.leaf?.synergy    ?? 0) +
    (sel.wrapper?.synergy ?? 0) +
    (sel.vitola?.synergy  ?? 0) +
    (sel.cut?.synergy     ?? 0),
    100
  );

  const spawnXP = useCallback((amount: number, e: React.MouseEvent) => {
    const id = ++chipId.current;
    setChips(c => [...c, { id, amount, x: e.clientX - 30, y: e.clientY - 40 }]);
    setTimeout(() => setChips(c => c.filter(ch => ch.id !== id)), 1200);
    setXp(v => v + amount);
  }, []);

  function select<T extends typeof LEAVES[0]>(key: keyof Sel, item: T, e: React.MouseEvent) {
    setSel(s => ({ ...s, [key]: item }));
    spawnXP(item.xp, e);
  }

  function nextStep() {
    if (step === 3) { setReveal(true); return; }
    setStep(s => (s + 1) as 0|1|2|3);
  }
  function prevStep() { if (step > 0) setStep(s => (s - 1) as 0|1|2|3); }

  const stepKeys: (keyof Sel)[] = ["leaf","wrapper","vitola","cut"];
  const canAdvance = !!sel[stepKeys[step]];

  const STEP_LABELS = ["TOBACCO LEAF","WRAPPER","VITOLA & SMOKE","THE CUT"];

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.07) 0%, #080502 55%)", fontFamily: "'Inter',sans-serif" }}
    >
      {/* Film grain + scanlines CSS already global from index.css */}

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 pt-5 pb-2 flex-shrink-0">
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

        {/* XP Counter */}
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

      {/* ── Synergy Halo (centered) ── */}
      <div className="flex justify-center flex-shrink-0 mt-1">
        <SynergyHalo synergy={synergy} />
      </div>

      {/* ── Step indicator ── */}
      <div className="flex justify-center gap-3 mt-2 flex-shrink-0">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div
              className="rounded-full"
              style={{
                width: 8, height: 8,
                background: i < step ? GOLD : i === step ? GOLD : "rgba(212,175,55,0.20)",
                boxShadow: i === step ? `0 0 10px ${GOLD}` : "none",
                transition: "all 0.3s",
              }}
            />
            <span
              className="text-[7px] tracking-widest uppercase hidden sm:block"
              style={{ color: i === step ? `${GOLD}` : "rgba(212,175,55,0.35)" }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Step content ── */}
      <div className="flex-1 flex flex-col overflow-hidden mt-4 px-4">
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
            <div className="flex flex-col mb-4">
              <span
                className="text-[10px] tracking-[0.3em] uppercase"
                style={{ color: `${GOLD}70` }}
              >
                STEP {step + 1} OF 4
              </span>
              <h2
                style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.8rem", fontWeight: 300, color: "rgba(240,232,212,0.95)", margin: 0, lineHeight: 1.1 }}
              >
                {["Select Your Tobacco Leaf","Choose the Wrapper","Vitola & Smoke Time","The Final Cut"][step]}
              </h2>
            </div>

            {/* ── Step 0: Leaf Carousel ── */}
            {step === 0 && (
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar flex-1 items-center">
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

            {/* ── Step 1: Wrapper Carousel ── */}
            {step === 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar flex-1 items-center">
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

            {/* ── Step 2: Vitola grid + smoke time ── */}
            {step === 2 && (
              <div className="flex flex-col gap-4 flex-1 overflow-y-auto no-scrollbar">
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

                {/* Smoke Time slider */}
                {sel.vitola && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-4 flex flex-col gap-3"
                    style={{ background: "rgba(212,175,55,0.06)", border: `1px solid ${GOLD}20`, backdropFilter: "blur(12px)" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] tracking-[0.22em] uppercase" style={{ color: `${GOLD}70` }}>SMOKE TIME</span>
                      <span className="text-sm font-bold" style={{ color: GOLD }}>{sel.vitola.smoke} min</span>
                    </div>
                    {/* Stylized static bar representing the vitola's smoke time */}
                    <div className="relative h-2 rounded-full" style={{ background: "rgba(212,175,55,0.15)" }}>
                      <motion.div
                        className="absolute left-0 top-0 h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${GOLD}, #f5d980)`, boxShadow: `0 0 8px ${GOLD}88` }}
                        initial={{ width: "0%" }}
                        animate={{ width: `${((sel.vitola.smoke - 30) / 90) * 100}%` }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                    <div className="flex justify-between text-[8px] tracking-widest uppercase" style={{ color: "rgba(212,175,55,0.35)" }}>
                      <span>30 min</span><span>120 min</span>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* ── Step 3: Cut selection ── */}
            {step === 3 && (
              <div className="flex gap-4 flex-1 items-center justify-center flex-wrap">
                {CUTS.map(cut => (
                  <motion.button
                    key={cut.id}
                    onClick={e => select("cut", cut, e)}
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.06, y: -4 }}
                    className="flex flex-col items-center gap-2 cursor-pointer"
                    style={{ background: "none", border: "none", outline: "none" }}
                  >
                    {/* Square image with glass frame */}
                    <div
                      className="relative overflow-hidden rounded-2xl"
                      style={{
                        width: 120, height: 120,
                        border: sel.cut?.id === cut.id ? `2px solid ${GOLD}` : `1px solid ${GOLD}25`,
                        boxShadow: sel.cut?.id === cut.id ? `0 0 28px ${GOLD}55` : "none",
                        backdropFilter: "blur(12px)",
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      <img
                        src={cut.img}
                        alt={cut.label}
                        className="w-full h-full object-cover"
                        style={{ filter: sel.cut?.id === cut.id ? "brightness(1.1)" : "brightness(0.65)" }}
                      />
                      {sel.cut?.id === cut.id && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 rounded-2xl"
                          style={{ background: `radial-gradient(circle, ${GOLD}18 0%, transparent 70%)` }}
                        />
                      )}
                    </div>
                    <span className="text-xs font-bold tracking-wider uppercase" style={{ color: sel.cut?.id === cut.id ? GOLD : "rgba(240,232,212,0.65)" }}>
                      {cut.label}
                    </span>
                    <span className="text-[9px]" style={{ color: "rgba(240,232,212,0.38)" }}>{cut.sub}</span>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Navigation strip ── */}
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(212,175,55,0.10)" }}>
        <motion.button
          onClick={prevStep}
          whileTap={{ scale: 0.92 }}
          disabled={step === 0}
          className="px-5 py-2.5 rounded-full text-xs tracking-widest uppercase font-bold"
          style={{
            background: "rgba(212,175,55,0.08)",
            border: `1px solid ${GOLD}25`,
            color: step === 0 ? "rgba(212,175,55,0.25)" : `${GOLD}80`,
            cursor: step === 0 ? "not-allowed" : "pointer",
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
            color: canAdvance ? "#0a0700" : "rgba(212,175,55,0.28)",
            boxShadow: canAdvance ? `0 4px 20px ${GOLD}44` : "none",
            cursor: canAdvance ? "pointer" : "not-allowed",
            border: "none",
          }}
        >
          {step === 3 ? "REVEAL MATCH" : "CONTINUE →"}
        </motion.button>
      </div>

      {/* ── Gold ticker (consistent with rest of experience) ── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: 28, background: "rgba(0,0,0,0.95)", borderTop: `1px solid ${GOLD}`,
        display: "flex", alignItems: "center", overflow: "hidden",
        zIndex: 9998, pointerEvents: "none",
      }}>
        <div style={{
          display: "flex", whiteSpace: "nowrap", alignItems: "center",
          animation: "axiom-ticker-scroll 28s linear infinite",
          color: GOLD, fontSize: 9, fontWeight: 700,
          letterSpacing: "0.22em", fontFamily: "monospace", textTransform: "uppercase",
        }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} style={{ marginRight: "6rem" }}>
              AXIOM OS /// MASTER BLENDER: ACTIVE /// SYNERGY ENGINE: ONLINE /// HUMIDOR AI: SCANNING /// PALATE CALIBRATION: LIVE ///
            </span>
          ))}
        </div>
      </div>

      {/* ── Floating XP chips ── */}
      {chips.map(chip => <XPChip key={chip.id} chip={chip} />)}

      {/* ── Alchemy Reveal ── */}
      {reveal && <AlchemyReveal sel={sel} onRestart={() => { setReveal(false); setStep(0); setSel({}); setXp(0); }} />}

      {/* ── Inline keyframes for halo pulse ── */}
      <style>{`
        @keyframes halo-pulse {
          0%,100% { box-shadow: 0 0 60px 20px ${GOLD}44, 0 0 120px 40px ${GOLD}18; }
          50%      { box-shadow: 0 0 80px 30px ${GOLD}66, 0 0 160px 60px ${GOLD}28; }
        }
        .no-scrollbar::-webkit-scrollbar { display:none; }
        .no-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
      `}</style>
    </div>
  );
}
