import React from 'react';

const TitanCraftDeck = () => {
  return (
    <div style={{ height: '100vh', width: '100vw', backgroundColor: '#000', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>

      {/* HEADER: METALLIC GOLD & SILVER */}
      <div style={{ height: '50px', width: '100%', background: '#050505', borderBottom: '1px solid #444', display: 'flex', alignItems: 'center', padding: '0 20px', zIndex: 50 }}>
        <div style={{ flex: 1, fontSize: '12px', color: '#c0c0c0', letterSpacing: '0.4em', fontWeight: 'bold' }}>AXIOM INTELLIGENCE // REVENUE ENGINE ACTIVE</div>
        <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '0.6em', background: 'linear-gradient(180deg, #fff9e6 0%, #d4af37 50%, #8a6d3b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AXIOM OS</div>
        <div style={{ flex: 1, textAlign: 'right', fontSize: '12px', color: '#c0c0c0', letterSpacing: '0.2em' }}>CRAFT MODULES: 04</div>
      </div>

      {/* 2x2 GRID: NO OVERLAYS, NO BLURS */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
        <div style={quadStyle}><img src="/images/scenes/smokecraft-card.jpg" style={imgStyle} /><div style={goldLabel}>[ SMOKECRAFT 360 ]</div></div>
        <div style={quadStyle}><img src="/images/scenes/pourcraft-card.jpg" style={imgStyle} /><div style={silverLabel}>[ POURCRAFT 360 ]</div></div>
        <div style={quadStyle}><img src="/images/scenes/brewcraft-card.jpg" style={imgStyle} /><div style={silverLabel}>[ BREWCRAFT 360 ]</div></div>
        <div style={quadStyle}><img src="/images/scenes/vapecraft-card.jpg" style={imgStyle} /><div style={silverLabel}>[ VAPECRAFT 360 ]</div></div>
        <div style={coreStyle} />
      </div>

      {/* KINETIC GOLD TICKER */}
      <div style={{ height: '55px', width: '100%', background: '#000', borderTop: '2px solid #d4af37', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <div style={{ whiteSpace: 'nowrap', animation: 'marquee 30s linear infinite', color: '#d4af37', letterSpacing: '0.5em', fontWeight: '900', fontSize: '14px' }}>
          {`>>> DAYONE 360 ADV /// REVENUE OPTIMIZED /// SYSTEM STATUS: SOVEREIGN /// SYSTEM LINK: STABLE /// AXIOM NODE: CONNECTED >>>`}
        </div>
      </div>

      <style>{`
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        @keyframes breathe { 0%, 100% { box-shadow: 0 0 20px #d4af37; } 50% { box-shadow: 0 0 50px #d4af37; } }
      `}</style>
    </div>
  );
};

const quadStyle = { position: 'relative', border: '0.5px solid rgba(255,255,255,0.1)', overflow: 'hidden' };
const imgStyle = { width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block', opacity: 1, filter: 'brightness(1.1)' };
const coreStyle = { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '14px', height: '14px', borderRadius: '50%', background: '#d4af37', animation: 'breathe 3s infinite', zIndex: 100, border: '2px solid #fff' };
const goldLabel = { position: 'absolute', bottom: '20px', left: '20px', fontWeight: '900', letterSpacing: '0.3em', background: 'linear-gradient(180deg, #fff9e6, #d4af37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' };
const silverLabel = { position: 'absolute', bottom: '20px', left: '20px', fontWeight: '900', letterSpacing: '0.3em', color: '#c0c0c0' };

export default TitanCraftDeck;