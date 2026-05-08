import React from 'react';

const TitanCraftDeck = () => {
  return (
    <div style={shell}>

      {/* ── HEADER ── */}
      <div style={header}>
        <span style={headerMono}>AXIOM INTELLIGENCE // REVENUE ENGINE ACTIVE</span>
        <span style={wordmark}>AXIOM OS</span>
        <span style={headerMonoRight}>CRAFT MODULES: 04</span>
      </div>

      {/* ── 2×2 GRID ── */}
      <div style={grid}>

        {/* TOP-LEFT: SMOKECRAFT */}
        <div style={quad}>
          <img src="/images/scenes/smokecraft-card.jpg" style={img} alt="" />
          <div style={rimTop} /><div style={rimLeft} />
          <div style={quadOverlay} />
          <span style={labelGold}>[ SMOKECRAFT 360 ]</span>
        </div>

        {/* TOP-RIGHT: POURCRAFT */}
        <div style={quad}>
          <img src="/images/scenes/pourcraft-card.jpg" style={img} alt="" />
          <div style={rimTop} /><div style={rimRight} />
          <div style={quadOverlay} />
          <span style={labelSilver}>[ POURCRAFT 360 ]</span>
        </div>

        {/* BOTTOM-LEFT: BREWCRAFT */}
        <div style={quad}>
          <img src="/images/scenes/brewcraft-card.jpg" style={img} alt="" />
          <div style={rimLeft} /><div style={rimBottom} />
          <div style={quadOverlay} />
          <span style={labelSilver}>[ BREWCRAFT 360 ]</span>
        </div>

        {/* BOTTOM-RIGHT: VAPECRAFT */}
        <div style={quad}>
          <img src="/images/scenes/vapecraft-card.jpg" style={img} alt="" />
          <div style={rimRight} /><div style={rimBottom} />
          <div style={quadOverlay} />
          <span style={labelSilver}>[ VAPECRAFT 360 ]</span>
        </div>

      </div>

      {/* ── CENTER ORB — positioned on the shell, not inside the grid ── */}
      <div style={orb} />

      {/* ── HORIZONTAL SEAM ── */}
      <div style={seamH} />
      {/* ── VERTICAL SEAM ── */}
      <div style={seamV} />

      {/* ── GOLD TICKER ── */}
      <div style={ticker}>
        <div style={tickerTrack}>
          {'>>> DAYONE 360 ADV /// REVENUE OPTIMIZED /// SYSTEM STATUS: SOVEREIGN /// SYSTEM LINK: STABLE /// AXIOM NODE: CONNECTED >>>'}
        </div>
      </div>

      <style>{`
        @keyframes marquee   { from { transform: translateX(100vw); } to { transform: translateX(-100%); } }
        @keyframes breathe   { 0%,100% { box-shadow: 0 0 16px 4px #d4af37; } 50% { box-shadow: 0 0 40px 10px #d4af37cc; } }
      `}</style>
    </div>
  );
};

/* ── TOKENS ── */
const GOLD   = 'linear-gradient(180deg,#fff9e6 0%,#d4af37 45%,#b8860b 75%,#8a6d3b 100%)';
const SILVER = 'linear-gradient(180deg,#ffffff 0%,#c0c0c0 50%,#4d4d4d 100%)';

/* ── SHELL ── */
const shell: React.CSSProperties = {
  position: 'fixed', inset: 0,
  display: 'flex', flexDirection: 'column',
  background: '#030303',
  overflow: 'hidden',
};

/* ── HEADER ── */
const header: React.CSSProperties = {
  flexShrink: 0,
  height: 48,
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0 24px',
  background: 'linear-gradient(180deg,#0a0a0a 0%,#050505 100%)',
  borderBottom: '1px solid rgba(212,175,55,0.35)',
  zIndex: 60,
};
const headerMono: React.CSSProperties = {
  flex: 1, fontSize: 10, letterSpacing: '0.35em', fontFamily: 'monospace',
  background: SILVER, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
};
const headerMonoRight: React.CSSProperties = {
  ...headerMono, flex: 1, textAlign: 'right',
};
const wordmark: React.CSSProperties = {
  fontSize: 20, fontWeight: 900, letterSpacing: '0.65em', fontFamily: 'monospace',
  background: GOLD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
};

/* ── GRID ── */
const grid: React.CSSProperties = {
  flex: 1,
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gridTemplateRows: '1fr 1fr',
  minHeight: 0,
};

/* ── QUAD ── */
const quad: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
};

/* ── IMAGE ── */
const img: React.CSSProperties = {
  position: 'absolute', inset: 0,
  width: '100%', height: '100%',
  objectFit: 'cover', objectPosition: 'center',
  display: 'block',
  filter: 'brightness(0.88) saturate(1.15)',
};

/* ── QUAD OVERLAY — very subtle vignette toward center ── */
const quadOverlay: React.CSSProperties = {
  position: 'absolute', inset: 0,
  background: 'radial-gradient(ellipse 80% 80% at center, transparent 40%, rgba(0,0,0,0.45) 100%)',
  pointerEvents: 'none',
};

/* ── RIM LIGHTS ── */
const rimBase: React.CSSProperties = { position: 'absolute', pointerEvents: 'none', zIndex: 10 };
const rimTop: React.CSSProperties    = { ...rimBase, top: 0,    left: 0, right: 0, height: 1,  background: 'rgba(255,255,255,0.35)' };
const rimBottom: React.CSSProperties = { ...rimBase, bottom: 0, left: 0, right: 0, height: 1,  background: 'rgba(255,255,255,0.18)' };
const rimLeft: React.CSSProperties   = { ...rimBase, left: 0,   top: 0, bottom: 0, width: 1,   background: 'rgba(255,255,255,0.18)' };
const rimRight: React.CSSProperties  = { ...rimBase, right: 0,  top: 0, bottom: 0, width: 1,   background: 'rgba(255,255,255,0.18)' };

/* ── LABELS ── */
const labelBase: React.CSSProperties = {
  position: 'absolute', bottom: 22, left: 20, zIndex: 20,
  fontSize: 11, fontWeight: 900, letterSpacing: '0.3em', fontFamily: 'monospace',
};
const labelGold: React.CSSProperties = {
  ...labelBase,
  background: GOLD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
};
const labelSilver: React.CSSProperties = {
  ...labelBase,
  background: SILVER, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
};

/* ── SEAMS ── */
const seamH: React.CSSProperties = {
  position: 'absolute',
  top: '50%', left: '10%', right: '10%',
  height: '0.5px',
  background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5) 30%, rgba(212,175,55,0.5) 70%, transparent)',
  transform: 'translateY(-50%)',
  zIndex: 30, pointerEvents: 'none',
  marginTop: 24,
};
const seamV: React.CSSProperties = {
  position: 'absolute',
  left: '50%', top: '15%', bottom: '10%',
  width: '0.5px',
  background: 'linear-gradient(180deg, transparent, rgba(212,175,55,0.5) 20%, rgba(212,175,55,0.5) 80%, transparent)',
  transform: 'translateX(-50%)',
  zIndex: 30, pointerEvents: 'none',
  marginTop: 24,
};

/* ── ORB — floats at grid center, NOT inside grid flow ── */
const orb: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(48px + 50% - 7px)',
  left: 'calc(50% - 7px)',
  width: 14, height: 14,
  borderRadius: '50%',
  background: 'radial-gradient(circle, #fff9e6 0%, #d4af37 60%, #8a6d3b 100%)',
  border: '1.5px solid rgba(255,255,255,0.7)',
  animation: 'breathe 3s ease-in-out infinite',
  zIndex: 50,
  pointerEvents: 'none',
};

/* ── TICKER ── */
const ticker: React.CSSProperties = {
  flexShrink: 0,
  height: 50,
  background: 'rgba(0,0,0,0.75)',
  backdropFilter: 'blur(12px)',
  borderTop: '1.5px solid rgba(212,175,55,0.45)',
  display: 'flex', alignItems: 'center',
  overflow: 'hidden',
  zIndex: 60,
};
const tickerTrack: React.CSSProperties = {
  whiteSpace: 'nowrap',
  animation: 'marquee 35s linear infinite',
  background: GOLD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  fontSize: 11, fontWeight: 900, letterSpacing: '0.5em', fontFamily: 'monospace',
};

export default TitanCraftDeck;
