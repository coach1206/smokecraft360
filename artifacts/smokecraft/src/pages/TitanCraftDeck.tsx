import React, { useState } from 'react';

export default function TitanCraftDeck() {
  const [activeCraft, setActiveCraft] = useState<any>(null);

  // --- STYLES ---
  const styles: Record<string, React.CSSProperties> = {
    shell: { height: '100vh', width: '100vw', backgroundColor: '#050505', overflow: 'hidden', position: 'relative', color: '#fff', fontFamily: 'monospace' },
    hubGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', height: '100%', width: '100%', gap: '4px' },
    quadrant: { position: 'relative', overflow: 'hidden', cursor: 'pointer' },
    envStage: { position: 'absolute', inset: 0, zIndex: 100, backgroundSize: 'cover', backgroundPosition: 'center' },
    goldText: { fontWeight: '900', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#d4af37' },
    // THE NEW ACTION BUTTON
    actionBtn: { 
      padding: '20px 40px', 
      background: 'linear-gradient(180deg, #D4AF37 0%, #8A6D3B 100%)', 
      color: '#000', 
      border: 'none', 
      fontWeight: 'bold', 
      fontSize: '18px', 
      cursor: 'pointer', 
      letterSpacing: '0.2em',
      marginTop: '20px',
      boxShadow: '0 0 20px rgba(212,175,55,0.4)'
    },
    backBtn: { position: 'absolute', top: '40px', left: '40px', zIndex: 400, padding: '10px 20px', background: 'rgba(0,0,0,0.8)', border: '1px solid #d4af37', color: '#d4af37', cursor: 'pointer' }
  };

  const startExperience = (id: string) => {
    console.log(`Starting Experience for: ${id}`);
    window.location.href = id === "smoke" ? "/smokecraft" : `/experience/${id}`;
  };

  const CRAFT_DATA = [
    { id: 'smoke', name: 'SMOKECRAFT', img: '/images/scenes/smokecraft-card.jpg' },
    { id: 'pour', name: 'POURCRAFT', img: '/images/scenes/pourcraft-card.jpg' },
    { id: 'brew', name: 'BREWCRAFT', img: '/images/scenes/brewcraft-card.jpg' },
    { id: 'vape', name: 'VAPECRAFT', img: '/images/scenes/vapecraft-card.jpg' }
  ];

  return (
    <div style={styles.shell}>
      {!activeCraft ? (
        <div style={styles.hubGrid}>
          {CRAFT_DATA.map((c) => (
            <div key={c.id} style={styles.quadrant} onClick={() => setActiveCraft(c)}>
              <img src={c.img} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} alt={c.name} />
              <div style={{ position: 'absolute', bottom: '30px', left: '30px' }}>
                <h2 style={styles.goldText}>{c.name}</h2>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ ...styles.envStage, backgroundImage: `url(${activeCraft.img})` }}>
          <button style={styles.backBtn} onClick={() => setActiveCraft(null)}>‹ RETURN TO HUB</button>

          <div style={{ position: 'absolute', bottom: '15%', width: '100%', textAlign: 'center' }}>
            <h1 style={{ ...styles.goldText, fontSize: '4.5rem', margin: 0 }}>{activeCraft.name}</h1>

            {/* THIS IS WHAT WAS MISSING: THE TRIGGER */}
            <button 
              style={styles.actionBtn} 
              onClick={() => startExperience(activeCraft.id)}
            >
              ENTER EXPERIENCE ›
            </button>

            <p style={{ letterSpacing: '0.5em', opacity: 0.6, marginTop: '20px' }}>
              INITIALIZE SOVEREIGN PROTOCOL
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
