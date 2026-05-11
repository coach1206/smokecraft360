/**
 * EEIE Staff Cockpit — Full guest management, AI recommendations, Product Wall.
 * Touch-first design. 56px+ button targets throughout.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Leaf, Coffee, Utensils, ShoppingCart, Users, Eye, Star,
  Send, ClipboardList, Bell, BookOpen, ChevronRight, Pause, Play,
} from "lucide-react";
import {
  type Theme, type GuestSession, type CartItem,
  Badge, Meter, Panel, TouchButton, RadarChart, DonutRing, LiveDot,
  MOCK_SESSIONS, TIER_C, STATUS_COLOR, triggerHaptic,
} from "./shared";

const FLAVOR_LABELS = ["Creamy","Sweet","Nutty","Earthy","Spicy","Woody","Pepper","Citrus"];

interface FoodItem { name: string; category: string; price: number; pairing: string; prepTime: string; }
const FOOD_ITEMS: Record<string, FoodItem> = {
  Creamy:  { name: "Smoked Short Rib Sliders",  category: "Small Plates", price: 18, pairing: "Deepens oak, cocoa, and charred-sweet finish in the blend.", prepTime: "12 min" },
  Sweet:   { name: "Vanilla Crème Brûlée",       category: "Dessert",      price: 14, pairing: "Amplifies the vanilla and caramel notes, softens the finish.", prepTime: "5 min" },
  Spicy:   { name: "Truffle Charcuterie Board",  category: "Boards",       price: 28, pairing: "Earthy umami grounds the spice and leather notes beautifully.", prepTime: "8 min" },
  default: { name: "Aged Cheese Flight",          category: "Boards",       price: 22, pairing: "Neutral creamy base bridges any flavor profile gracefully.", prepTime: "6 min" },
};

function getFoodRec(flavors: string[]): FoodItem {
  for (const f of flavors) if (FOOD_ITEMS[f]) return FOOD_ITEMS[f];
  return FOOD_ITEMS.default;
}

function timeSince(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? "just now" : `${m}m`;
}

interface Props { T: Theme; }

export function StaffCockpit({ T }: Props) {
  const [sessions, setSessions] = useState<GuestSession[]>(MOCK_SESSIONS);
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_SESSIONS[0].id);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [showGuestPreview, setShowGuestPreview] = useState(false);

  const selected = sessions.find(s => s.id === selectedId) ?? null;
  const foodRec = selected ? getFoodRec(selected.flavors) : FOOD_ITEMS.default;

  function showToast(msg: string) {
    triggerHaptic("success");
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  function togglePause(id: string) {
    triggerHaptic("softTap");
    setSessions(p => p.map(s => s.id === id ? { ...s, status: s.status === "paused" ? "active" : "paused" } : s));
  }

  function addToCart(session: GuestSession, item: CartItem) {
    setSessions(p => p.map(s => s.id === session.id ? { ...s, cart: [...s.cart, item] } : s));
    showToast(`${item.name} added to order`);
  }

  function removeFromCart(sessionId: string, idx: number) {
    setSessions(p => p.map(s => s.id === sessionId ? { ...s, cart: s.cart.filter((_, i) => i !== idx) } : s));
  }

  function sendToPOS(session: GuestSession) {
    if (session.cart.length === 0) return;
    showToast(`${session.cart.length} item(s) sent to Commerce Infrastructure`);
    setSessions(p => p.map(s => s.id === session.id ? { ...s, cart: [] } : s));
    triggerHaptic("managerAlert");
  }

  function applyReward(session: GuestSession) {
    showToast(`Loyalty reward applied for ${session.guestName}`);
    triggerHaptic("success");
  }

  const moodTagColor = (tag: string) => ({
    Premium: T.accent, "High Energy": T.cyan, Social: T.green, "VIP Active": T.purple,
    Calm: "#38BDF8", Slow: "#C084FC",
  }[tag] ?? T.accent);

  return (
    <div style={{ display: "flex", gap: 16, height: "100%" }}>

      {/* ── LEFT: Table List ── */}
      <div style={{ width: 210, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.22em", color: T.textFaint, fontFamily: T.mono, marginBottom: 6 }}>
          ACTIVE TABLES
        </div>
        {sessions.map(s => {
          const sc = STATUS_COLOR(s.status, T);
          const isSelected = selectedId === s.id;
          return (
            <motion.div key={s.id} onClick={() => setSelectedId(s.id)} whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
              style={{
                background: isSelected ? `${T.accent}10` : T.card,
                border: `1px solid ${isSelected ? T.borderHi : T.border}`,
                borderLeft: `3px solid ${sc}`,
                borderRadius: 12, padding: "11px 13px", cursor: "pointer",
                boxShadow: isSelected ? `0 0 0 2px ${T.accent}28` : T.shadow,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: T.textFaint, fontFamily: T.mono }}>{s.table.toUpperCase()}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {s.cart.length > 0 && (
                    <div style={{ background: T.accent, color: "#fff", borderRadius: 999, fontSize: 8, fontWeight: 800, padding: "1px 5px" }}>{s.cart.length}</div>
                  )}
                  <LiveDot color={sc} size={6} />
                </div>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>{s.guestName}</div>
              <div style={{ fontSize: 9, color: T.textSub, marginTop: 3, display: "flex", gap: 8 }}>
                <span>{timeSince(s.startedAt)}</span>
                <span>{s.loyaltyTier}</span>
              </div>
              {s.status === "attention" && (
                <div style={{ marginTop: 5, fontSize: 8.5, color: T.yellow, fontWeight: 700, fontFamily: T.mono }}>⚠ NEEDS ATTENTION</div>
              )}
              {s.status === "paused" && (
                <div style={{ marginTop: 5, fontSize: 8.5, color: T.accent, fontFamily: T.mono }}>⏸ EXPERIENCE PAUSED</div>
              )}
            </motion.div>
          );
        })}

        {/* Mode switcher */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.16em", color: T.textFaint, fontFamily: T.mono, marginBottom: 6 }}>KIOSK MODE</div>
          {["Staff Assist","Guest View","Manager Control","Kiosk Lock"].map(mode => (
            <motion.button key={mode} whileTap={{ scale: 0.95 }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "8px 10px", borderRadius: 8, border: "none", background: mode === "Staff Assist" ? `${T.accent}12` : "transparent", color: mode === "Staff Assist" ? T.accent : T.textSub, cursor: "pointer", fontSize: 10, fontWeight: mode === "Staff Assist" ? 700 : 400, marginBottom: 2, textAlign: "left" as const }}>
              <ChevronRight size={10} />
              {mode}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── CENTER: Guest Detail ── */}
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        {!selected ? (
          <div style={{ color: T.textSub, textAlign: "center", padding: "80px 0", fontSize: 13 }}>
            <Users size={36} style={{ opacity: 0.2, marginBottom: 12 }} />
            <div>Select a table to view guest session</div>
          </div>
        ) : (
          <>
            {/* Guest header */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "18px 20px", boxShadow: T.shadow }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${T.accent}14`, border: `2px solid ${T.borderHi}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 800, color: T.accent, flexShrink: 0 }}>
                  {selected.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                    <span style={{ fontSize: 17, fontWeight: 800, color: T.text }}>{selected.guestName}</span>
                    {selected.returning && <Badge label="RETURNING" color={T.accent} bg={`${T.accent}12`} />}
                    <Badge label={selected.loyaltyTier} color={TIER_C[selected.loyaltyTier] ?? T.accent} bg={`${TIER_C[selected.loyaltyTier] ?? T.accent}12`} />
                    <Badge label={selected.moodTag.toUpperCase()} color={moodTagColor(selected.moodTag)} bg={`${moodTagColor(selected.moodTag)}12`} />
                  </div>
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                    {[
                      { l: "XP", v: selected.xp.toLocaleString() },
                      { l: "STRENGTH", v: selected.strength.toUpperCase(), c: T.accent },
                      { l: "AI MATCH", v: `${selected.aiMatchScore}%`, c: T.green },
                      { l: "ACTIVE", v: timeSince(selected.startedAt) },
                    ].map(m => (
                      <div key={m.l}>
                        <span style={{ fontSize: 8.5, color: T.textFaint, fontFamily: T.mono }}>{m.l} </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: m.c ?? T.text }}>{m.v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                    {selected.flavors.map(f => <Badge key={f} label={f} color={T.purple} bg={`${T.purple}0C`} />)}
                  </div>
                </div>

                {/* Pause / Resume */}
                <motion.button whileTap={{ scale: 0.93 }} onClick={() => togglePause(selected.id)}
                  style={{
                    padding: "10px 16px", borderRadius: 10, border: `1px solid ${selected.status === "paused" ? `${T.green}40` : `${T.yellow}40`}`,
                    background: selected.status === "paused" ? `${T.green}12` : `${T.yellow}10`,
                    color: selected.status === "paused" ? T.green : T.yellow,
                    cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                  }}>
                  {selected.status === "paused" ? <><Play size={12} /> Resume</> : <><Pause size={12} /> Pause</>}
                </motion.button>
              </div>
            </div>

            {/* Blend Intelligence radar */}
            <Panel title="SmokeCraft Blend Intelligence" subtitle="Guest flavor radar profile" icon={<Star size={14} />} T={T} accentColor={T.purple}>
              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <RadarChart labels={FLAVOR_LABELS} values={Object.values(selected.blendProfile)} color={T.purple} size={150} />
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {FLAVOR_LABELS.map((label, i) => {
                    const val = Object.values(selected.blendProfile)[i] ?? 0;
                    return (
                      <div key={label}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: T.textSub, marginBottom: 3 }}>
                          <span>{label}</span><span style={{ color: T.purple, fontWeight: 700 }}>{val}</span>
                        </div>
                        <Meter pct={val} color={T.purple} height={4} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                  {[
                    { l: "Wrapper", v: "Connecticut Shade" },
                    { l: "Binder", v: "Honduran" },
                    { l: "Filler", v: "Nicaraguan" },
                    { l: "Size", v: "Robusto" },
                    { l: "Cut", v: "Straight" },
                    { l: "Strength", v: selected.strength },
                  ].map(m => (
                    <div key={m.l}>
                      <div style={{ fontSize: 8, color: T.textFaint, fontFamily: T.mono }}>{m.l}</div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: T.text }}>{m.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            {/* AI Recommendations grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {/* Cigar Match */}
              <Panel title="AI Cigar Match" icon={<Leaf size={13} />} badge="RECOMMENDED" T={T} accentColor={T.green}>
                <div style={{ padding: "12px", borderRadius: 12, background: `${T.green}06`, border: `1px solid ${T.green}18` }}>
                  <div style={{ height: 70, borderRadius: 10, background: `${T.green}10`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                    <Leaf size={28} color={`${T.green}80`} />
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: T.text, marginBottom: 2, lineHeight: 1.3 }}>{selected.favCigar}</div>
                  <div style={{ fontSize: 9, color: T.textSub, marginBottom: 8 }}>Medium · Handcrafted · Premium Reserve</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <DonutRing pct={selected.aiMatchScore} color={T.green} size={52} label={`${selected.aiMatchScore}%`} />
                    <div style={{ flex: 1, paddingLeft: 10 }}>
                      <div style={{ fontSize: 9, color: T.textSub, lineHeight: 1.6 }}>"{selected.flavors.slice(0,2).join(" and ")} notes complement this blend perfectly."</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <motion.button whileTap={{ scale: 0.94 }}
                      onClick={() => addToCart(selected, { name: selected.favCigar, type: "cigar", price: 42, qty: 1 })}
                      style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: T.green, color: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 700, boxShadow: `0 4px 12px ${T.green}35` }}>
                      + Add
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.94 }}
                      onClick={() => showToast(`${selected.favCigar} shown to ${selected.guestName}`)}
                      style={{ padding: "11px 12px", borderRadius: 10, border: `1px solid ${T.green}30`, background: `${T.green}0A`, color: T.green, cursor: "pointer" }}>
                      <Eye size={13} />
                    </motion.button>
                  </div>
                </div>
              </Panel>

              {/* Liquor Pairing */}
              <Panel title="Liquor Pairing" icon={<Coffee size={13} />} badge="OPTIMAL" T={T} accentColor={T.purple}>
                <div style={{ padding: "12px", borderRadius: 12, background: `${T.purple}06`, border: `1px solid ${T.purple}18` }}>
                  <div style={{ height: 70, borderRadius: 10, background: `${T.purple}10`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                    <Coffee size={28} color={`${T.purple}80`} />
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: T.text, marginBottom: 2, lineHeight: 1.3 }}>{selected.favLiquor}</div>
                  <div style={{ fontSize: 9, color: T.textSub, marginBottom: 8 }}>2 oz pour · Available · Premium</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                    {["Creamy","Toasted","Vanilla","Oak"].map(f => <Badge key={f} label={f} color={T.purple} bg={`${T.purple}0C`} />)}
                  </div>
                  <div style={{ fontSize: 9, color: T.textSub, lineHeight: 1.6, marginBottom: 10 }}>"{selected.favLiquor} supports {selected.flavors[0]?.toLowerCase() ?? "the"} and {selected.flavors[1]?.toLowerCase() ?? "rich"} notes while lifting the cigar's finish."</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <motion.button whileTap={{ scale: 0.94 }}
                      onClick={() => addToCart(selected, { name: selected.favLiquor, type: "liquor", price: 22, qty: 1 })}
                      style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: T.purple, color: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 700, boxShadow: `0 4px 12px ${T.purple}35` }}>
                      + Add
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.94 }}
                      onClick={() => showToast(`Pairing shown to ${selected.guestName}`)}
                      style={{ padding: "11px 12px", borderRadius: 10, border: `1px solid ${T.purple}30`, background: `${T.purple}0A`, color: T.purple, cursor: "pointer" }}>
                      <Eye size={13} />
                    </motion.button>
                  </div>
                </div>
              </Panel>

              {/* Food Pairing */}
              <Panel title="Food Pairing" icon={<Utensils size={13} />} badge="SUGGESTED" T={T} accentColor={T.yellow}>
                <div style={{ padding: "12px", borderRadius: 12, background: `${T.yellow}06`, border: `1px solid ${T.yellow}18` }}>
                  <div style={{ height: 70, borderRadius: 10, background: `${T.yellow}10`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                    <Utensils size={28} color={`${T.yellow}80`} />
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: T.text, marginBottom: 2, lineHeight: 1.3 }}>{foodRec.name}</div>
                  <div style={{ fontSize: 9, color: T.textSub, marginBottom: 4 }}>{foodRec.category} · ${foodRec.price} · {foodRec.prepTime}</div>
                  <div style={{ fontSize: 9, color: T.textSub, lineHeight: 1.6, marginBottom: 10 }}>"{foodRec.pairing}"</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <motion.button whileTap={{ scale: 0.94 }}
                      onClick={() => addToCart(selected, { name: foodRec.name, type: "food", price: foodRec.price, qty: 1 })}
                      style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: T.yellow, color: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 700, boxShadow: `0 4px 12px ${T.yellow}35` }}>
                      + Add
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.94 }}
                      onClick={() => showToast(`Food shown to ${selected.guestName}`)}
                      style={{ padding: "11px 12px", borderRadius: 10, border: `1px solid ${T.yellow}30`, background: `${T.yellow}0A`, color: T.yellow, cursor: "pointer" }}>
                      <Eye size={13} />
                    </motion.button>
                  </div>
                </div>
              </Panel>
            </div>

            {/* Staff Nudge System */}
            <Panel title="Staff Nudge System" subtitle="AI-suggested service script" icon={<ClipboardList size={14} />} T={T} accentColor={T.accent}>
              <div style={{ padding: "14px", borderRadius: 12, background: `${T.accent}06`, border: `1px solid ${T.accent}18`, marginBottom: 14 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 10 }}>
                  <Star size={13} color={T.accent} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 11, color: T.text, lineHeight: 1.7, fontStyle: "italic" }}>
                    "Say: <strong>This pairing brings out the {selected.flavors[0]?.toLowerCase() ?? "creamy"} and {selected.flavors[1]?.toLowerCase() ?? "nutty"} notes in your blend. The {selected.favLiquor.split(" ")[0]} lifts the finish beautifully. Would you like to add a 2 oz pour tonight?</strong>"
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {[
                    { l: "Opportunity", v: "Premium Pairing Upsell" },
                    { l: "Timing", v: "Now — guest at mid-session" },
                    { l: "Confidence", v: `${selected.aiMatchScore}%` },
                    { l: "Pace", v: "Curated · Unhurried" },
                  ].map(m => (
                    <div key={m.l}>
                      <div style={{ fontSize: 8, color: T.textFaint, fontFamily: T.mono }}>{m.l}</div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: T.text }}>{m.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action grid — 56px min height touch buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
                <TouchButton icon={<Star size={16} />}         label="APPLY REWARD"    color={T.green}  variant="glass" onClick={() => applyReward(selected)} />
                <TouchButton icon={<ClipboardList size={16} />} label="ADD NOTE"        color={T.accent} variant="glass" />
                <TouchButton icon={<Eye size={16} />}          label="SHOW VISUALS"    color={T.purple} variant="glass" onClick={() => showToast(`Visuals shown to ${selected.guestName}`)} />
                <TouchButton icon={<Leaf size={16} />}         label="ADD CIGAR"       color={T.green}  variant="glass" onClick={() => addToCart(selected, { name: selected.favCigar, type: "cigar", price: 42, qty: 1 })} />
                <TouchButton icon={<Coffee size={16} />}       label="ADD DRINK"       color={T.purple} variant="glass" onClick={() => addToCart(selected, { name: selected.favLiquor, type: "liquor", price: 22, qty: 1 })} />
                <TouchButton icon={<Utensils size={16} />}     label="ADD FOOD"        color={T.yellow} variant="glass" onClick={() => addToCart(selected, { name: foodRec.name, type: "food", price: foodRec.price, qty: 1 })} />
                <TouchButton icon={<Bell size={16} />}         label="NOTIFY MGR"      color={T.yellow} variant="glass" onClick={() => showToast("Manager notified")} />
                <TouchButton icon={<Send size={16} />}         label="NOTIFY BAR"      color={T.cyan}   variant="glass" onClick={() => showToast("Bar notified")} />
                <TouchButton icon={<BookOpen size={16} />}     label="NOTIFY KITCHEN"  color={T.accent} variant="glass" onClick={() => showToast("Kitchen notified")} />
                <TouchButton icon={<ShoppingCart size={16} />} label="SEND TO POS"     color={T.green}  variant="solid" size="md" onClick={() => sendToPOS(selected)} />
                <TouchButton icon={<Play size={16} />}         label="RETURN TO GUEST" color={T.accent} variant="solid" size="md" onClick={() => togglePause(selected.id)} />
              </div>

              {/* Note input */}
              <input value={note} onChange={e => setNote(e.target.value)}
                placeholder="Add a staff note for this table..."
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.dark ? "rgba(255,255,255,0.04)" : "rgba(0,60,180,0.03)", color: T.text, fontSize: 12, outline: "none", boxSizing: "border-box" as const }} />
            </Panel>

            {/* Cart */}
            {selected.cart.length > 0 && (
              <Panel title={`Current Order · ${selected.cart.length} item${selected.cart.length > 1 ? "s" : ""}`} icon={<ShoppingCart size={14} />} T={T} accentColor={T.green}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {selected.cart.map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, background: `${T.green}06`, border: `1px solid ${T.border}` }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{item.name}</div>
                        <div style={{ fontSize: 9, color: T.textSub, textTransform: "capitalize" as const }}>{item.type}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.green }}>${item.price}</div>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => removeFromCart(selected.id, i)}
                          style={{ background: "none", border: "none", color: T.textSub, cursor: "pointer", fontSize: 14, padding: "2px 6px" }}>✕</motion.button>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 4px", borderTop: `1px solid ${T.border}`, marginTop: 4 }}>
                    <span style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>Total</span>
                    <span style={{ fontWeight: 800, color: T.green, fontSize: 18 }}>${selected.cart.reduce((s, i) => s + i.price * i.qty, 0)}</span>
                  </div>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => sendToPOS(selected)}
                    style={{ width: "100%", padding: "16px", borderRadius: 12, background: T.green, border: "none", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 800, boxShadow: `0 4px 18px ${T.green}40`, marginTop: 4 }}>
                    📲 Send to Commerce Infrastructure
                  </motion.button>
                </div>
              </Panel>
            )}

            {/* Guest Experience Preview */}
            <Panel title="Guest Experience Preview" subtitle="What the guest sees on kiosk" icon={<Eye size={14} />} T={T} accentColor={T.cyan}>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowGuestPreview(p => !p)}
                style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1px solid ${T.cyan}28`, background: `${T.cyan}08`, color: T.cyan, cursor: "pointer", fontSize: 11, fontWeight: 700, marginBottom: showGuestPreview ? 12 : 0 }}>
                {showGuestPreview ? "▲ Hide Preview" : "▼ View Guest Screen"}
              </motion.button>
              <AnimatePresence>
                {showGuestPreview && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                    <div style={{ padding: "16px", borderRadius: 14, background: T.dark ? "#0A1428" : "#F8FAFF", border: `1px solid ${T.cyan}25` }}>
                      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.22em", color: T.cyan, fontFamily: T.mono, marginBottom: 2 }}>SMOKECRAFT BY SOVEREIGN</div>
                      <div style={{ fontSize: 9, color: T.textFaint, marginBottom: 12 }}>Step 3 of 5 · Flavor Discovery</div>
                      {/* Step progress */}
                      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                        {[1,2,3,4,5].map(s => (
                          <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= 3 ? T.cyan : `${T.border}` }} />
                        ))}
                      </div>
                      <div style={{ textAlign: "center" as const, padding: "20px", borderRadius: 12, background: T.dark ? "rgba(0,200,255,0.06)" : "rgba(0,130,180,0.05)", border: `1px solid ${T.cyan}18` }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>Your Blend Profile</div>
                        <div style={{ fontSize: 11, color: T.textSub, marginBottom: 12 }}>AI Match Score: <strong style={{ color: T.green }}>{selected.aiMatchScore}%</strong></div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center" as const }}>
                          {selected.flavors.map(f => <Badge key={f} label={f} color={T.cyan} bg={`${T.cyan}0E`} />)}
                        </div>
                        {selected.status === "paused" && (
                          <div style={{ marginTop: 12, padding: "8px 14px", borderRadius: 9, background: `${T.yellow}0E`, border: `1px solid ${T.yellow}25`, fontSize: 10, color: T.yellow, fontWeight: 700 }}>
                            ⏸ Your experience is paused — your concierge will return shortly
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Panel>
          </>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            style={{ position: "fixed", bottom: 100, right: 32, background: T.green, color: "#fff", padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 12, zIndex: 999, boxShadow: `0 4px 20px ${T.green}50` }}>
            ✓ {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
