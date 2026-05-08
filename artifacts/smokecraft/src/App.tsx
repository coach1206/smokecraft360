import React, { useState, useEffect, useRef, useCallback } from 'react';
import TitanCraftDeck from '@/pages/TitanCraftDeck';

/* ═══════════════════════════════════════════════════════════════
   AXIOM OS — 7-PHASE SOVEREIGN BOOT FLOW
   Master State Engine · No menus · No buttons · No dashboards
═══════════════════════════════════════════════════════════════ */

type Phase =
  | 'void'         // 0–3s   black void + gold particle
  | 'materialize'  // 3–7s   PROFOUND INNOVATIONS emergence
  | 'calibrate'    // 7–11s  intelligence ring + telemetry
  | 'environment'  // 11s+   2×2 live craft terminal
  | 'immersion'    // dwell  single craft consumes screen
  | 'eeis'         // staff  gold wireframe intelligence layer
  | 'recap';       // end    session discoveries cinematic

const CRAFT_DATA: Record<string, { name: string; color: string; glow: string; img: string; tagline: string }> = {
  smoke: { name: 'SMOKECRAFT',  color: '#c8860a', glow: 'rgba(200,134,10,0.45)',  img: '/images/scenes/smokecraft-card.jpg', tagline: 'Aged Leaf · Warm Ember · Sovereign Smoke' },
  pour:  { name: 'POURCRAFT',   color: '#d4af37', glow: 'rgba(212,175,55,0.45)',  img: '/images/scenes/pourcraft-card.jpg',  tagline: 'Single Malt · Crystal Glass · Liquid Gold' },
  brew:  { name: 'BREWCRAFT',   color: '#b87333', glow: 'rgba(184,115,51,0.45)',  img: '/images/scenes/brewcraft-card.jpg',  tagline: 'Cold Craft · Copper Warmth · Fresh Pour' },
  vape:  { name: 'VAPECRAFT',   color: '#8b5cf6', glow: 'rgba(139,92,246,0.45)', img: '/images/scenes/vapecraft-card.jpg',  tagline: 'Vapor Drift · Kinetic Haze · Neon Atmosphere' },
};

/* ── PHASE 1: THE VOID ─────────────────────────────────────── */
function PhaseVoid({ progress }: { progress: number }) {
  return (
    <div style={fullBleed('#000')}>
      <div style={{
        width: 2, height: 2, borderRadius: '50%',
        background: '#d4af37',
        boxShadow: `0 0 ${8 + progress * 40}px ${2 + progress * 20}px rgba(212,175,55,${0.3 + progress * 0.5})`,
        animation: 'axiom-breathe 2s ease-in-out infinite',
      }} />
    </div>
  );
}

/* ── PHASE 2: MATERIALIZATION ──────────────────────────────── */
function PhaseMaterialize({ progress }: { progress: number }) {
  const p = Math.min(1, progress);
  return (
    <div style={fullBleed('#000')}>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        {/* Smoked titanium depth layer */}
        <div style={{
          position: 'absolute', inset: '-40px -60px',
          background: `radial-gradient(ellipse, rgba(212,175,55,${0.04 * p}) 0%, transparent 70%)`,
          filter: 'blur(20px)',
        }} />
        {/* Edge reflection bars */}
        <div style={{
          position: 'absolute', top: 0, left: `-${60 - p * 60}px`, right: `-${60 - p * 60}px`,
          height: 1, background: `linear-gradient(90deg,transparent,rgba(212,175,55,${p * 0.6}),transparent)`,
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: `-${60 - p * 60}px`, right: `-${60 - p * 60}px`,
          height: 1, background: `linear-gradient(90deg,transparent,rgba(212,175,55,${p * 0.4}),transparent)`,
        }} />
        {/* PROFOUND INNOVATIONS — cinematic materialization */}
        <div style={{
          fontSize: 'clamp(10px,2.2vw,28px)',
          fontWeight: 300,
          letterSpacing: `${0.6 - p * 0.3}em`,
          fontFamily: 'monospace',
          color: `rgba(255,249,230,${p})`,
          textShadow: `0 0 ${p * 60}px rgba(212,175,55,${p * 0.8}), 0 0 ${p * 120}px rgba(212,175,55,${p * 0.3})`,
          transform: `scale(${0.88 + p * 0.12})`,
          transition: 'all 0.1s linear',
          filter: `blur(${(1 - p) * 8}px)`,
          marginBottom: 12,
        }}>
          PROFOUND INNOVATIONS
        </div>
        {/* Scan line sweeping across */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${p * 110 - 5}%`,
          width: 2,
          background: `linear-gradient(180deg,transparent,rgba(212,175,55,${p * 0.7}),transparent)`,
          filter: 'blur(1px)',
          transition: 'left 0.05s linear',
        }} />
        {/* Powered by */}
        <div style={{
          fontSize: 'clamp(7px,1.1vw,13px)',
          letterSpacing: '0.5em',
          fontFamily: 'monospace',
          color: `rgba(212,175,55,${Math.max(0, p - 0.6) * 2.5})`,
          marginTop: 8,
        }}>
          POWERED BY AXIOM OS
        </div>
      </div>
    </div>
  );
}

/* ── PHASE 3: CALIBRATION ──────────────────────────────────── */
const TELEMETRY_LINES = [
  'VENUE_SYNC .............. ACTIVE',
  'GUEST_CONTINUITY ........ STABLE',
  'INTELLIGENCE_MESH ....... ONLINE',
  'SENSORY_SYSTEMS ......... ARMED',
  'ENVIRONMENTAL_CORE ...... ENGAGED',
  'REVENUE_ENGINE .......... LIVE',
];

function PhaseCalibrate({ progress }: { progress: number }) {
  const p = Math.min(1, progress);
  const R = 90;
  return (
    <div style={fullBleed('#000')}>
      {/* Intelligence Ring */}
      <div style={{ position: 'relative', width: 220, height: 220, marginBottom: 32 }}>
        <svg width="220" height="220" style={{ position: 'absolute', inset: 0 }}>
          {/* Outer ring */}
          <circle cx="110" cy="110" r={R} stroke="rgba(212,175,55,0.18)" strokeWidth="0.5" fill="none" />
          {/* Rotating arc */}
          <circle cx="110" cy="110" r={R} stroke="#d4af37" strokeWidth="1.5" fill="none"
            strokeDasharray={`${p * 200} ${2 * Math.PI * R}`}
            strokeLinecap="round"
            style={{ transformOrigin: '110px 110px', animation: 'axiom-ring-spin 3s linear infinite' }} />
          {/* Inner pulse ring */}
          <circle cx="110" cy="110" r={R - 12} stroke="rgba(212,175,55,0.08)" strokeWidth="0.5" fill="none" />
          {/* AI resonance dots */}
          {[0, 60, 120, 180, 240, 300].map((deg, i) => {
            const rad = (deg - 90) * Math.PI / 180;
            const x = 110 + R * Math.cos(rad);
            const y = 110 + R * Math.sin(rad);
            return (
              <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 3 : 1.5}
                fill="#d4af37"
                opacity={p > i * 0.15 ? (i % 3 === 0 ? 0.9 : 0.4) : 0}
                style={{ animation: `axiom-breathe ${1.5 + i * 0.2}s ease-in-out infinite` }} />
            );
          })}
        </svg>
        {/* Center content */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 4,
        }}>
          <div style={{ fontSize: 11, letterSpacing: '0.4em', fontFamily: 'monospace',
            background: GOLD_GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            opacity: p, fontWeight: 900 }}>AXIOM OS</div>
          <div style={{ fontSize: 8, letterSpacing: '0.25em', color: 'rgba(212,175,55,0.5)',
            fontFamily: 'monospace', opacity: p }}>CALIBRATING</div>
        </div>
      </div>
      {/* Telemetry lines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 320 }}>
        {TELEMETRY_LINES.map((line, i) => (
          <div key={i} style={{
            fontSize: 9, letterSpacing: '0.18em', fontFamily: 'monospace',
            color: '#d4af37', opacity: p > (i + 1) / TELEMETRY_LINES.length ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── PHASE 4 WRAPPER: ENVIRONMENT + DWELL ──────────────────── */
const HOVER_CRAFTS = ['smoke', 'pour', 'brew', 'vape'];

function PhaseEnvironment({
  onDwell, onEEIS, entering,
}: {
  onDwell: (craft: string) => void;
  onEEIS: () => void;
  entering: boolean;
}) {
  const dwellRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const startDwell = useCallback((craft: string) => {
    setHovered(craft);
    dwellRef.current = setTimeout(() => onDwell(craft), 1500);
  }, [onDwell]);

  const cancelDwell = useCallback(() => {
    setHovered(null);
    if (dwellRef.current) clearTimeout(dwellRef.current);
  }, []);

  const startEEIS = useCallback(() => {
    pressRef.current = setTimeout(onEEIS, 3000);
  }, [onEEIS]);

  const cancelEEIS = useCallback(() => {
    if (pressRef.current) clearTimeout(pressRef.current);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, opacity: entering ? 0 : 1, transition: 'opacity 1.2s ease' }}>
      {/* The locked TitanCraftDeck */}
      <TitanCraftDeck />

      {/* Dwell detection zones — invisible 2×2 overlay */}
      <div style={{
        position: 'fixed',
        top: 36, left: 84, right: 72, bottom: 36,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        zIndex: 200,
        pointerEvents: 'auto',
      }}>
        {HOVER_CRAFTS.map(craft => (
          <div key={craft}
            onMouseEnter={() => startDwell(craft)}
            onMouseLeave={cancelDwell}
            onTouchStart={() => startDwell(craft)}
            onTouchEnd={cancelDwell}
            style={{ position: 'relative', cursor: 'none' }}
          >
            {/* Dwell progress ring */}
            {hovered === craft && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                width: 48, height: 48,
                border: '1.5px solid rgba(212,175,55,0.6)',
                borderRadius: '50%',
                animation: 'axiom-dwell-ring 1.5s linear forwards',
                pointerEvents: 'none',
                zIndex: 210,
              }} />
            )}
          </div>
        ))}
      </div>

      {/* EEIS hidden trigger — long-press on left panel area */}
      <div
        onMouseDown={startEEIS}
        onMouseUp={cancelEEIS}
        onTouchStart={startEEIS}
        onTouchEnd={cancelEEIS}
        style={{
          position: 'fixed', top: 36, left: 0, width: 84, bottom: 36,
          zIndex: 300, cursor: 'default',
        }}
      />
    </div>
  );
}

/* ── PHASE 4b: IMMERSION ────────────────────────────────────── */
function PhaseImmersion({ craft, onExit }: { craft: string; onExit: () => void }) {
  const c = CRAFT_DATA[craft];
  useEffect(() => {
    const t = setTimeout(onExit, 12000); // auto-return after 12s
    return () => clearTimeout(t);
  }, [onExit]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, cursor: 'pointer' }} onClick={onExit}>
      <img src={c.img} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', objectPosition: '50% 20%',
        filter: 'brightness(0.6) saturate(1.3)',
      }} alt="" />
      {/* Atmosphere color wash */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at center, ${c.glow} 0%, rgba(0,0,0,0.7) 100%)`,
        animation: 'axiom-breathe-slow 4s ease-in-out infinite',
      }} />
      {/* Craft identity */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        animation: 'axiom-fadein 1s ease forwards',
      }}>
        <div style={{
          fontSize: 'clamp(28px,6vw,72px)', fontWeight: 900,
          letterSpacing: '0.5em', fontFamily: 'monospace',
          color: c.color,
          textShadow: `0 0 40px ${c.glow}, 0 0 80px ${c.glow}`,
        }}>{c.name}</div>
        <div style={{
          fontSize: 'clamp(9px,1.4vw,14px)', letterSpacing: '0.4em',
          color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace',
        }}>{c.tagline}</div>
        <div style={{
          marginTop: 32, fontSize: 9, letterSpacing: '0.3em',
          color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace',
          animation: 'axiom-pulse 2s ease-in-out infinite',
        }}>TAP TO RETURN</div>
      </div>
    </div>
  );
}

/* ── PHASE 5: EEIS INTELLIGENCE LAYER ──────────────────────── */
const EEIS_METRICS = [
  { label: 'GUEST JOURNEY',         value: 'SMOKE → POUR → INQUIRY', color: '#d4af37' },
  { label: 'PREDICTIVE INTENT',     value: 'PRESTIGE SPEND ↑ 87%',   color: '#00e676' },
  { label: 'ENV INTENSITY',         value: '████████░░ 82%',          color: '#d4af37' },
  { label: 'REVENUE INFLUENCE',     value: '$340 PROJECTED',         color: '#00e676' },
  { label: 'PACING',                value: 'LEISURELY · 14 MIN',     color: '#d4af37' },
  { label: 'PREMIUM PROBABILITY',   value: '███████░░░ 71%',          color: '#d4af37' },
  { label: 'AI MENTOR STATE',       value: 'ACTIVE · ENGAGED',       color: '#00e676' },
  { label: 'ATMOS HEATMAP',         value: 'SMOKE ZONE: HOT',        color: '#ff6b35' },
];

function PhaseEEIS({ onExit }: { onExit: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600 }}>
      {/* Environment dimmed behind */}
      <TitanCraftDeck />
      {/* Ripple distortion overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(3px)',
        animation: 'axiom-fadein 0.8s ease forwards',
      }} />
      {/* Gold wireframe grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(212,175,55,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(212,175,55,0.06) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
        pointerEvents: 'none',
      }} />
      {/* EEIS panel */}
      <div style={{
        position: 'absolute', inset: '5%',
        border: '1px solid rgba(212,175,55,0.35)',
        borderRadius: 2,
        display: 'flex', flexDirection: 'column',
        animation: 'axiom-fadein 0.6s ease forwards',
        overflow: 'hidden',
      }}>
        {/* EEIS header */}
        <div style={{
          height: 44, background: 'rgba(0,0,0,0.85)',
          borderBottom: '1px solid rgba(212,175,55,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e676', boxShadow: '0 0 8px #00e676', animation: 'axiom-pulse 1.5s infinite' }} />
            <span style={{ fontSize: 10, letterSpacing: '0.35em', fontFamily: 'monospace', color: '#d4af37', fontWeight: 900 }}>
              EEIS · ENVIRONMENTAL EXPERIENCE INTELLIGENCE SYSTEM
            </span>
          </div>
          <div
            style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(212,175,55,0.5)', fontFamily: 'monospace', cursor: 'pointer' }}
            onClick={onExit}
          >
            [ EXIT STAFF MODE ]
          </div>
        </div>
        {/* Metrics grid */}
        <div style={{
          flex: 1, display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))',
          gap: 1, background: 'rgba(212,175,55,0.06)',
          overflow: 'auto',
        }}>
          {EEIS_METRICS.map((m, i) => (
            <div key={i} style={{
              background: 'rgba(0,0,0,0.8)',
              padding: '18px 20px',
              borderLeft: `1.5px solid ${m.color}33`,
              animation: `axiom-fadein 0.4s ${i * 0.08}s ease both`,
            }}>
              <div style={{ fontSize: 7.5, letterSpacing: '0.25em', color: 'rgba(212,175,55,0.45)', fontFamily: 'monospace', marginBottom: 8 }}>{m.label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', color: m.color, fontFamily: 'monospace' }}>{m.value}</div>
              {/* Animated pulse line */}
              <div style={{ marginTop: 10, height: 1, background: `linear-gradient(90deg,${m.color}44,${m.color}88,${m.color}44)`, animation: `axiom-shimmer 2s ${i * 0.1}s linear infinite` }} />
            </div>
          ))}
        </div>
        {/* Live waveform footer */}
        <div style={{
          height: 56, background: 'rgba(0,0,0,0.9)',
          borderTop: '1px solid rgba(212,175,55,0.2)',
          display: 'flex', alignItems: 'center',
          padding: '0 20px', gap: 16,
        }}>
          <span style={{ fontSize: 8, letterSpacing: '0.3em', color: 'rgba(212,175,55,0.45)', fontFamily: 'monospace' }}>ATMOSPHERIC PULSE</span>
          <svg width="200" height="28" viewBox="0 0 200 28">
            <polyline points="0,14 10,8 20,18 30,6 40,20 50,10 60,16 70,4 80,22 90,12 100,14 110,7 120,19 130,9 140,17 150,5 160,21 170,11 180,15 190,8 200,14"
              fill="none" stroke="#d4af37" strokeWidth="1.2" opacity="0.6"
              style={{ animation: 'axiom-shimmer 3s linear infinite' }} />
          </svg>
          <span style={{ marginLeft: 'auto', fontSize: 8, letterSpacing: '0.3em', color: '#00e676', fontFamily: 'monospace' }}>VENUE VOLATILITY: NOMINAL</span>
        </div>
      </div>
    </div>
  );
}

/* ── PHASE 7: RECAP ─────────────────────────────────────────── */
function PhaseRecap({ onRestart }: { onRestart: () => void }) {
  const DISCOVERIES = ['SMOKECRAFT 360', 'POURCRAFT 360', 'BREWCRAFT 360', 'VAPECRAFT 360'];
  return (
    <div style={{ ...fullBleed('#000'), flexDirection: 'column', gap: 32 }} onClick={onRestart}>
      <div style={{ fontSize: 9, letterSpacing: '0.5em', color: 'rgba(212,175,55,0.5)', fontFamily: 'monospace' }}>SESSION COMPLETE</div>
      <div style={{ fontSize: 'clamp(18px,3vw,36px)', fontWeight: 900, letterSpacing: '0.4em', fontFamily: 'monospace',
        background: GOLD_GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        DISCOVERIES UNLOCKED
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        {DISCOVERIES.map((d, i) => (
          <div key={d} style={{
            fontSize: 11, letterSpacing: '0.35em', fontFamily: 'monospace',
            color: '#d4af37', opacity: 0,
            animation: `axiom-fadein 0.6s ${0.3 + i * 0.25}s ease forwards`,
          }}>
            ◆ {d}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 40, fontSize: 8, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace',
        animation: 'axiom-pulse 2s ease-in-out infinite' }}>
        TAP TO BEGIN NEW SESSION
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MASTER STATE ENGINE
══════════════════════════════════════════════════════════════ */
export default function App() {
  const [phase, setPhase]           = useState<Phase>('void');
  const [phaseAge, setPhaseAge]     = useState(0);   // seconds in current phase
  const [immersionCraft, setImmersionCraft] = useState<string>('smoke');
  const ageRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Drive the automatic phase progression
  useEffect(() => {
    if (ageRef.current) clearInterval(ageRef.current);
    setPhaseAge(0);
    ageRef.current = setInterval(() => setPhaseAge(a => a + 0.05), 50);
    return () => { if (ageRef.current) clearInterval(ageRef.current); };
  }, [phase]);

  // Auto-advance through boot phases
  useEffect(() => {
    if (phase === 'void'        && phaseAge >= 3)  setPhase('materialize');
    if (phase === 'materialize' && phaseAge >= 4)  setPhase('calibrate');
    if (phase === 'calibrate'   && phaseAge >= 4)  setPhase('environment');
  }, [phase, phaseAge]);

  const handleDwell   = useCallback((craft: string) => { setImmersionCraft(craft); setPhase('immersion'); }, []);
  const handleEEIS    = useCallback(() => setPhase('eeis'), []);
  const handleEEISExit= useCallback(() => setPhase('environment'), []);
  const handleImmExit = useCallback(() => setPhase('environment'), []);
  const handleRecap   = useCallback(() => { setPhase('void'); }, []);

  return (
    <>
      {/* ── PHASE RENDER ── */}
      {phase === 'void'        && <PhaseVoid        progress={phaseAge / 3} />}
      {phase === 'materialize' && <PhaseMaterialize  progress={phaseAge / 4} />}
      {phase === 'calibrate'   && <PhaseCalibrate    progress={phaseAge / 4} />}
      {phase === 'environment' && (
        <PhaseEnvironment
          onDwell={handleDwell}
          onEEIS={handleEEIS}
          entering={phaseAge < 1.2}
        />
      )}
      {phase === 'immersion'   && <PhaseImmersion craft={immersionCraft} onExit={handleImmExit} />}
      {phase === 'eeis'        && <PhaseEEIS onExit={handleEEISExit} />}
      {phase === 'recap'       && <PhaseRecap onRestart={handleRecap} />}

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { width:100vw; height:100vh; overflow:hidden; background:#000; }

        @keyframes axiom-breathe      { 0%,100%{opacity:.6;transform:scale(1)}   50%{opacity:1;transform:scale(1.15)} }
        @keyframes axiom-breathe-slow { 0%,100%{opacity:.85} 50%{opacity:1} }
        @keyframes axiom-pulse        { 0%,100%{opacity:1}   50%{opacity:.35} }
        @keyframes axiom-fadein       { from{opacity:0} to{opacity:1} }
        @keyframes axiom-ring-spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes axiom-shimmer      { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        @keyframes axiom-dwell-ring   {
          0%   { transform:translate(-50%,-50%) scale(0.5); opacity:0; border-color:rgba(212,175,55,0.8); }
          100% { transform:translate(-50%,-50%) scale(1.6); opacity:0; border-color:rgba(212,175,55,0); }
        }
      `}</style>
    </>
  );
}

/* ── HELPERS ── */
const GOLD_GRAD = 'linear-gradient(180deg,#fff9e6 0%,#d4af37 45%,#b8860b 75%,#8a6d3b 100%)';

function fullBleed(bg: string): React.CSSProperties {
  return {
    position: 'fixed', inset: 0,
    background: bg,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexDirection: 'column',
  };
}
