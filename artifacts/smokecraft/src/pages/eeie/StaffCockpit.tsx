/**
 * EEIE Staff Cockpit — 3-column command layout.
 * LEFT: Dark navy table rail
 * CENTER: Ice-blue workflow surface — step rail, pairing showcase, "Why This Works", script
 * RIGHT: White persistent ticket/cart panel
 *
 * Cigar carousel: every 5 s · Liquor carousel: every 6.5 s
 * AnimatePresence crossfade on every image rotation.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useKernelMode } from "@/contexts/KernelModeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Leaf, Coffee, Utensils, ShoppingCart, Users, Eye, Star,
  Send, ClipboardList, Bell, BookOpen, ChevronRight,
  Pause, Play, ArrowRightLeft, Zap, CheckCircle2, CircleDot,
  Circle, RefreshCw, Maximize2,
} from "lucide-react";
import "@/styles/eeie-motion.css";
import {
  type Theme, type GuestSession, type CartItem,
  Badge, Meter, Panel, TouchButton, RadarChart, DonutRing, LiveDot,
  MOCK_SESSIONS, TIER_C, STATUS_COLOR, triggerHaptic,
} from "./shared";

// ── Color tokens (shell + surface) ───────────────────────────
const SHELL   = "#061426";
const SURFACE = "#EAF4FF";
const CARD    = "#FFFFFF";

const FLAVOR_LABELS = ["Creamy","Sweet","Nutty","Earthy","Spicy","Woody","Pepper","Citrus"];

interface FoodItem {
  name: string; category: string; price: number;
  pairing: string; prepTime: string; image: string;
}
const FOOD_ITEMS: Record<string, FoodItem> = {
  Creamy:  { name: "Smoked Short Rib Sliders",  category: "Small Plates", price: 18, pairing: "Deepens the cocoa and charred oak finish.",       prepTime: "12 min", image: "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=600&q=80" },
  Sweet:   { name: "Vanilla Crème Brûlée",       category: "Dessert",      price: 14, pairing: "Amplifies vanilla and caramel, softens the draw.", prepTime: "5 min",  image: "https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?auto=format&fit=crop&w=600&q=80" },
  Spicy:   { name: "Truffle Charcuterie Board",  category: "Boards",       price: 28, pairing: "Earthy umami grounds the spice and leather.",       prepTime: "8 min",  image: "https://images.unsplash.com/photo-1546039907-7fa05f864c02?auto=format&fit=crop&w=600&q=80" },
  default: { name: "Aged Cheese Flight",          category: "Boards",       price: 22, pairing: "Neutral creamy base bridges any flavor profile.",    prepTime: "6 min",  image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&q=80" },
};
function getFoodRec(flavors: string[]): FoodItem {
  for (const f of flavors) if (FOOD_ITEMS[f]) return FOOD_ITEMS[f];
  return FOOD_ITEMS.default;
}

interface CatalogProduct {
  id: string; name: string; brand: string; category: string;
  price: number; matchScore: number; flavorTags: string[];
  description: string; strength: string; image: string;
}

function timeSince(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? "just now" : `${m}m`;
}

// ── Step progress rail ────────────────────────────────────────
const WORKFLOW_STEPS = ["TABLE","TASTE","MATCH","PAIR","PREVIEW","CART","POS"];

function StepRail({ current, T }: { current: number; T: Theme }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 0,
      padding: "10px 20px 10px",
      background: CARD,
      borderBottom: `1px solid ${T.border}`,
      flexShrink: 0,
    }}>
      {WORKFLOW_STEPS.map((step, i) => {
        const done    = i < current;
        const active  = i === current;
        const blocked = i > current;
        const c = done ? T.green : active ? T.accent : T.textFaint;
        return (
          <div key={step} style={{ display: "flex", alignItems: "center", flex: i < WORKFLOW_STEPS.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: done ? T.green : active ? `${T.accent}18` : `${T.textFaint}18`, border: `1.5px solid ${c}` }}>
                {done
                  ? <CheckCircle2 size={11} color={T.green} />
                  : active
                    ? <CircleDot size={11} color={T.accent} />
                    : <Circle size={11} color={T.textFaint} />
                }
              </div>
              <span style={{ fontSize: 7, fontWeight: active ? 800 : done ? 700 : 400, color: c, letterSpacing: "0.12em", whiteSpace: "nowrap" as const, fontFamily: T.mono }}>
                {step}
              </span>
            </div>
            {i < WORKFLOW_STEPS.length - 1 && (
              <div style={{ flex: 1, height: 1.5, background: done ? `${T.green}60` : `${T.border}`, margin: "0 4px", marginBottom: 14, minWidth: 8 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Animated pairing connector ────────────────────────────────
function PairingConnector({ color }: { color: string }) {
  return (
    <div style={{ width: 48, flexShrink: 0, display: "flex", alignItems: "center", position: "relative", height: 200 }}>
      <div style={{ width: "100%", height: 2, background: `linear-gradient(90deg, ${color}40, ${color}80, ${color}40)`, borderRadius: 2 }} />
      <motion.div
        animate={{ x: ["-50%", "calc(100% + 50%)"] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "linear", repeatDelay: 0.4 }}
        style={{ position: "absolute", width: 10, height: 10, borderRadius: "50%", background: color, boxShadow: `0 0 10px ${color}, 0 0 20px ${color}60`, left: 0 }}
      />
    </div>
  );
}

// ── Rotating product card ─────────────────────────────────────
function PairingCard({
  title, accentColor, badge, T,
  product, rotIdx, totalCount,
  onAdd, onShow, onSwap,
  fallbackIcon,
  extraLabel,
}: {
  title: string; accentColor: string; badge: string; T: Theme;
  product: CatalogProduct | null; rotIdx: number; totalCount: number;
  onAdd: () => void; onShow: () => void; onSwap: () => void;
  fallbackIcon: React.ReactNode; extraLabel?: string;
}) {
  const c = accentColor;
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: CARD,
      border: `1.5px solid ${T.border}`,
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: T.shadow,
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Card header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${T.border}`, background: `${c}06` }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: c, textTransform: "uppercase" as const, flex: 1, fontFamily: T.mono }}>{title}</span>
        <span style={{ fontSize: 7.5, fontWeight: 700, color: c, background: `${c}14`, border: `1px solid ${c}28`, borderRadius: 20, padding: "2px 8px", letterSpacing: "0.10em" }}>{badge}</span>
      </div>

      {/* Image zone */}
      <div className="eeie-image-shimmer" style={{ height: 150, position: "relative", background: `${c}08`, overflow: "hidden" }}>
        <AnimatePresence mode="wait">
          {product ? (
            <motion.img
              key={product.name}
              src={product.image}
              alt={product.name}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <motion.div key="fallback" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {fallbackIcon}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gradient overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,20,38,0.72) 0%, transparent 50%)", zIndex: 2, pointerEvents: "none" }} />

        {/* Name overlay */}
        {product && (
          <div style={{ position: "absolute", bottom: 8, left: 12, right: 12, zIndex: 3 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: "#fff", lineHeight: 1.3, textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>{product.name}</div>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
              {product.brand} · {extraLabel ?? product.strength}
            </div>
          </div>
        )}

        {/* LIVE badge */}
        <div style={{ position: "absolute", top: 8, right: 8, zIndex: 3, display: "flex", alignItems: "center", gap: 3, background: "rgba(6,20,38,0.55)", borderRadius: 20, padding: "3px 8px", backdropFilter: "blur(6px)" }}>
          <div className="eeie-status-pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: c }} />
          <span style={{ fontSize: 7, color: c, fontWeight: 700, letterSpacing: "0.12em" }}>LIVE</span>
        </div>
      </div>

      {/* Rotation dots */}
      {totalCount > 1 && (
        <div style={{ display: "flex", gap: 4, justifyContent: "center", padding: "6px 0 0" }}>
          {Array.from({ length: totalCount }, (_, i) => (
            <div key={i} style={{ width: i === rotIdx ? 14 : 5, height: 4, borderRadius: 2, background: i === rotIdx ? c : `${c}30`, transition: "width 0.3s ease" }} />
          ))}
        </div>
      )}

      {/* Score + tags */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px 0" }}>
        {product && <DonutRing pct={product.matchScore} color={c} size={42} label={`${product.matchScore}%`} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 4 }}>
            {(product?.flavorTags ?? []).slice(0, 3).map(f => <Badge key={f} label={f} color={c} bg={`${c}10`} />)}
          </div>
          <div style={{ fontSize: 8.5, color: T.textSub, lineHeight: 1.5 }}>
            {product?.description ? product.description.slice(0, 55) + "…" : ""}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, padding: "10px 14px 14px", marginTop: "auto" }}>
        <motion.button whileTap={{ scale: 0.94 }} onClick={onAdd} disabled={!product}
          style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: c, color: "#fff", fontSize: 10, fontWeight: 700, cursor: product ? "pointer" : "not-allowed", opacity: product ? 1 : 0.4, boxShadow: `0 4px 12px ${c}35` }}>
          + Add {product ? `$${product.price}` : ""}
        </motion.button>
        <motion.button whileTap={{ scale: 0.94 }} onClick={onShow}
          style={{ padding: "10px 10px", borderRadius: 10, border: `1px solid ${c}30`, background: `${c}0C`, color: c, cursor: "pointer" }} title="Show to Guest">
          <Eye size={13} />
        </motion.button>
        <motion.button whileTap={{ scale: 0.94 }} onClick={onSwap}
          style={{ padding: "10px 10px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.cardAlt, color: T.textSub, cursor: "pointer" }} title="View Alternatives">
          <ArrowRightLeft size={13} />
        </motion.button>
      </div>
    </div>
  );
}

// ── Right ticket panel ────────────────────────────────────────
function TicketPanel({
  T, session,
  rotCigar, rotLiquor, foodRec,
  onSendToPOS, onClearCart, onReturn, onResume,
}: {
  T: Theme; session: GuestSession | null;
  rotCigar: CatalogProduct | null; rotLiquor: CatalogProduct | null; foodRec: FoodItem;
  onSendToPOS: () => void; onClearCart: () => void; onReturn: () => void; onResume: () => void;
}) {
  const cart = session?.cart ?? [];
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const recommended = [
    rotCigar  ? { label: rotCigar.name,   type: "cigar",  price: rotCigar.price,  color: T.green  } : null,
    rotLiquor ? { label: rotLiquor.name,  type: "liquor", price: rotLiquor.price, color: T.purple } : null,
    { label: foodRec.name, type: "food", price: foodRec.price, color: T.yellow },
  ].filter(Boolean) as { label: string; type: string; price: number; color: string }[];

  return (
    <div style={{
      width: 272, flexShrink: 0,
      background: CARD,
      borderLeft: `1.5px solid rgba(34,126,255,0.22)`,
      display: "flex", flexDirection: "column",
      height: "100%",
    }}>
      {/* Panel header */}
      <div style={{ padding: "14px 18px 12px", borderBottom: `1px solid rgba(34,126,255,0.16)`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <ShoppingCart size={13} color={T.accent} />
          <span style={{ fontSize: 10.5, fontWeight: 800, color: T.text, letterSpacing: "0.08em" }}>TICKET PANEL</span>
          {cart.length > 0 && (
            <div style={{ marginLeft: "auto", background: T.accent, color: "#fff", borderRadius: 999, fontSize: 8, fontWeight: 800, padding: "1px 6px" }}>
              {cart.length}
            </div>
          )}
        </div>
        {session && (
          <div style={{ fontSize: 9, color: T.textSub }}>
            {session.table} · {session.guestName}
          </div>
        )}
      </div>

      {/* Next best action */}
      {session && (
        <div style={{ padding: "10px 18px", borderBottom: `1px solid rgba(34,126,255,0.10)`, background: `${T.accent}06`, flexShrink: 0 }}>
          <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.18em", color: T.accent, fontFamily: T.mono, marginBottom: 5 }}>NEXT ACTION</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Zap size={11} color={T.accent} />
            <span style={{ fontSize: 10, fontWeight: 700, color: T.text }}>
              {cart.length === 0 ? "Add Bundle to Cart" : cart.length < 3 ? "Complete the Pairing" : "Send to Commerce"}
            </span>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
        {/* Cart items */}
        {cart.length > 0 ? (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.16em", color: T.textFaint, fontFamily: T.mono, marginBottom: 8 }}>CURRENT ORDER</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {cart.map((item, i) => {
                const c = item.type === "cigar" ? T.green : item.type === "liquor" ? T.purple : T.yellow;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: `${c}08`, border: `1px solid ${c}20` }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: c, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{item.name}</div>
                      <div style={{ fontSize: 8, color: T.textSub, textTransform: "capitalize" as const }}>{item.type}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: c }}>${item.price}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 2px 0", borderTop: `1px solid ${T.border}`, marginTop: 8 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: T.text }}>Total</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: T.green }}>${total}</span>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.16em", color: T.textFaint, fontFamily: T.mono, marginBottom: 8 }}>RECOMMENDED BUNDLE</div>
            {recommended.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: `${item.color}07`, border: `1px solid ${item.color}20`, marginBottom: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{item.label}</div>
                  <div style={{ fontSize: 7.5, color: T.textSub, textTransform: "capitalize" as const }}>{item.type}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: item.color }}>${item.price}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 2px 0", borderTop: `1px solid ${T.border}`, marginTop: 2 }}>
              <span style={{ fontSize: 9, color: T.textSub }}>Bundle est.</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: T.accent }}>${recommended.reduce((s, i) => s + i.price, 0)}</span>
            </div>
          </div>
        )}

        {/* POS status */}
        <div style={{ padding: "10px 12px", borderRadius: 10, background: `${T.green}08`, border: `1px solid ${T.green}25`, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <div className="eeie-status-pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: T.green }} />
            <span style={{ fontSize: 8, fontWeight: 700, color: T.green, letterSpacing: "0.12em" }}>POS CONNECTED</span>
          </div>
          <div style={{ fontSize: 8.5, color: T.textSub }}>Commerce Infrastructure · Ready</div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ padding: "14px 18px", borderTop: `1px solid rgba(34,126,255,0.14)`, display: "flex", flexDirection: "column", gap: 7, flexShrink: 0 }}>
        <motion.button whileTap={{ scale: 0.96 }} onClick={onSendToPOS} disabled={cart.length === 0}
          style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: cart.length > 0 ? T.green : `${T.green}30`, color: "#fff", cursor: cart.length > 0 ? "pointer" : "not-allowed", fontSize: 11, fontWeight: 800, boxShadow: cart.length > 0 ? `0 4px 16px ${T.green}40` : "none", letterSpacing: "0.06em" }}>
          Send to POS
        </motion.button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onResume}
            style={{ padding: "10px 0", borderRadius: 10, border: `1px solid ${T.accent}30`, background: `${T.accent}0C`, color: T.accent, cursor: "pointer", fontSize: 9.5, fontWeight: 700 }}>
            Manual Mode
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onClearCart}
            style={{ padding: "10px 0", borderRadius: 10, border: `1px solid ${T.border}`, background: T.cardAlt, color: T.textSub, cursor: "pointer", fontSize: 9.5, fontWeight: 700 }}>
            Clear Cart
          </motion.button>
        </div>

        <motion.button whileTap={{ scale: 0.95 }} onClick={onReturn}
          style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: `1px solid ${T.border}`, background: T.cardAlt, color: T.textMid, cursor: "pointer", fontSize: 9.5, fontWeight: 700 }}>
          Return Guest to Experience
        </motion.button>
      </div>
    </div>
  );
}

// ── Left table rail ───────────────────────────────────────────
function TableRail({
  sessions, selectedId, onSelect, T,
}: {
  sessions: GuestSession[]; selectedId: string | null; onSelect: (id: string) => void; T: Theme;
}) {
  return (
    <div style={{
      width: 210, flexShrink: 0,
      background: SHELL,
      borderRight: "1px solid rgba(8,123,255,0.18)",
      display: "flex", flexDirection: "column",
      height: "100%", overflowY: "auto",
    }}>
      <div style={{ padding: "14px 14px 8px" }}>
        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.22em", color: "rgba(140,175,220,0.50)", marginBottom: 10, fontFamily: "'Space Mono',monospace" }}>
          ACTIVE TABLES
        </div>
        {sessions.map(s => {
          const isSel = selectedId === s.id;
          const sc = s.status === "active" ? T.green : s.status === "attention" ? T.yellow : s.status === "paused" ? "#087BFF" : "#7BA8CC";
          return (
            <motion.div
              key={s.id}
              onClick={() => onSelect(s.id)}
              whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
              style={{
                background: isSel ? "rgba(8,123,255,0.18)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${isSel ? "rgba(8,123,255,0.50)" : "rgba(8,123,255,0.10)"}`,
                borderLeft: `3px solid ${sc}`,
                borderRadius: 10, padding: "10px 12px", cursor: "pointer", marginBottom: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 8.5, fontWeight: 700, color: "rgba(140,175,220,0.55)", fontFamily: "'Space Mono',monospace" }}>{s.table.toUpperCase()}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {s.cart.length > 0 && <div style={{ background: "#087BFF", color: "#fff", borderRadius: 999, fontSize: 7.5, fontWeight: 800, padding: "1px 5px" }}>{s.cart.length}</div>}
                  <LiveDot color={sc} size={5} />
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: isSel ? "#fff" : "rgba(210,230,255,0.88)" }}>{s.guestName}</div>
              <div style={{ fontSize: 8.5, color: "rgba(140,175,220,0.55)", marginTop: 2, display: "flex", gap: 8 }}>
                <span>{timeSince(s.startedAt)}</span>
                <span>{s.loyaltyTier}</span>
              </div>
              {s.status === "attention" && <div style={{ marginTop: 4, fontSize: 8, color: T.yellow, fontWeight: 700 }}>⚠ NEEDS ATTENTION</div>}
              {s.status === "paused"    && <div style={{ marginTop: 4, fontSize: 8, color: "#087BFF" }}>⏸ PAUSED</div>}
            </motion.div>
          );
        })}
      </div>

      <div style={{ padding: "8px 14px 14px", marginTop: "auto" }}>
        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.16em", color: "rgba(140,175,220,0.40)", marginBottom: 6, fontFamily: "'Space Mono',monospace" }}>KIOSK MODE</div>
        {["Staff Assist","Guest View","Manager Control","Kiosk Lock"].map(mode => (
          <motion.button key={mode} whileTap={{ scale: 0.95 }}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "7px 8px", borderRadius: 8, border: "none", background: mode === "Staff Assist" ? "rgba(8,123,255,0.20)" : "transparent", color: mode === "Staff Assist" ? "#087BFF" : "rgba(140,175,220,0.45)", cursor: "pointer", fontSize: 9.5, fontWeight: mode === "Staff Assist" ? 700 : 400, marginBottom: 2, textAlign: "left" as const }}>
            <ChevronRight size={9} />
            {mode}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────
interface Props { T: Theme; }

type SyncStatus = "idle" | "syncing" | "synced" | "error";

export function StaffCockpit({ T }: Props) {
  const { mode, refresh } = useKernelMode();
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const syncResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sessions, setSessions]       = useState<GuestSession[]>(MOCK_SESSIONS);
  const [selectedId, setSelectedId]   = useState<string | null>(MOCK_SESSIONS[0].id);
  const [note, setNote]               = useState("");
  const [toast, setToast]             = useState<string | null>(null);
  const [showGuestPreview, setShowGuestPreview] = useState(false);
  const [guestPreviewShown, setGuestPreviewShown] = useState(false);

  const [cigarProducts, setCigarProducts]   = useState<CatalogProduct[]>([]);
  const [liquorProducts, setLiquorProducts] = useState<CatalogProduct[]>([]);
  const [cigarIdx, setCigarIdx]   = useState(0);
  const [liquorIdx, setLiquorIdx] = useState(0);

  useEffect(() => {
    fetch("/api/eeie/products", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((data: { products: CatalogProduct[] } | null) => {
        if (!data?.products) return;
        setCigarProducts(data.products.filter(p => p.category === "Cigar"));
        setLiquorProducts(data.products.filter(p => ["Bourbon","Scotch","Cognac","Spirit","Whiskey"].includes(p.category)));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (cigarProducts.length < 2) return;
    const t = setInterval(() => setCigarIdx(i => (i + 1) % cigarProducts.length), 5000);
    return () => clearInterval(t);
  }, [cigarProducts.length]);

  useEffect(() => {
    if (liquorProducts.length < 2) return;
    const t = setInterval(() => setLiquorIdx(i => (i + 1) % liquorProducts.length), 6500);
    return () => clearInterval(t);
  }, [liquorProducts.length]);

  const rotCigar  = cigarProducts.length  > 0 ? cigarProducts[cigarIdx  % cigarProducts.length]  : null;
  const rotLiquor = liquorProducts.length > 0 ? liquorProducts[liquorIdx % liquorProducts.length] : null;

  const selected = sessions.find(s => s.id === selectedId) ?? null;
  const foodRec  = selected ? getFoodRec(selected.flavors) : FOOD_ITEMS.default;

  // Step progress
  const currentStep =
    selected?.cart.length ? (guestPreviewShown ? 5 : 4) :
    guestPreviewShown ? 4 :
    rotCigar && rotLiquor && selected ? 3 :
    selected ? 2 : 1;

  const canSyncMode =
    user?.role === "manager" ||
    user?.role === "venue_owner" ||
    user?.role === "super_admin";

  useEffect(() => {
    return () => {
      if (syncResetRef.current !== null) clearTimeout(syncResetRef.current);
    };
  }, []);

  async function handleSyncMode() {
    if (syncStatus === "syncing") return;
    if (syncResetRef.current !== null) clearTimeout(syncResetRef.current);
    setSyncStatus("syncing");
    try {
      await refresh();
      setSyncStatus("synced");
      syncResetRef.current = setTimeout(() => setSyncStatus("idle"), 3000);
    } catch {
      setSyncStatus("error");
      syncResetRef.current = setTimeout(() => setSyncStatus("idle"), 3000);
    }
  }

  function showToast(msg: string) {
    triggerHaptic("success");
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }
  function addToCart(session: GuestSession, item: CartItem) {
    setSessions(p => p.map(s => s.id === session.id ? { ...s, cart: [...s.cart, item] } : s));
    showToast(`${item.name} added`);
  }
  function removeFromCart(sessionId: string, idx: number) {
    setSessions(p => p.map(s => s.id === sessionId ? { ...s, cart: s.cart.filter((_, i) => i !== idx) } : s));
  }
  function sendToPOS(session: GuestSession) {
    if (!session || session.cart.length === 0) return;
    showToast(`${session.cart.length} item(s) sent to Commerce Infrastructure`);
    setSessions(p => p.map(s => s.id === session.id ? { ...s, cart: [] } : s));
    triggerHaptic("managerAlert");
  }
  function clearCart(session: GuestSession) {
    setSessions(p => p.map(s => s.id === session.id ? { ...s, cart: [] } : s));
    showToast("Cart cleared");
  }
  function togglePause(id: string) {
    triggerHaptic("softTap");
    setSessions(p => p.map(s => s.id === id ? { ...s, status: s.status === "paused" ? "active" : "paused" } : s));
  }
  function applyReward(session: GuestSession) {
    showToast(`Loyalty reward applied for ${session.guestName}`);
    triggerHaptic("success");
  }

  const moodColor = (tag: string) => ({ Premium: T.accent, "High Energy": T.cyan, Social: T.green, "VIP Active": T.purple }[tag] ?? T.accent);

  // "Why This Works" sentence
  const whyText = rotCigar && rotLiquor
    ? `The ${rotCigar.flavorTags[0]?.toLowerCase() ?? "rich"} and ${rotCigar.flavorTags[1]?.toLowerCase() ?? "smooth"} character of the ${rotCigar.name} is lifted by the ${rotLiquor.flavorTags[0]?.toLowerCase() ?? "oaky"} and ${rotLiquor.flavorTags[1]?.toLowerCase() ?? "vanilla"} depth of the ${rotLiquor.name}. The ${foodRec.name} adds ${foodRec.pairing.toLowerCase()}`
    : "Select a guest to generate a live pairing explanation.";

  return (
    <div style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>

      {/* ── LEFT: Dark navy table rail ── */}
      <TableRail sessions={sessions} selectedId={selectedId} onSelect={setSelectedId} T={T} />

      {/* ── CENTER: Ice-blue workflow surface ── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: SURFACE, overflow: "hidden" }}>

        {/* Cockpit header with Sync Mode trigger */}
        {canSyncMode && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "flex-end",
            padding: "6px 16px",
            background: CARD,
            borderBottom: `1px solid ${T.border}`,
            flexShrink: 0,
            minHeight: 36,
          }}>
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={handleSyncMode}
              disabled={syncStatus === "syncing"}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 12px",
                borderRadius: 8,
                border: `1px solid ${
                  syncStatus === "synced" ? `${T.green}50` :
                  syncStatus === "error"  ? `${T.yellow}50` :
                  `${T.accent}35`
                }`,
                background:
                  syncStatus === "synced" ? `${T.green}10` :
                  syncStatus === "error"  ? `${T.yellow}10` :
                  `${T.accent}0C`,
                color:
                  syncStatus === "synced" ? T.green :
                  syncStatus === "error"  ? T.yellow :
                  T.accent,
                cursor: syncStatus === "syncing" ? "not-allowed" : "pointer",
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: "0.08em",
                opacity: syncStatus === "syncing" ? 0.7 : 1,
                transition: "all 0.2s ease",
              }}
            >
              <motion.span
                animate={syncStatus === "syncing" ? { rotate: 360 } : { rotate: 0 }}
                transition={syncStatus === "syncing" ? { duration: 0.8, repeat: Infinity, ease: "linear" } : { duration: 0 }}
                style={{ display: "flex", alignItems: "center" }}
              >
                {syncStatus === "synced"
                  ? <CheckCircle2 size={11} />
                  : <RefreshCw size={11} />
                }
              </motion.span>
              {syncStatus === "syncing" ? "Syncing…" :
               syncStatus === "synced"  ? "Up to date" :
               syncStatus === "error"   ? "Sync failed" :
               "Sync Mode"}
            </motion.button>
          </div>
        )}

        {/* Step continuity rail */}
        <StepRail current={currentStep} T={T} />

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {!selected ? (
            <div style={{ color: T.textSub, textAlign: "center", padding: "80px 0", fontSize: 13 }}>
              <Users size={36} color={T.textFaint} style={{ marginBottom: 12 }} />
              <div style={{ fontWeight: 700, color: T.text, marginBottom: 6 }}>Select a table to begin</div>
              <div style={{ fontSize: 11 }}>Choose a guest from the table rail</div>
            </div>
          ) : (
            <>
              {/* Guest header card */}
              <div className="eeie-live-card" style={{ background: CARD, border: `1.5px solid ${T.border}`, borderRadius: 16, padding: "16px 20px", boxShadow: T.shadow }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 13, background: `${T.accent}14`, border: `2px solid ${T.accent}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: T.accent, flexShrink: 0 }}>
                    {selected.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 5 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{selected.guestName}</span>
                      {selected.returning && <Badge label="RETURNING" color={T.accent} bg={`${T.accent}12`} />}
                      <Badge label={selected.loyaltyTier} color={TIER_C[selected.loyaltyTier] ?? T.accent} bg={`${TIER_C[selected.loyaltyTier] ?? T.accent}12`} />
                      <Badge label={selected.moodTag.toUpperCase()} color={moodColor(selected.moodTag)} bg={`${moodColor(selected.moodTag)}12`} />
                    </div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      {[
                        { l: "XP",       v: selected.xp.toLocaleString() },
                        { l: "STRENGTH", v: selected.strength.toUpperCase(), c: T.accent },
                        { l: "AI MATCH", v: `${selected.aiMatchScore}%`,     c: T.green },
                        { l: "ACTIVE",   v: timeSince(selected.startedAt) },
                      ].map(m => (
                        <div key={m.l}>
                          <span style={{ fontSize: 8, color: T.textFaint, fontFamily: T.mono }}>{m.l} </span>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: m.c ?? T.text }}>{m.v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 7 }}>
                      {selected.flavors.map(f => <Badge key={f} label={f} color={T.purple} bg={`${T.purple}0C`} />)}
                    </div>
                  </div>
                  <motion.button whileTap={{ scale: 0.93 }} onClick={() => togglePause(selected.id)}
                    style={{ padding: "9px 14px", borderRadius: 10, border: `1px solid ${selected.status === "paused" ? `${T.green}40` : `${T.yellow}35`}`, background: selected.status === "paused" ? `${T.green}10` : `${T.yellow}0C`, color: selected.status === "paused" ? T.green : T.yellow, cursor: "pointer", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                    {selected.status === "paused" ? <><Play size={11} /> Resume</> : <><Pause size={11} /> Pause</>}
                  </motion.button>
                </div>
              </div>

              {/* ── PAIRING SHOWCASE with connectors ── */}
              <div style={{ background: CARD, border: `1.5px solid ${T.border}`, borderRadius: 16, padding: "16px 18px", boxShadow: T.shadow }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Star size={13} color={T.accent} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: T.text, textTransform: "uppercase" as const, fontFamily: T.mono }}>AI Pairing Showcase</span>
                  <Badge label="LIVE" color={T.green} bg={`${T.green}12`} />
                </div>

                {/* 3-card grid with connectors */}
                <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
                  <PairingCard
                    title="Cigar Match" accentColor={T.green} badge="ROTATING" T={T}
                    product={rotCigar} rotIdx={cigarIdx} totalCount={cigarProducts.length}
                    onAdd={() => rotCigar && addToCart(selected, { name: rotCigar.name, type: "cigar", price: rotCigar.price, qty: 1 })}
                    onShow={() => { setShowGuestPreview(true); setGuestPreviewShown(true); showToast(`Cigar shown to ${selected.guestName}`); }}
                    onSwap={() => setCigarIdx(i => (i + 1) % Math.max(1, cigarProducts.length))}
                    fallbackIcon={<Leaf size={32} color={`${T.green}40`} />}
                  />
                  <PairingConnector color={T.green} />
                  <PairingCard
                    title="Liquor Pairing" accentColor={T.purple} badge="ROTATING" T={T}
                    product={rotLiquor} rotIdx={liquorIdx} totalCount={liquorProducts.length}
                    onAdd={() => rotLiquor && addToCart(selected, { name: rotLiquor.name, type: "liquor", price: rotLiquor.price, qty: 1 })}
                    onShow={() => { setShowGuestPreview(true); setGuestPreviewShown(true); showToast(`Liquor shown to ${selected.guestName}`); }}
                    onSwap={() => setLiquorIdx(i => (i + 1) % Math.max(1, liquorProducts.length))}
                    fallbackIcon={<Coffee size={32} color={`${T.purple}40`} />}
                    extraLabel="2 oz pour"
                  />
                  <PairingConnector color={T.purple} />
                  <PairingCard
                    title="Food Pairing" accentColor={T.yellow} badge="SUGGESTED" T={T}
                    product={foodRec ? { id: "food", name: foodRec.name, brand: foodRec.category, category: "Food", price: foodRec.price, matchScore: 88, flavorTags: ["Savory","Umami"], description: foodRec.pairing, strength: foodRec.prepTime, image: foodRec.image } : null}
                    rotIdx={0} totalCount={1}
                    onAdd={() => addToCart(selected, { name: foodRec.name, type: "food", price: foodRec.price, qty: 1 })}
                    onShow={() => { setGuestPreviewShown(true); showToast(`Food shown to ${selected.guestName}`); }}
                    onSwap={() => showToast("Alternatives coming soon")}
                    fallbackIcon={<Utensils size={32} color={`${T.yellow}40`} />}
                    extraLabel={foodRec.prepTime}
                  />
                </div>

                {/* Why This Works */}
                <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 12, background: `${T.accent}06`, border: `1px solid ${T.accent}18` }}>
                  <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.18em", color: T.accent, fontFamily: T.mono, marginBottom: 6 }}>WHY THIS WORKS</div>
                  <div style={{ fontSize: 10.5, color: T.text, lineHeight: 1.75, fontStyle: "italic" }}>"{whyText}"</div>
                </div>
              </div>

              {/* Blend Intelligence — Sovereign only */}
              {mode === "sovereign" && (
              <div style={{ background: CARD, border: `1.5px solid ${T.border}`, borderRadius: 16, padding: "16px 18px", boxShadow: T.shadow }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <RefreshCw size={13} color={T.purple} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: T.text, textTransform: "uppercase" as const, fontFamily: T.mono }}>SmokeCraft Blend Intelligence</span>
                  <span style={{ fontSize: 8.5, color: T.textSub }}>Guest flavor radar</span>
                </div>
                <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                  <RadarChart labels={FLAVOR_LABELS} values={Object.values(selected.blendProfile)} color={T.purple} size={140} />
                  <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {FLAVOR_LABELS.map((label, i) => {
                      const val = Object.values(selected.blendProfile)[i] ?? 0;
                      return (
                        <div key={label}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: T.textSub, marginBottom: 3 }}>
                            <span>{label}</span><span style={{ color: T.purple, fontWeight: 700 }}>{val}</span>
                          </div>
                          <Meter pct={val} color={T.purple} height={4} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              )}

              {/* Staff Script Generator */}
              <div style={{ background: CARD, border: `1.5px solid ${T.border}`, borderRadius: 16, padding: "16px 18px", boxShadow: T.shadow }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <ClipboardList size={13} color={T.accent} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: T.text, textTransform: "uppercase" as const, fontFamily: T.mono }}>Staff Script Generator</span>
                </div>
                <div style={{ padding: "12px 16px", borderRadius: 12, background: `${T.accent}06`, border: `1px solid ${T.accent}18`, marginBottom: 12 }}>
                  <div style={{ fontSize: 11.5, color: T.text, lineHeight: 1.75, fontStyle: "italic" }}>
                    "{selected.guestName.split(" ")[0]}, this pairing brings out the <strong>{selected.flavors[0]?.toLowerCase() ?? "creamy"}</strong> and <strong>{selected.flavors[1]?.toLowerCase() ?? "nutty"}</strong> notes in your blend. The {(rotLiquor?.brand ?? "spirit").split(" ")[0]} lifts the finish beautifully — would you like to add a pour tonight?"
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  {[
                    { l: "Show to Guest", c: T.accent, action: () => { setShowGuestPreview(true); setGuestPreviewShown(true); } },
                    { l: "Shorter",       c: T.textSub, action: () => showToast("Shorter script loaded") },
                    { l: "Premium",       c: T.purple,  action: () => showToast("Premium script loaded") },
                  ].map(btn => (
                    <motion.button key={btn.l} whileTap={{ scale: 0.95 }} onClick={btn.action}
                      style={{ padding: "9px 14px", borderRadius: 9, border: `1px solid ${btn.c}28`, background: `${btn.c}0C`, color: btn.c, cursor: "pointer", fontSize: 9.5, fontWeight: 700 }}>
                      {btn.l}
                    </motion.button>
                  ))}
                </div>

                {/* Action grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 7, marginBottom: 12 }}>
                  <TouchButton icon={<Star size={15} />}          label="REWARD"    color={T.green}  variant="glass" size="sm" onClick={() => applyReward(selected)} />
                  <TouchButton icon={<Eye size={15} />}            label="SHOW"      color={T.purple} variant="glass" size="sm" onClick={() => { setShowGuestPreview(true); setGuestPreviewShown(true); }} />
                  <TouchButton icon={<Bell size={15} />}           label="MGR"       color={T.yellow} variant="glass" size="sm" onClick={() => showToast("Manager notified")} />
                  <TouchButton icon={<Send size={15} />}           label="BAR"       color={T.cyan}   variant="glass" size="sm" onClick={() => showToast("Bar notified")} />
                  <TouchButton icon={<BookOpen size={15} />}       label="KITCHEN"   color={T.accent} variant="glass" size="sm" onClick={() => showToast("Kitchen notified")} />
                  <TouchButton icon={<Leaf size={15} />}           label="ADD CIGAR" color={T.green}  variant="glass" size="sm" onClick={() => rotCigar  && addToCart(selected, { name: rotCigar.name,  type: "cigar",  price: rotCigar.price,  qty: 1 })} />
                  <TouchButton icon={<Coffee size={15} />}         label="ADD DRINK" color={T.purple} variant="glass" size="sm" onClick={() => rotLiquor && addToCart(selected, { name: rotLiquor.name, type: "liquor", price: rotLiquor.price, qty: 1 })} />
                  <TouchButton icon={<Utensils size={15} />}       label="ADD FOOD"  color={T.yellow} variant="glass" size="sm" onClick={() => addToCart(selected, { name: foodRec.name, type: "food", price: foodRec.price, qty: 1 })} />
                  <TouchButton icon={<ShoppingCart size={15} />}   label="SEND POS"  color={T.green}  variant="solid" size="sm" onClick={() => sendToPOS(selected)} />
                  <TouchButton icon={<Maximize2 size={15} />}      label="FULLSCREEN" color={T.accent} variant="glass" size="sm" onClick={() => showToast("Entering kiosk mode")} />
                </div>

                <input value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Add a staff note for this table…"
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: `1px solid ${T.border}`, background: SURFACE, color: T.text, fontSize: 11.5, outline: "none", boxSizing: "border-box" as const }} />
              </div>

              {/* Guest Preview */}
              <AnimatePresence>
                {showGuestPreview && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                    <div style={{ background: CARD, border: `1.5px solid ${T.cyan}40`, borderRadius: 16, padding: "16px 18px", boxShadow: T.shadow }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <Maximize2 size={13} color={T.cyan} />
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: T.text, textTransform: "uppercase" as const, fontFamily: T.mono }}>Guest Preview Mode</span>
                        <span style={{ fontSize: 8.5, color: T.textSub }}>Guest sees this on their screen</span>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowGuestPreview(false)}
                          style={{ marginLeft: "auto", background: "none", border: "none", color: T.textSub, cursor: "pointer", fontSize: 16 }}>✕</motion.button>
                      </div>
                      <div style={{ padding: "20px", borderRadius: 12, background: "#EAF4FF", border: `1px solid ${T.cyan}28`, textAlign: "center" as const }}>
                        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.22em", color: T.cyan, fontFamily: T.mono, marginBottom: 4 }}>NOVEE OS · PAIRING RECOMMENDATION</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 6 }}>{rotCigar?.name ?? selected.favCigar}</div>
                        <div style={{ fontSize: 12, color: T.textSub, marginBottom: 12 }}>paired with {rotLiquor?.name ?? selected.favLiquor}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center" as const, marginBottom: 14 }}>
                          {selected.flavors.map(f => <Badge key={f} label={f} color={T.cyan} bg={`${T.cyan}10`} />)}
                        </div>
                        <div style={{ fontSize: 10.5, color: T.textMid, lineHeight: 1.7, maxWidth: 380, margin: "0 auto", fontStyle: "italic" }}>"{whyText}"</div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
                          <motion.button whileTap={{ scale: 0.96 }} onClick={() => { addToCart(selected, { name: rotCigar?.name ?? selected.favCigar, type: "cigar", price: rotCigar?.price ?? 42, qty: 1 }); setShowGuestPreview(false); }}
                            style={{ padding: "11px 22px", borderRadius: 10, border: "none", background: T.green, color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Accept</motion.button>
                          <motion.button whileTap={{ scale: 0.96 }} onClick={() => setShowGuestPreview(false)}
                            style={{ padding: "11px 22px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.cardAlt, color: T.textSub, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Decline</motion.button>
                          <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setCigarIdx(i => (i + 1) % Math.max(1, cigarProducts.length)); setLiquorIdx(i => (i + 1) % Math.max(1, liquorProducts.length)); }}
                            style={{ padding: "11px 22px", borderRadius: 10, border: `1px solid ${T.cyan}30`, background: `${T.cyan}0C`, color: T.cyan, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Swap</motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Cart summary in center */}
              {selected.cart.length > 0 && (
                <div style={{ background: CARD, border: `1.5px solid ${T.green}35`, borderRadius: 16, padding: "14px 18px", boxShadow: T.shadow }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <ShoppingCart size={13} color={T.green} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.text, textTransform: "uppercase" as const, letterSpacing: "0.12em", fontFamily: T.mono }}>Current Order · {selected.cart.length} item{selected.cart.length > 1 ? "s" : ""}</span>
                    <div style={{ marginLeft: "auto", fontSize: 14, fontWeight: 800, color: T.green }}>${selected.cart.reduce((s, i) => s + i.price * i.qty, 0)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {selected.cart.map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, background: `${T.green}08`, border: `1px solid ${T.border}` }}>
                        <span style={{ fontSize: 10, color: T.text, fontWeight: 600 }}>{item.name}</span>
                        <span style={{ fontSize: 10, color: T.green, fontWeight: 700 }}>${item.price}</span>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => removeFromCart(selected.id, i)}
                          style={{ background: "none", border: "none", color: T.textSub, cursor: "pointer", fontSize: 13, padding: "0 2px", lineHeight: 1 }}>✕</motion.button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── RIGHT: White ticket panel ── */}
      <TicketPanel
        T={T}
        session={selected}
        rotCigar={rotCigar}
        rotLiquor={rotLiquor}
        foodRec={foodRec}
        onSendToPOS={() => selected && sendToPOS(selected)}
        onClearCart={() => selected && clearCart(selected)}
        onReturn={() => showToast("Guest returned to experience")}
        onResume={() => selected && togglePause(selected.id)}
      />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            style={{ position: "fixed", bottom: 80, right: 290, background: T.green, color: "#fff", padding: "11px 18px", borderRadius: 12, fontWeight: 700, fontSize: 11.5, zIndex: 9999, boxShadow: `0 4px 20px ${T.green}50` }}
          >
            ✓ {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
