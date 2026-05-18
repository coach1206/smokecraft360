import { useState, useEffect } from 'react';
import { useAppState } from '../App';

const GOLD = '#d4af37';

export default function SmokeCraftQR() {
  const { profile } = useAppState();
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 2000);
    return () => clearInterval(t);
  }, []);

  const sessionCode = `SC-${profile.name.toUpperCase().slice(0, 2)}${profile.running_score}`;

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, boxSizing: 'border-box', gap: 24,
      fontFamily: "'Inter', sans-serif",
    }}>
      <p style={{
        fontSize: 10, color: '#444', letterSpacing: '0.15em',
        textTransform: 'uppercase', margin: 0,
      }}>
        Portal Sync
      </p>

      {/* QR placeholder */}
      <div style={{
        width: 160, height: 160, borderRadius: 12,
        border: `1px solid ${pulse ? GOLD : '#333'}`,
        background: '#0a0c10', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'border-color 0.8s',
      }}>
        {/* Minimal QR-like grid */}
        <svg width="100" height="100" viewBox="0 0 100 100" style={{ opacity: 0.6 }}>
          <rect x="5"  y="5"  width="38" height="38" rx="4" fill="none" stroke={GOLD} strokeWidth="3"/>
          <rect x="15" y="15" width="18" height="18" rx="2" fill={GOLD} opacity="0.7"/>
          <rect x="57" y="5"  width="38" height="38" rx="4" fill="none" stroke={GOLD} strokeWidth="3"/>
          <rect x="67" y="15" width="18" height="18" rx="2" fill={GOLD} opacity="0.7"/>
          <rect x="5"  y="57" width="38" height="38" rx="4" fill="none" stroke={GOLD} strokeWidth="3"/>
          <rect x="15" y="67" width="18" height="18" rx="2" fill={GOLD} opacity="0.7"/>
          <rect x="57" y="57" width="6"  height="6"  fill={GOLD} opacity="0.5"/>
          <rect x="67" y="57" width="6"  height="6"  fill={GOLD} opacity="0.5"/>
          <rect x="77" y="57" width="6"  height="6"  fill={GOLD} opacity="0.5"/>
          <rect x="57" y="67" width="6"  height="6"  fill={GOLD} opacity="0.5"/>
          <rect x="77" y="67" width="6"  height="6"  fill={GOLD} opacity="0.5"/>
          <rect x="57" y="77" width="6"  height="6"  fill={GOLD} opacity="0.5"/>
          <rect x="67" y="77" width="6"  height="6"  fill={GOLD} opacity="0.5"/>
          <rect x="87" y="77" width="6"  height="6"  fill={GOLD} opacity="0.5"/>
        </svg>
        <p style={{ fontSize: 9, color: '#444', margin: 0, letterSpacing: '0.1em' }}>SCAN TO SYNC</p>
      </div>

      {/* Session code */}
      <div style={{
        padding: '10px 20px', borderRadius: 8,
        border: '1px solid #1a1a1a', background: '#0d0f12',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 9, color: '#444', margin: '0 0 4px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Session Code
        </p>
        <p style={{ fontSize: 18, color: GOLD, margin: 0, letterSpacing: '0.2em', fontWeight: 700 }}>
          {sessionCode}
        </p>
      </div>

      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: pulse ? '#3ecf6e' : '#2a8a4a',
          boxShadow: pulse ? '0 0 8px #3ecf6e' : 'none',
          transition: 'all 0.8s',
        }} />
        <p style={{ fontSize: 11, color: '#555', margin: 0, letterSpacing: '0.1em' }}>
          Kiosk linked · Awaiting selection
        </p>
      </div>

      <div style={{ marginTop: 'auto', width: '100%' }}>
        <div style={{
          padding: '12px 16px', borderRadius: 8, border: '1px solid #1a1a1a',
          background: '#0d0f12',
        }}>
          <p style={{ fontSize: 9, color: '#333', margin: '0 0 6px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Guest Profile
          </p>
          <p style={{ fontSize: 12, color: '#777', margin: '2px 0' }}>
            <span style={{ color: '#444' }}>Name · </span>{profile.name}
          </p>
          {profile.ageRange && (
            <p style={{ fontSize: 12, color: '#777', margin: '2px 0' }}>
              <span style={{ color: '#444' }}>Age · </span>{profile.ageRange}
            </p>
          )}
          {profile.preferences && (
            <p style={{ fontSize: 12, color: '#777', margin: '2px 0' }}>
              <span style={{ color: '#444' }}>Style · </span>{profile.preferences}
            </p>
          )}
          <p style={{ fontSize: 12, color: GOLD, margin: '6px 0 0' }}>
            Score · {profile.running_score}
          </p>
        </div>
      </div>
    </div>
  );
}
