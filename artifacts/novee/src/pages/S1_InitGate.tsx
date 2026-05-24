import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { BackButton } from "@/components/BackButton";
import { LeaderboardTicker } from "@/components/LeaderboardTicker";
import { POSGateModal } from "@/components/POSGateModal";
import { CheatCodeEngine } from "@/components/CheatCodeEngine";
import { hapticMilestone, hapticError } from "@/hooks/useHaptic";
import { CigarHero } from "@/components/CigarHero";
import { submitScore, getVenueLeaderboard } from "@/lib/leaderboardEngine";

const IMG = (n: string) => `${import.meta.env.BASE_URL}images/${n}`;

const GOLD = "#D4AF37";
const PV = {
  enter:  { opacity: 0, x: 50,  scale: 0.97 },
  active: { opacity: 1, x: 0,   scale: 1    },
  exit:   { opacity: 0, x: -40, scale: 0.98 },
};
const PT = { type: "spring" as const, mass: 0.9, stiffness: 240, damping: 28 };

/* ─── Mentors ─── */
const MENTORS = [
  {
    id: "dominican", name: "Señor Alejandro", flag: "🇩🇴",
    country: "Dominican Republic", valley: "Cibao Valley",
    bio: "Earthy, cedar, medium body. Old-world master of aged Olor Dominicano. Multi-leaf complexity with deep earth-tone transitions.",
    tags: ["Aged Profiles", "Earth Transitions", "Multi-Leaf"],
    hue: "#1B4BD4", soilTop: "#110A02", soilBot: "#1E1008",
    photo: "mentor_dominican.png",
    soilTarget: { n: [35, 50], ph: [5.8, 6.8], m: [50, 65] }
  },
  {
    id: "nicaraguan", name: "Doña Rosa", flag: "🇳🇮",
    country: "Nicaragua", valley: "Estelí",
    bio: "Volcanic, spicy, full body. Commands volcanic mineral-rich soils for maximum Ligero density. Uncompromising palate intensity.",
    tags: ["Volcanic Soil", "Heavy Ligero", "Full-Body"],
    hue: "#1A8C3A", soilTop: "#061006", soilBot: "#0C1C0A",
    photo: "mentor_nicaraguan.png",
    soilTarget: { n: [60, 75], ph: [5.5, 6.5], m: [55, 70] }
  },
  {
    id: "honduran", name: "Maestro Cortés", flag: "🇭🇳",
    country: "Honduras", valley: "Jamastran Valley",
    bio: "Creamy, smooth, mild-medium. Flawless sun-grown wrapper selection with microscopic vein concealment and aerodynamic draw precision.",
    tags: ["Wrapper Perfection", "Vein Concealment", "Draw Precision"],
    hue: "#2A7ABF", soilTop: "#060A12", soilBot: "#0C1020",
    photo: "mentor_honduran.png",
    soilTarget: { n: [40, 55], ph: [6.0, 7.0], m: [45, 60] }
  },
  {
    id: "venezuelan", name: "Don Estéban", flag: "🇻🇪",
    country: "Venezuela", valley: "Aragua Valley",
    bio: "Rich, complex, full body. Master of rare Venezuelan Criollo, bringing deep cocoa and dark fruit complexity to every blend.",
    tags: ["Rich Cocoa", "Dark Fruit", "Complex"],
    hue: "#D48C1E", soilTop: "#1A1005", soilBot: "#2A1A08",
    photo: "mentor_venezuelan.png",
    soilTarget: { n: [50, 65], ph: [5.7, 6.7], m: [60, 75] }
  },
];

const COUNTRIES = MENTORS;

/* ─── Seeds ─── */
const SEED_PHOTOS: Record<string,string> = {
  criollo: "tobacco_criollo.png",
  corojo:  "tobacco_corojo.png",
  connecticut: "tobacco_connecticut.png",
};

const SEEDS = [
  {
    id: "criollo", name: "Criollo '98", origin: "Cuban-Seed · Dominican Republic",
    profile: "Delivers deep, traditional earth-toned flavor transitions and heavy spice tracking. Medium-to-full body with secondary dark chocolate, cedar, and aged leather notes across the full smoke.",
    specs: [{ k: "Body", v: "Medium-Full", b: 70 }, { k: "Nicotine", v: "High", b: 78 }, { k: "Burn Rate", v: "Slow / Even", b: 38 }, { k: "Aroma", v: "Earth · Spice", b: 80 }],
    veinColor: "rgba(170,130,45,0.58)", veinW: 2.2, oilSheen: true,
    c1: "#213A10", c2: "#0E1E06", cs: "#3A5C18", tx: 0.62,
    tagline: "Deep earth. Heavy spice tracking.",
    veinDesc: "Balanced vein system with moderate secondary density. Classic Cuban-seed architecture for reliable, consistent draw and even oil channel distribution.",
  },
  {
    id: "corojo", name: "Corojo", origin: "Vuelta Abajo, Cuba · Honduras",
    profile: "A robust, altamente resiliente leaf known for producing intense peppery finishes and high natural oil yield. The thick cuticle locks in volatile aromatic compounds through fermentation.",
    specs: [{ k: "Body", v: "Full", b: 95 }, { k: "Nicotine", v: "Very High", b: 94 }, { k: "Burn Rate", v: "Medium", b: 55 }, { k: "Aroma", v: "Pepper · Oak", b: 90 }],
    veinColor: "rgba(200,155,30,0.68)", veinW: 2.8, oilSheen: true,
    c1: "#162E08", c2: "#080E02", cs: "#2A4A10", tx: 0.73,
    tagline: "Maximum strength. Pepper dominance.",
    veinDesc: "Dense primary vein with aggressive secondary branching. Maximum oil-channel surface area for aromatic concentration and palate intensity.",
  },
  {
    id: "connecticut", name: "Connecticut Shade", origin: "Connecticut River Valley, USA",
    profile: "A delicate, ultra-smooth wrapper leaf delivering creamy tasting notes, mild body, and seamless aesthetics. Grown under cheesecloth shade canopies — the gold standard for premium construction.",
    specs: [{ k: "Body", v: "Mild", b: 22 }, { k: "Nicotine", v: "Low-Medium", b: 28 }, { k: "Burn Rate", v: "Fast / Smooth", b: 78 }, { k: "Aroma", v: "Cream · Hay", b: 45 }],
    veinColor: "rgba(220,205,150,0.26)", veinW: 0.9, oilSheen: false,
    c1: "#4A6E28", c2: "#2E4A14", cs: "#7AAA44", tx: 0.48,
    tagline: "Invisible veins. Creamy aesthetics.",
    veinDesc: "Near-invisible tertiary vein network. Microscopic cross-fibers sealed under the cuticle — standard for premium wrapper aesthetics and consistent draw.",
  },
];

/* ─── Quiz ─── */
const QUIZ = [
  { q: "Which leaf is prized for near-invisible veins, creamy notes, and mild body?", opts: ["Criollo '98", "Corojo", "Connecticut Shade", "Habano 2000"], correct: 2, pen: 2 },
  { q: "Corojo leaf produces which dominant palate characteristic?", opts: ["Creamy sweetness", "Intense peppery strength", "Light cedar notes", "Mild earth tones"], correct: 1, pen: 2 },
  { q: "Criollo '98 is distinguished by its balance of which two qualities?", opts: ["Light color & low nicotine", "Strength & aromatic complexity", "Cedar & mild pepper", "Sweetness & burn rate"], correct: 1, pen: 2 },
];

/* ─── Photorealistic Leaf SVG ─── */
function LeafSVG({ s, scale = 1 }: { s: typeof SEEDS[0]; scale?: number }) {
  const w = Math.round(190 * scale);
  const h = Math.round(280 * scale);
  const fid = `lf_${s.id}`, gid = `lg_${s.id}`, sid = `ls_${s.id}`;
  return (
    <svg width={w} height={h} viewBox="0 0 190 280" fill="none"
      style={{ filter: "drop-shadow(0 12px 40px rgba(0,0,0,0.80)) drop-shadow(0 3px 10px rgba(0,0,0,0.65))" }}>
      <defs>
        <filter id={fid} x="-8%" y="-5%" width="116%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency={s.tx} numOctaves="5" seed="9" stitchTiles="stitch" result="noise" />
          <feColorMatrix type="matrix"
            values={s.oilSheen ? "0 0 0 0 0.04 0 0 0 0 0.09 0 0 0 0 0.01 0 0 0 0.50 0" : "0 0 0 0 0.05 0 0 0 0 0.10 0 0 0 0 0.02 0 0 0 0.32 0"}
            in="noise" result="cn" />
          <feComposite in="SourceGraphic" in2="cn" operator="multiply" result="tx" />
          <feGaussianBlur in="tx" stdDeviation="0.25" result="sm" />
          <feComposite in="SourceGraphic" in2="sm" operator="arithmetic" k1="0" k2="0.80" k3="0.20" k4="0" />
        </filter>
        <radialGradient id={gid} cx="37%" cy="24%" r="72%">
          <stop offset="0%"  stopColor={s.cs} />
          <stop offset="38%" stopColor={s.c1} />
          <stop offset="78%" stopColor={s.c2} />
          <stop offset="100%" stopColor="#030702" />
        </radialGradient>
        <linearGradient id={sid} x1="28%" y1="3%" x2="52%" y2="38%">
          <stop offset="0%"  stopColor="rgba(255,255,255,0.12)" />
          <stop offset="70%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <path d="M95 5 C120 15,150 35,160 68 C170 100,165 135,157 165 C148 196,132 224,118 248 C110 262,103 274,95 283 C87 274,80 262,72 248 C58 224,42 196,33 165 C25 135,20 100,30 68 C40 35,70 15,95 5Z"
        fill={`url(#${gid})`} filter={`url(#${fid})`} />
      <path d="M95 10 Q95 145 95 277" stroke={s.veinColor} strokeWidth={s.veinW * 1.5} fill="none" strokeLinecap="round" />
      {[34,58,84,110,138,164,190,215].map((y, i) => {
        const sp = 30 - i * 2.8, sw = Math.max(s.veinW * (0.65 - i * 0.045), 0.35);
        return (
          <g key={y}>
            <path d={`M95 ${y} C${95-sp*.45} ${y+11},${95-sp*.88} ${y+20},${95-sp} ${y+27}`} stroke={s.veinColor} strokeWidth={sw} fill="none" strokeLinecap="round" />
            <path d={`M95 ${y} C${95+sp*.45} ${y+11},${95+sp*.88} ${y+20},${95+sp} ${y+27}`} stroke={s.veinColor} strokeWidth={sw} fill="none" strokeLinecap="round" />
          </g>
        );
      })}
      {[50,100,148,195].map((y, i) => {
        const b = 20 - i * 2.5, tw = Math.max(s.veinW * 0.28, 0.22);
        return (
          <g key={`tv${i}`}>
            <line x1={95-b*.42} y1={y} x2={95-b-4} y2={y+16} stroke={s.veinColor} strokeWidth={tw} strokeLinecap="round" />
            <line x1={95+b*.42} y1={y} x2={95+b+4} y2={y+16} stroke={s.veinColor} strokeWidth={tw} strokeLinecap="round" />
          </g>
        );
      })}
      {s.oilSheen && <path d="M95 5 C120 15,150 35,160 68 C156 48,140 28,95 17 C50 28,34 48,30 68 C40 35,70 15,95 5Z" fill={`url(#${sid})`} />}
      <ellipse cx="95" cy="13" rx="7" ry="4" fill="rgba(255,255,255,0.07)" />
    </svg>
  );
}

/* ─── Left visual panel — cinematic full-bleed ─── */
function LeftPanel({ eyebrow, headline, sub, accent = GOLD }: { eyebrow: string; headline: string; sub?: string; accent?: string }) {
  return (
    <div style={{ position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* ── Real cigar photograph — full bleed ── */}
      <img src={IMG("cigar_hero.png")} alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 40%" }}
        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      {/* Dark cinematic overlay */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(170deg, rgba(6,4,1,0.80) 0%, rgba(4,2,0,0.60) 35%, rgba(8,5,2,0.92) 100%)" }} />
      {/* Amber top glow */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "55%", background: `radial-gradient(ellipse 85% 60% at 45% 0%, rgba(212,140,30,0.22) 0%, transparent 65%)`, pointerEvents: "none" }} />
      {/* Gold top rim */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}EE, ${accent}88 60%, transparent)`, boxShadow: `0 0 32px 5px ${accent}30`, zIndex: 5 }} />
      {/* Gold right divider */}
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 1, background: `linear-gradient(180deg, transparent, ${accent}55 35%, ${accent}44 65%, transparent)` }} />

      {/* ── Text anchored bottom ── */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 52px 52px", zIndex: 2 }}>
        {/* Fade above text */}
        <div style={{ position: "absolute", bottom: "100%", left: 0, right: 0, height: 160, background: "linear-gradient(0deg, rgba(5,3,1,0.96) 0%, transparent 100%)", pointerEvents: "none" }} />
        <div style={{ fontSize: 11, letterSpacing: "0.58em", textTransform: "uppercase", fontWeight: 800, color: `${accent}80`, marginBottom: 18, fontFamily: "'Inter', sans-serif" }}>
          {eyebrow}
        </div>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(54px, 6.5vw, 92px)",
          fontWeight: 300, color: "#F0E8D4", margin: "0 0 22px",
          letterSpacing: "0.03em", lineHeight: 0.98,
          textShadow: `0 0 80px ${accent}22, 0 4px 40px rgba(0,0,0,0.95)`,
          whiteSpace: "pre-line",
        }}>
          {headline}
        </h1>
        {sub && (
          <p style={{ fontSize: 20, color: "rgba(240,232,212,0.48)", lineHeight: 1.58, margin: "0 0 20px", fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
            {sub}
          </p>
        )}
        <div style={{ width: 90, height: 2, background: `linear-gradient(90deg, ${accent}, transparent)`, boxShadow: `0 0 14px ${accent}66` }} />
      </div>
    </div>
  );
}

/* ─── Right glass panel ─── */
function RightPanel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display:        "flex",
      flexDirection:  "column",
      justifyContent: "center",
      padding:        "56px 52px",
      background:     "rgba(255,255,255,0.018)",
      backdropFilter: "blur(28px)",
      WebkitBackdropFilter: "blur(28px)",
      overflowY:      "auto",
    }}>
      {children}
    </div>
  );
}

/* ─── Full-bleed split layout ─── */
function Split({ left, right, leftFr = "1fr", rightFr = "1fr" }: { left: React.ReactNode; right: React.ReactNode; leftFr?: string; rightFr?: string }) {
  return (
    <motion.div
      variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
      style={{
        position:             "absolute",
        inset:                "41px 0 0 0",
        display:              "grid",
        gridTemplateColumns:  `${leftFr} ${rightFr}`,
        overflow:             "hidden",
      }}
    >
      {left}
      {right}
    </motion.div>
  );
}

type Step = "demo" | "rules" | "country_select" | "mentor" | "soil_calibration" | "pilon_game" | "quiz" | "posgate" | "leaderboard" | "seed_canvas";

export function S1_InitGate() {
  const { updateProfile, setPhase, addPoints, applyPenalty, profile } = useGuest();
  const [step,        setStep]       = useState<Step>("demo");
  const [firstName,   setFirstName]  = useState("");
  const [lastName,    setLastName]   = useState("");
  const [phone4,      setPhone4]     = useState("");
  const [age,         setAge]        = useState("");
  
  const [country1,    setCountry1]   = useState<string | null>(profile.blendCountry1);
  const [country2,    setCountry2]   = useState<string | null>(profile.blendCountry2);

  const [soilN,       setSoilN]      = useState(60);
  const [soilPH,      setSoilPH]     = useState(6.0);
  const [soilMoisture, setSoilMoisture] = useState(60);

  const [pilonHeat,   setPilonHeat]  = useState(0);
  const [pilonStatus, setPilonStatus] = useState<"idle" | "running" | "venting" | "success" | "fail">("idle");
  const [ventWindows, setVentWindows] = useState<number[]>([]);

  const [mentor,     setMentor]    = useState<string | null>(profile.mentor);
  const [seedId,     setSeedId]    = useState("criollo");
  const [qIdx,       setQIdx]      = useState(0);
  const [answered,   setAnswered]  = useState<number[]>([]);
  const [wrongFlash, setWrongFlash]= useState(false);
  const [showPOS,    setShowPOS]   = useState(false);
  const [quizPts,    setQuizPts]   = useState(0);
  const [flavorNotes, setFlavorNotes] = useState("");
  const [expLevel,   setExpLevel]  = useState("");
  const [seedTab,    setSeedTab]   = useState("leaf_ed");

  const go = (s: Step) => setStep(s);
  const canSubmitProfile = firstName.trim() && lastName.trim() && phone4.trim().length === 4 && age;
  const canSubmit = !!canSubmitProfile;

  function submitDemo() {
    if (!canSubmitProfile) return;
    updateProfile({ firstName: firstName.trim(), lastName: lastName.trim(), phone4: phone4.trim().slice(-4), age: parseInt(age) });
    addPoints(10);
    go("rules");
  }

  function selectCountry(id: string) {
    if (id === country1) {
      setCountry1(null);
      return;
    }
    if (id === country2) {
      setCountry2(null);
      return;
    }
    if (!country1) setCountry1(id);
    else if (!country2) setCountry2(id);
  }

  function confirmCountries() {
    if (!country1 || !country2) return;
    updateProfile({ blendCountry1: country1, blendCountry2: country2, mentor: country1 });
    setMentor(country1);
    go("seed_canvas");
  }

  function startPilon() {
    setPilonStatus("running");
    let heat = 0;
    const interval = setInterval(() => {
      heat += 2;
      setPilonHeat(heat);
      if (heat >= 100) {
        clearInterval(interval);
        setPilonStatus("fail");
        applyPenalty(3);
      }
    }, 200);
  }

  function ventPilon() {
    if (pilonStatus !== "running") return;
    setPilonHeat(prev => Math.max(0, prev - 20));
    setVentWindows(prev => [...prev, pilonHeat]);
    if (ventWindows.length >= 2) {
      setPilonStatus("success");
      addPoints(20);
    }
  }

  function answerQuiz(oi: number) {
    if (answered.includes(qIdx)) return;
    const q = QUIZ[qIdx]; const good = oi === q.correct;
    setAnswered(p => [...p, qIdx]);
    if (good) { hapticMilestone(); setQuizPts(p => p + 20); addPoints(20); }
    else { hapticError(); setWrongFlash(true); setTimeout(() => setWrongFlash(false), 700); applyPenalty(q.pen); }
    setTimeout(() => {
      if (qIdx < QUIZ.length - 1) setQIdx(i => i + 1);
      else {
        const finalScore = profile.points + (good ? 20 : 0);
        updateProfile({ quizScore: quizPts + (good ? 20 : 0) });
        submitScore({
          name: `${profile.firstName} ${profile.lastName}`.trim() || "Guest",
          score: finalScore,
          tier: profile.difficultyTier,
          venueId: "00000000-0000-0000-0000-000000000001",
          region: "North America",
          sessionType: "session",
        });
        go("posgate");
      }
    }, 880);
  }

  function handlePOSUnlock(code: string) {
    updateProfile({ receiptCode: code });
    hapticMilestone(); setShowPOS(false);
    setPhase("s2_terroir");
  }

  const STEPS: Step[] = ["demo", "rules", "country_select", "seed_canvas", "quiz", "posgate"];

  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: "'Inter', sans-serif", overflow: "hidden" }}>
      <BackButton />

      {/* Step dots */}
      <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 7, zIndex: 30 }}>
        {STEPS.map(s => (
          <div key={s} style={{
            width: 24, height: 4, borderRadius: 2,
            background: s === step ? GOLD : "rgba(255,255,255,0.14)",
            boxShadow: s === step ? `0 0 8px ${GOLD}` : "none",
            transition: "all 0.28s",
          }} />
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ══════════════ DEMO — YOUR PROFILE ══════════════ */}
        {step === "demo" && (
          <motion.div key="demo" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
            style={{ position: "absolute", inset: "41px 0 0 0", display: "flex", overflow: "hidden" }}>

            {/* ── LEFT PANEL: Cigar Photo ── */}
            <div style={{ width: "38%", flexShrink: 0, position: "relative", overflow: "hidden" }}>
              <img src={IMG("cigar_hero.png")} alt=""
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,0,0,0.82) 0%, rgba(5,3,0,0.60) 60%, rgba(0,0,0,0.78) 100%)" }} />

              {/* Back button */}
              <div style={{ position: "absolute", top: 24, left: 24 }}>
                <motion.button type="button" onPointerDown={() => setPhase("crafthub")} whileTap={{ scale: 0.94 }}
                  style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.55)", border: "1px solid rgba(212,175,55,0.30)", borderRadius: 8, padding: "10px 18px", color: "#F0E8D4", fontSize: 14, fontWeight: 700, letterSpacing: "0.12em", cursor: "pointer" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  BACK
                </motion.button>
              </div>

              {/* Bottom text block */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "32px 28px" }}>
                <div style={{ fontSize: 11, letterSpacing: "0.44em", color: GOLD, textTransform: "uppercase", fontWeight: 800, marginBottom: 10, opacity: 0.85 }}>GUEST REGISTRATION</div>
                <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", lineHeight: 1.05, marginBottom: 16 }}>
                  <div style={{ fontSize: 54, fontWeight: 700, color: "#F0E8D4" }}>Your</div>
                  <div style={{ fontSize: 54, fontWeight: 700, color: GOLD }}>Profile</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 4 13C4 9 9 4 12 2c3 2 8 7 8 11a7 7 0 0 1-7 7z"/><path d="M12 2c0 6-4 10-4 10"/></svg>
                  <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, ${GOLD}55, transparent)` }} />
                </div>
                <p style={{ fontSize: 15, color: "rgba(240,232,212,0.55)", lineHeight: 1.65, margin: "0 0 28px" }}>
                  Create your profile to begin your 4-session cigar science journey. Your progress and scores will be saved to your profile.
                </p>
                <div style={{ background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.20)", borderRadius: 10, padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <div>
                    <div style={{ fontSize: 13, color: GOLD, fontStyle: "italic", fontWeight: 500, marginBottom: 4 }}>Your journey. Your palate. Your legacy.</div>
                    <div style={{ fontSize: 12, color: "rgba(240,232,212,0.45)" }}>4 sessions. Countless discoveries.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT PANEL: Form ── */}
            <div style={{ flex: 1, background: "#080500", overflowY: "auto", padding: "36px 40px 40px" }}>

              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", flexShrink: 0, background: "rgba(212,175,55,0.10)", border: "1.5px solid rgba(212,175,55,0.30)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 4 13C4 9 9 4 12 2c3 2 8 7 8 11a7 7 0 0 1-7 7z"/><path d="M12 2c0 6-4 10-4 10"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 11, letterSpacing: "0.44em", color: "rgba(212,175,55,0.70)", textTransform: "uppercase", fontWeight: 800, marginBottom: 4 }}>GUEST REGISTRATION</div>
                  <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 38, fontWeight: 700, color: "#F0E8D4", lineHeight: 1.0, marginBottom: 2 }}>Your Profile</div>
                  <div style={{ fontSize: 14, color: "rgba(240,232,212,0.38)", fontWeight: 300 }}>Let's get to know you.</div>
                </div>
              </div>

              {/* Gold divider */}
              <div style={{ height: 1, background: `linear-gradient(90deg, ${GOLD}55, transparent)`, marginBottom: 24 }} />

              {/* Required fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                {([
                  { label: "FIRST NAME",  val: firstName, set: setFirstName, ph: "Enter first name",  t: "text", icon: <><circle cx="12" cy="7" r="4"/><path d="M5.5 21a9 9 0 0 1 13 0"/></> },
                  { label: "LAST NAME",   val: lastName,  set: setLastName,  ph: "Enter last name",   t: "text", icon: <><circle cx="12" cy="7" r="4"/><path d="M5.5 21a9 9 0 0 1 13 0"/></> },
                ] as const).map(f => (
                  <div key={f.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.18)", borderRadius: 10, display: "flex", alignItems: "stretch", minHeight: 68, overflow: "hidden" }}>
                    <div style={{ width: 48, flexShrink: 0, background: "rgba(212,175,55,0.06)", borderRight: "1px solid rgba(212,175,55,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{f.icon}</svg>
                    </div>
                    <div style={{ flex: 1, padding: "10px 14px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 3 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(212,175,55,0.65)" }}>{f.label}</div>
                      <input type={f.t} placeholder={f.ph} value={f.val}
                        onChange={e => f.set(e.target.value)}
                        style={{ background: "transparent", border: "none", outline: "none", color: "#E8DECA", fontSize: 16, fontFamily: "'Inter',sans-serif", padding: 0, width: "100%" }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                {/* Last 4 */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.18)", borderRadius: 10, display: "flex", alignItems: "stretch", minHeight: 68, overflow: "hidden" }}>
                  <div style={{ width: 48, flexShrink: 0, background: "rgba(212,175,55,0.06)", borderRight: "1px solid rgba(212,175,55,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
                  </div>
                  <div style={{ flex: 1, padding: "10px 14px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 3 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(212,175,55,0.65)" }}>LAST 4 DIGITS (PHONE)</div>
                    <input type="tel" placeholder="Enter last 4 digits" value={phone4} maxLength={4}
                      onChange={e => setPhone4(e.target.value.replace(/\D/g,"").slice(0,4))}
                      style={{ background: "transparent", border: "none", outline: "none", color: "#E8DECA", fontSize: 16, fontFamily: "'Inter',sans-serif", padding: 0, width: "100%", letterSpacing: "0.20em" }} />
                  </div>
                </div>
                {/* Age */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.18)", borderRadius: 10, display: "flex", alignItems: "stretch", minHeight: 68, overflow: "hidden" }}>
                  <div style={{ width: 48, flexShrink: 0, background: "rgba(212,175,55,0.06)", borderRight: "1px solid rgba(212,175,55,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  </div>
                  <div style={{ flex: 1, padding: "10px 14px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 3 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(212,175,55,0.65)" }}>AGE</div>
                    <select value={age} onChange={e => setAge(e.target.value)}
                      style={{ background: "transparent", border: "none", outline: "none", color: age ? "#E8DECA" : "rgba(240,232,212,0.30)", fontSize: 16, fontFamily: "'Inter',sans-serif", padding: 0, width: "100%", appearance: "none", cursor: "pointer" }}>
                      <option value="" style={{ background: "#0A0600", color: "#E8DECA" }}>Select your age</option>
                      {Array.from({ length: 63 }, (_, i) => i + 18).map(a => (
                        <option key={a} value={String(a)} style={{ background: "#0A0600", color: "#E8DECA" }}>{a}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Optional section divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(212,175,55,0.18)" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, letterSpacing: "0.32em", color: "rgba(212,175,55,0.55)", textTransform: "uppercase", fontWeight: 700 }}>OPTIONAL — IMPROVES RECOMMENDATIONS</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.55 }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </div>
                <div style={{ flex: 1, height: 1, background: "rgba(212,175,55,0.18)" }} />
              </div>

              {/* Optional fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                {/* Flavor notes */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 10, display: "flex", alignItems: "stretch", minHeight: 68, overflow: "hidden" }}>
                  <div style={{ width: 48, flexShrink: 0, background: "rgba(212,175,55,0.04)", borderRight: "1px solid rgba(212,175,55,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.65 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
                  <div style={{ flex: 1, padding: "10px 14px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 3, position: "relative" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(212,175,55,0.50)" }}>PREFERRED FLAVOR NOTES</div>
                    <select value={flavorNotes} onChange={e => setFlavorNotes(e.target.value)}
                      style={{ background: "transparent", border: "none", outline: "none", color: flavorNotes ? "#E8DECA" : "rgba(240,232,212,0.28)", fontSize: 15, fontFamily: "'Inter',sans-serif", padding: 0, width: "100%", appearance: "none", cursor: "pointer" }}>
                      <option value="" style={{ background: "#0A0600", color: "#E8DECA" }}>Select your notes</option>
                      {["Earth & Cedar", "Pepper & Spice", "Cream & Nuts", "Dark Chocolate", "Coffee & Mocha", "Leather & Oak", "Sweet & Floral", "Mineral & Grass"].map(n => (
                        <option key={n} value={n} style={{ background: "#0A0600", color: "#E8DECA" }}>{n}</option>
                      ))}
                    </select>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", opacity: 0.45, pointerEvents: "none" }}><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
                {/* Experience level */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 10, display: "flex", alignItems: "stretch", minHeight: 68, overflow: "hidden" }}>
                  <div style={{ width: 48, flexShrink: 0, background: "rgba(212,175,55,0.04)", borderRight: "1px solid rgba(212,175,55,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.65 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <div style={{ flex: 1, padding: "10px 14px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 3, position: "relative" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(212,175,55,0.50)" }}>EXPERIENCE LEVEL</div>
                    <select value={expLevel} onChange={e => setExpLevel(e.target.value)}
                      style={{ background: "transparent", border: "none", outline: "none", color: expLevel ? "#E8DECA" : "rgba(240,232,212,0.28)", fontSize: 15, fontFamily: "'Inter',sans-serif", padding: 0, width: "100%", appearance: "none", cursor: "pointer" }}>
                      <option value="" style={{ background: "#0A0600", color: "#E8DECA" }}>Select your level</option>
                      {["First time smoker", "Casual enthusiast", "Regular aficionado", "Seasoned connoisseur", "Master blender"].map(l => (
                        <option key={l} value={l} style={{ background: "#0A0600", color: "#E8DECA" }}>{l}</option>
                      ))}
                    </select>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", opacity: 0.45, pointerEvents: "none" }}><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
              </div>

              {/* CONTINUE */}
              <motion.button type="button" onPointerDown={submitDemo} whileTap={{ scale: 0.97 }}
                disabled={!canSubmit}
                style={{
                  width: "100%", padding: "20px 32px", marginBottom: 28,
                  background: canSubmit ? `linear-gradient(135deg, ${GOLD} 0%, #B8920A 100%)` : "rgba(212,175,55,0.10)",
                  border: canSubmit ? "none" : "1px solid rgba(212,175,55,0.20)",
                  borderRadius: 8, cursor: canSubmit ? "pointer" : "default",
                  fontSize: 17, fontWeight: 800, color: canSubmit ? "#0A0600" : "rgba(212,175,55,0.30)",
                  letterSpacing: "0.22em", textTransform: "uppercase",
                  fontFamily: "'Inter',sans-serif",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                  boxShadow: canSubmit ? "0 8px 40px rgba(212,175,55,0.28)" : "none",
                  transition: "all 0.25s",
                }}>
                CONTINUE <span style={{ fontSize: 20 }}>→</span>
              </motion.button>

              {/* WHAT TO EXPECT */}
              <div style={{ borderTop: "1px solid rgba(212,175,55,0.14)", paddingTop: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(212,175,55,0.14)" }} />
                  <span style={{ fontSize: 10, letterSpacing: "0.32em", color: "rgba(212,175,55,0.50)", textTransform: "uppercase", fontWeight: 700 }}>WHAT TO EXPECT</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(212,175,55,0.14)" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                  {[
                    { num: "1", icon: <><path d="M11 20A7 7 0 0 1 4 13C4 9 9 4 12 2c3 2 8 7 8 11a7 7 0 0 1-7 7z"/><path d="M12 2c0 6-4 10-4 10"/></>, label: "DISCOVER",    desc: "Explore premium flavor, body, aroma, and structure" },
                    { num: "2", icon: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,            label: "ANALYZE",     desc: "Understand flavor transitions, depth, and blend notes" },
                    { num: "3", icon: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,              label: "CRAFT",       desc: "Build your blend profile through guided selections" },
                    { num: "4", icon: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></>,                          label: "EXPERIENCE",  desc: "Score your blends and refine your last palate" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(212,175,55,0.10)", borderRadius: 10, padding: "16px 12px", textAlign: "center" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(212,175,55,0.10)", border: "1px solid rgba(212,175,55,0.22)", margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{s.icon}</svg>
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.24em", color: GOLD, textTransform: "uppercase", marginBottom: 6 }}>{s.num} {s.label}</div>
                      <div style={{ fontSize: 11, color: "rgba(240,232,212,0.40)", lineHeight: 1.5 }}>{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* ══════════════ RULES — THE GOLDEN BOX ══════════════ */}
        {step === "rules" && (
          <motion.div key="rules" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
            style={{ position: "absolute", inset: "41px 0 0 0", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* ── Top Header Bar ── */}
            <div style={{
              flexShrink: 0, textAlign: "center", padding: "18px 48px 14px",
              background: "rgba(0,0,0,0.55)", backdropFilter: "blur(20px)",
              borderBottom: "1px solid rgba(212,175,55,0.18)",
            }}>
              <div style={{ fontSize: 11, letterSpacing: "0.55em", color: "rgba(212,175,55,0.65)", fontWeight: 800, textTransform: "uppercase", marginBottom: 4 }}>
                SmokeCraft 360 · Kiosk Edition
              </div>
              <h1 style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 48, fontWeight: 700, color: GOLD,
                margin: "0 0 4px", letterSpacing: "0.12em", textTransform: "uppercase",
                textShadow: `0 0 60px ${GOLD}55, 0 2px 16px rgba(0,0,0,0.90)`,
                lineHeight: 1,
              }}>The Golden Box</h1>
              <div style={{ fontSize: 16, letterSpacing: "0.38em", color: "rgba(240,232,212,0.45)", fontWeight: 400, fontStyle: "italic" }}>
                Compete. Learn. Ascend.
              </div>
            </div>

            {/* ── 3-Column Body ── */}
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "220px 1fr 260px", overflow: "hidden" }}>

              {/* ── LEFT: Rules of Play ── */}
              <div style={{
                borderRight: "1px solid rgba(212,175,55,0.12)",
                background: "rgba(0,0,0,0.50)", backdropFilter: "blur(16px)",
                padding: "28px 22px", display: "flex", flexDirection: "column", gap: 0,
                overflowY: "auto",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
                  <div style={{ width: 28, height: 1, background: `${GOLD}55` }} />
                  <span style={{ fontSize: 12, letterSpacing: "0.40em", color: GOLD, fontWeight: 800, textTransform: "uppercase" }}>Rules of Play</span>
                </div>
                <p style={{ fontSize: 16, color: "rgba(240,232,212,0.42)", lineHeight: 1.6, margin: "0 0 24px" }}>
                  Every action is scored. Learn the system before you build your blend.
                </p>
                {[
                  { icon: "◎", label: "Score Points",   sub: "Complete actions & challenges" },
                  { icon: "▲", label: "Climb Ranks",    sub: "Earn XP to level up" },
                  { icon: "⬡", label: "Unlock Rewards", sub: "Badges, blends, gear & more" },
                  { icon: "♛", label: "Earn Respect",   sub: "Compete. Be recognized. Lead." },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 20 }}>
                    <span style={{ fontSize: 20, color: GOLD, flexShrink: 0, marginTop: 2, opacity: 0.85 }}>{r.icon}</span>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#F0E8D4", marginBottom: 2 }}>{r.label}</div>
                      <div style={{ fontSize: 14, color: "rgba(240,232,212,0.40)", lineHeight: 1.4 }}>{r.sub}</div>
                    </div>
                  </div>
                ))}
                <div style={{
                  marginTop: "auto", background: "rgba(212,175,55,0.07)",
                  border: "1px solid rgba(212,175,55,0.22)", borderRadius: 10, padding: "14px 16px",
                }}>
                  <div style={{ fontSize: 11, letterSpacing: "0.36em", color: `${GOLD}90`, fontWeight: 800, marginBottom: 8, textTransform: "uppercase" }}> Tip</div>
                  <p style={{ fontSize: 15, color: "rgba(240,232,212,0.55)", lineHeight: 1.55, margin: 0 }}>
                    The better your decisions, the higher you climb.
                  </p>
                </div>
              </div>

              {/* ── CENTER: Contest Levels + Bottom Progress ── */}
              <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Contest Levels heading */}
                <div style={{
                  flexShrink: 0, padding: "20px 32px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(0,0,0,0.30)",
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "0.26em", color: "#F0E8D4", textTransform: "uppercase", marginBottom: 4 }}>Contest Levels</div>
                    <div style={{ fontSize: 14, color: "rgba(240,232,212,0.38)", letterSpacing: "0.16em" }}>Progress through the ranks. Master the leaf.</div>
                  </div>
                </div>

                {/* 4 Tier Cards */}
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0, overflow: "hidden" }}>
                  {[
                    {
                      num: 1, name: "Novice", sub: "The Beginning",
                      xp: "0 – 999 XP", color: "#C8322A", glow: "rgba(200,50,42,0.28)",
                      badge: "", desc: "You're learning the basics. Every decision builds your foundation.",
                      skills: ["Learn cigar basics", "Identify simple flavors", "Complete intro challenges"],
                    },
                    {
                      num: 2, name: "Enthusiast", sub: "Fueled by Passion",
                      xp: "1,000 – 4,999 XP", color: GOLD, glow: "rgba(212,175,55,0.28)",
                      badge: "🕯", desc: "You understand more. Your palate is growing. Your choices matter.",
                      skills: ["Understand regions", "Master pairings", "Score higher to climb"],
                    },
                    {
                      num: 3, name: "Connoisseur", sub: "Refined & Focused",
                      xp: "5,000 – 14,999 XP", color: "#9B59B6", glow: "rgba(155,89,182,0.28)",
                      badge: "", desc: "You appreciate complexity. You see what others overlook.",
                      skills: ["Identify flavor transitions", "Know aging & construction", "Compete at a higher level"],
                    },
                    {
                      num: 4, name: "Aficionado", sub: "The Ultimate Status",
                      xp: "15,000+ XP", color: "#D4820A", glow: "rgba(212,130,10,0.28)",
                      badge: "♛", desc: "You live the culture. You don't just smoke — you understand the leaf.",
                      skills: ["Master sensory analysis", "Lead & mentor others", "Top of the leaderboard"],
                    },
                  ].map((tier, i) => (
                    <div key={tier.name} style={{
                      display: "flex", flexDirection: "column",
                      borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none",
                      background: "rgba(0,0,0,0.22)",
                      padding: "20px 18px",
                      position: "relative", overflow: "hidden",
                    }}>
                      {/* Top glow accent */}
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${tier.color}AA, transparent)` }} />

                      {/* Badge circle */}
                      <div style={{ textAlign: "center", marginBottom: 12 }}>
                        <div style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 64, height: 64, borderRadius: "50%",
                          background: `radial-gradient(circle at 35% 30%, ${tier.color}44, rgba(0,0,0,0.70))`,
                          border: `2px solid ${tier.color}66`,
                          boxShadow: `0 0 28px ${tier.glow}, inset 0 1px 0 rgba(255,255,255,0.12)`,
                          fontSize: 28, position: "relative",
                        }}>
                          <span style={{ position: "absolute", top: -10, right: -10, width: 22, height: 22, borderRadius: "50%", background: tier.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#000", fontFamily: "'Inter',sans-serif" }}>{tier.num}</span>
                          {tier.badge}
                        </div>
                      </div>

                      {/* Name */}
                      <div style={{ textAlign: "center", marginBottom: 8 }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: "#F0E8D4", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 2 }}>{tier.name}</div>
                        <div style={{ fontSize: 12, letterSpacing: "0.22em", color: tier.color, fontWeight: 700, textTransform: "uppercase" }}>{tier.sub}</div>
                      </div>

                      {/* Desc */}
                      <p style={{ fontSize: 15, color: "rgba(240,232,212,0.48)", lineHeight: 1.55, textAlign: "center", margin: "0 0 14px" }}>{tier.desc}</p>

                      {/* Skills checklist */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                        {tier.skills.map(sk => (
                          <div key={sk} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <span style={{ color: tier.color, fontSize: 14, marginTop: 1, flexShrink: 0 }}>✓</span>
                            <span style={{ fontSize: 15, color: "rgba(240,232,212,0.58)", lineHeight: 1.4 }}>{sk}</span>
                          </div>
                        ))}
                      </div>

                      {/* XP range badge */}
                      <div style={{
                        marginTop: 16, textAlign: "center",
                        background: `${tier.color}18`,
                        border: `1px solid ${tier.color}44`,
                        borderRadius: 8, padding: "8px 10px",
                        fontSize: 16, fontWeight: 900, color: tier.color,
                        letterSpacing: "0.06em", fontFamily: "'Inter',sans-serif",
                      }}>
                        {tier.xp}
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Bottom Progress Bar ── */}
                <div style={{
                  flexShrink: 0,
                  background: "rgba(0,0,0,0.65)", backdropFilter: "blur(20px)",
                  borderTop: "1px solid rgba(212,175,55,0.14)",
                  padding: "14px 24px",
                  display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
                  gap: 20, alignItems: "center",
                }}>
                  {/* Your Progress */}
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: "radial-gradient(circle at 35% 30%, rgba(212,175,55,0.40), rgba(0,0,0,0.70))",
                      border: `2px solid ${GOLD}55`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20,
                    }}>🎩</div>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.30em", color: "rgba(240,232,212,0.35)", textTransform: "uppercase", marginBottom: 2 }}>Your Progress</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: GOLD, letterSpacing: "0.04em" }}>ENTHUSIAST</div>
                      <div style={{ fontSize: 15, color: "rgba(240,232,212,0.55)" }}>{profile.points} XP</div>
                    </div>
                  </div>
                  {/* Next Milestone */}
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: "0.28em", color: "rgba(240,232,212,0.32)", textTransform: "uppercase", marginBottom: 4 }}>Next Milestone</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "#F0E8D4" }}>
                      {Math.max(0, 1000 - profile.points)} <span style={{ fontSize: 14, color: "rgba(240,232,212,0.38)", fontWeight: 400 }}>XP</span>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(240,232,212,0.35)", letterSpacing: "0.12em", textTransform: "uppercase" }}>to reach Connoisseur</div>
                    <div style={{ marginTop: 6, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${Math.min(100, (profile.points / 1000) * 100)}%`, background: GOLD, borderRadius: 2, boxShadow: `0 0 8px ${GOLD}` }} />
                    </div>
                  </div>
                  {/* Earn Badges */}
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: "0.28em", color: "rgba(240,232,212,0.32)", textTransform: "uppercase", marginBottom: 8 }}>Earn Badges</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["","🕯","","♛"].map((b, i) => (
                        <div key={i} style={{
                          width: 36, height: 36, borderRadius: "50%", fontSize: 18,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: i === 0 ? "rgba(200,50,42,0.20)" : "rgba(255,255,255,0.06)",
                          border: i === 0 ? "1px solid rgba(200,50,42,0.50)" : "1px solid rgba(255,255,255,0.10)",
                          boxShadow: i === 0 ? "0 0 14px rgba(200,50,42,0.30)" : "none",
                        }}>{b}</div>
                      ))}
                    </div>
                  </div>
                  {/* Unlock Rewards */}
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: "0.28em", color: "rgba(240,232,212,0.32)", textTransform: "uppercase", marginBottom: 6 }}>Unlock Rewards</div>
                    <div style={{ fontSize: 14, color: "rgba(240,232,212,0.45)", lineHeight: 1.5 }}>Exclusive blends,<br />gear, and experiences<br />await...</div>
                  </div>
                  {/* CTA button */}
                  <motion.button type="button"
                    onPointerDown={() => go("leaderboard")}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      padding: "16px 28px",
                      background: `linear-gradient(135deg, ${GOLD} 0%, #B8920A 100%)`,
                      border: "none", borderRadius: 10,
                      color: "#080502", fontSize: 16, fontWeight: 900,
                      letterSpacing: "0.18em", textTransform: "uppercase",
                      cursor: "pointer", fontFamily: "'Inter',sans-serif",
                      boxShadow: `0 0 28px rgba(212,175,55,0.35), 0 6px 20px rgba(0,0,0,0.60)`,
                      whiteSpace: "nowrap",
                    }}>
                     View Leaderboard
                  </motion.button>
                </div>
              </div>

              {/* ── RIGHT: The Golden Cigar Box ── */}
              <div style={{
                borderLeft: "1px solid rgba(212,175,55,0.12)",
                background: "rgba(0,0,0,0.55)", backdropFilter: "blur(16px)",
                display: "flex", flexDirection: "column", overflow: "hidden",
              }}>
                <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 11, letterSpacing: "0.44em", color: `${GOLD}80`, fontWeight: 800, textTransform: "uppercase", marginBottom: 4 }}>The Golden</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#F0E8D4", letterSpacing: "0.12em", textTransform: "uppercase" }}>Cigar Box</div>
                </div>
                <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                  <img
                    src={IMG("golden_box.png")}
                    alt="The Golden Cigar Box"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  {/* Bottom fade */}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(0deg, rgba(0,0,0,0.80), transparent)" }} />
                  {/* Gold rim */}
                  <div style={{ position: "absolute", inset: 0, border: `1px solid ${GOLD}22`, pointerEvents: "none" }} />
                </div>
                <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(212,175,55,0.10)" }}>
                  <div style={{ fontSize: 13, color: "rgba(240,232,212,0.38)", lineHeight: 1.55, fontStyle: "italic" }}>
                    SmokeCraft 360 — Collector's Kiosk Edition
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════ LEADERBOARD — THE GOLDEN BOX ══════════════ */}
        {step === "leaderboard" && (
          <motion.div key="leaderboard" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
            style={{ position: "absolute", inset: "41px 0 0 0", display: "flex", overflow: "hidden" }}>

            {/* ── LEFT PANEL ── */}
            <div style={{
              width: 420, flexShrink: 0, display: "flex", flexDirection: "column",
              borderRight: "1px solid rgba(212,175,55,0.14)",
              background: "rgba(0,0,0,0.60)", backdropFilter: "blur(20px)",
              overflowY: "auto",
            }}>
              {/* Header area with golden box photo */}
              <div style={{ position: "relative", height: 160, flexShrink: 0, overflow: "hidden" }}>
                <img src={IMG("golden_box.png")} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.85) 100%)" }} />
                <div style={{ position: "absolute", bottom: 14, left: 0, right: 0, textAlign: "center" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 32, fontWeight: 700, color: GOLD, letterSpacing: "0.14em", textTransform: "uppercase", textShadow: `0 0 40px ${GOLD}66` }}>
                    The Golden Box
                  </div>
                  <div style={{ fontSize: 11, letterSpacing: "0.44em", color: "rgba(212,175,55,0.55)", textTransform: "uppercase", marginTop: 2 }}>
                    Compete. Learn. Ascend.
                  </div>
                </div>
              </div>

              {/* Tagline text */}
              <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontSize: 15, color: "rgba(240,232,212,0.45)", lineHeight: 1.60, margin: 0, textAlign: "center" }}>
                  The Golden Box is SmokeCraft 360's elite challenge system.<br />
                  Every decision you make affects your rank, reputation, and rewards.<br />
                  <span style={{ color: GOLD, fontStyle: "italic" }}>Study the leaf. Build wisely. Earn your place.</span>
                </p>
              </div>

              {/* Rules of Play */}
              <div style={{ padding: "16px 24px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 20, height: 1, background: `${GOLD}55` }} />
                  <span style={{ fontSize: 11, letterSpacing: "0.44em", color: GOLD, fontWeight: 800, textTransform: "uppercase" }}>Rules of Play</span>
                  <div style={{ flex: 1, height: 1, background: `${GOLD}22` }} />
                </div>
                {[
                  { icon: "◎", label: "Score Points", body: "Complete challenges, tasting rounds, mentor quizzes, and pairing decisions to earn XP." },
                  { icon: "", label: "Climb the Ranks", body: "Advance through the four official SmokeCraft stages and prove your mastery." },
                  { icon: "⬡", label: "Earn Badges", body: "Unlock exclusive achievement badges that represent your knowledge, skill, and prestige." },
                  { icon: "⬡", label: "Unlock Rewards", body: "Higher ranks unlock rare blends, VIP experiences, exclusive events, and premium gear." },
                  { icon: "⚠", label: "Penalties", body: "Poor decisions and incorrect selections may reduce your points. Not every move earns respect." },
                ].map((r, i) => (
                  <div key={r.label} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 18, color: i === 4 ? "#C8322A" : GOLD, flexShrink: 0, marginTop: 1 }}>{r.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#F0E8D4", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 3 }}>{r.label}</div>
                      <div style={{ fontSize: 14, color: "rgba(240,232,212,0.42)", lineHeight: 1.55 }}>{r.body}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Contest Levels compact list */}
              <div style={{ padding: "12px 24px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 20, height: 1, background: `${GOLD}55` }} />
                  <span style={{ fontSize: 11, letterSpacing: "0.44em", color: GOLD, fontWeight: 800, textTransform: "uppercase" }}>Contest Levels</span>
                  <div style={{ flex: 1, height: 1, background: `${GOLD}22` }} />
                </div>
                {[
                  { badge: "", name: "Novice",       sub: "The Beginning",      xp: "0 – 999 XP",          color: "#C8322A", desc: "Learn cigar basics, flavor recognition, and foundational pairing techniques." },
                  { badge: "🕯", name: "Enthusiast",   sub: "Fueled by Passion",  xp: "1,000 – 4,999 XP",   color: GOLD,      desc: "Understand regions, wrappers, construction, and pairing synergy." },
                  { badge: "", name: "Connoisseur",  sub: "Refined & Focused",  xp: "5,000 – 14,999 XP",  color: "#9B59B6", desc: "Recognize flavor transitions, aging, fermentation, and advanced blend structure." },
                  { badge: "♛",  name: "Aficionado",  sub: "The Ultimate Status", xp: "15,000+ XP",          color: "#D4820A", desc: "Master sensory analysis, pairing intelligence, cigar culture, and strategic competition." },
                ].map(t => (
                  <div key={t.name} style={{
                    display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 14,
                    padding: "12px 14px", borderRadius: 10,
                    background: "rgba(255,255,255,0.025)",
                    border: `1px solid ${t.color}22`,
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                      background: `radial-gradient(circle at 35% 30%, ${t.color}33, rgba(0,0,0,0.60))`,
                      border: `1.5px solid ${t.color}55`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                    }}>{t.badge}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: "#F0E8D4", letterSpacing: "0.08em", textTransform: "uppercase" }}>{t.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: t.color }}>{t.xp}</span>
                      </div>
                      <div style={{ fontSize: 11, color: t.color, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 4 }}>{t.sub}</div>
                      <div style={{ fontSize: 13, color: "rgba(240,232,212,0.40)", lineHeight: 1.45 }}>{t.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Golden Box Prize */}
              <div style={{
                margin: "12px 24px 24px",
                background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.28)",
                borderRadius: 12, padding: "14px 18px",
                display: "flex", gap: 14, alignItems: "center",
              }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: GOLD, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 4 }}>The Golden Box Prize</div>
                  <div style={{ fontSize: 13, color: "rgba(240,232,212,0.45)", lineHeight: 1.55 }}>
                    Reserved for top-ranking competitors. Inside: rare blends, exclusive gear, and experiences that can't be bought.
                  </div>
                </div>
                <motion.button type="button" onPointerDown={() => go("country_select")}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    flexShrink: 0, padding: "10px 16px",
                    background: "rgba(212,175,55,0.14)", border: `1px solid ${GOLD}55`,
                    borderRadius: 8, color: GOLD, fontSize: 13, fontWeight: 800,
                    letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer",
                    fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap",
                  }}>
                  View Prize Pool →
                </motion.button>
              </div>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

              {/* Rank status top bar */}
              <div style={{
                flexShrink: 0, display: "flex", alignItems: "stretch",
                background: "rgba(0,0,0,0.65)", backdropFilter: "blur(20px)",
                borderBottom: "1px solid rgba(212,175,55,0.14)",
              }}>
                {/* Your rank */}
                <div style={{ padding: "16px 28px", borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: "50%", flexShrink: 0,
                    background: "radial-gradient(circle at 35% 30%, rgba(212,175,55,0.38), rgba(0,0,0,0.70))",
                    border: `2px solid ${GOLD}55`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                  }}>🎩</div>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: "0.36em", color: "rgba(240,232,212,0.35)", textTransform: "uppercase", marginBottom: 2 }}>Your Rank</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: GOLD, letterSpacing: "0.06em" }}>ENTHUSIAST</div>
                    <div style={{ fontSize: 16, color: "rgba(240,232,212,0.60)", fontWeight: 600 }}>{profile.points.toLocaleString()} XP</div>
                  </div>
                </div>
                {/* Next rank */}
                <div style={{ padding: "16px 28px", borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.36em", color: "rgba(240,232,212,0.32)", textTransform: "uppercase", marginBottom: 4 }}>Next Rank</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#9B59B6", letterSpacing: "0.06em" }}>CONNOISSEUR</div>
                  <div style={{ fontSize: 14, color: "rgba(240,232,212,0.40)" }}>{Math.max(0, 5000 - profile.points).toLocaleString()} XP to go</div>
                  <div style={{ marginTop: 6, height: 3, width: 140, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${Math.min(100, (profile.points / 5000) * 100)}%`, background: "#9B59B6", borderRadius: 2 }} />
                  </div>
                </div>
                {/* Rewards */}
                <div style={{ padding: "16px 24px", borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(212,175,55,0.12)", border: `1px solid ${GOLD}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🎁</div>
                  <div style={{ fontSize: 10, letterSpacing: "0.28em", color: "rgba(240,232,212,0.35)", textTransform: "uppercase" }}>Rewards</div>
                </div>
                {/* Badges */}
                <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(212,175,55,0.12)", border: `1px solid ${GOLD}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}></div>
                  <div style={{ fontSize: 10, letterSpacing: "0.28em", color: "rgba(240,232,212,0.35)", textTransform: "uppercase" }}>Badges</div>
                </div>
                {/* Spacer + CTA */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 24px" }}>
                  <GoldBtn onClick={() => go("country_select")} style={{ padding: "14px 28px", fontSize: 16 }}>
                    SELECT MENTOR →
                  </GoldBtn>
                </div>
              </div>

              {/* Live Leaderboard table */}
              <div style={{ flex: 1, overflowY: "auto", padding: "0 0 24px" }}>
                {/* Table header */}
                <div style={{
                  position: "sticky", top: 0, zIndex: 10,
                  background: "rgba(8,5,2,0.95)", backdropFilter: "blur(12px)",
                  padding: "14px 28px 12px",
                  borderBottom: "1px solid rgba(212,175,55,0.12)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 8px #32B45A", flexShrink: 0 }} />
                    <span style={{ fontSize: 22, fontWeight: 900, color: "#F0E8D4", letterSpacing: "0.18em", textTransform: "uppercase" }}>Live Leaderboard</span>
                    <span style={{ fontSize: 12, color: "rgba(240,232,212,0.32)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
                      {getVenueLeaderboard("00000000-0000-0000-0000-000000000001").length > 0
                        ? `· ${getVenueLeaderboard("00000000-0000-0000-0000-000000000001").length} Live Guests Ranked`
                        : "· Updated Just Now"}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "52px 1fr 130px 110px 120px", gap: 0, padding: "0 4px" }}>
                    {["Rank","Contestant","Level","XP","Badges"].map(h => (
                      <div key={h} style={{ fontSize: 11, letterSpacing: "0.32em", color: "rgba(240,232,212,0.28)", textTransform: "uppercase", fontWeight: 800 }}>{h}</div>
                    ))}
                  </div>
                </div>

                {/* Rows */}
                {(() => {
                  type RowData = { rank: number; handle: string; real: string; xp: number; tier: string; badge: string; tColor: string; badges: string[]; extra: string };
                  const TIER_META: Record<string, { label: string; badge: string; color: string }> = {
                    beginner:   { label: "Novice",      badge: "",  color: "#C8322A" },
                    apprentice: { label: "Enthusiast",  badge: "🕯", color: GOLD },
                    blender:    { label: "Connoisseur", badge: "", color: "#9B59B6" },
                    master:     { label: "Aficionado",  badge: "♛",  color: "#D4820A" },
                    architect:  { label: "Aficionado",  badge: "♛",  color: "#D4820A" },
                  };
                  const DEMO: RowData[] = [
                    { rank: 1,  handle: "TheCigarLion",   real: "Alex Martinez",      xp: 18750, tier: "Aficionado",  badge: "♛",  tColor: "#D4820A", badges: ["♛","",""], extra: "+3" },
                    { rank: 2,  handle: "Aficionado_D",   real: "Darnell Washington", xp: 16420, tier: "Connoisseur", badge: "", tColor: "#9B59B6", badges: ["","🕯",""], extra: "+2" },
                    { rank: 3,  handle: "SmoothDraws",    real: "Marcus Tate",         xp: 14980, tier: "Connoisseur", badge: "", tColor: "#9B59B6", badges: ["","🕯",""], extra: "+4" },
                    { rank: 4,  handle: "Ash&Oak",        real: "Brandon Hill",        xp: 13250, tier: "Connoisseur", badge: "", tColor: "#9B59B6", badges: ["","🕯"],       extra: "+1" },
                    { rank: 5,  handle: "LeafScholar",    real: "Jasmine Cole",        xp: 12760, tier: "Connoisseur", badge: "", tColor: "#9B59B6", badges: ["♛",""],       extra: "+2" },
                    { rank: 6,  handle: "BourbonLeaf",    real: "Tyler Bennett",       xp: 10850, tier: "Enthusiast",  badge: "🕯", tColor: GOLD,      badges: ["♛",""],       extra: "+1" },
                    { rank: 7,  handle: "CigarSensei",    real: "Ethan Reynolds",      xp:  9430, tier: "Enthusiast",  badge: "🕯", tColor: GOLD,      badges: ["",""],       extra: "+2" },
                    { rank: 8,  handle: "PuffProfessor",  real: "Daniel Cooper",       xp:  8910, tier: "Enthusiast",  badge: "🕯", tColor: GOLD,      badges: ["",""],       extra: "+1" },
                    { rank: 9,  handle: "VintageVisions", real: "Robert King",         xp:  7650, tier: "Enthusiast",  badge: "🕯", tColor: GOLD,      badges: ["♛",""],       extra: "+2" },
                    { rank: 10, handle: "CedarRoomKing",  real: "Kevin Brooks",        xp:  6980, tier: "Enthusiast",  badge: "🕯", tColor: GOLD,      badges: [""],            extra: "+1" },
                  ];
                  const liveEntries = getVenueLeaderboard("00000000-0000-0000-0000-000000000001");
                  let rows: RowData[];
                  if (liveEntries.length > 0) {
                    const liveRows = liveEntries.map((e, idx) => {
                      const m = TIER_META[e.tier] ?? TIER_META.beginner;
                      const parts = e.name.split(" ");
                      const handle = parts.length > 1 ? `${parts[0]}${parts.slice(1).join("").charAt(0)}` : e.name;
                      return { rank: idx + 1, handle, real: e.name, xp: e.score, tier: m.label, badge: m.badge, tColor: m.color, badges: [] as string[], extra: "" };
                    });
                    rows = [...liveRows, ...DEMO.slice(liveRows.length)].slice(0, 10).map((r, idx) => ({ ...r, rank: idx + 1 }));
                  } else {
                    rows = DEMO;
                  }
                  return rows;
                })().map((row, i) => {
                  const isTop3 = row.rank <= 3;
                  const rankColor = row.rank === 1 ? GOLD : row.rank === 2 ? "#C0C0C0" : row.rank === 3 ? "#CD7F32" : "rgba(240,232,212,0.30)";
                  return (
                    <motion.div key={row.rank}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.32, ease: [0.22,1,0.36,1] }}
                      style={{
                        display: "grid", gridTemplateColumns: "52px 1fr 130px 110px 120px",
                        alignItems: "center", gap: 0,
                        padding: "12px 28px",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: isTop3 ? `rgba(212,175,55,${0.04 - i*0.01})` : "transparent",
                        transition: "background 0.2s",
                      }}>
                      {/* Rank */}
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: isTop3 ? `radial-gradient(circle at 35% 30%, ${rankColor}44, rgba(0,0,0,0.60))` : "rgba(255,255,255,0.05)",
                          border: isTop3 ? `2px solid ${rankColor}88` : "1px solid rgba(255,255,255,0.08)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: isTop3 ? 15 : 14, fontWeight: 900, color: rankColor,
                          boxShadow: isTop3 ? `0 0 16px ${rankColor}44` : "none",
                        }}>{row.rank}</div>
                      </div>
                      {/* Contestant */}
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                          background: `radial-gradient(circle at 35% 30%, ${row.tColor}33, rgba(0,0,0,0.55))`,
                          border: `1.5px solid ${row.tColor}44`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 16,
                        }}>🎩</div>
                        <div>
                          <div style={{ fontSize: 17, fontWeight: 800, color: "#F0E8D4", letterSpacing: "0.02em" }}>{row.handle}</div>
                          <div style={{ fontSize: 13, color: "rgba(240,232,212,0.35)" }}>{row.real}</div>
                        </div>
                      </div>
                      {/* Level */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: "50%",
                          background: `radial-gradient(circle at 35% 30%, ${row.tColor}33, rgba(0,0,0,0.55))`,
                          border: `1.5px solid ${row.tColor}55`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 14,
                        }}>{row.badge}</div>
                      </div>
                      {/* XP */}
                      <div style={{ fontSize: 17, fontWeight: 800, color: row.tColor, letterSpacing: "0.04em" }}>
                        {row.xp.toLocaleString()} XP
                      </div>
                      {/* Badges */}
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        {row.badges.map((b, bi) => (
                          <div key={bi} style={{
                            width: 26, height: 26, borderRadius: "50%", fontSize: 12,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)",
                          }}>{b}</div>
                        ))}
                        <span style={{ fontSize: 13, color: row.tColor, fontWeight: 700, marginLeft: 2 }}>{row.extra}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════ MENTOR ══════════════ */}
        {/* ══════════════ SEED CANVAS ══════════════ */}
        {step === "seed_canvas" && (() => {
          type Drink = { icon: string; label: string; category: string; desc: string; score: number };
          const INTEL: Record<string, {
            telemetry: { k: string; v: string; b: number }[];
            notes: string[];
            drinks: Drink[];
            warning: string;
            masterNote: string;
            descLong: string;
            meta: { origin: string; seedType: string; crop: string; aging: string };
          }> = {
            criollo: {
              telemetry: [
                { k: "Body",      v: "Medium-Full",           b: 72 },
                { k: "Nicotine",  v: "High",                  b: 78 },
                { k: "Burn Rate", v: "Slow / Even",           b: 38 },
                { k: "Aroma",     v: "Earth · Spice · Cedar", b: 80 },
                { k: "Finish",    v: "Long · Cocoa · Pepper", b: 75 },
              ],
              notes: ["Dark Chocolate","Cedar","Leather","Espresso","Black Pepper","Roasted Earth","Aged Oak","Cocoa Nib"],
              drinks: [
                { icon:"🥃", label:"Aged Bourbon",   category:"Whiskey",  score:95, desc:"Vanilla and caramel notes mirror Criollo's earth tone. The wood char bridges the spice beautifully." },
                { icon:"🥃", label:"Rye Whiskey",    category:"Whiskey",  score:88, desc:"Peppery rye grain amplifies Criollo's black pepper finish — a bold, layered combination." },
                { icon:"🥃", label:"Cognac VSOP",    category:"Brandy",   score:84, desc:"Dried fruit and floral esters round out Criollo's heavier earth profile with sophistication." },
                { icon:"🍷", label:"Dark Rum",       category:"Rum",      score:82, desc:"Molasses sweetness cuts through Criollo's leather without masking the spice complexity." },
                { icon:"☕", label:"Espresso",        category:"Coffee",   score:80, desc:"Roasted intensity echoes Criollo's dark chocolate notes. A ritual pairing of the highest order." },
                { icon:"🥃", label:"Añejo Tequila",  category:"Agave",    score:74, desc:"Barrel aging softens tequila's heat and introduces oak harmony with the Criollo wrapper." },
                { icon:"🍺", label:"Imperial Stout", category:"Beer",     score:66, desc:"Roasted malt and dark fruit offer a heavy-handed but capable companion to Criollo's strength." },
                { icon:"🥃", label:"Armagnac",       category:"Brandy",   score:60, desc:"A more rustic alternative to Cognac — earthy and assertive, a secondary option for bold palates." },
              ],
              warning: "Avoid overly sweet citrus pairings — they suppress the spice complexity and collapse the finish.",
              masterNote: "Criollo '98 rewards patience. The second third reveals the true spice architecture beneath the earth-toned opening.",
              descLong: "A premium Cuban-seed wrapper grown in the rich soils of the Dominican Republic. Known for its powerful yet refined character, deep complexity, and bold spice transitions.",
              meta: { origin: "D.R.", seedType: "Cuban", crop: "Priming", aging: "18–24 Months" },
            },
            corojo: {
              telemetry: [
                { k: "Body",      v: "Full",                  b: 95 },
                { k: "Nicotine",  v: "Very High",             b: 94 },
                { k: "Burn Rate", v: "Medium",                b: 55 },
                { k: "Aroma",     v: "Pepper · Oak · Spice",  b: 90 },
                { k: "Finish",    v: "Long · Pepper · Oak",   b: 88 },
              ],
              notes: ["Black Pepper","Cedar","Oak","Clove","Espresso","Dark Earth","Raw Tobacco","Charred Wood"],
              drinks: [
                { icon:"🥃", label:"Islay Single Malt", category:"Scotch",   score:96, desc:"Peat smoke and brine from Islay scotch create an almost confrontational but harmonious match with Corojo's intensity." },
                { icon:"🥃", label:"Aged Rum 18yr",     category:"Rum",      score:90, desc:"Long barrel aging softens rum's sweetness just enough to survive Corojo's full-body assault." },
                { icon:"🥃", label:"Cognac XO",         category:"Brandy",   score:86, desc:"XO-grade concentration provides structure and fruit complexity that balances Corojo's pepper dominance." },
                { icon:"🍷", label:"Mezcal Reposado",   category:"Agave",    score:82, desc:"Smoke-on-smoke intensity. Mezcal's agave oils amplify Corojo's deep earth and pepper architecture." },
                { icon:"☕", label:"Black Coffee",      category:"Coffee",   score:80, desc:"Pure, uncut roast bitterness matches Corojo stride for stride — no sweetness to get in the way." },
                { icon:"🍷", label:"Madeira Reserve",   category:"Fortified",score:74, desc:"Oxidative nuttiness and acidity provide a sharp contrast that momentarily tames Corojo's heat." },
                { icon:"🍺", label:"Baltic Porter",     category:"Beer",     score:68, desc:"Dark malt gravity and residual sweetness offer a momentary reprieve between Corojo's pepper waves." },
                { icon:"🥃", label:"Overproof Rum",     category:"Rum",      score:58, desc:"High-proof rum amplifies rather than moderates — only for those who seek maximum intensity." },
              ],
              warning: "Pair with robust spirits only — mild or sweet pairings are completely overwhelmed by Corojo's intensity.",
              masterNote: "Corojo demands a palate that can take the heat. The pepper never relents — but beneath it lies extraordinary oil complexity.",
              descLong: "A highly robust, oil-dense Vuelta Abajo cultivar. Renowned for intense peppery finishes and maximum natural oil yield — the benchmark of full-strength construction.",
              meta: { origin: "Cuba/HN", seedType: "Corojo", crop: "Priming", aging: "24–36 Months" },
            },
            connecticut: {
              telemetry: [
                { k: "Body",      v: "Mild",                      b: 22 },
                { k: "Nicotine",  v: "Low-Medium",                b: 28 },
                { k: "Burn Rate", v: "Fast / Smooth",             b: 78 },
                { k: "Aroma",     v: "Cream · Hay · Floral",      b: 45 },
                { k: "Finish",    v: "Smooth · Cream · Vanilla",  b: 40 },
              ],
              notes: ["Cream","Hay","Vanilla","Floral","Cedar","Light Toast","Sweet Butter","White Tea"],
              drinks: [
                { icon:"🥂", label:"Brut Champagne",  category:"Sparkling", score:96, desc:"Fine bubble acidity lifts Connecticut's creaminess into an extraordinarily refined tasting moment." },
                { icon:"🥃", label:"Light Bourbon",   category:"Whiskey",   score:88, desc:"Low rye content and gentle sweetness complement Connecticut's vanilla and cream without overpowering." },
                { icon:"🍵", label:"White Tea",       category:"Tea",       score:85, desc:"Floral, almost ephemeral character perfectly mirrors Connecticut's aromatic profile." },
                { icon:"🍵", label:"Green Tea",       category:"Tea",       score:82, desc:"Grassy freshness and vegetal notes align naturally with Connecticut's hay and floral dimensions." },
                { icon:"🥂", label:"Blanc de Blancs", category:"Sparkling", score:80, desc:"100% Chardonnay sparkle brings mineral elegance that elevates Connecticut's subtle complexity." },
                { icon:"☕", label:"Milk Coffee",     category:"Coffee",    score:74, desc:"Cream and steamed milk soften any bitterness while the caramel notes sync with vanilla finish." },
                { icon:"🍷", label:"Sauvignon Blanc", category:"Wine",      score:70, desc:"Citrus zest and herbaceous character add brightness without overwhelming the wrapper's delicacy." },
                { icon:"🥂", label:"Dry Rosé",        category:"Wine",      score:64, desc:"Berry notes and crisp acidity offer a gentle, summery complement — best in lighter sessions." },
              ],
              warning: "Never pair with bold spirits — they will completely obliterate the delicate creaminess this wrapper is celebrated for.",
              masterNote: "Connecticut Shade is deceptive in its subtlety. What seems simple reveals layers of creaminess, floral notes, and a seamless burn.",
              descLong: "Grown under cheesecloth shade canopies in the Connecticut River Valley. Prized for near-invisible veins, ultra-smooth draw, and the gold standard for premium wrapper aesthetics.",
              meta: { origin: "CT, USA", seedType: "Shade", crop: "Shade", aging: "12–18 Months" },
            },
          };
          const seed  = SEEDS.find(s => s.id === seedId) || SEEDS[0];
          const intel = INTEL[seedId] || INTEL.criollo;
          const FLAVOR_ICONS: Record<string, {sym:string;label:string}[]> = {
            criollo:     [{sym:"🌍",label:"EARTH"},{sym:"🌿",label:"CEDAR"},{sym:"🍫",label:"COCOA"},{sym:"🌶",label:"PEPPER"}],
            corojo:      [{sym:"🌶",label:"PEPPER"},{sym:"🌿",label:"CEDAR"},{sym:"⚡",label:"SPICE"},{sym:"🌳",label:"OAK"}],
            connecticut: [{sym:"🥛",label:"CREAM"},{sym:"🌾",label:"HAY"},{sym:"",label:"VANILLA"},{sym:"🌸",label:"FLORAL"}],
          };
          const RADAR_VALS: Record<string,number[]> = {
            criollo:     [90,60,20,15,30,75,80,85],
            corojo:      [80,70,10, 5,20,60,95,95],
            connecticut: [25,40,90,70,55,20,10,15],
          };
          const BODY_META: Record<string,{label:string;dots:number}> = {
            criollo:     {label:"MEDIUM TO FULL",dots:5},
            corojo:      {label:"FULL",           dots:7},
            connecticut: {label:"MILD",           dots:2},
          };
          const CMP_ROWS = [
            {id:"criollo",    name:"Criollo '98",       tag:"Balanced · Earthy · Rich Spice", s:70,f:80,b:38,sm:60},
            {id:"corojo",     name:"Corojo",            tag:"Bold · Peppery · Strong Finish",  s:95,f:90,b:55,sm:28},
            {id:"connecticut",name:"Connecticut Shade", tag:"Smooth · Creamy · Mild",          s:22,f:45,b:78,sm:92},
          ];
          const FLAGS: Record<string,string> = {criollo:"🇩🇴",corojo:"🇳🇮",connecticut:"🇺🇸"};
          const RLABELS = ["EARTH","WOOD","CREAM","SWEET","NUT","COCOA","PEPPER","SPICE"];
          const rv  = RADAR_VALS[seedId] || RADAR_VALS.criollo;
          const rA  = (i:number) => (i*2*Math.PI/8) - Math.PI/2;
          const RR=68, RC=90;
          const rGrid = (r:number) => rv.map((_,i)=>`${RC+RR*r*Math.cos(rA(i))},${RC+RR*r*Math.sin(rA(i))}`).join(" ");
          const rPoly = rv.map((v,i)=>`${RC+RR*(v/100)*Math.cos(rA(i))},${RC+RR*(v/100)*Math.sin(rA(i))}`).join(" ");
          const rAxes = rv.map((_,i)=>({x2:RC+RR*Math.cos(rA(i)),y2:RC+RR*Math.sin(rA(i))}));
          const rDots = rv.map((v,i)=>({cx:RC+RR*(v/100)*Math.cos(rA(i)),cy:RC+RR*(v/100)*Math.sin(rA(i))}));
          const rLbls = RLABELS.map((_,i)=>({x:RC+84*Math.cos(rA(i)),y:RC+84*Math.sin(rA(i))}));
          const fl  = FLAVOR_ICONS[seedId] || FLAVOR_ICONS.criollo;
          const bm  = BODY_META[seedId] || BODY_META.criollo;
          const cr  = CMP_ROWS.find(c=>c.id===seedId) || CMP_ROWS[0];
          const top2 = intel.drinks.slice(0,2);
          return (
          <motion.div key="seed_canvas" variants={PV} initial="enter" animate="active" exit="exit" transition={PT}
            style={{ position: "absolute", inset: "41px 0 0 0", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* ── 3-column body ── */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

              {/* LEFT: intro text */}
              <div style={{ width: "22%", flexShrink: 0, background: "rgba(5,3,1,0.97)", borderRight: "1px solid rgba(212,175,55,0.12)", display: "flex", flexDirection: "column", padding: "32px 24px 28px", overflowY: "auto" }}>
                <div style={{ fontSize: 11, letterSpacing: "0.40em", color: "rgba(212,175,55,0.55)", textTransform: "uppercase", fontWeight: 800, marginBottom: 12 }}>Leaf Education</div>
                <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 34, fontWeight: 700, color: "#F0E8D4", lineHeight: 1.15, marginBottom: 20 }}>
                  Understanding<br />the Tobacco<br />Leaf
                </div>
                <p style={{ fontSize: 14, color: "rgba(240,232,212,0.48)", lineHeight: 1.72, margin: "0 0 14px" }}>Every tobacco leaf contributes something different to the cigar experience.</p>
                <p style={{ fontSize: 14, color: "rgba(240,232,212,0.48)", lineHeight: 1.72, margin: "0 0 14px" }}>Some leaves bring strength and spice. Others create smoothness, aroma, sweetness, or balance.</p>
                <p style={{ fontSize: 14, color: "rgba(240,232,212,0.48)", lineHeight: 1.72, margin: 0 }}>Explore how each leaf shapes flavor, burn, body, and character.</p>
                <div style={{ flex: 1, minHeight: 20 }} />
                <div style={{ borderTop: "1px solid rgba(212,175,55,0.14)", paddingTop: 20, marginTop: 24 }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.34em", color: "rgba(212,175,55,0.55)", textTransform: "uppercase", fontWeight: 800, marginBottom: 10 }}>Why This Leaf Matters</div>
                  <AnimatePresence mode="wait">
                    <motion.div key={seedId + "_why"} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.30 }}>
                      <p style={{ fontSize: 13, color: "rgba(240,232,212,0.44)", lineHeight: 1.65, margin: "0 0 12px" }}>{intel.masterNote}</p>
                      <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 15, fontStyle: "italic", color: "rgba(212,175,55,0.45)", textAlign: "right" }}>Master Blenders of SmokeCraft</div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* CENTER: leaf photo + compare */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

                {/* Top: full-bleed leaf photo */}
                <div style={{ flex: "0 0 58%", position: "relative", overflow: "hidden" }}>
                  <AnimatePresence mode="sync">
                    <motion.img key={seedId + "_img2"}
                      src={IMG(SEED_PHOTOS[seedId] || "tobacco_criollo.png")} alt={seed.name}
                      initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.50, ease: [0.22, 1, 0.36, 1] }}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </AnimatePresence>
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(150deg,rgba(0,0,0,0.08) 0%,rgba(0,0,0,0.28) 38%,rgba(0,0,0,0.94) 100%)" }} />

                  {/* Bottom overlay: name + flavor icons + stats */}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 22px 18px", background: "linear-gradient(0deg,rgba(4,2,0,1) 0%,rgba(4,2,0,0.75) 55%,transparent 100%)" }}>
                    <AnimatePresence mode="wait">
                      <motion.div key={seedId + "_ovl"} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                        style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14 }}>

                        {/* Left: name + origin + flavor icons */}
                        <div>
                          <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 40, fontWeight: 700, color: "#F0E8D4", lineHeight: 1, marginBottom: 4 }}>{seed.name}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <span style={{ fontSize: 14 }}>{FLAGS[seedId] || "🌍"}</span>
                            <span style={{ fontSize: 12, letterSpacing: "0.26em", color: "rgba(212,175,55,0.65)", textTransform: "uppercase", fontWeight: 700 }}>{seed.origin}</span>
                          </div>
                          <div style={{ fontSize: 10, letterSpacing: "0.34em", color: "rgba(212,175,55,0.50)", textTransform: "uppercase", fontWeight: 800, marginBottom: 8 }}>Flavor Profile</div>
                          <div style={{ display: "flex", gap: 12 }}>
                            {fl.map(fi => (
                              <div key={fi.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(212,175,55,0.12)", border: "1.5px solid rgba(212,175,55,0.32)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{fi.sym}</div>
                                <span style={{ fontSize: 9, letterSpacing: "0.14em", color: "rgba(240,232,212,0.45)", textTransform: "uppercase", fontWeight: 700 }}>{fi.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Right: body + experience + best paired */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 220 }}>
                          <div>
                            <div style={{ fontSize: 10, letterSpacing: "0.32em", color: "rgba(212,175,55,0.55)", textTransform: "uppercase", fontWeight: 800, marginBottom: 5 }}>Body</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ display: "flex", gap: 3 }}>
                                {[1, 2, 3, 4, 5, 6, 7].map(d => (
                                  <div key={d} style={{ width: 10, height: 10, borderRadius: 2, background: d <= bm.dots ? GOLD : "rgba(255,255,255,0.10)", boxShadow: d <= bm.dots ? `0 0 5px ${GOLD}66` : "none" }} />
                                ))}
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#F0E8D4", letterSpacing: "0.06em" }}>{bm.label}</span>
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, letterSpacing: "0.32em", color: "rgba(212,175,55,0.55)", textTransform: "uppercase", fontWeight: 800, marginBottom: 3 }}>Experience</div>
                            <p style={{ fontSize: 12, color: "rgba(240,232,212,0.48)", lineHeight: 1.55, margin: 0, maxWidth: 200 }}>{intel.descLong.slice(0, 82)}…</p>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, letterSpacing: "0.32em", color: "rgba(212,175,55,0.55)", textTransform: "uppercase", fontWeight: 800, marginBottom: 6 }}>Best Paired With</div>
                            <div style={{ display: "flex", gap: 7 }}>
                              {top2.map(d => (
                                <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(212,175,55,0.10)", border: "1px solid rgba(212,175,55,0.22)", borderRadius: 7, padding: "5px 9px" }}>
                                  <span style={{ fontSize: 13 }}>{d.icon}</span>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(240,232,212,0.70)" }}>{d.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>

                {/* Bottom: Compare to other leaves */}
                <div style={{ flex: 1, background: "rgba(4,2,0,0.99)", borderTop: "1px solid rgba(212,175,55,0.14)", padding: "14px 18px", overflowY: "auto" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(212,175,55,0.16)" }} />
                    <span style={{ fontSize: 10, letterSpacing: "0.40em", color: "rgba(212,175,55,0.50)", textTransform: "uppercase", fontWeight: 800 }}>Compare to Other Leaves</span>
                    <div style={{ flex: 1, height: 1, background: "rgba(212,175,55,0.16)" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                    {CMP_ROWS.map(cs => {
                      const act = cs.id === seedId;
                      return (
                        <motion.button key={cs.id} type="button" onPointerDown={() => setSeedId(cs.id)} whileTap={{ scale: 0.97 }}
                          animate={{ background: act ? "rgba(212,175,55,0.13)" : "rgba(255,255,255,0.025)" }}
                          style={{ border: `1.5px solid ${act ? GOLD + "66" : "rgba(255,255,255,0.07)"}`, cursor: "pointer", borderRadius: 10, padding: "12px 14px", textAlign: "left", fontFamily: "'Inter',sans-serif", display: "flex", gap: 10, alignItems: "flex-start", transition: "border-color 0.20s" }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: act ? `radial-gradient(circle at 35% 30%,${GOLD}44,rgba(0,0,0,0.65))` : "rgba(255,255,255,0.06)", border: `1.5px solid ${act ? GOLD + "66" : "rgba(255,255,255,0.10)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🍃</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: act ? GOLD : "#F0E8D4", marginBottom: 1 }}>{cs.name}</div>
                            <div style={{ fontSize: 11, color: "rgba(240,232,212,0.36)", marginBottom: 8 }}>{cs.tag}</div>
                            {([{ l: "STRENGTH", v: cs.s }, { l: "FLAVOR", v: cs.f }, { l: "BURN", v: cs.b }, { l: "SMOOTHNESS", v: cs.sm }]).map(row => (
                              <div key={row.l} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: 9, letterSpacing: "0.14em", color: "rgba(240,232,212,0.30)", textTransform: "uppercase", width: 64, flexShrink: 0 }}>{row.l}</span>
                                <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2 }}>
                                  <motion.div key={cs.id + row.l + seedId} initial={{ width: 0 }} animate={{ width: `${row.v}%` }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                                    style={{ height: "100%", background: act ? `linear-gradient(90deg,${GOLD}88,${GOLD})` : "rgba(212,175,55,0.40)", borderRadius: 2 }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT: radar + bars */}
              <div style={{ width: "24%", flexShrink: 0, background: "rgba(5,3,1,0.97)", borderLeft: "1px solid rgba(212,175,55,0.12)", display: "flex", flexDirection: "column", padding: "18px 16px", overflowY: "auto" }}>

                {/* Mini cigar photo */}
                <div style={{ width: "100%", height: 86, borderRadius: 9, overflow: "hidden", marginBottom: 16, flexShrink: 0, position: "relative" }}>
                  <img src={IMG("cigar_hero.png")} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.48)" }} />
                  <div style={{ position: "absolute", top: 8, right: 10, fontSize: 9, letterSpacing: "0.26em", color: "rgba(212,175,55,0.70)", fontWeight: 800, textTransform: "uppercase", textAlign: "right", lineHeight: 1.5 }}>SMOKECRAFT 360<br />KIOSK EDITION</div>
                </div>

                <div style={{ fontSize: 10, letterSpacing: "0.34em", color: "rgba(212,175,55,0.55)", textTransform: "uppercase", fontWeight: 800, textAlign: "center", marginBottom: 12 }}>Flavor &amp; Aroma Spectrum</div>

                {/* Radar SVG */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                  <AnimatePresence mode="wait">
                    <motion.svg key={seedId + "_radar"} width="176" height="176" viewBox="0 0 180 180"
                      initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}>
                      {[0.25, 0.50, 0.75, 1.0].map(r => (
                        <polygon key={r} points={rGrid(r)} fill="none" stroke="rgba(212,175,55,0.15)" strokeWidth="1" />
                      ))}
                      {rAxes.map((ax, i) => (
                        <line key={i} x1={RC} y1={RC} x2={ax.x2} y2={ax.y2} stroke="rgba(212,175,55,0.18)" strokeWidth="1" />
                      ))}
                      <polygon points={rPoly} fill="rgba(212,175,55,0.18)" stroke={GOLD} strokeWidth="1.5" />
                      {rDots.map((d, i) => <circle key={i} cx={d.cx} cy={d.cy} r="3" fill={GOLD} />)}
                      {rLbls.map((p, i) => (
                        <text key={i} x={p.x} y={p.y} fontSize="8" fill="rgba(212,175,55,0.60)" textAnchor="middle" dominantBaseline="central" fontWeight="700" letterSpacing="0.5" fontFamily="'Inter',sans-serif">{RLABELS[i]}</text>
                      ))}
                    </motion.svg>
                  </AnimatePresence>
                </div>

                {/* Smoke Density */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                    <span style={{ fontSize: 13 }}></span>
                    <span style={{ fontSize: 10, letterSpacing: "0.28em", color: "rgba(212,175,55,0.55)", textTransform: "uppercase", fontWeight: 800 }}>Smoke Density</span>
                  </div>
                  <div style={{ height: 7, background: "rgba(255,255,255,0.07)", borderRadius: 4, overflow: "hidden" }}>
                    <motion.div key={seedId + "_sd"} initial={{ width: 0 }} animate={{ width: `${cr.s}%` }} transition={{ duration: 0.50, ease: [0.22, 1, 0.36, 1] }}
                      style={{ height: "100%", background: `linear-gradient(90deg,${GOLD}66,${GOLD})`, boxShadow: `0 0 8px ${GOLD}55` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: 9, color: "rgba(240,232,212,0.28)", letterSpacing: "0.12em", textTransform: "uppercase" }}>LIGHT</span>
                    <span style={{ fontSize: 9, color: "rgba(240,232,212,0.28)", letterSpacing: "0.12em", textTransform: "uppercase" }}>DENSE</span>
                  </div>
                </div>

                {/* Burn Speed */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                    <span style={{ fontSize: 13 }}>🕯</span>
                    <span style={{ fontSize: 10, letterSpacing: "0.28em", color: "rgba(212,175,55,0.55)", textTransform: "uppercase", fontWeight: 800 }}>Burn Speed</span>
                  </div>
                  <div style={{ height: 7, background: "rgba(255,255,255,0.07)", borderRadius: 4, overflow: "hidden" }}>
                    <motion.div key={seedId + "_bs"} initial={{ width: 0 }} animate={{ width: `${cr.b}%` }} transition={{ duration: 0.50, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                      style={{ height: "100%", background: `linear-gradient(90deg,${GOLD}66,${GOLD})`, boxShadow: `0 0 8px ${GOLD}55` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: 9, color: "rgba(240,232,212,0.28)", letterSpacing: "0.12em", textTransform: "uppercase" }}>SLOW</span>
                    <span style={{ fontSize: 9, color: "rgba(240,232,212,0.28)", letterSpacing: "0.12em", textTransform: "uppercase" }}>FAST</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Bottom nav bar ── */}
            <div style={{ flexShrink: 0, background: "rgba(3,2,0,1)", borderTop: "1px solid rgba(212,175,55,0.18)", display: "flex", height: 62 }}>
              <div style={{ flex: 1, display: "flex" }}>
                {[
                  { id: "leaf_ed", label: "LEAF EDUCATION",   sym: "🍃" },
                  { id: "blend",   label: "BLENDING JOURNEY", sym: "🔬" },
                  { id: "pairing", label: "PAIRING GUIDE",    sym: "🍷" },
                  { id: "profile", label: "MY PROFILE",       sym: "👤" },
                ].map(tab => {
                  const act = seedTab === tab.id;
                  return (
                    <motion.button key={tab.id} type="button" onPointerDown={() => setSeedTab(tab.id)} whileTap={{ scale: 0.97 }}
                      style={{ flex: 1, border: "none", cursor: "pointer", background: act ? "rgba(212,175,55,0.09)" : "transparent", borderBottom: act ? `2.5px solid ${GOLD}` : "2.5px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "'Inter',sans-serif", transition: "background 0.18s,border-color 0.18s" }}>
                      <span style={{ fontSize: 15 }}>{tab.sym}</span>
                      <span style={{ fontSize: 11, fontWeight: act ? 800 : 500, letterSpacing: "0.16em", color: act ? GOLD : "rgba(240,232,212,0.32)", textTransform: "uppercase" }}>{tab.label}</span>
                    </motion.button>
                  );
                })}
              </div>
              <motion.button type="button" onPointerDown={() => go("quiz")} whileTap={{ scale: 0.97 }}
                style={{ flexShrink: 0, padding: "0 32px", background: `linear-gradient(135deg,${GOLD} 0%,#B8920A 100%)`, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 800, color: "#0A0600", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "'Inter',sans-serif", boxShadow: `-4px 0 28px rgba(212,175,55,0.22)` }}>
                CONTINUE JOURNEY <span style={{ fontSize: 17 }}>→</span>
              </motion.button>
            </div>
          </motion.div>
          );
        })()}

        {/* ══════════════ QUIZ ══════════════ */}
        {step === "quiz" && (
          <Split key="quiz"
            leftFr="0.85fr" rightFr="1.15fr"
            left={
              <LeftPanel
                eyebrow="Step 1.6 · Blind Identification Test"
                headline={`Identify\nthe Leaf`}
                sub="Study what you've learned. No hints. Each wrong answer costs 2 pts from your session total."
              />
            }
            right={
              <RightPanel>
                {/* Progress */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <Eyebrow style={{ margin: 0 }}>Question {qIdx + 1} of {QUIZ.length}</Eyebrow>
                  <span style={{ color: `${GOLD}80`, fontSize: 15, fontWeight: 800 }}>{Math.round((qIdx / QUIZ.length) * 100)}%</span>
                </div>
                <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, marginBottom: 32 }}>
                  <motion.div animate={{ width: `${(qIdx / QUIZ.length) * 100}%` }} transition={{ duration: 0.4 }}
                    style={{ height: "100%", background: GOLD, borderRadius: 3, boxShadow: `0 0 12px ${GOLD}66` }} />
                </div>

                <AnimatePresence mode="wait">
                  <motion.div key={qIdx}
                    initial={{ opacity: 0, x: 38 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -28 }}
                    transition={{ type: "spring", mass: 0.8, stiffness: 280, damping: 26 }}>
                    <h2 style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 400, color: "#F0E8D4",
                      margin: "0 0 28px", lineHeight: 1.35,
                    }}>{QUIZ[qIdx].q}</h2>

                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {QUIZ[qIdx].opts.map((opt, oi) => {
                        const done = answered.includes(qIdx);
                        const correct = oi === QUIZ[qIdx].correct;
                        return (
                          <motion.button key={oi} type="button"
                            onPointerDown={() => !done && answerQuiz(oi)}
                            whileTap={done ? {} : { scale: 0.985 }}
                            animate={
                              done && correct ? { background: "rgba(50,180,90,0.18)", borderColor: "#32B45A" } :
                              done && wrongFlash && !correct ? { background: "rgba(200,50,42,0.14)", borderColor: "#C8322A" } : {}
                            }
                            style={{
                              padding: "20px 24px",
                              background: "rgba(255,255,255,0.028)", backdropFilter: "blur(14px)",
                              border: "1px solid rgba(255,255,255,0.09)", borderRadius: 13,
                              color: "#F0E8D4", fontSize: 24, fontWeight: 500, textAlign: "left",
                              cursor: done ? "default" : "pointer", fontFamily: "'Inter', sans-serif",
                              display: "flex", alignItems: "center", gap: 18,
                              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 10px rgba(0,0,0,0.30)",
                              transition: "background 0.22s, border-color 0.22s",
                            }}>
                            <span style={{
                              width: 36, height: 36, borderRadius: "50%",
                              background: "rgba(212,175,55,0.08)", border: `1px solid ${GOLD}33`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 13, fontWeight: 900, color: GOLD, flexShrink: 0,
                            }}>{String.fromCharCode(65 + oi)}</span>
                            {opt}
                          </motion.button>
                        );
                      })}
                    </div>
                    <p style={{ color: "rgba(200,50,42,0.65)", fontSize: 20, margin: "18px 0 0", letterSpacing: "0.04em" }}>
                      Wrong answer = −{QUIZ[qIdx].pen} pts from your session total
                    </p>
                  </motion.div>
                </AnimatePresence>
              </RightPanel>
            }
          />
        )}

        {/* ══════════════ POS GATE ══════════════ */}
        {step === "posgate" && (
          <Split key="posgate"
            leftFr="1fr" rightFr="1fr"
            left={
              <LeftPanel
                eyebrow="Session 1 · Complete"
                headline={`Seeds\nPrimed`}
                sub={`Current session score: ${profile.points} pts. Your rank is live on the wall display.`}
              />
            }
            right={
              <RightPanel>
                <div style={{ fontSize: 64, marginBottom: 20 }}>🌱</div>
                <Eyebrow>Session 1 Complete</Eyebrow>
                <SectionTitle>Enter Receipt Code</SectionTitle>
                <p style={{ color: "rgba(240,232,212,0.52)", fontSize: 24, lineHeight: 1.60, marginBottom: 28 }}>
                  Present your table receipt to your server. They will provide a 4–6 character code to unlock Session 2: the Terroir Matrix.
                </p>
                <GoldBtn onClick={() => setShowPOS(true)} fullWidth>ENTER RECEIPT CODE →</GoldBtn>
                <div style={{ marginTop: 28 }}>
                  <CheatCodeEngine />
                </div>
              </RightPanel>
            }
          />
        )}

      </AnimatePresence>
      {showPOS && <POSGateModal onUnlock={handlePOSUnlock} />}
    </div>
  );
}

/* ── Tiny shared components ── */
function Eyebrow({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: 10, letterSpacing: "0.50em", textTransform: "uppercase", color: `${GOLD}77`, fontWeight: 800, marginBottom: 10, ...style }}>
      {children}
    </div>
  );
}
function SectionTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <h2 style={{
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      fontSize: "clamp(32px, 3.8vw, 52px)", fontWeight: 300, color: "#F0E8D4",
      margin: "0 0 28px", letterSpacing: "0.04em", lineHeight: 1.05,
      textShadow: "0 0 40px rgba(212,175,55,0.08)",
      ...style,
    }}>
      {children}
    </h2>
  );
}
function GoldBtn({ children, disabled, onClick, fullWidth, style }: {
  children: React.ReactNode; disabled?: boolean; onClick?: () => void; fullWidth?: boolean; style?: React.CSSProperties;
}) {
  return (
    <motion.button type="button" onPointerDown={!disabled ? onClick : undefined} whileTap={!disabled ? { scale: 0.97 } : {}}
      style={{
        width: fullWidth ? "100%" : undefined,
        padding: "24px 32px",
        background: disabled
          ? "rgba(255,255,255,0.055)"
          : `linear-gradient(135deg, ${GOLD} 0%, #BF9800 52%, #9A7A14 100%)`,
        border: disabled ? "1px solid rgba(255,255,255,0.09)" : "none",
        borderRadius: 14,
        color: disabled ? "rgba(255,255,255,0.24)" : "#060400",
        fontSize: 18, fontWeight: 900, letterSpacing: "0.26em", textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif",
        boxShadow: disabled ? "none" : `0 0 40px rgba(212,175,55,0.24), 0 8px 30px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.22)`,
        position: "relative", overflow: "hidden", transition: "all 0.22s",
        ...style,
      }}>
      {!disabled && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "52%", background: "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, transparent 100%)", borderRadius: "14px 14px 0 0" }} />
      )}
      {children}
    </motion.button>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 14 }}>{children}</div>;
}
function BigInput({ ph, val, fn, type = "text", extra, maxLen }: {
  ph: string; val: string; fn: (v: string) => void; type?: string; extra?: React.CSSProperties; maxLen?: number;
}) {
  return (
    <input type={type} value={val} onChange={e => fn(e.target.value)} placeholder={ph} maxLength={maxLen}
      style={{
        flex: 1, padding: "22px 22px",
        background: "rgba(255,255,255,0.040)",
        border: "1.5px solid rgba(212,175,55,0.20)",
        borderRadius: 13, color: "#F0E8D4",
        fontSize: 24, fontWeight: 700, letterSpacing: "0.06em",
        fontFamily: "'Inter', sans-serif", outline: "none",
        boxShadow: "inset 0 2px 8px rgba(0,0,0,0.42), 0 1px 0 rgba(255,255,255,0.04)",
        boxSizing: "border-box",
        ...extra,
      }} />
  );
}
