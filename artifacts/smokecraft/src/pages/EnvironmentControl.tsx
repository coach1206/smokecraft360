import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, Trash2, Zap } from "lucide-react";

type AssetType = "Circular Table" | "Square Booth" | "VIP Lounge Couch" | "Main Bar Module";

interface FloorItem {
  id:    string;
  type:  AssetType;
  x:     number;
  y:     number;
  label: string;
  seats: number;
}

const ASSET_META: Record<AssetType, { icon: string; color: string }> = {
  "Circular Table":   { icon: "⬤", color: "#d4af37" },
  "Square Booth":     { icon: "■", color: "#c0a030" },
  "VIP Lounge Couch": { icon: "▬", color: "#ffb300" },
  "Main Bar Module":  { icon: "═", color: "#e8c040" },
};

const ASSET_TYPES: AssetType[] = [
  "Circular Table", "Square Booth", "VIP Lounge Couch", "Main Bar Module",
];

function playClick() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = 3400;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.09);
  } catch { /* silent */ }
}

export default function EnvironmentControl() {
  const [, navigate]    = useLocation();
  const [tables,        setTables]       = useState<FloorItem[]>([]);
  const [activeId,      setActiveId]     = useState<string | null>(null);
  const [drawerTable,   setDrawerTable]  = useState<FloorItem | null>(null);
  const [editLabel,     setEditLabel]    = useState("");
  const [isDragOver,    setIsDragOver]   = useState(false);
  const gridRef         = useRef<HTMLDivElement>(null);

  function handleDragStart(e: React.DragEvent, type: AssetType) {
    e.dataTransfer.setData("assetType", type);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const type = e.dataTransfer.getData("assetType") as AssetType;
    if (!type || !gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left - 56, rect.width  - 128));
    const y = Math.max(0, Math.min(e.clientY - rect.top  - 56, rect.height - 128));
    const num = tables.length + 1;
    const id  = `tbl_${Date.now()}`;
    const label = `TABLE ${String(num).padStart(2, "0")}`;
    playClick();
    setTables(prev => [...prev, { id, type, x, y, label, seats: 4 }]);
    setActiveId(id);
    setEditLabel(label);
  }

  function tapTable(e: React.MouseEvent, table: FloorItem) {
    e.stopPropagation();
    setActiveId(table.id);
    setEditLabel(table.label);
    setDrawerTable(table);
    playClick();
  }

  function removeActive() {
    if (!activeId) return;
    setTables(prev => prev.filter(t => t.id !== activeId));
    setActiveId(null); setEditLabel(""); setDrawerTable(null);
  }

  function goToTransaction(table: FloorItem) {
    playClick();
    const num = table.label.replace("TABLE ", "").trim();
    setDrawerTable(null);
    navigate(`/transaction?table=${num}`);
  }

  const activeTable = tables.find(t => t.id === activeId) ?? null;

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-black select-none">

      {/* Header */}
      <header className="flex items-center justify-between px-6 border-b-2 border-[#1c1c1c] bg-[#060606]"
        style={{ minHeight: 70 }}>
        <div className="flex items-center gap-5">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-[#d4af37] font-mono font-black text-lg tracking-widest border border-[#d4af37]/35 rounded-xl px-5 py-2.5 hover:bg-[#d4af37]/10 transition-all active:scale-95">
            <ArrowLeft size={18} /> BACK
          </button>
          <div>
            <span className="text-[#d4af37] font-mono font-black text-3xl tracking-widest">[ ENVIRONMENT ]</span>
            <span className="text-[#444] font-mono text-xl ml-3 tracking-widest">FLOOR BLUEPRINT DESIGNER</span>
          </div>
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_8px_#4ade80]"
          />
        </div>
        <span className="text-[#333] font-mono text-xl font-bold tracking-widest">
          {tables.length} ELEMENT{tables.length !== 1 ? "S" : ""} PLACED
        </span>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT DRAWER — 35% */}
        <aside className="w-[35%] flex flex-col border-r-2 border-[#181818] bg-[#080808] overflow-y-auto">
          <div className="p-7 border-b border-[#141414]">
            <h2 className="text-[#d4af37] font-mono font-black text-4xl tracking-widest mb-2">ENV DESIGNER</h2>
            <p className="text-[#555] font-mono text-lg leading-relaxed">Drag components onto the grid to calibrate your venue layout.</p>
          </div>

          <div className="flex flex-col gap-4 p-5">
            {ASSET_TYPES.map(type => {
              const meta = ASSET_META[type];
              return (
                /* Outer plain div handles HTML5 native drag (typed as React.DragEvent) */
                <div
                  key={type}
                  draggable
                  onDragStart={e => handleDragStart(e, type)}
                  style={{ touchAction: "manipulation" }}
                >
                  {/* Inner motion.div handles Framer animations only */}
                  <motion.div
                    animate={{
                      boxShadow: [
                        `0 0 0px rgba(212,175,55,0)`,
                        `0 0 22px rgba(212,175,55,0.35)`,
                        `0 0 0px rgba(212,175,55,0)`,
                      ],
                    }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                    whileTap={{ scale: 1.05 }}
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center justify-between bg-[#0e0e0e] border-2 border-[#222] rounded-2xl px-6 py-5 cursor-grab active:cursor-grabbing"
                    style={{ borderColor: "#222" }}
                  >
                    <div className="flex items-center gap-5">
                      <span className="text-4xl" style={{ color: meta.color }}>{meta.icon}</span>
                      <div>
                        <span className="text-white font-mono font-black text-xl tracking-wide block">{type.toUpperCase()}</span>
                        <span className="text-[#444] font-mono text-sm tracking-widest">DRAG TO GRID</span>
                      </div>
                    </div>
                    <motion.span
                      animate={{ rotate: [0, 180, 360] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      className="text-4xl font-black"
                      style={{ color: meta.color }}
                    >+</motion.span>
                  </motion.div>
                </div>
              );
            })}
          </div>

          {/* Active element editor */}
          <AnimatePresence>
            {activeTable && (
              <motion.div
                key={activeTable.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                className="mx-5 mb-5 mt-auto bg-[#0c0c0c] border-2 border-[#d4af37]/20 rounded-2xl p-6"
              >
                <h3 className="text-white font-mono text-2xl font-black tracking-widest mb-5">LAYER PARAMETERS</h3>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#555] font-mono font-bold text-lg">LABEL</span>
                    <input
                      value={editLabel}
                      onChange={e => {
                        const v = e.target.value.toUpperCase();
                        setEditLabel(v);
                        setTables(prev => prev.map(t => t.id === activeTable.id ? { ...t, label: v } : t));
                      }}
                      className="bg-black border border-[#333] text-[#ffb300] font-mono font-black text-xl rounded-xl px-4 py-2 w-2/3 text-right focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#555] font-mono font-bold text-lg">SEATS</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setTables(prev => prev.map(t => t.id === activeTable.id ? { ...t, seats: Math.max(1, t.seats - 1) } : t))}
                        className="w-11 h-11 bg-[#141414] border border-[#2a2a2a] rounded-xl text-white font-mono font-black text-2xl flex items-center justify-center hover:border-[#d4af37] transition-colors">−</button>
                      <span className="text-[#ffb300] font-mono font-black text-3xl w-9 text-center">{activeTable.seats}</span>
                      <button onClick={() => setTables(prev => prev.map(t => t.id === activeTable.id ? { ...t, seats: Math.min(20, t.seats + 1) } : t))}
                        className="w-11 h-11 bg-[#141414] border border-[#2a2a2a] rounded-xl text-white font-mono font-black text-2xl flex items-center justify-center hover:border-[#d4af37] transition-colors">+</button>
                    </div>
                  </div>
                  <button onClick={removeActive}
                    className="flex items-center justify-center gap-2 mt-1 w-full py-3.5 bg-[#160a0a] border border-red-900/40 text-red-500 font-mono font-black text-lg tracking-widest rounded-xl hover:bg-red-900/20 transition-all active:scale-95">
                    <Trash2 size={16} /> REMOVE ELEMENT
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        {/* RIGHT GRID — 65% */}
        <div
          ref={gridRef}
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => { setActiveId(null); setEditLabel(""); setDrawerTable(null); }}
          className="flex-1 relative overflow-hidden transition-colors"
          style={{
            background:       isDragOver ? "#0a0800" : "#060606",
            backgroundImage:  "radial-gradient(#1e1e1e 1.5px, transparent 1.5px)",
            backgroundSize:   "30px 30px",
            boxShadow:        isDragOver ? "inset 0 0 60px rgba(212,175,55,0.08)" : "none",
          }}
        >
          {tables.length === 0 && !isDragOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-3">
              <span className="text-[#1e1e1e] font-mono font-black text-6xl tracking-widest">VENUE GRID</span>
              <span className="text-[#252525] font-mono text-2xl tracking-widest">DRAG ELEMENTS FROM LEFT PANEL</span>
            </div>
          )}

          {isDragOver && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <motion.div
                animate={{ opacity: [0.4, 0.9, 0.4], scale: [0.97, 1.02, 0.97] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="text-[#d4af37] font-mono font-black text-5xl tracking-widest"
              >DROP TO PLACE</motion.div>
            </div>
          )}

          <AnimatePresence>
            {tables.map(table => {
              const meta = ASSET_META[table.type];
              const isActive = activeId === table.id;
              return (
                <motion.div
                  key={table.id}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{
                    scale: 1, opacity: 1,
                    boxShadow: isActive
                      ? ["0 0 20px rgba(212,175,55,0.5)", "0 0 40px rgba(212,175,55,0.8)", "0 0 20px rgba(212,175,55,0.5)"]
                      : "0 0 0px rgba(212,175,55,0)",
                  }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={isActive
                    ? { boxShadow: { duration: 1.2, repeat: Infinity }, scale: { type: "spring", stiffness: 400, damping: 22 } }
                    : { type: "spring", stiffness: 400, damping: 22 }
                  }
                  style={{ position: "absolute", left: table.x, top: table.y }}
                  onClick={e => tapTable(e, table)}
                  className={`w-32 h-32 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    isActive
                      ? "bg-gradient-to-br from-[#1a1200] to-black border-2 border-[#ffb300]"
                      : "bg-[#0e0e0e]/95 border-2 border-[#252525] hover:border-[#444]"
                  }`}
                >
                  <span className="text-3xl mb-1" style={{ color: meta.color }}>{meta.icon}</span>
                  <span className="font-mono font-black text-base tracking-tight text-center px-1 leading-tight" style={{ color: "#ffb300" }}>{table.label}</span>
                  <span className="text-[#444] text-xs font-bold tracking-widest uppercase mt-1">{table.seats}✦</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Cross-module passthrough drawer */}
      <AnimatePresence>
        {drawerTable && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[9900] flex items-end justify-center"
            style={{ background: "rgba(0,0,0,0.75)" }}
            onClick={() => setDrawerTable(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 36 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-xl bg-[#090909] border border-[#d4af37]/25 rounded-t-3xl px-8 py-8"
              style={{ boxShadow: "0 -16px 60px rgba(0,0,0,0.8), 0 -4px 28px rgba(212,175,55,0.12)" }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[#444] font-mono text-sm tracking-widest uppercase">Floor Table · Active Context</p>
                  <h3 className="text-[#ffb300] font-mono font-black text-3xl tracking-widest mt-1">{drawerTable.label}</h3>
                  <p className="text-[#555] font-mono text-base mt-1">{drawerTable.type} · {drawerTable.seats} seats</p>
                </div>
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.1, repeat: Infinity }}
                    className="w-4 h-4 rounded-full bg-[#ffb300] shadow-[0_0_12px_#ffb30099]"
                  />
                  <span className="text-[#d4af37] font-mono text-base font-bold tracking-widest">HALO LOCKED</span>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => goToTransaction(drawerTable)}
                className="w-full flex items-center justify-center gap-4 py-6 bg-gradient-to-r from-[#1a1000] to-[#0d0900] border-2 border-[#ffb300] rounded-2xl cursor-pointer hover:bg-[#ffb300]/10 transition-all"
                style={{ boxShadow: "0 0 30px rgba(255,179,0,0.20)" }}
              >
                <Zap size={28} className="text-[#ffb300]" />
                <div className="text-left">
                  <p className="text-[#ffb300] font-mono font-black text-2xl tracking-widest">[ RUN IMMEDIATE TABLE TRANSACTION ]</p>
                  <p className="text-[#666] font-mono text-base mt-1 tracking-wider">Jump directly to {drawerTable.label} checkout — session state preserved</p>
                </div>
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
