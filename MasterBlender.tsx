import React, { useState } from 'react';
import { useAppState } from './App';

const PREMIUM_PAIRINGS = [
  {
    id: 'yamazaki',
    name: 'Yamazaki 12 Year Single Malt',
    type: 'Japanese Whisky',
    notes: 'Peach, pineapple, grapefruit, clove, candied orange, Mizunara (Japanese oak).',
    imgUrl: 'https://images.unsplash.com/photo-1527281473228-791021ec1345?auto=format&fit=crop&w=400&q=80',
    bgGradient: 'from-amber-950/40 to-yellow-950/20'
  },
  {
    id: 'macallan',
    name: 'The Macallan Sherry Oak 18',
    type: 'Single Malt Scotch',
    notes: 'Dried fruits, ginger, rich cinnamon, heavy clove, toasted mature oak.',
    imgUrl: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=400&q=80',
    bgGradient: 'from-orange-950/40 to-red-950/20'
  }
];

export default function MasterBlender() {
  const { profile, setCurrentView, playClick } = useAppState();
  const [ringGauge, setRingGauge] = useState(50);
  const [selectedLeaf, setSelectedLeaf] = useState('Ligero');
  const [activePairing, setActivePairing] = useState('yamazaki');

  const visualRadius = 35 + (ringGauge - 30) * 0.8;

  const handleReset = () => {
    playClick();
    setCurrentView('welcome');
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-4 bg-black/40 text-neutral-100 font-sans">

      {/* Top Bar Header */}
      <div className="border-b border-neutral-800 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light tracking-widest text-amber-500 uppercase">SMOKECRAFT 360</h1>
          <p className="text-xs tracking-widest text-neutral-400 mt-1 uppercase">Environmental Adaptation Engine</p>
        </div>
        <div className="text-right flex items-center gap-4">
          <div className="text-xs font-mono bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded text-neutral-400">
            ACTIVE SESSION: <span className="text-amber-400 font-bold">{profile.name || 'UNAUTHENTICATED'}</span>
          </div>
          <button 
            onClick={handleReset}
            className="text-xs font-mono text-amber-500/80 bg-amber-950/30 border border-amber-500/20 px-4 py-1.5 rounded-full uppercase tracking-widest hover:bg-amber-500 hover:text-black transition-all"
          >
            Reset Ritual
          </button>
        </div>
      </div>

      {/* Main Interactive Workspace Grid */}
      <div className="grid grid-cols-12 gap-6 my-auto items-stretch">

        {/* Left Side: Customizations & Active Sliders */}
        <div className="col-span-7 bg-neutral-900/40 border border-neutral-800 rounded-xl p-6 flex flex-col justify-between space-y-6">

          {/* Leaf Selector */}
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-widest text-neutral-400 font-mono">1. Leaf Morphology Profile</label>
            <div className="grid grid-cols-3 gap-4">
              {['Volado', 'Seco', 'Ligero'].map((leaf) => (
                <button
                  key={leaf}
                  onClick={() => { playClick(); setSelectedLeaf(leaf); }}
                  className={`py-4 rounded-lg border text-sm font-medium tracking-wider transition-all uppercase ${
                    selectedLeaf === leaf 
                      ? 'bg-gradient-to-b from-amber-950/50 to-neutral-900 border-amber-500 text-amber-400 shadow-lg' 
                      : 'bg-neutral-950/80 border-neutral-800 text-neutral-500 hover:border-neutral-700'
                  }`}
                >
                  {leaf}
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-500 italic px-1">
              Currently loaded: <span className="text-amber-500/80 font-mono font-bold">{selectedLeaf}</span> leaf profile details applied to active blend session.
            </p>
          </div>

          {/* Interactive Responsive Ring Gauge Visualizer */}
          <div className="space-y-4 pt-4 border-t border-neutral-800/60">
            <label className="text-xs uppercase tracking-widest text-neutral-400 font-mono">2. Vitola Dimension Calibration</label>

            <div className="flex flex-col items-center bg-neutral-950/60 border border-neutral-800 rounded-xl p-6">
              <div className="w-44 h-44 flex items-center justify-center relative mb-4">
                <svg width="160" height="160" viewBox="0 0 160 160">
                  <circle 
                    cx="80" 
                    cy="80" 
                    r={visualRadius} 
                    className="fill-amber-950/30 stroke-amber-500 transition-all duration-150 ease-out" 
                    strokeWidth="3"
                    strokeDasharray="6 3"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl font-bold tracking-tight text-neutral-100">{ringGauge}</span>
                  <span className="text-[10px] text-neutral-400 tracking-widest uppercase mt-0.5">Ring Gauge</span>
                </div>
              </div>

              <input 
                type="range" 
                min="30" 
                max="64" 
                value={ringGauge}
                onChange={(e) => setRingGauge(Number(e.target.value))}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500 transition-all"
              />
              <div className="w-full flex justify-between text-[10px] text-neutral-500 mt-2 font-mono uppercase tracking-widest">
                <span>30 (Slim Vitola)</span>
                <span>64 (Heavy Vitola)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: High-End Visual Pairings Panel */}
        <div className="col-span-5 bg-neutral-900/40 border border-neutral-800 rounded-xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <label className="text-xs uppercase tracking-widest text-neutral-400 font-mono block">3. Luxury Spirits Pairing Matrix</label>

            <div className="flex gap-4 border-b border-neutral-800 pb-3">
              {PREMIUM_PAIRINGS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { playClick(); setActivePairing(p.id); }}
                  className={`text-xs uppercase font-mono tracking-wider pb-1 transition-all ${
                    activePairing === p.id 
                      ? 'text-amber-500 border-b-2 border-amber-500 font-bold' 
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {p.type}
                </button>
              ))}
            </div>

            {PREMIUM_PAIRINGS.map((p) => p.id === activePairing && (
              <div key={p.id} className={`rounded-xl overflow-hidden border border-amber-500/10 bg-gradient-to-b ${p.bgGradient} transition-all duration-300`}>
                <div className="h-44 w-full overflow-hidden relative">
                  <img 
                    src={p.imgUrl} 
                    alt={p.name} 
                    className="w-full h-full object-cover mix-blend-luminosity hover:mix-blend-normal transition-all duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent"></div>
                </div>
                <div className="p-5 space-y-2">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-amber-500">{p.type}</span>
                  <h3 className="text-xl font-light tracking-wide text-neutral-100">{p.name}</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed font-sans pt-1">{p.notes}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Metric Status Readout Blocks */}
          <div className="pt-4 border-t border-neutral-800/60 mt-4">
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-4 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 block">Current Target Score</span>
                <span className="text-2xl font-bold text-neutral-100 font-mono tracking-tight">{profile.running_score} <span className="text-sm font-light text-neutral-400">PTS</span></span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 block">E.A.T. Profile Status</span>
                <span className="text-xs font-mono font-medium text-amber-500 uppercase tracking-widest">Optimized & Live</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Footer Alert System */}
      <div className="mt-4 flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-neutral-400">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          ENVIRONMENTAL ADAPTATION LAYER ACTIVE
        </div>
        <span className="text-amber-500/60 uppercase tracking-widest text-[10px]">NOVEE OS Matrix Sync</span>
      </div>

    </div>
  );
}