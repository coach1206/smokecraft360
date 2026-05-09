import React from 'react';

export default function TitanCraftDeck() {
  // WE ARE FORCING IT TO STAY ON SMOKECRAFT NO MATTER WHAT
  const sceneImage = '/images/scenes/smokecraft-card.jpg';

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      backgroundColor: '#000', 
      margin: 0, 
      padding: 0,
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* FULL SCREEN BACKGROUND - NO CONTAIN, NO ZOOM */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${sceneImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: 1
      }} />

      {/* HARDWARE OVERLAY */}
      <div style={{ 
        position: 'absolute', 
        inset: 0, 
        zIndex: 10, 
        border: '20px solid rgba(212,175,55,0.1)',
        pointerEvents: 'none' 
      }} />

      <div style={{ 
        position: 'absolute', 
        bottom: '10%', 
        width: '100%', 
        textAlign: 'center', 
        zIndex: 20 
      }}>
        <h1 style={{ 
          color: '#d4af37', 
          fontSize: '5rem', 
          fontWeight: '900', 
          letterSpacing: '0.5em',
          textShadow: '0 0 20px rgba(0,0,0,0.8)' 
        }}>
          SMOKECRAFT
        </h1>
        <p style={{ color: '#fff', letterSpacing: '1em' }}>LOOP TERMINATED /// SYSTEM LOCKED</p>
      </div>
    </div>
  );
}
