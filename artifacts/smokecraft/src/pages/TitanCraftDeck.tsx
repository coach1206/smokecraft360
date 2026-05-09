import React, { useState } from 'react';

// --- STYLING (Machined Gold & Glass) ---
const styles = {
  shell: { height: '100vh', width: '100vw', backgroundColor: '#050505', overflow: 'hidden', position: 'relative', color: '#fff', fontFamily: 'sans-serif' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', height: '100%', width: '100%', gap: '2px', background: '#1a1a1a' },
  quadrant: { position: 'relative', overflow: 'hidden', cursor: 'pointer' },
  fullEnv: { position: 'absolute', inset: 0, zIndex: 100, backgroundSize: 'cover', backgroundPosition: 'center', animation: 'fadeIn 0.5s ease-in-out' },
  goldText: { background: 'linear-gradient(180deg, #FFF9E6 0%, #D4AF37 50%, #8A6D3B 100%)', WebkitBackgroundClip: 'text', WebkitTextFill-color: 'transparent', fontWeight: '900', letterSpacing: '0.3em', textTransform: 'uppercase' },
  glassLabel: { position: 'absolute', bottom: '20px', left: '20px', padding: '15px 25px', backdropFilter: 'blur(10px)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '4px' },
  backBtn: { position: 'absolute', top: '40px', left: '40px', zIndex: 200, padding: '10px 20px', background: 'none', border: '1px solid #d4af37', color: '#d4af37', cursor: 'pointer', letterSpacing: '0.1em' }
};

const CRAFTS = [
  { id: 'smoke', name: 'SMOKECRAFT', sub: 'SOVEREIGN RITUAL', img: '/images/scenes/smokecraft-card.jpg' },
  { id: 'pour', name: 'POURCRAFT', sub: 'PRESTIGE SPIRITS', img: '/images/scenes/pourcraft-card.jpg' },
  { id: 'brew', name: 'BREWCRAFT', sub: 'PALATE SENTIMENT', img: '/images/scenes/brewcraft-card.jpg' },
  { id: 'vape', name: 'VAPECRAFT', sub: 'ENVIRONMENT PULSE', img: '/images/scenes/vapecraft-card.jpg' }
];

export default function TitanCraftDeck() {
  const [activeCraft, setActiveCraft] = useState(null);

  return (
    <div style={styles.shell}>

      {/* 1. THE 4-QUADRANT HUB */}
      {!activeCraft && (
        <div style={styles.grid}>
          {CRAFTS.map((craft) => (
            <div key={craft.id} style={styles.quadrant} onClick={() => setActiveCraft(craft)}>
              <img src={craft.img} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
              <div style={styles.glassLabel}>
                <h2 style={styles.goldText}>{craft.name}</h2>
                <p style={{ margin: 0, fontSize: '10px', opacity: 0.5 }}>{craft.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. THE PERMANENT ENVIRONMENT (No Timers) */}
      {activeCraft && (
        <div style={{ ...styles.fullEnv, backgroundImage: `url(${activeCraft.img})` }}>
          <button style={styles.backBtn} onClick={() => setActiveCraft(null)}>
            ‹ RETURN TO HUB
          </button>

          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%)' }} />

          <div style={{ position: 'absolute', bottom: '10%', width: '100%', textAlign: 'center' }}>
            <h1 style={{ ...styles.goldText, fontSize: '60px' }}>{activeCraft.name}</h1>
            <p style={{ letterSpacing: '0.8em', opacity: 0.8 }}>EXPERIENCE ACTIVE</p>
          </div>
        </div>
      )}

      {/* 3. HARDWARE TICKER FRAME (Stays visible always) */}
      <div style={{ position: 'absolute', bottom: 0, width: '100%', height: '30px', background: 'rgba(0,0,0,0.9)', borderTop: '1px solid #d4af37', display: 'flex', alignItems: 'center', zIndex: 150 }}>
        <marquee style={{ color: '#d4af37', fontSize: '11px', letterSpacing: '0.2em' }}>
          SYSTEM STATUS: SOVEREIGN /// ENGINE ACTIVE /// REVENUE OPTIMIZED /// AXIOM OS 360
        </marquee>
      </div>
    </div>
  );
}