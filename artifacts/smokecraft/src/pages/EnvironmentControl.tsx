import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, Trash2 } from "lucide-react";

type AssetType = "Circular Table" | "Square Booth" | "VIP Lounge Couch" | "Main Bar Module";

interface FloorItem {
  id:     string;
  type:   AssetType;
  x:      number;
  y:      number;
  label:  string;
  seats:  number;
}

const ASSET_ICONS: Record<AssetType, string> = {
  "Circular Table":   "⬤",
  "Square Booth":     "■",
  "VIP Lounge Couch": "▬",
  "Main Bar Module":  "═",
};

const ASSET_TYPES: AssetType[] = [
  "Circular Table",
  "Square Booth",
  "VIP Lounge Couch",
  "Main Bar Module",
];

export default function EnvironmentControl() {
  const [, navigate]      = useLocation();
  const [tables,          setTables]          = useState<FloorItem[]>([]);
  const [activeId,        setActiveId]        = useState<string | null>(null);
  const [draggingNew,     setDraggingNew]     = useState<AssetType | null>(null);
  const [editLabel,       setEditLabel]       = useState<string>("");
  const gridRef           = useRef<HTMLDivElement>(null);

  function handleDragStart(e: React.DragEvent, type: AssetType) {
    e.dataTransfer.setData("assetType", type);
    setDraggingNew(type);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const type = e.dataTransfer.getData("assetType") as AssetType;
    if (!type || !gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left - 56, rect.width  - 120));
    const y = Math.max(0, Math.min(e.clientY - rect.top  - 56, rect.height - 120));
    const num = tables.length + 1;
    const id  = `tbl_${Date.now()}`;
    setTables(prev => [...prev, { id, type, x, y, label: `TABLE ${String(num).padStart(2, "0")}`, seats: 4 }]);
    setActiveId(id);
    setEditLabel(`TABLE ${String(num).padStart(2, "0")}`);
    setDraggingNew(null);
  }

  function removeActive() {
    if (!activeId) return;
    setTables(prev => prev.filter(t => t.id !== activeId));
    setActiveId(null);
    setEditLabel("");
  }

  const activeTable = tables.find(t => t.id === activeId) ?? null;

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-black select-none">

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 border-b-2 border-[#1a1a1a] bg-[#070707]"
        style={{ minHeight: 64 }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-[#d4af37] font-mono font-black text-base tracking-widest border border-[#d4af37]/30 rounded-lg px-4 py-2 hover:bg-[#d4af37]/10 transition-all active:scale-95">
            <ArrowLeft size={16} /> BACK
          </button>
          <span className="text-[#d4af37] font-mono font-black text-2xl tracking-widest">[ ENVIRONMENT ] FLOOR BLUEPRINT</span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <span className="text-[#444] font-mono text-lg font-bold tracking-widest">{tables.length} ELEMENT{tables.length !== 1 ? "S" : ""} PLACED</span>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden gap-0">

        {/* Left drawer — 35% */}
        <aside className="w-[35%] flex flex-col gap-0 border-r-2 border-[#1a1a1a] bg-[#0a0a0a] overflow-y-auto">
          <div className="p-6 border-b border-[#141414]">
            <h2 className="text-[#d4af37] font-mono font-black text-3xl tracking-widest mb-1">ENV DESIGNER</h2>
            <p className="text-[#555] font-mono text-base leading-relaxed">Drag components onto the grid to calibrate your venue layout.</p>
          </div>

          <div className="flex flex-col gap-3 p-5">
            {ASSET_TYPES.map(type => (
              <div
                key={type}
                draggable
                onDragStart={e => handleDragStart(e, type)}
                className="flex items-center justify-between bg-[#111] border border-[#222] rounded-xl px-5 py-5 cursor-grab active:cursor-grabbing hover:border-[#d4af37] active:scale-95 transition-all duration-100">
                <div className="flex items-center gap-4">
                  <span className="text-[#d4af37] text-2xl">{ASSET_ICONS[type]}</span>
                  <span className="text-white font-mono font-bold text-xl tracking-wide">{type.toUpperCase()}</span>
                </div>
                <span className="text-[#d4af37] text-3xl font-black">+</span>
              </div>
            ))}
          </div>

          {/* Active element editor */}
          <AnimatePresence>
            {activeTable && (
              <motion.div
                key={activeTable.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.2 }}
                className="mx-5 mb-5 mt-auto bg-[#0d0d0d] border-2 border-[#d4af37]/25 rounded-xl p-5"
              >
                <h3 className="text-white font-mono text-xl font-black tracking-widest mb-4">MODIFY LAYER PARAMETERS</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#666] font-mono font-bold text-base">LABEL</span>
                    <input
                      value={editLabel}
                      onChange={e => {
                        const v = e.target.value.toUpperCase();
                        setEditLabel(v);
                        setTables(prev => prev.map(t => t.id === activeTable.id ? { ...t, label: v } : t));
                      }}
                      className="bg-black border border-[#333] text-[#ffb300] font-mono font-black text-xl rounded-lg px-3 py-2 w-2/3 text-right focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#666] font-mono font-bold text-base">SEATS</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTables(prev => prev.map(t => t.id === activeTable.id ? { ...t, seats: Math.max(1, t.seats - 1) } : t))}
                        className="w-10 h-10 bg-[#1a1a1a] border border-[#333] text-white font-mono font-black text-xl rounded-lg hover:border-[#d4af37] transition-all">−</button>
                      <span className="text-[#ffb300] font-mono font-black text-2xl w-8 text-center">{activeTable.seats}</span>
                      <button
                        onClick={() => setTables(prev => prev.map(t => t.id === activeTable.id ? { ...t, seats: Math.min(20, t.seats + 1) } : t))}
                        className="w-10 h-10 bg-[#1a1a1a] border border-[#333] text-white font-mono font-black text-xl rounded-lg hover:border-[#d4af37] transition-all">+</button>
                    </div>
                  </div>
                  <button
                    onClick={removeActive}
                    className="flex items-center justify-center gap-2 mt-2 w-full py-3 bg-[#1a0a0a] border border-red-900/40 text-red-500 font-mono font-black text-base tracking-widest rounded-lg hover:bg-red-900/20 transition-all active:scale-95">
                    <Trash2 size={14} /> REMOVE ELEMENT
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        {/* Right grid — 65% */}
        <div
          ref={gridRef}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          className="flex-1 relative overflow-hidden bg-[#060606]"
          style={{
            backgroundImage:   "radial-gradient(#1c1c1c 1.5px, transparent 1.5px)",
            backgroundSize:    "30px 30px",
          }}
          onClick={() => { setActiveId(null); setEditLabel(""); }}
        >
          {tables.length === 0 && !draggingNew && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[#1e1e1e] font-mono font-black text-5xl tracking-widest mb-3">VENUE GRID</span>
              <span className="text-[#252525] font-mono text-xl tracking-widest">DRAG ELEMENTS FROM LEFT PANEL</span>
            </div>
          )}

          <AnimatePresence>
            {tables.map(table => (
              <motion.div
                key={table.id}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 22 }}
                style={{ position: "absolute", left: table.x, top: table.y }}
                onClick={e => {
                  e.stopPropagation();
                  setActiveId(table.id);
                  setEditLabel(table.label);
                }}
                className={`w-28 h-28 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                  activeId === table.id
                    ? "bg-gradient-to-br from-[#d4af37]/20 to-black border-2 border-[#ffb300] shadow-[0_0_22px_rgba(255,179,0,0.35)]"
                    : "bg-[#111]/90 border-2 border-[#262626] hover:border-[#444]"
                }`}
              >
                <span className="text-[#d4af37] text-2xl mb-1">{ASSET_ICONS[table.type]}</span>
                <span className="text-[#ffb300] font-mono font-black text-base tracking-tighter leading-tight text-center px-1">{table.label}</span>
                <span className="text-[#555] text-xs font-bold tracking-widest uppercase mt-0.5">{table.seats} seats</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
