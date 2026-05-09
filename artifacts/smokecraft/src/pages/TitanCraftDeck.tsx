import React, { useState } from 'react';

// --- TITAN SYSTEM STYLES (Machined Hardware Look) ---
const styles = {
  shell: { height: '100vh', width: '100vw', backgroundColor: '#050505', overflow: 'hidden', position: 'relative', color: '#fff', fontFamily: 'monospace' },
  hubGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', height: '100%', width: '100%', gap: '4px', background: '#111' },
  quadrant: { position: 'relative', overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(212,175,55,0.1)' },
  // FIX FOR "XL UGLY" IMAGE: Forces it to fill screen as an environment
  envStage: { position: 'absolute', inset: 0, zIndex: 100, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', animation: 'fadeIn 0.6s ease' },
  goldText: { background: 'linear-gradient(180deg, #FFF9E6 0%, #D4AF37 50%, #8A6D3B 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '900', letterSpacing: '0.35em', textTransform: 'uppercase' },
  ticker: { position: 'absolute', bottom: 0, width: '100%', height: '35px', background: 'rgba(0,0,0,0.95)', borderTop: '2px solid #d4af37', display: 'flex', alignItems: 'center', zIndex: 300 },
  backBtn: { position: 'absolute', top: '40px', left: '40px', zIndex: 400, padding: '12px 24px', background: 'rgba(0,0,0,0.8)', border: '1px solid #d4af37', color: '#d4af37', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }
};

const CRAFT_DATA = [
  { id: 'smoke', name: 'SMOKECRAFT', sub: 'SOVEREIGN RITUAL', img: '/images/scenes/smokecraft-card.jpg' },
  { id: 'pour', name: 'POURCRAFT', sub: 'PRESTIGE SPIRITS', img: '/images/scenes/pourcraft-card.jpg' },
  { id: 'brew', name: 'BREWCRAFT', sub: 'PALATE SENTIMENT', img: '/images/scenes/brewcraft-card.jpg' },
  { id: 'vape', name: 'VAPECRAFT', sub: 'ENVIRONMENT PULSE', img: '/images/scenes/vapecraft-card.jpg' }
];

export default function TitanCraftDeck() {
  const [activeCraft, setActiveCraft] = useState(null);

  return (
    <div style={styles.shell}>

      {/* 1. THE 2x2 HARDWARE HUB */}
      {!activeCraft && (
        <div style={styles.hubGrid}>
          {CRAFT_DATA.map((c) => (
            <div key={c.id} style={styles.quadrant} onClick={() => setActiveCraft(c)}>
              {/* Full Bleed Image with Overlay */}
              <img src={c.img} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 40%)' }} />

              <div style={{ position: 'absolute', bottom: '30px', left: '30px' }}>
                <h2 style={styles.goldText}>{c.name}</h2>
                <p style={{ margin: 0, fontSize: '10px', opacity: 0.5, letterSpacing: '0.2em' }}>{c.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. THE IMMERSIVE ENVIRONMENT (No Timers, Stay until click) */}
      {activeCraft && (
        <div style={{ ...styles.envStage, backgroundImage: `url(${activeCraft.img})` }}>
          <button style={styles.backBtn} onClick={() => setActiveCraft(null)}>
            ‹ RETURN TO HUB
          </button>

          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.6) 100%)' }} />

          <div style={{ position: 'absolute', bottom: '15%', width: '100%', textAlign: 'center' }}>
            <h1 style={{ ...styles.goldText, fontSize: '4.5rem' }}>{activeCraft.name}</h1>
            <p style={{ letterSpacing: '1.2em', opacity: 0.6, fontSize: '14px' }}>OPERATOR IMMERSION ACTIVE</p>
          </div>
        </div>
      )}

      {/* 3. SYSTEM FOOTER */}
      <div style={styles.ticker}>
        <marquee style={{ color: '#d4af37', fontSize: '11px', fontWeight: 'bold' }}>
          AXIOM OS /// ENGINE STATUS: LOCKED /// NO ACTIVE GHOST TIMERS /// REVENUE OPTIMIZED /// SOVEREIGN NODE: ONLINE
        </marquee>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}