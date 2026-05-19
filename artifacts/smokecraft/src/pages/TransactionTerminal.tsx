import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, X, CheckCircle2 } from "lucide-react";

interface Product { id: string; name: string; price: number; category: string; desc: string; }
interface LineItem { product: Product; qty: number; }

const MENU: Product[] = [
  { id: "p1", name: "PADRÓN 1926 SERIE ALLOCATION",      price:  45.00, category: "CIGAR",  desc: "Maduro wrapper · Full body · Cedar finish"        },
  { id: "p2", name: "ARTURO FUENTE OPUS X VAULT",         price:  65.00, category: "CIGAR",  desc: "Ecuador Rosado · Ultra-premium · Limited reserve"  },
  { id: "p3", name: "SINGLE-MALT SCOTCH FLIGHT 18YR",     price:  55.00, category: "SPIRIT", desc: "Highland · Sherry cask · Vanilla & dried fruit"     },
  { id: "p4", name: "PRIVATE BIN RESERVATION WINE",       price: 120.00, category: "WINE",   desc: "Napa Valley · Cabernet · 2018 vintage"             },
  { id: "p5", name: "MASTERCLASS ALLOCATION SAMPLER",     price:  85.00, category: "PAIRING", desc: "Curated cigar + spirit pairing for two"            },
  { id: "p6", name: "ELITE BOURBON RARE CASK SELECT",     price:  75.00, category: "SPIRIT", desc: "Kentucky straight · 23yr · Batch #07"              },
];

const CAT_COLORS: Record<string, string> = {
  CIGAR:   "text-amber-400 bg-amber-400/10 border-amber-400/20",
  SPIRIT:  "text-blue-400  bg-blue-400/10  border-blue-400/20",
  WINE:    "text-purple-400 bg-purple-400/10 border-purple-400/20",
  PAIRING: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
};

function playTap() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = 3400;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.09);
  } catch { /* silent */ }
}

export default function TransactionTerminal() {
  const [, navigate]     = useLocation();
  const [invoice,        setInvoice]        = useState<LineItem[]>([]);
  const [tableNum,       setTableNum]       = useState("01");
  const [confirmed,      setConfirmed]      = useState(false);
  const [pressedId,      setPressedId]      = useState<string | null>(null);
  const timerRef         = useRef<ReturnType<typeof setTimeout> | null>(null);

  function addItem(p: Product) {
    playTap();
    setPressedId(p.id);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPressedId(null), 110);
    setInvoice(prev => {
      const ex = prev.find(l => l.product.id === p.id);
      return ex
        ? prev.map(l => l.product.id === p.id ? { ...l, qty: l.qty + 1 } : l)
        : [...prev, { product: p, qty: 1 }];
    });
  }

  function removeItem(id: string) {
    setInvoice(prev => prev.filter(l => l.product.id !== id));
  }

  function decrement(id: string) {
    setInvoice(prev => prev.flatMap(l =>
      l.product.id !== id ? [l] : l.qty <= 1 ? [] : [{ ...l, qty: l.qty - 1 }]
    ));
  }

  const subtotal  = invoice.reduce((s, l) => s + l.product.price * l.qty, 0);
  const tax       = subtotal * 0.0875;
  const total     = subtotal + tax;

  function authorizeTransaction() {
    if (invoice.length === 0) return;
    playTap();
    setConfirmed(true);
    setTimeout(() => { setConfirmed(false); setInvoice([]); }, 2800);
  }

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
          <span className="text-[#d4af37] font-mono font-black text-2xl tracking-widest">[ TRANSACTION ] SOMMELIER TERMINAL</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#555] font-mono text-lg font-bold">TABLE</span>
          <input
            value={tableNum}
            onChange={e => setTableNum(e.target.value.replace(/\D/g, "").padStart(2, "0").slice(-2))}
            className="bg-[#111] border-2 border-[#d4af37]/40 text-[#ffb300] font-mono font-black text-2xl w-16 text-center rounded-lg py-1 focus:outline-none focus:border-[#d4af37]"
            maxLength={2}
          />
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left — product grid 60% */}
        <div className="w-[60%] grid grid-cols-2 gap-4 p-5 overflow-y-auto content-start border-r-2 border-[#111]">
          {MENU.map(p => (
            <motion.div
              key={p.id}
              animate={{ scale: pressedId === p.id ? 0.94 : 1 }}
              transition={{ duration: 0.1 }}
              onPointerDown={() => addItem(p)}
              className="h-44 bg-[#0d0d0d] border-2 border-[#1a1a1a] rounded-xl p-5 flex flex-col justify-between cursor-pointer hover:border-[#d4af37]/40 transition-colors"
            >
              <div>
                <span className={`text-xs font-black tracking-widest border rounded px-2 py-0.5 font-mono ${CAT_COLORS[p.category] ?? CAT_COLORS.CIGAR}`}>
                  {p.category}
                </span>
                <h3 className="text-white font-sans font-bold text-xl tracking-wide mt-3 leading-snug">{p.name}</h3>
                <p className="text-[#444] text-sm font-mono mt-1 leading-tight">{p.desc}</p>
              </div>
              <span className="text-[#ffb300] font-mono font-black text-3xl">${p.price.toFixed(2)}</span>
            </motion.div>
          ))}
        </div>

        {/* Right — invoice 40% */}
        <div className="w-[40%] flex flex-col bg-[#080808]">

          <div className="flex items-center justify-between px-6 py-4 border-b border-[#141414]">
            <h2 className="text-[#ffb300] font-mono font-black text-xl tracking-wider">LIVE INVOICE · TABLE {tableNum}</h2>
            {invoice.length > 0 && (
              <button onClick={() => setInvoice([])} className="text-red-600 font-mono text-xs font-bold tracking-widest border border-red-900/30 px-3 py-1 rounded hover:bg-red-900/20 transition-all">
                CLEAR ALL
              </button>
            )}
          </div>

          {/* Line items */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            {invoice.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16">
                <span className="text-[#222] font-mono font-black text-3xl tracking-widest mb-2">TERMINAL EMPTY</span>
                <span className="text-[#333] font-mono text-lg tracking-widest">AWAITING TOUCH INPUT</span>
              </div>
            ) : (
              invoice.map(line => (
                <div key={line.product.id} className="flex items-center gap-3 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-base tracking-wide truncate">{line.product.name}</p>
                    <p className="text-[#ffb300] font-mono font-bold text-sm">${line.product.price.toFixed(2)} ea</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => decrement(line.product.id)} className="w-8 h-8 bg-[#161616] border border-[#2a2a2a] rounded text-white font-mono font-black text-lg flex items-center justify-center hover:border-[#d4af37] transition-colors">−</button>
                    <span className="text-white font-mono font-black text-xl w-7 text-center">{line.qty}</span>
                    <button onClick={() => addItem(line.product)} className="w-8 h-8 bg-[#161616] border border-[#2a2a2a] rounded text-white font-mono font-black text-lg flex items-center justify-center hover:border-[#d4af37] transition-colors">+</button>
                    <button onClick={() => removeItem(line.product.id)} className="w-8 h-8 bg-[#1a0a0a] border border-red-900/30 rounded text-red-600 flex items-center justify-center hover:bg-red-900/20 transition-colors ml-1">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals + authorize */}
          <div className="border-t-2 border-[#141414] px-6 py-5 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-[#555] font-mono font-bold text-base tracking-wider">SUBTOTAL</span>
              <span className="text-white font-mono font-black text-xl">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#555] font-mono font-bold text-base tracking-wider">TAX (8.75%)</span>
              <span className="text-white font-mono font-black text-xl">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-[#1a1a1a] pt-3 mt-1">
              <span className="text-[#888] font-mono font-bold text-xl tracking-widest">TOTAL DUE</span>
              <span className="text-[#ffb300] font-mono font-black text-4xl tracking-tight">${total.toFixed(2)}</span>
            </div>

            <button
              disabled={invoice.length === 0}
              onPointerDown={authorizeTransaction}
              className="w-full mt-2 py-5 bg-[#ffb300] hover:bg-[#ffc107] disabled:bg-[#141414] disabled:text-[#333] text-black font-mono font-black text-xl tracking-widest rounded-xl transition-all active:scale-[0.98] shadow-[0_4px_28px_rgba(255,179,0,0.22)] disabled:shadow-none uppercase"
            >
              AUTHORIZE & CLOSE TRANSACTION
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation flash */}
      <AnimatePresence>
        {confirmed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] bg-black/92 flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
              className="flex flex-col items-center gap-6"
            >
              <CheckCircle2 size={80} className="text-[#ffb300]" strokeWidth={1.5} />
              <div className="text-center">
                <p className="text-[#ffb300] font-mono font-black text-4xl tracking-widest">TRANSACTION AUTHORIZED</p>
                <p className="text-[#555] font-mono text-xl tracking-widest mt-2">TABLE {tableNum} · ${total.toFixed(2)} SECURED</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
