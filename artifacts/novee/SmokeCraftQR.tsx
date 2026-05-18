import React from "react";
import { useAppState } from "./App";

const GOLD = "#d4af37";

export default function SmokeCraftQR() {
  const { playClick } = useAppState();

  return (
    <div className="w-full h-full flex flex-col justify-between p-8 bg-[#05070b] text-neutral-100 font-sans border border-amber-500/10 rounded-2xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-amber-500/5 blur-xl group-hover:bg-amber-500/10 transition-all duration-500 pointer-events-none"></div>
      
      <div className="text-center space-y-2 relative z-10">
        <span className="text-xs text-amber-500 font-mono tracking-[0.4em] uppercase block">SYSTEM INITIALIZATION</span>
        <h1 className="text-4xl font-extralight tracking-[0.2em] text-neutral-100 uppercase leading-tight">
          SMOKECRAFT <span className="text-amber-500 font-light">360</span>
        </h1>
        <p className="text-[10px] tracking-[0.4em] text-neutral-500 uppercase font-mono pt-1">
          ENVIRONMENTAL ADAPTATION PORTAL
        </p>
      </div>

      <div className="flex flex-col items-center justify-center my-auto relative z-10">
        <div className="bg-white p-4 rounded-xl border-2 border-amber-500/30 shadow-2xl">
          <svg width="220" height="220" viewBox="0 0 29 29" className="shape-rendering-crispedges">
            <path d="M0 0h7v7H0zm22 0h7v7h-7zM0 22h7v7H0zm9 0h2v2H9zm2 2h2v3h-2zm4-2h2v2h-2zm2 2h3v2h-3zm3-2h2v2h-2zm-5 5h2v2h-2zm4 0h3v2h-3zM2 2h3v3H2zm20 0h3v3h-3zM2 24h3v3H2zm7-22h2v3H9zm4 0h2v2h-2zm0 4h2v3h-2zm4-4h4v2h-4zm2 3h2v4h-2zm-4 3h2v2h-2zm1 3h2v2h-2zm-5-1h3v2H9zm4 2h2v2h-2zm5-2h2v2h-2zm0 3h4v2h-4zm-9 1h2v2H9zm4 2h2v2h-2zm-4 2h3v1H9z" fill="#000000"/>
            <path d="M9 3h2v2H9zm4 2h2v2h-2zm4-4h2v2h-2zm-5 7h4v2h-4zm7-1h3v2h-3zm1 4h2v3h-2zm-5-1h2v3h-2zm7 5h2v3h-2zm-3 2h2v2h-2zm1 3h4v2h-4z" fill={GOLD}/>
          </svg>
        </div>
        <div className="mt-4 text-center space-y-1">
          <span className="text-[10px] font-mono tracking-[0.3em] text-amber-500 uppercase block animate-pulse">
            • MOBILE REPLICATION SYNC READY
          </span>
          <span className="text-xs text-neutral-400 font-sans tracking-wide">
            Scan to Sync Handheld Ritual
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-[11px] font-mono relative z-10">
        <div className="flex items-center gap-2 text-neutral-400">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          MATRIX REPLICATION LINK // LIVE
        </div>
        <span className="text-amber-500/60 uppercase tracking-widest text-[10px]">NOVEE OS Matrix Sync</span>
      </div>
    </div>
  );
}
