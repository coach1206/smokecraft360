/**
 * GesturalEngine.tsx — 2D Gestural Physics Simulator
 * Enterprise-grade touch canvas for POS / E.A.T. Ecosystem.
 *
 * Left 58%  → Tactile Workspace Canvas  (drag, hold, split, tear)
 * Right 42% → Async Queue Monitor + Ambient HUD Telemetry
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";

// ── Design tokens ────────────────────────────────────────────────────────────
const OB   = "#010101";
const CH   = "#111111";
const GOLD = "#D4AF37";
const CREAM = "#F0E8D4";

// ── Types ────────────────────────────────────────────────────────────────────
type SyncStatus   = "Synced" | "Syncing" | "Queued";
type Category     = "Asset" | "Environment" | "Transaction";
type PhysicsState = "Rest" | "Lifted" | "UnderlayOpened" | "Tearing";

interface ActiveItem {
  id: string;
  name: string;
  category: Category;
  unitPrice: number;
  qty: number;
  syncStatus: SyncStatus;
  isSplit: boolean;
  splitPct: number;
}

interface AsyncQueueEntry {
  id: string;
  action: string;
  timestamp: number;
  latencyMs: number;
  payloadStatus: "pending" | "transmitting" | "delivered" | "failed";
  progress: number;
}

interface AmbientHUD {
  smokeDensity: number;
  audioAmplitude: number;
  colorTemp: number;
}

interface GestureState {
  currentDelta: { x: number; y: number };
  physicsState: PhysicsState;
  activeItemId: string | null;
}

// ── Constants ────────────────────────────────────────────────────────────────
const SYNC_COLORS: Record<SyncStatus, string> = {
  Synced:  "#32B45A",
  Syncing: GOLD,
  Queued:  "#C84A4A",
};
const CAT_COLORS: Record<Category, string> = {
  Asset:       GOLD,
  Environment: "#5B9BD5",
  Transaction: "#B45A32",
};
const QUEUE_ACTIONS = [
  "PRICE_SYNC",     "INVENTORY_DEDUCT",  "SESSION_COMMIT",
  "LOYALTY_AWARD",  "RESERVATION_LOCK",  "CACHE_PURGE",
  "MENU_BROADCAST", "AUDIT_LOG_FLUSH",   "RECEIPT_EMIT",
];
const PAYLOAD_COLOR: Record<string, string> = {
  pending:      GOLD,
  transmitting: "#5B9BD5",
  delivered:    "#32B45A",
  failed:       "#C84A4A",
};

const DEFAULT_ITEMS: ActiveItem[] = [
  { id: "i1", name: "01. Don Julio 1942 (PourCraft)",    category: "Asset",       unitPrice: 50,  qty: 1, syncStatus: "Synced",  isSplit: false, splitPct: 50 },
  { id: "i2", name: "02. Amber Aura Ritual (SmokeCraft)", category: "Asset",       unitPrice: 75,  qty: 1, syncStatus: "Syncing", isSplit: false, splitPct: 50 },
  { id: "i3", name: "03. Opus One Cabernet (WineCraft)",  category: "Transaction", unitPrice: 120, qty: 1, syncStatus: "Queued",  isSplit: false, splitPct: 50 },
];

function osc(base: number, amp: number, freq: number, t: number, phase = 0) {
  return base + amp * Math.sin(freq * t + phase);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Root component
// ═══════════════════════════════════════════════════════════════════════════════
export default function GesturalEngine() {
  const [items,          setItems]         = useState<ActiveItem[]>(DEFAULT_ITEMS);
  const [queue,          setQueue]         = useState<AsyncQueueEntry[]>([]);
  const [hud,            setHud]           = useState<AmbientHUD>({ smokeDensity: 42, audioAmplitude: 68, colorTemp: 3200 });
  const [ge,             setGe]            = useState<GestureState>({ currentDelta: { x: 0, y: 0 }, physicsState: "Rest", activeItemId: null });
  const [underlayItemId, setUnderlayItemId] = useState<string | null>(null);

  const tickRef    = useRef(0);
  const queueIdxRef = useRef(0);
  const holdRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Live HUD telemetry ───────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current += 0.05;
      const t = tickRef.current;
      setHud({
        smokeDensity:   Math.min(100, Math.max(0, Math.round(osc(42, 20, 0.6, t)))),
        audioAmplitude: Math.min(100, Math.max(0, Math.round(osc(68, 24, 1.1, t, 1.3)))),
        colorTemp:      Math.round(osc(3200, 420, 0.45, t, 0.9)),
      });
    }, 110);
    return () => clearInterval(id);
  }, []);

  // ── Async queue simulation ───────────────────────────────────────────────
  useEffect(() => {
    function push() {
      const idx     = queueIdxRef.current++ % QUEUE_ACTIONS.length;
      const latency = 90 + Math.floor(Math.random() * 380);
      const id      = `q${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
      const entry: AsyncQueueEntry = {
        id, action: QUEUE_ACTIONS[idx], timestamp: Date.now(),
        latencyMs: latency, payloadStatus: "pending", progress: 0,
      };
      setQueue(prev => [entry, ...prev].slice(0, 7));
      setTimeout(() => setQueue(prev => prev.map(e => e.id === id ? { ...e, payloadStatus: "transmitting", progress: 38 } : e)), latency * 0.28);
      setTimeout(() => setQueue(prev => prev.map(e => e.id === id ? { ...e, progress: 74 } : e)),                               latency * 0.68);
      setTimeout(() => setQueue(prev => prev.map(e => e.id === id ? { ...e, payloadStatus: Math.random() > 0.08 ? "delivered" : "failed", progress: 100 } : e)), latency);
    }
    push();
    const ms = () => 2200 + Math.random() * 1400;
    let timeout: ReturnType<typeof setTimeout>;
    function schedule() { timeout = setTimeout(() => { push(); schedule(); }, ms()); }
    schedule();
    return () => clearTimeout(timeout);
  }, []);

  // ── Item helpers ─────────────────────────────────────────────────────────
  const patchItem = useCallback((id: string, patch: Partial<ActiveItem>) =>
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item)), []);

  const triggerSync = useCallback((id: string) => {
    patchItem(id, { syncStatus: "Syncing" });
    setTimeout(() => patchItem(id, { syncStatus: "Synced" }), 1100 + Math.random() * 900);
  }, [patchItem]);

  const startHold = useCallback((itemId: string) => {
    if (holdRef.current) clearTimeout(holdRef.current);
    holdRef.current = setTimeout(() => {
      setUnderlayItemId(itemId);
      setGe(prev => ({ ...prev, physicsState: "UnderlayOpened", activeItemId: itemId }));
    }, 500);
  }, []);

  const clearHold = useCallback(() => {
    if (holdRef.current) clearTimeout(holdRef.current);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: OB, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter',sans-serif", userSelect: "none", zoom: 0.8 }}>

      {/* ── Top chrome ── */}
      <div style={{ height: 40, flexShrink: 0, borderBottom: `1px solid ${GOLD}22`, background: `linear-gradient(90deg,${CH},#0D0D0D)`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: GOLD, boxShadow: `0 0 14px ${GOLD}` }} />
          <span style={{ fontSize: 11, fontWeight: 900, color: GOLD, letterSpacing: "0.34em" }}>GESTURAL ENGINE</span>
          <span style={{ fontSize: 9, color: `${GOLD}3A`, letterSpacing: "0.18em", marginLeft: 6 }}>2D FLUID MOTION SIMULATOR · E.A.T. ECOSYSTEM</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontSize: 9, color: `${GOLD}66`, letterSpacing: "0.14em" }}>PHYSICS: ACTIVE</span>
          <div style={{ width: 1, height: 14, background: `${GOLD}22` }} />
          <span style={{ fontSize: 9, color: "#32B45A", letterSpacing: "0.14em" }}>SYNC LIVE</span>
          <div style={{ width: 1, height: 14, background: `${GOLD}22` }} />
          <span style={{ fontSize: 9, color: `${GOLD}66`, letterSpacing: "0.14em" }}>ITEMS: {items.length}</span>
        </div>
      </div>

      {/* ── Split body ── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

        {/* ═══════════════════════════════════════════════════════
            LEFT — Tactile Workspace Canvas
        ═══════════════════════════════════════════════════════ */}
        <div style={{ width: "58%", flexShrink: 0, position: "relative", overflow: "hidden", borderRight: `1px solid ${GOLD}18`, background: `radial-gradient(ellipse 130% 130% at 50% -10%, #0B0800 0%, ${OB} 72%)` }}>

          {/* Grid overlay */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${GOLD}07 1px,transparent 1px),linear-gradient(90deg,${GOLD}07 1px,transparent 1px)`, backgroundSize: "52px 52px", pointerEvents: "none" }} />
          {/* Top rule */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${GOLD}55,transparent)`, pointerEvents: "none" }} />
          {/* Canvas label */}
          <div style={{ position: "absolute", top: 10, left: 18, zIndex: 5, pointerEvents: "none" }}>
            <span style={{ fontSize: 7, letterSpacing: "0.36em", color: `${GOLD}38`, fontWeight: 700 }}>TACTILE WORKSPACE CANVAS</span>
          </div>

          {/* Draggable cards */}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 10, padding: "36px 20px 54px" }}>
            {items.map(item => (
              <DraggableCard key={item.id} item={item} ge={ge}
                isUnderlayOpen={underlayItemId === item.id}
                onDragStart={() => { startHold(item.id); setGe(prev => ({ ...prev, physicsState: "Lifted", activeItemId: item.id })); }}
                onDragUpdate={delta => setGe(prev => ({ ...prev, currentDelta: delta, physicsState: Math.abs(delta.x) > 88 ? "Tearing" : prev.physicsState === "Rest" ? "Lifted" : prev.physicsState }))}
                onDragEnd={() => { clearHold(); setUnderlayItemId(null); setGe({ currentDelta: { x: 0, y: 0 }, physicsState: "Rest", activeItemId: null }); }}
                onQtyChange={d => patchItem(item.id, { qty: Math.max(1, item.qty + d) })}
                onToggleSplit={() => patchItem(item.id, { isSplit: !item.isSplit })}
                onSync={() => triggerSync(item.id)}
                onCloseUnderlay={() => { setUnderlayItemId(null); setGe(prev => ({ ...prev, physicsState: "Rest" })); }}
              />
            ))}
          </div>

          {/* Gesture Engine footer HUD */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 42, borderTop: `1px solid ${GOLD}18`, background: "rgba(8,5,0,0.94)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", padding: "0 16px", gap: 18 }}>
            <span style={{ fontSize: 8, letterSpacing: "0.28em", color: `${GOLD}3A`, fontWeight: 700, flexShrink: 0 }}>GESTURE ENGINE</span>
            <div style={{ display: "flex", gap: 20 }}>
              {(["Rest","Lifted","UnderlayOpened","Tearing"] as PhysicsState[]).map(state => {
                const active = ge.physicsState === state;
                const color  = state === "Tearing" ? "#C84A4A" : GOLD;
                return (
                  <div key={state} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <motion.div animate={{ scale: active ? [1, 1.4, 1] : 1, boxShadow: active ? `0 0 12px ${color}` : "none" }} transition={{ duration: 0.4, repeat: active ? Infinity : 0, repeatDelay: 0.8 }}
                      style={{ width: 6, height: 6, borderRadius: "50%", background: active ? color : `${GOLD}18`, flexShrink: 0 }} />
                    <span style={{ fontSize: 8, color: active ? color : `${GOLD}30`, letterSpacing: "0.12em", fontWeight: active ? 900 : 400, transition: "all 0.2s" }}>
                      {state.toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 16, flexShrink: 0 }}>
              <span style={{ fontSize: 8, color: `${GOLD}40`, letterSpacing: "0.10em" }}>ΔX {ge.currentDelta.x.toFixed(0)}px</span>
              <span style={{ fontSize: 8, color: `${GOLD}40`, letterSpacing: "0.10em" }}>ΔY {ge.currentDelta.y.toFixed(0)}px</span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            RIGHT — Queue Monitor + Ambient HUD
        ═══════════════════════════════════════════════════════ */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Async Queue Panel */}
          <div style={{ flex: "0 0 55%", borderBottom: `1px solid ${GOLD}14`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <PanelHeader label="ASYNC SYNC QUEUE" title="NETWORK FRAME MONITOR" />
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 14px 12px" }}>
              <AnimatePresence initial={false}>
                {queue.map(entry => <QueueEntry key={entry.id} entry={entry} />)}
              </AnimatePresence>
              {queue.length === 0 && (
                <div style={{ color: `${GOLD}30`, fontSize: 9, letterSpacing: "0.22em", textAlign: "center", marginTop: 28 }}>AWAITING SYNC FRAMES...</div>
              )}
            </div>
          </div>

          {/* Ambient HUD Panel */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <PanelHeader label="AMBIENT HUD" title="ENVIRONMENTAL TELEMETRY" />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "12px 20px", gap: 20 }}>
              <HudMeter label="SMOKE DENSITY"     pct={hud.smokeDensity}                                    accentColor={GOLD}     display={`${hud.smokeDensity}%`} />
              <HudMeter label="AUDIO AMPLITUDE"   pct={hud.audioAmplitude}                                  accentColor="#5B9BD5"  display={`${(hud.audioAmplitude / 100 * 60 - 60).toFixed(1)} dB`} />
              <HudMeter label="COLOR TEMPERATURE" pct={(hud.colorTemp - 2700) / (6500 - 2700) * 100}        accentColor="#E8D48B"  display={`${hud.colorTemp} K`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DraggableCard
// ═══════════════════════════════════════════════════════════════════════════════
function DraggableCard({ item, ge, isUnderlayOpen, onDragStart, onDragUpdate, onDragEnd, onQtyChange, onToggleSplit, onSync, onCloseUnderlay }: {
  item: ActiveItem;
  ge: GestureState;
  isUnderlayOpen: boolean;
  onDragStart: () => void;
  onDragUpdate: (d: { x: number; y: number }) => void;
  onDragEnd: () => void;
  onQtyChange: (d: number) => void;
  onToggleSplit: () => void;
  onSync: () => void;
  onCloseUnderlay: () => void;
}) {
  const x      = useMotionValue(0);
  const y      = useMotionValue(0);
  const rotate = useTransform(x, [-130, 0, 130], [-4.5, 0, 4.5]);
  const scale  = useTransform(x, [-130, 0, 130], [0.97, 1, 0.97]);

  const isTearing = ge.physicsState === "Tearing" && ge.activeItemId === item.id;
  const tearColor = "#C84A4A";

  return (
    <div style={{ width: "100%", maxWidth: 490, position: "relative" }}>

      {/* Underlay action tray */}
      <AnimatePresence>
        {isUnderlayOpen && (
          <motion.div key="underlay" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}
            style={{ position: "absolute", top: -50, left: 0, right: 0, height: 46, display: "flex", gap: 6, zIndex: 20 }}>
            {[
              { label: "SPLIT",  action: () => { onToggleSplit(); onCloseUnderlay(); } },
              { label: "VOID",   action: () => { onCloseUnderlay(); } },
              { label: "COMP",   action: () => { onCloseUnderlay(); } },
              { label: "SYNC",   action: () => { onSync(); onCloseUnderlay(); } },
            ].map(btn => (
              <motion.button key={btn.label} whileTap={{ scale: 0.92 }} onClick={btn.action}
                style={{ flex: 1, borderRadius: 7, border: `1px solid ${GOLD}44`, background: `rgba(212,175,55,0.09)`, color: GOLD, fontSize: 9, fontWeight: 900, cursor: "pointer", letterSpacing: "0.22em", backdropFilter: "blur(12px)" }}>
                {btn.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag card */}
      <motion.div drag dragElastic={0.10} dragMomentum={false}
        onDragStart={onDragStart}
        onDrag={(_, info) => onDragUpdate({ x: info.offset.x, y: info.offset.y })}
        onDragEnd={() => { x.set(0); y.set(0); onDragEnd(); }}
        whileDrag={{ zIndex: 50 }}
        animate={{ boxShadow: isTearing ? `0 0 36px ${tearColor}44, 0 4px 28px rgba(0,0,0,0.60)` : `0 4px 28px rgba(0,0,0,0.55)` }}
        transition={{ boxShadow: { duration: 0.2 } }}
        style={{ x, y, rotate, scale,
          borderRadius: 10,
          border: `1px solid ${isTearing ? tearColor + "55" : GOLD + "25"}`,
          background: `linear-gradient(145deg,#161008,${CH})`,
          backdropFilter: "blur(24px)",
          cursor: "grab",
          padding: "11px 14px",
          position: "relative",
          overflow: "hidden",
          touchAction: "none",
        }}>

        {/* Top accent bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${isTearing ? tearColor : GOLD}77,transparent)`, pointerEvents: "none" }} />

        {/* Row 1: Name + Price */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#FFFDD0", letterSpacing: "0.02em", marginBottom: 4, lineHeight: 1.2 }}>{item.name}</div>
            <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
              <span style={{ fontSize: 7, fontWeight: 900, letterSpacing: "0.18em", color: CAT_COLORS[item.category], border: `1px solid ${CAT_COLORS[item.category]}30`, borderRadius: 4, padding: "1px 5px", background: `${CAT_COLORS[item.category]}10` }}>
                {item.category.toUpperCase()}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <motion.span animate={{ opacity: item.syncStatus === "Syncing" ? [1, 0.3, 1] : 1 }} transition={{ duration: 0.9, repeat: item.syncStatus === "Syncing" ? Infinity : 0 }}
                  style={{ width: 4, height: 4, borderRadius: "50%", background: SYNC_COLORS[item.syncStatus], display: "inline-block", boxShadow: `0 0 6px ${SYNC_COLORS[item.syncStatus]}88` }} />
                <span style={{ fontSize: 7, color: SYNC_COLORS[item.syncStatus], letterSpacing: "0.14em", fontWeight: 700 }}>{item.syncStatus.toUpperCase()}</span>
              </span>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0, paddingLeft: 12 }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: GOLD, fontFamily: "'Cormorant Garamond',serif", lineHeight: 1 }}>
              ${(item.unitPrice * item.qty).toFixed(2)}
            </div>
            <div style={{ fontSize: 8, color: `${GOLD}50`, letterSpacing: "0.08em", marginTop: 1 }}>@ ${item.unitPrice.toFixed(2)} ea.</div>
          </div>
        </div>

        {/* Row 2: Qty + Split */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <motion.button whileTap={{ scale: 0.86 }} onClick={e => { e.stopPropagation(); onQtyChange(-1); }}
              style={{ width: 24, height: 24, borderRadius: 5, border: `1px solid ${GOLD}30`, background: `rgba(212,175,55,0.07)`, color: GOLD, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
              −
            </motion.button>
            <span style={{ fontSize: 13, fontWeight: 900, color: "#FFFDD0", minWidth: 18, textAlign: "center" }}>{item.qty}</span>
            <motion.button whileTap={{ scale: 0.86 }} onClick={e => { e.stopPropagation(); onQtyChange(1); }}
              style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${GOLD}30`, background: `rgba(212,175,55,0.07)`, color: GOLD, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
              +
            </motion.button>
          </div>
          <motion.button whileTap={{ scale: 0.93 }} onClick={e => { e.stopPropagation(); onToggleSplit(); }}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 5, border: `1px solid ${item.isSplit ? GOLD + "66" : GOLD + "20"}`, background: item.isSplit ? `rgba(212,175,55,0.12)` : "transparent", color: item.isSplit ? GOLD : `${GOLD}40`, fontSize: 8, fontWeight: 700, cursor: "pointer", letterSpacing: "0.14em" }}>
            ⟠ {item.isSplit ? `SPLIT ${item.splitPct}%` : "SPLIT"}
          </motion.button>
        </div>

        {/* Split bar */}
        <AnimatePresence>
          {item.isSplit && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 18, opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              style={{ marginTop: 7, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", display: "flex" }}>
                <div style={{ width: `${item.splitPct}%`, background: `rgba(212,175,55,0.20)`, borderRight: `1px solid ${GOLD}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 8, color: GOLD, fontWeight: 700 }}>${(item.unitPrice * item.qty * item.splitPct / 100).toFixed(2)}</span>
                </div>
                <div style={{ flex: 1, background: `rgba(212,175,55,0.07)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 8, color: `${GOLD}66`, fontWeight: 700 }}>${(item.unitPrice * item.qty * (100 - item.splitPct) / 100).toFixed(2)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// QueueEntry
// ═══════════════════════════════════════════════════════════════════════════════
function QueueEntry({ entry }: { entry: AsyncQueueEntry }) {
  const age = Math.round((Date.now() - entry.timestamp) / 1000);
  return (
    <motion.div layout initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 18 }} transition={{ duration: 0.20 }}
      style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${GOLD}12`, background: "rgba(255,255,255,0.016)", marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
          <span style={{ fontSize: 9, fontWeight: 900, color: GOLD, letterSpacing: "0.16em" }}>{entry.action}</span>
          <span style={{ fontSize: 8, color: PAYLOAD_COLOR[entry.payloadStatus], letterSpacing: "0.12em", fontWeight: 700 }}>{entry.payloadStatus.toUpperCase()}</span>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 8, color: `${GOLD}40`, letterSpacing: "0.10em" }}>
          <span>{entry.latencyMs}ms</span>
          <span>{age}s ago</span>
        </div>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <motion.div animate={{ width: `${entry.progress}%` }} transition={{ duration: 0.38, ease: "easeOut" }}
          style={{ height: "100%", borderRadius: 2, background: PAYLOAD_COLOR[entry.payloadStatus], boxShadow: `0 0 8px ${PAYLOAD_COLOR[entry.payloadStatus]}77` }} />
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HudMeter
// ═══════════════════════════════════════════════════════════════════════════════
function HudMeter({ label, pct, accentColor, display }: {
  label: string; pct: number; accentColor: string; display: string;
}) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
        <span style={{ fontSize: 8, letterSpacing: "0.28em", color: `${accentColor}88`, fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 16, fontWeight: 900, color: accentColor, fontFamily: "'Cormorant Garamond',serif" }}>{display}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <motion.div animate={{ width: `${clamped}%` }} transition={{ duration: 0.14, ease: "linear" }}
          style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg,${accentColor}77,${accentColor})`, boxShadow: `0 0 10px ${accentColor}66` }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ fontSize: 7, color: `${GOLD}28`, letterSpacing: "0.12em" }}>MIN</span>
        <span style={{ fontSize: 7, color: `${GOLD}28`, letterSpacing: "0.12em" }}>MAX</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PanelHeader
// ═══════════════════════════════════════════════════════════════════════════════
function PanelHeader({ label, title }: { label: string; title: string }) {
  return (
    <div style={{ padding: "14px 18px 10px", flexShrink: 0, borderBottom: `1px solid ${GOLD}10` }}>
      <div style={{ fontSize: 8, letterSpacing: "0.32em", color: `${GOLD}50`, fontWeight: 700, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 900, color: GOLD, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.06em" }}>{title}</div>
    </div>
  );
}
