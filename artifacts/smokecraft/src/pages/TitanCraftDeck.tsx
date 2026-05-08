import React, { useState, useEffect } from 'react';

/* ─────────────────────────────────────────────
   TITAN CRAFT DECK — Machined Hardware Terminal
   Rotating image carousel per quad, crossfade
───────────────────────────────────────────────── */

const CRAFT_IMAGES: Record<string, string[]> = {
  smoke: [
    '/images/scenes/smokecraft-card.jpg',
    '/images/smoke/smoke_lounge.png',
    '/images/smoke/smoke_woman.png',
    '/images/smoke/smoke_group.png',
    '/images/smoke/smoke_urban.png',
    '/images/smoke/smoke_solo.png',
    '/images/smoke/smoke_selection.png',
    '/images/scenes/social.jpg',
    '/images/scenes/bold.jpg',
    '/images/scenes/reflective.jpg',
  ],
  pour: [
    '/images/scenes/pourcraft-card.jpg',
    '/images/pour/pour_bar.png',
    '/images/pour/pour_cocktail.png',
    '/images/pour/pour_tasting.png',
    '/images/pour/pour_whiskey.png',
    '/images/pour/pour_wine.png',
    '/images/pour/pour_aged.png',
    '/images/scenes/relaxed.jpg',
  ],
  brew: [
    '/images/scenes/brewcraft-card.jpg',
    '/images/brew/brew_outdoor.png',
    '/images/brew/brew_taproom.png',
    '/images/brew/brew_flight.png',
    '/images/brew/brew_pouring.png',
    '/images/brew/brew_barrel.png',
  ],
  vape: [
    '/images/scenes/vapecraft-card.jpg',
    '/images/vape/vape_social.png',
    '/images/vape/vape_hookah.png',
    '/images/vape/vape_modern.png',
    '/images/vape/vape_device.png',
  ],
};

const QUADS = [
  { key: 'smoke', name: 'SMOKECRAFT 360', sub: 'LOCOPOSTAL ANCHORS', gold: true  },
  { key: 'pour',  name: 'POURCRAFT 360',  sub: 'PRESTIGE SPEND',     gold: false },
  { key: 'brew',  name: 'BREWCRAFT 360',  sub: 'PALATE SENTIMENT',   gold: false },
  { key: 'vape',  name: 'VAPECRAFT 360',  sub: 'ENVIRONMENT PULSE',  gold: false },
];

/** Each craft rotates independently on a staggered interval */
function useRotatingIndex(length: number, intervalMs: number, offset: number) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const id = setInterval(() => setIdx(i => (i + 1) % length), intervalMs);
      return () => clearInterval(id);
    }, offset);
    return () => clearTimeout(t);
  }, [length, intervalMs, offset]);
  return idx;
}

function CraftQuad({ craftKey, name, sub, gold }: { craftKey: string; name: string; sub: string; gold: boolean }) {
  const images = CRAFT_IMAGES[craftKey];
  const idx    = useRotatingIndex(images.length, 4500, QUADS.findIndex(q => q.key === craftKey) * 900);
  const prev   = (idx - 1 + images.length) % images.length;

  return (
    <div className="tcd-quad">
      {/* Previous image fades out */}
      <img key={`prev-${craftKey}-${prev}`} src={images[prev]} className="tcd-img tcd-img-out" alt="" />
      {/* Current image fades in */}
      <img key={`cur-${craftKey}-${idx}`}  src={images[idx]}  className="tcd-img tcd-img-in"  alt="" />
      <div className="tcd-vignette"/>
      <div className="tcd-tile-bar">
        <DiamondIcon color={gold ? '#d4af37' : '#c0c0c0'}/>
        <div className="tcd-tile-text">
          <div className={`tcd-tile-name ${gold ? 'tcd-gold' : 'tcd-silver'}`}>{name}</div>
          <div className="tcd-tile-sub">{sub}</div>
        </div>
      </div>
      <div className={`tcd-corner-tl ${gold ? 'tcd-gold-border' : 'tcd-silver-border'}`}/>
      <div className={`tcd-corner-br ${gold ? 'tcd-gold-border' : 'tcd-silver-border'}`}/>
    </div>
  );
}

const DiamondIcon = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <polygon points="8,1 15,8 8,15 1,8" stroke={color} strokeWidth="1.2" fill={`${color}22`}/>
    <polygon points="8,4 12,8 8,12 4,8" fill={`${color}44`}/>
  </svg>
);

const TitanCraftDeck = () => (
  <div className="tcd-chassis">

    {/* ── LEFT PANEL ── */}
    <div className="tcd-left">
      <div className="tcd-titan-logo">
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
          <polygon points="14,2 26,24 2,24" stroke="#d4af37" strokeWidth="1.5" fill="none"/>
          <polygon points="14,8 21,22 7,22" fill="rgba(212,175,55,0.18)" stroke="#d4af37" strokeWidth="0.8"/>
          <circle cx="14" cy="16" r="2" fill="#d4af37"/>
        </svg>
        <span className="tcd-titan-lbl">Titan<br/>Engine</span>
      </div>
      <div className="tcd-telem">
        {[['TELEMETRY','117'],['DATA MOD','3.9A'],['KAPMAN','50K']].map(([k,v]) => (
          <div key={k} className="tcd-telem-row">
            <span className="tcd-telem-key">{k}</span>
            <span className="tcd-telem-val">{v}</span>
          </div>
        ))}
      </div>
      <div className="tcd-grips">
        {Array.from({length:8}).map((_,i) => <div key={i} className="tcd-grip"/>)}
      </div>
    </div>

    {/* ── CENTER ── */}
    <div className="tcd-center">

      <div className="tcd-top-bezel">
        <div className="tcd-engine-badge">
          <span className="tcd-green-dot"/>
          <span className="tcd-engine-txt">TITAN ENGINE ACTIVE</span>
        </div>
        <span className="tcd-wordmark">Axiom OS</span>
        <div className="tcd-kiosk-badge">
          <span className="tcd-kiosk-txt">KIOSK LOCK: ABSOLUTE</span>
          <span className="tcd-green-dot"/>
        </div>
      </div>

      <div className="tcd-screen">
        <div className="tcd-screen-glow"/>
        <div className="tcd-grid">
          {QUADS.map(q => <CraftQuad key={q.key} craftKey={q.key} name={q.name} sub={q.sub} gold={q.gold}/>)}
        </div>
        <div className="tcd-seam-h"/>
        <div className="tcd-seam-v"/>
        <div className="tcd-orb"/>
      </div>

      <div className="tcd-bottom-bezel">
        <div className="tcd-coin-tap">
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" style={{marginRight:6,flexShrink:0}}>
            <path d="M5 9 Q9 4 13 9 Q9 14 5 9Z" stroke="#d4af37" strokeWidth="1.2" fill="none"/>
            <circle cx="9" cy="9" r="1.5" fill="#d4af37"/>
          </svg>
          <span className="tcd-coin-txt">AXIOM COIN TAP</span>
        </div>
        <div className="tcd-ticker-wrap">
          <div className="tcd-ticker">
            {'>>> REVENUE OPTIMIZED · SYSTEM STATUS: SOVEREIGN · AXIOM NODE: CONNECTED · CRAFT PORTALS: 04 >>>'}
          </div>
        </div>
      </div>
    </div>

    {/* ── RIGHT PANEL ── */}
    <div className="tcd-right">
      <div className="tcd-dial">
        <div className="tcd-dial-inner"><div className="tcd-dial-dot"/></div>
        {Array.from({length:12}).map((_,i) => (
          <div key={i} className="tcd-notch" style={{transform:`translate(-50%,-28px) rotate(${i*30}deg) translateY(-16px)`}}/>
        ))}
      </div>
      <div className="tcd-btns">
        {[0,1,2].map(i => <div key={i} className="tcd-btn"><div className="tcd-btn-inner"/></div>)}
      </div>
      <div className="tcd-grips">
        {Array.from({length:8}).map((_,i) => <div key={i} className="tcd-grip"/>)}
      </div>
    </div>

    <style>{`
      :root {
        --gold:   linear-gradient(180deg,#fff9e6 0%,#d4af37 45%,#b8860b 75%,#8a6d3b 100%);
        --silver: linear-gradient(180deg,#ffffff 0%,#c0c0c0 50%,#4d4d4d 100%);
        --gold-rim: 1.5px solid #d4af37;
        --gold-dim: 1px solid rgba(212,175,55,0.35);
        --carbon: repeating-linear-gradient(135deg,#1c1c1c 0px,#1c1c1c 2px,#141414 2px,#141414 8px);
      }
      .tcd-chassis { position:fixed; inset:0; display:flex; background:var(--carbon); overflow:hidden; }

      /* ── LEFT ── */
      .tcd-left {
        width:84px; flex-shrink:0; display:flex; flex-direction:column; align-items:center;
        padding:16px 0 10px; background:linear-gradient(180deg,#1a1a1a,#0f0f0f);
        border-right:var(--gold-rim); gap:14px;
      }
      .tcd-titan-logo { display:flex; flex-direction:column; align-items:center; gap:5px; }
      .tcd-titan-lbl  {
        font-size:8px; letter-spacing:.2em; text-align:center; line-height:1.4;
        background:var(--gold); -webkit-background-clip:text; -webkit-text-fill-color:transparent;
        font-family:monospace; font-weight:900;
      }
      .tcd-telem { display:flex; flex-direction:column; gap:5px; width:100%; padding:0 8px; }
      .tcd-telem-row {
        display:flex; flex-direction:column;
        background:rgba(212,175,55,0.06); border:0.5px solid rgba(212,175,55,0.2);
        border-radius:2px; padding:3px 5px;
      }
      .tcd-telem-key { font-size:6.5px; letter-spacing:.12em; color:#6b5a3a; font-family:monospace; }
      .tcd-telem-val {
        font-size:11px; font-weight:900; letter-spacing:.1em; font-family:monospace;
        background:var(--gold); -webkit-background-clip:text; -webkit-text-fill-color:transparent;
      }
      .tcd-grips { margin-top:auto; display:flex; flex-direction:column; gap:5px; padding:0 14px; width:100%; }
      .tcd-grip  { height:3px; border-radius:2px; background:linear-gradient(90deg,#2a2a2a,#d4af3755,#2a2a2a); }

      /* ── CENTER ── */
      .tcd-center { flex:1; display:flex; flex-direction:column; min-width:0; }

      /* ── TOP BEZEL ── */
      .tcd-top-bezel {
        height:36px; flex-shrink:0; display:flex; align-items:center; justify-content:space-between;
        padding:0 12px; background:linear-gradient(180deg,#111,#0a0a0a); border-bottom:var(--gold-rim); gap:8px;
      }
      .tcd-engine-badge { display:flex; align-items:center; gap:5px; flex-shrink:0; }
      .tcd-green-dot {
        display:inline-block; width:6px; height:6px; border-radius:50%;
        background:#00e676; box-shadow:0 0 6px #00e676; animation:tcd-pulse 2s infinite; flex-shrink:0;
      }
      .tcd-engine-txt {
        font-size:8px; letter-spacing:.2em; font-family:monospace; font-weight:700; white-space:nowrap;
        background:var(--gold); -webkit-background-clip:text; -webkit-text-fill-color:transparent;
      }
      .tcd-wordmark {
        font-size:14px; font-weight:900; letter-spacing:.5em; font-family:monospace; white-space:nowrap; flex-shrink:0;
        background:var(--gold); -webkit-background-clip:text; -webkit-text-fill-color:transparent;
      }
      .tcd-kiosk-badge { display:flex; align-items:center; gap:5px; flex-shrink:0; }
      .tcd-kiosk-txt {
        font-size:8px; letter-spacing:.15em; font-family:monospace; white-space:nowrap;
        background:var(--silver); -webkit-background-clip:text; -webkit-text-fill-color:transparent;
      }

      /* ── SCREEN ── */
      .tcd-screen {
        flex:1; position:relative; background:#030303; overflow:hidden;
        box-shadow:inset 0 0 40px rgba(0,0,0,.8),inset 0 0 1px rgba(212,175,55,.2);
      }
      .tcd-screen-glow {
        position:absolute; inset:0; pointer-events:none; z-index:50;
        background:radial-gradient(ellipse 60% 40% at 50% 0%,rgba(212,175,55,.06) 0%,transparent 70%);
      }
      .tcd-grid {
        position:absolute; inset:0; display:grid;
        grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr;
      }

      /* ── QUAD + CROSSFADE ── */
      .tcd-quad     { position:relative; overflow:hidden; }
      .tcd-img      {
        position:absolute; inset:0; width:100%; height:100%;
        object-fit:cover; object-position:50% 20%; display:block;
        filter:brightness(.75) saturate(1.1);
      }
      .tcd-img-in  { animation:tcd-fadein 1.2s ease forwards; z-index:2; }
      .tcd-img-out { opacity:0; z-index:1; }
      .tcd-vignette {
        position:absolute; inset:0; pointer-events:none; z-index:5;
        background:radial-gradient(ellipse 90% 90% at 50% 50%,transparent 30%,rgba(0,0,0,.55) 100%);
      }
      .tcd-tile-bar {
        position:absolute; bottom:0; left:0; right:0;
        display:flex; align-items:center; gap:7px; padding:8px 10px 10px;
        background:linear-gradient(0deg,rgba(0,0,0,.88) 0%,transparent 100%); z-index:10;
      }
      .tcd-tile-text { min-width:0; }
      .tcd-tile-name {
        font-size:9px; font-weight:900; letter-spacing:.22em; font-family:monospace;
        white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
      }
      .tcd-tile-sub  { font-size:7px; letter-spacing:.18em; color:rgba(255,255,255,.35); font-family:monospace; margin-top:1px; white-space:nowrap; }
      .tcd-gold   { background:var(--gold);   -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
      .tcd-silver { background:var(--silver); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
      .tcd-corner-tl,.tcd-corner-br { position:absolute; width:14px; height:14px; z-index:10; }
      .tcd-corner-tl { top:0; left:0; border-top:1.5px solid transparent; border-left:1.5px solid transparent; }
      .tcd-corner-br { bottom:0; right:0; border-bottom:1.5px solid transparent; border-right:1.5px solid transparent; }
      .tcd-gold-border   { border-color:#d4af37!important; }
      .tcd-silver-border { border-color:#888!important; }

      /* Seams + orb */
      .tcd-seam-h {
        position:absolute; top:50%; left:0; right:0; height:1px;
        background:linear-gradient(90deg,transparent,rgba(212,175,55,.55) 20%,rgba(212,175,55,.55) 80%,transparent);
        transform:translateY(-50%); z-index:30; pointer-events:none;
      }
      .tcd-seam-v {
        position:absolute; left:50%; top:0; bottom:0; width:1px;
        background:linear-gradient(180deg,transparent,rgba(212,175,55,.55) 15%,rgba(212,175,55,.55) 85%,transparent);
        transform:translateX(-50%); z-index:30; pointer-events:none;
      }
      .tcd-orb {
        position:absolute; top:calc(50% - 6px); left:calc(50% - 6px);
        width:12px; height:12px; border-radius:50%;
        background:radial-gradient(circle,#fff9e6 0%,#d4af37 55%,#8a6d3b 100%);
        border:1.5px solid rgba(255,255,255,.6);
        animation:tcd-breathe 3s ease-in-out infinite; z-index:40; pointer-events:none;
      }

      /* ── BOTTOM BEZEL ── */
      .tcd-bottom-bezel {
        height:36px; flex-shrink:0; display:flex; align-items:center;
        background:linear-gradient(180deg,#0a0a0a,#111); border-top:var(--gold-rim); overflow:hidden;
      }
      .tcd-coin-tap { display:flex; align-items:center; padding:0 12px; border-right:var(--gold-dim); flex-shrink:0; }
      .tcd-coin-txt {
        font-size:8px; letter-spacing:.28em; font-family:monospace; font-weight:700; white-space:nowrap;
        background:var(--gold); -webkit-background-clip:text; -webkit-text-fill-color:transparent;
      }
      .tcd-ticker-wrap { flex:1; overflow:hidden; padding-left:10px; }
      .tcd-ticker {
        white-space:nowrap; animation:tcd-marquee 35s linear infinite;
        font-size:8px; font-weight:700; letter-spacing:.3em; font-family:monospace;
        background:var(--gold); -webkit-background-clip:text; -webkit-text-fill-color:transparent;
      }

      /* ── RIGHT PANEL ── */
      .tcd-right {
        width:72px; flex-shrink:0; display:flex; flex-direction:column; align-items:center;
        padding:14px 0 10px; background:linear-gradient(180deg,#1a1a1a,#0f0f0f);
        border-left:var(--gold-rim); gap:16px;
      }
      .tcd-dial {
        width:46px; height:46px; border-radius:50%; position:relative;
        background:radial-gradient(circle at 35% 35%,#3a3a3a 0%,#1a1a1a 60%,#0a0a0a 100%);
        border:2px solid #d4af37; box-shadow:0 0 0 1px #8a6d3b,0 4px 12px rgba(0,0,0,.6); flex-shrink:0;
      }
      .tcd-dial-inner {
        position:absolute; inset:6px; border-radius:50%;
        background:radial-gradient(circle at 40% 40%,#2a2a2a 0%,#111 100%);
        display:flex; align-items:center; justify-content:center;
      }
      .tcd-dial-dot { width:6px; height:6px; border-radius:50%; background:#d4af37; box-shadow:0 0 6px #d4af37; }
      .tcd-notch { position:absolute; width:2px; height:6px; background:#d4af37; border-radius:1px; top:50%; left:50%; transform-origin:50% 28px; }
      .tcd-notch:nth-child(2n) { background:#444; }
      .tcd-btns { display:flex; flex-direction:column; gap:8px; }
      .tcd-btn  {
        width:36px; height:18px; border-radius:4px;
        background:linear-gradient(180deg,#2a2a2a,#111); border:1px solid #d4af37;
        box-shadow:0 2px 6px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.08);
        display:flex; align-items:center; justify-content:center;
      }
      .tcd-btn-inner { width:18px; height:3px; border-radius:2px; background:linear-gradient(90deg,#8a6d3b,#d4af37,#8a6d3b); }

      /* ── KEYFRAMES ── */
      @keyframes tcd-fadein  { from{opacity:0} to{opacity:1} }
      @keyframes tcd-breathe { 0%,100%{box-shadow:0 0 14px 3px #d4af37aa} 50%{box-shadow:0 0 32px 8px #d4af37ee} }
      @keyframes tcd-marquee { from{transform:translateX(100%)} to{transform:translateX(-100%)} }
      @keyframes tcd-pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }

      /* ── RESPONSIVE ── */
      @media (max-width:600px) {
        .tcd-left,.tcd-right { display:none; }
        .tcd-engine-txt      { display:none; }
        .tcd-wordmark  { font-size:11px; letter-spacing:.3em; }
        .tcd-kiosk-txt { font-size:7px; letter-spacing:.08em; }
        .tcd-tile-name { font-size:8px; letter-spacing:.15em; }
      }
      @media (max-width:900px) and (orientation:landscape) {
        .tcd-left,.tcd-right { width:58px; }
        .tcd-wordmark  { font-size:12px; letter-spacing:.35em; }
        .tcd-engine-txt,.tcd-kiosk-txt { font-size:7px; }
      }
    `}</style>
  </div>
);

export default TitanCraftDeck;
