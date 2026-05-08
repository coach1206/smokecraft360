import React from 'react';

/* ─────────────────────────────────────────────
   TITAN CRAFT DECK — Machined Hardware Terminal
   Carbon fibre chassis · Gold bezels · Live quads
───────────────────────────────────────────────── */

const TitanCraftDeck = () => (
  <div style={chassis}>

    {/* ── LEFT PANEL: Titan telemetry column ── */}
    <div style={leftPanel}>
      <div style={titanLogo}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <polygon points="14,2 26,24 2,24" stroke="#d4af37" strokeWidth="1.5" fill="none"/>
          <polygon points="14,8 21,22 7,22" fill="rgba(212,175,55,0.18)" stroke="#d4af37" strokeWidth="0.8"/>
          <circle cx="14" cy="16" r="2" fill="#d4af37"/>
        </svg>
        <span style={titanLabel}>Titan<br/>Engine</span>
      </div>
      <div style={telemBlock}>
        {[
          { label: 'TELEMETRY', val: '117' },
          { label: 'DATA MOD', val: '3.9A' },
          { label: 'KAPMAN', val: '50K' },
        ].map(r => (
          <div key={r.label} style={telemRow}>
            <span style={telemKey}>{r.label}</span>
            <span style={telemVal}>{r.val}</span>
          </div>
        ))}
      </div>
      {/* Side grip grooves */}
      <div style={gripColumn}>
        {Array.from({ length: 8 }).map((_, i) => <div key={i} style={grip} />)}
      </div>
    </div>

    {/* ── CENTER: Screen + bezels ── */}
    <div style={centerCol}>

      {/* TOP BEZEL */}
      <div style={topBezel}>
        <div style={engineBadge}>
          <span style={greenDot} />
          <span style={engineText}>TITAN ENGINE ACTIVE</span>
        </div>
        <span style={axiomWordmark}>Axiom OS</span>
        <div style={kioskBadge}>
          <span style={kbText}>KIOSK LOCK: ABSOLUTE</span>
          <span style={greenDotSm} />
        </div>
      </div>

      {/* SCREEN — 2×2 ENVIRONMENTAL GRID */}
      <div style={screen}>

        {/* Screen inner glow */}
        <div style={screenGlow} />

        {/* Grid */}
        <div style={grid}>
          {QUADS.map((q, i) => (
            <div key={i} style={quadWrap}>
              <img src={q.img} style={img} alt={q.name} />
              <div style={vignette} />
              {/* Tile overlay bar */}
              <div style={tileBar}>
                <div style={tileIcon}><DiamondIcon color={q.gold ? '#d4af37' : '#c0c0c0'} /></div>
                <div>
                  <div style={tileName(q.gold)}>{q.name}</div>
                  <div style={tileSub}>{q.sub}</div>
                </div>
              </div>
              {/* Corner accent */}
              <div style={cornerTL(q.gold)} />
              <div style={cornerBR(q.gold)} />
            </div>
          ))}
        </div>

        {/* Center orb at seam intersection */}
        <div style={centerOrb} />
        <div style={seamH} />
        <div style={seamV} />
      </div>

      {/* BOTTOM BEZEL */}
      <div style={bottomBezel}>
        <div style={coinTap}>
          <NfcIcon />
          <span style={coinText}>AXIOM COIN TAP</span>
        </div>
        <div style={bottomTicker}>
          <div style={tickerInner}>
            {'>>> REVENUE OPTIMIZED · SYSTEM STATUS: SOVEREIGN · AXIOM NODE: CONNECTED · CRAFT PORTALS: 04 >>>'}
          </div>
        </div>
      </div>

    </div>

    {/* ── RIGHT PANEL: Machined controls ── */}
    <div style={rightPanel}>
      {/* Machined dial */}
      <div style={dial}>
        <div style={dialInner}>
          <div style={dialDot} />
        </div>
        {/* Dial notches */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={notch(i)} />
        ))}
      </div>
      {/* Button cluster */}
      <div style={btnCluster}>
        {[0, 1, 2].map(i => (
          <div key={i} style={hwBtn}>
            <div style={hwBtnInner} />
          </div>
        ))}
      </div>
      {/* Side grip grooves */}
      <div style={gripColumn}>
        {Array.from({ length: 8 }).map((_, i) => <div key={i} style={grip} />)}
      </div>
    </div>

    <style>{`
      @keyframes breathe  { 0%,100%{box-shadow:0 0 14px 3px #d4af37aa}50%{box-shadow:0 0 32px 8px #d4af37ee} }
      @keyframes marquee  { from{transform:translateX(100%)} to{transform:translateX(-100%)} }
      @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.4} }
    `}</style>
  </div>
);

/* ─── DATA ─── */
const QUADS = [
  { name: 'SMOKECRAFT 360', sub: 'LOCOPOSTAL ANCHORS', img: '/images/scenes/smokecraft-card.jpg', gold: true  },
  { name: 'POURCRAFT 360',  sub: 'PRESTIGE SPEND',     img: '/images/scenes/pourcraft-card.jpg',  gold: false },
  { name: 'BREWCRAFT 360',  sub: 'PALATE SENTIMENT',   img: '/images/scenes/brewcraft-card.jpg',  gold: false },
  { name: 'VAPECRAFT 360',  sub: 'ENVIRONMENT PULSE',  img: '/images/scenes/vapecraft-card.jpg',  gold: false },
];

/* ─── ICONS ─── */
const DiamondIcon = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <polygon points="8,1 15,8 8,15 1,8" stroke={color} strokeWidth="1.2" fill={`${color}22`}/>
    <polygon points="8,4 12,8 8,12 4,8" fill={`${color}44`}/>
  </svg>
);
const NfcIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ marginRight: 6 }}>
    <path d="M5 9 Q9 4 13 9 Q9 14 5 9Z" stroke="#d4af37" strokeWidth="1.2" fill="none"/>
    <circle cx="9" cy="9" r="1.5" fill="#d4af37"/>
  </svg>
);

/* ─── TOKENS ─── */
const GOLD   = 'linear-gradient(180deg,#fff9e6 0%,#d4af37 45%,#b8860b 75%,#8a6d3b 100%)';
const SILVER = 'linear-gradient(180deg,#ffffff 0%,#c0c0c0 50%,#4d4d4d 100%)';
const CARBON = `repeating-linear-gradient(
  135deg,
  #1c1c1c 0px,#1c1c1c 2px,
  #141414 2px,#141414 8px
)`;
const GOLD_TRIM = '1.5px solid #d4af37';
const GOLD_DIM  = '1px solid rgba(212,175,55,0.35)';

/* ─── CHASSIS ─── */
const chassis: React.CSSProperties = {
  position: 'fixed', inset: 0,
  display: 'flex',
  background: CARBON,
  overflow: 'hidden',
};

/* ─── LEFT PANEL ─── */
const leftPanel: React.CSSProperties = {
  width: 88,
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '18px 0 12px',
  background: `linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)`,
  borderRight: GOLD_TRIM,
  gap: 16,
};
const titanLogo: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
};
const titanLabel: React.CSSProperties = {
  fontSize: 8, letterSpacing: '0.2em', textAlign: 'center', lineHeight: 1.4,
  background: GOLD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  fontFamily: 'monospace', fontWeight: 900,
};
const telemBlock: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 6, width: '100%', padding: '0 10px',
};
const telemRow: React.CSSProperties = {
  display: 'flex', flexDirection: 'column',
  background: 'rgba(212,175,55,0.06)',
  border: '0.5px solid rgba(212,175,55,0.2)',
  borderRadius: 2, padding: '4px 6px',
};
const telemKey: React.CSSProperties = {
  fontSize: 7, letterSpacing: '0.15em', color: '#6b5a3a', fontFamily: 'monospace',
};
const telemVal: React.CSSProperties = {
  fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', fontFamily: 'monospace',
  background: GOLD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
};
const gripColumn: React.CSSProperties = {
  marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 5, padding: '0 16px', width: '100%',
};
const grip: React.CSSProperties = {
  height: 3, borderRadius: 2,
  background: 'linear-gradient(90deg, #2a2a2a, #d4af3755, #2a2a2a)',
};

/* ─── CENTER ─── */
const centerCol: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
};

/* ─── TOP BEZEL ─── */
const topBezel: React.CSSProperties = {
  height: 38,
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0 16px',
  background: 'linear-gradient(180deg,#111 0%,#0a0a0a 100%)',
  borderBottom: GOLD_TRIM,
  flexShrink: 0,
};
const engineBadge: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
};
const greenDot: React.CSSProperties = {
  width: 7, height: 7, borderRadius: '50%',
  background: '#00e676',
  boxShadow: '0 0 6px #00e676',
  animation: 'pulse 2s infinite',
  display: 'inline-block',
};
const greenDotSm: React.CSSProperties = { ...greenDot, width: 5, height: 5 };
const engineText: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.25em', fontFamily: 'monospace', fontWeight: 700,
  background: GOLD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
};
const axiomWordmark: React.CSSProperties = {
  fontSize: 15, fontWeight: 900, letterSpacing: '0.5em', fontFamily: 'monospace',
  background: GOLD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
};
const kioskBadge: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
};
const kbText: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.2em', fontFamily: 'monospace',
  background: SILVER, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
};

/* ─── SCREEN ─── */
const screen: React.CSSProperties = {
  flex: 1,
  position: 'relative',
  background: '#030303',
  overflow: 'hidden',
  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8), inset 0 0 1px rgba(212,175,55,0.2)',
};
const screenGlow: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50,
  background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(212,175,55,0.06) 0%, transparent 70%)',
};
const grid: React.CSSProperties = {
  position: 'absolute', inset: 0,
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gridTemplateRows: '1fr 1fr',
};

/* ─── QUAD ─── */
const quadWrap: React.CSSProperties = {
  position: 'relative', overflow: 'hidden',
};
const img: React.CSSProperties = {
  position: 'absolute', inset: 0,
  width: '100%', height: '100%',
  objectFit: 'cover', objectPosition: 'center',
  display: 'block',
  filter: 'brightness(0.72) saturate(1.1)',
};
const vignette: React.CSSProperties = {
  position: 'absolute', inset: 0,
  background: 'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 30%, rgba(0,0,0,0.55) 100%)',
  pointerEvents: 'none', zIndex: 5,
};
const tileBar: React.CSSProperties = {
  position: 'absolute', bottom: 0, left: 0, right: 0,
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '8px 12px 10px',
  background: 'linear-gradient(0deg,rgba(0,0,0,0.85) 0%,transparent 100%)',
  zIndex: 10,
};
const tileIcon: React.CSSProperties = { flexShrink: 0 };
const tileName = (gold: boolean): React.CSSProperties => ({
  fontSize: 10, fontWeight: 900, letterSpacing: '0.25em', fontFamily: 'monospace',
  background: gold ? GOLD : SILVER,
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
});
const tileSub: React.CSSProperties = {
  fontSize: 7.5, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', marginTop: 1,
};
const cornerTL = (gold: boolean): React.CSSProperties => ({
  position: 'absolute', top: 0, left: 0, width: 16, height: 16, zIndex: 10,
  borderTop: `1.5px solid ${gold ? '#d4af37' : '#888'}`,
  borderLeft: `1.5px solid ${gold ? '#d4af37' : '#888'}`,
});
const cornerBR = (gold: boolean): React.CSSProperties => ({
  position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, zIndex: 10,
  borderBottom: `1.5px solid ${gold ? '#d4af37' : '#888'}`,
  borderRight: `1.5px solid ${gold ? '#d4af37' : '#888'}`,
});

/* ─── SEAMS + ORB ─── */
const seamH: React.CSSProperties = {
  position: 'absolute', top: '50%', left: 0, right: 0, height: 1,
  background: 'linear-gradient(90deg,transparent 0%,rgba(212,175,55,0.5) 20%,rgba(212,175,55,0.5) 80%,transparent 100%)',
  transform: 'translateY(-50%)', zIndex: 30, pointerEvents: 'none',
};
const seamV: React.CSSProperties = {
  position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1,
  background: 'linear-gradient(180deg,transparent 0%,rgba(212,175,55,0.5) 15%,rgba(212,175,55,0.5) 85%,transparent 100%)',
  transform: 'translateX(-50%)', zIndex: 30, pointerEvents: 'none',
};
const centerOrb: React.CSSProperties = {
  position: 'absolute', top: 'calc(50% - 6px)', left: 'calc(50% - 6px)',
  width: 12, height: 12, borderRadius: '50%',
  background: 'radial-gradient(circle,#fff9e6 0%,#d4af37 55%,#8a6d3b 100%)',
  border: '1.5px solid rgba(255,255,255,0.6)',
  animation: 'breathe 3s ease-in-out infinite',
  zIndex: 40, pointerEvents: 'none',
};

/* ─── BOTTOM BEZEL ─── */
const bottomBezel: React.CSSProperties = {
  height: 38,
  display: 'flex', alignItems: 'center',
  background: 'linear-gradient(180deg,#0a0a0a 0%,#111 100%)',
  borderTop: GOLD_TRIM,
  flexShrink: 0,
  overflow: 'hidden',
  position: 'relative',
};
const coinTap: React.CSSProperties = {
  display: 'flex', alignItems: 'center',
  padding: '0 14px',
  borderRight: GOLD_DIM,
  flexShrink: 0,
};
const coinText: React.CSSProperties = {
  fontSize: 9, letterSpacing: '0.3em', fontFamily: 'monospace', fontWeight: 700,
  background: GOLD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
};
const bottomTicker: React.CSSProperties = {
  flex: 1, overflow: 'hidden', paddingLeft: 12,
};
const tickerInner: React.CSSProperties = {
  whiteSpace: 'nowrap',
  animation: 'marquee 35s linear infinite',
  fontSize: 8.5, fontWeight: 700, letterSpacing: '0.35em', fontFamily: 'monospace',
  background: GOLD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
};

/* ─── RIGHT PANEL ─── */
const rightPanel: React.CSSProperties = {
  width: 80,
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '14px 0 12px',
  background: 'linear-gradient(180deg,#1a1a1a 0%,#0f0f0f 100%)',
  borderLeft: GOLD_TRIM,
  gap: 18,
};

/* ─── MACHINED DIAL ─── */
const dial: React.CSSProperties = {
  width: 48, height: 48,
  borderRadius: '50%',
  position: 'relative',
  background: 'radial-gradient(circle at 35% 35%, #3a3a3a 0%, #1a1a1a 60%, #0a0a0a 100%)',
  border: '2px solid #d4af37',
  boxShadow: '0 0 0 1px #8a6d3b, 0 4px 12px rgba(0,0,0,0.6)',
  flexShrink: 0,
};
const dialInner: React.CSSProperties = {
  position: 'absolute', inset: 6,
  borderRadius: '50%',
  background: 'radial-gradient(circle at 40% 40%, #2a2a2a 0%, #111 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const dialDot: React.CSSProperties = {
  width: 6, height: 6, borderRadius: '50%',
  background: '#d4af37',
  boxShadow: '0 0 6px #d4af37',
};
const notch = (i: number): React.CSSProperties => ({
  position: 'absolute',
  width: 2, height: 6,
  background: i % 3 === 0 ? '#d4af37' : '#444',
  borderRadius: 1,
  top: '50%', left: '50%',
  transformOrigin: '50% 28px',
  transform: `translate(-50%, -28px) rotate(${i * 30}deg) translateY(-16px)`,
});

/* ─── BUTTON CLUSTER ─── */
const btnCluster: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 8,
};
const hwBtn: React.CSSProperties = {
  width: 36, height: 20, borderRadius: 4,
  background: 'linear-gradient(180deg,#2a2a2a 0%,#111 100%)',
  border: '1px solid #d4af37',
  boxShadow: '0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const hwBtnInner: React.CSSProperties = {
  width: 20, height: 3, borderRadius: 2,
  background: 'linear-gradient(90deg,#8a6d3b,#d4af37,#8a6d3b)',
};

export default TitanCraftDeck;
