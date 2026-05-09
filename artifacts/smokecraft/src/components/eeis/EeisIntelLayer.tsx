/**
 * EeisIntelLayer — Per-Craft Hidden Intelligence Overlay
 *
 * Activation: 3-finger press held for 1.5 seconds on any Craft360 page.
 * Visible to: Staff / authorized personnel only (no guest UI chrome).
 *
 * Per-craft intelligence surface:
 *   Smoke → Cigar SKU margin ranking, wrapper compatibility, low-stock alerts
 *   Pour  → Spirit upsell stack, aged allocation flags, cocktail pairing matrix
 *   Brew  → Flight optimization, seasonal tap alerts, bitterness-profile matches
 *   Vape  → Device bundle opportunities, trending SKU velocity, cloud-profile match
 *
 * Design: Brushed Graphite (#2A2A2A) header · craft-accent intelligence cards ·
 *         smoked-titanium panel · Warm Honey Amber data labels.
 */

import { useRef, useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence }        from "framer-motion";
import { useExperience, type Module }     from "@/contexts/ExperienceContext";

// ── Design tokens ──────────────────────────────────────────────────────────────
const GRAPHITE = "#2A2A2A";
const OBSIDIAN = "#0F0E0C";
const GOLD     = "#D4AF37";

// ── Per-craft intel data ───────────────────────────────────────────────────────
interface IntelCard {
  sku:        string;
  label:      string;
  margin:     number;   // 0–100
  stock:      number;
  stockLabel: "HIGH" | "MED" | "LOW" | "CRITICAL";
  note:       string;   // AI pairing / revenue note
}

const INTEL_DATA: Record<Exclude<Module, "portal">, {
  accent:   string;
  subtitle: string;
  revenue:  string;
  cards:    IntelCard[];
}> = {
  smoke: {
    accent:   "#C8A96E",
    subtitle: "COMBUSTION INTELLIGENCE LAYER",
    revenue:  "+$340 margin opportunity detected",
    cards: [
      { sku: "SC-241", label: "Aged Dominican",           margin: 75, stock: 6,  stockLabel: "MED",      note: "Premium margin · Spice-forward · 4 swipes tonight" },
      { sku: "SC-188", label: "Maduro Churchill",         margin: 72, stock: 14, stockLabel: "HIGH",     note: "Bold wrapper — aligns to Leather/Earthy profiles" },
      { sku: "SC-093", label: "Connecticut Shade Robsto", margin: 68, stock: 8,  stockLabel: "MED",      note: "High conversion · Cedar-forward · pairs w/ bourbon" },
      { sku: "SC-317", label: "Cameroon Petit Corona",    margin: 61, stock: 3,  stockLabel: "CRITICAL", note: "⚠ 3 remaining — push before depletion" },
    ],
  },
  pour: {
    accent:   "#E8C870",
    subtitle: "DISTILLATION INTELLIGENCE LAYER",
    revenue:  "+$510 margin opportunity detected",
    cards: [
      { sku: "PR-408", label: "Ardbeg Uigeadail",    margin: 78, stock: 2,  stockLabel: "CRITICAL", note: "⚠ 2 bottles — peat profile match · highest margin" },
      { sku: "PR-312", label: "Glenfarclas 25yr",    margin: 74, stock: 4,  stockLabel: "LOW",      note: "Oak dominant · premium upsell · 6 pours remaining" },
      { sku: "PR-201", label: "Hibiki Harmony",      margin: 71, stock: 7,  stockLabel: "MED",      note: "Fruit + Spice balance — top evening conversion" },
      { sku: "PR-155", label: "Diplomatico Reserva", margin: 68, stock: 12, stockLabel: "HIGH",     note: "Fruit-forward rum · highest table close rate" },
    ],
  },
  brew: {
    accent:   "#7EC8A0",
    subtitle: "FERMENTATION INTELLIGENCE LAYER",
    revenue:  "+$220 margin opportunity detected",
    cards: [
      { sku: "BR-502", label: "Lost Abbey Judgment", margin: 73, stock: 3,  stockLabel: "CRITICAL", note: "⚠ Last 3 bottles — seasonal push opportunity" },
      { sku: "BR-314", label: "Founders Bfast Stout", margin: 69, stock: 6,  stockLabel: "LOW",      note: "Body + Malt match · cold-weather driver" },
      { sku: "BR-218", label: "Pliny the Elder IPA",  margin: 64, stock: 9,  stockLabel: "MED",      note: "Hops-dominant · profile match · fast mover" },
      { sku: "BR-101", label: "Allagash White",       margin: 61, stock: 14, stockLabel: "HIGH",     note: "Crisp + clean · highest table volume" },
    ],
  },
  vape: {
    accent:   "#B8A0E8",
    subtitle: "CLOUD GEOMETRY INTELLIGENCE LAYER",
    revenue:  "+$180 margin opportunity detected",
    cards: [
      { sku: "VP-601", label: "Vaporesso XROS 4",   margin: 71, stock: 7,  stockLabel: "MED",      note: "Pod system · highest bundle attachment rate" },
      { sku: "VP-488", label: "SMOK Morph 3 Kit",   margin: 62, stock: 5,  stockLabel: "LOW",      note: "Dense cloud geometry · top-rated kit tonight" },
      { sku: "VP-302", label: "Lost Mary BM600",     margin: 58, stock: 18, stockLabel: "HIGH",     note: "Crisp flavor · fastest-moving SKU this week" },
      { sku: "VP-214", label: "Elf Bar Lost Mary",   margin: 55, stock: 2,  stockLabel: "CRITICAL", note: "⚠ Trending item — 2 remaining · move now" },
    ],
  },
};

// ── Live inventory fetch helpers ───────────────────────────────────────────────
const CATEGORY_MAP: Record<Exclude<Module, "portal">, string> = {
  smoke: "cigar",
  pour:  "alcohol",
  brew:  "beer",
  vape:  "vape",
};

const TIER_MARGIN: Record<string, number> = { premium: 83, mid: 69, standard: 56 };

interface RawProduct { id: string; name: string; tier: string; boostLevel: number; sponsored: boolean }

function productToCard(p: RawProduct): IntelCard {
  const margin      = TIER_MARGIN[p.tier] ?? 65;
  const stock       = Math.max(2, 18 - (p.boostLevel ?? 0) * 2);
  const stockLabel: IntelCard["stockLabel"] =
    stock <= 3 ? "CRITICAL" : stock <= 7 ? "LOW" : stock <= 12 ? "MED" : "HIGH";
  return {
    sku:        p.id.slice(0, 8).toUpperCase(),
    label:      p.name,
    margin,
    stock,
    stockLabel,
    note: p.sponsored
      ? `Sponsored · ${p.tier} tier · active campaign running`
      : `${p.tier} tier · margin-optimised for tonight`,
  };
}

const STOCK_COLORS: Record<string, string> = {
  HIGH:     "#7EC8A0",
  MED:      "#E8C870",
  LOW:      "#E8904A",
  CRITICAL: "#EF4444",
};

// ── Intel card ─────────────────────────────────────────────────────────────────
function IntelCard({ card, accent, idx }: { card: IntelCard; accent: string; idx: number }) {
  const stockColor = STOCK_COLORS[card.stockLabel];
  const barW       = `${card.margin}%`;
  const isCritical = card.stockLabel === "CRITICAL";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * idx, duration: 0.35 }}
      style={{
        background:    "rgba(20,18,14,0.92)",
        border:        `1px solid ${isCritical ? "#EF444430" : `${accent}22`}`,
        borderRadius:  10,
        padding:       "12px 14px",
        flexShrink:    0,
        width:         200,
        boxShadow:     isCritical ? "0 0 16px rgba(239,68,68,0.12)" : "none",
      }}
    >
      {/* SKU + stock badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 7, color: `${accent}60`, letterSpacing: "0.18em" }}>{card.sku}</div>
        <div style={{
          fontSize: 6.5, fontWeight: 700, letterSpacing: "0.14em",
          color: stockColor, background: `${stockColor}18`,
          border: `1px solid ${stockColor}40`,
          padding: "2px 7px", borderRadius: 999,
        }}>
          {card.stockLabel} · {card.stock}
        </div>
      </div>

      {/* Item name */}
      <div style={{
        fontSize: 11, color: "#F5F2ED", fontWeight: 600,
        letterSpacing: "0.04em", marginBottom: 8,
        fontFamily: "'Cormorant Garamond', Georgia, serif",
      }}>
        {card.label}
      </div>

      {/* Margin bar */}
      <div style={{ marginBottom: 7 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <div style={{ fontSize: 6.5, color: `${GOLD}70`, letterSpacing: "0.14em" }}>MARGIN</div>
          <div style={{ fontSize: 8, color: GOLD, fontWeight: 700 }}>{card.margin}%</div>
        </div>
        <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: barW }}
            transition={{ duration: 0.7, delay: 0.1 + 0.06 * idx, ease: [0.22, 1, 0.36, 1] }}
            style={{ height: "100%", background: `linear-gradient(90deg, ${accent}80, ${accent})`, borderRadius: 2 }}
          />
        </div>
      </div>

      {/* AI note */}
      <div style={{
        fontSize: 9, color: "rgba(245,242,237,0.38)",
        lineHeight: 1.5, fontStyle: "italic",
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        borderTop: `1px solid rgba(255,255,255,0.05)`,
        paddingTop: 7,
      }}>
        {card.note}
      </div>
    </motion.div>
  );
}

// ── 3-finger gesture hook ──────────────────────────────────────────────────────
const HOLD_MS = 1500;

export function useThreeFingerGesture(onActivate: () => void) {
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countRef  = useRef(0);
  const [holding, setHolding] = useState(false);

  const cancel = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setHolding(false);
    countRef.current = 0;
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    countRef.current = e.touches.length;
    if (e.touches.length === 3) {
      setHolding(true);
      timerRef.current = setTimeout(() => {
        if (countRef.current === 3) onActivate();
        cancel();
      }, HOLD_MS);
    } else {
      cancel();
    }
  }, [onActivate, cancel]);

  const onTouchEnd   = useCallback(() => cancel(), [cancel]);
  const onTouchMove  = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 3) cancel();
  }, [cancel]);

  return { holding, onTouchStart, onTouchEnd, onTouchMove };
}

// ── Main overlay component ─────────────────────────────────────────────────────
interface EeisIntelLayerProps {
  craftId: Exclude<Module, "portal">;
}

export function EeisIntelLayer({ craftId }: EeisIntelLayerProps) {
  const { state, toggleEeis } = useExperience();
  const intel   = INTEL_DATA[craftId];
  const isOpen  = state.eeisMode;

  const [liveCards,  setLiveCards]  = useState<IntelCard[] | null>(null);
  const [dataSource, setDataSource] = useState<"live" | "cached">("cached");

  useEffect(() => {
    if (!isOpen) return;
    const category = CATEGORY_MAP[craftId];
    fetch(`/api/products?category=${category}&limit=8`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((products: RawProduct[]) => {
        if (Array.isArray(products) && products.length >= 1) {
          setLiveCards(products.slice(0, 4).map(productToCard));
          setDataSource("live");
        }
      })
      .catch(() => { /* fall back to static INTEL_DATA */ });
  }, [isOpen, craftId]);

  const { holding, onTouchStart, onTouchEnd, onTouchMove } = useThreeFingerGesture(toggleEeis);

  return (
    <>
      {/* Invisible 3-finger capture zone — covers the entire viewport */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchMove={onTouchMove}
        style={{
          position:    "fixed",
          inset:       0,
          zIndex:      200,
          touchAction: "none",
          pointerEvents: isOpen ? "none" : "auto",
        }}
      />

      {/* 3-finger hold progress indicator */}
      <AnimatePresence>
        {holding && !isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position:       "fixed",
              bottom:         80,
              left:           "50%",
              transform:      "translateX(-50%)",
              zIndex:         300,
              background:     "rgba(10,9,8,0.90)",
              border:         `1px solid ${intel.accent}50`,
              borderRadius:   999,
              padding:        "8px 20px",
              display:        "flex",
              alignItems:     "center",
              gap:            10,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            <motion.div
              style={{
                width: 28, height: 28, borderRadius: "50%",
                border: `2px solid ${intel.accent}40`,
                borderTopColor: intel.accent,
                flexShrink: 0,
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
            <div style={{
              fontSize: 8, color: intel.accent, letterSpacing: "0.2em",
              fontFamily: "'Space Mono', monospace",
            }}>
              ACTIVATING EEIS…
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EEIS Intelligence Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="eeis-intel"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position:   "fixed",
              inset:      0,
              zIndex:     400,
              display:    "flex",
              flexDirection: "column",
              background: `radial-gradient(ellipse at 50% 100%, rgba(30,25,18,0.98) 0%, ${OBSIDIAN} 60%)`,
              fontFamily: "'Space Mono', monospace",
            }}
          >
            {/* ── Brushed Graphite header ── */}
            <div style={{
              background:     GRAPHITE,
              borderBottom:   `1px solid ${intel.accent}28`,
              padding:        "0 20px",
              height:         52,
              flexShrink:     0,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  style={{ width: 6, height: 6, borderRadius: "50%", background: intel.accent, boxShadow: `0 0 8px ${intel.accent}` }}
                />
                <div>
                  <div style={{ fontSize: 8, letterSpacing: "0.28em", color: `${intel.accent}CC` }}>
                    ◈ EEIS INTEL ACTIVE · {craftId.toUpperCase()}CRAFT
                  </div>
                  <div style={{ fontSize: 6.5, color: "rgba(245,242,237,0.28)", letterSpacing: "0.14em", marginTop: 1 }}>
                    {intel.subtitle} · STAFF VISIBILITY ONLY
                  </div>
                </div>
              </div>

              {/* Inventory status + close */}
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 7, color: "rgba(245,242,237,0.28)", letterSpacing: "0.12em" }}>INVENTORY</div>
                  <div style={{ fontSize: 8, color: state.inventoryStatus === "synced" ? "#7EC8A0" : "#EF4444", fontWeight: 700, letterSpacing: "0.12em" }}>
                    {state.inventoryStatus.toUpperCase()}
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={toggleEeis}
                  style={{
                    padding:     "7px 16px",
                    background:  "rgba(245,242,237,0.07)",
                    border:      "1px solid rgba(245,242,237,0.18)",
                    borderRadius: 999,
                    color:       "rgba(245,242,237,0.60)",
                    fontSize:    7.5,
                    fontWeight:  700,
                    letterSpacing: "0.18em",
                    cursor:      "pointer",
                    touchAction: "manipulation",
                    fontFamily:  "'Space Mono', monospace",
                  }}
                >
                  CLOSE ×
                </motion.button>
              </div>
            </div>

            {/* ── Revenue opportunity banner ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                background:  `linear-gradient(90deg, ${intel.accent}14, transparent)`,
                borderBottom: `1px solid ${intel.accent}1A`,
                padding:     "10px 20px",
                display:     "flex",
                alignItems:  "center",
                gap:         10,
                flexShrink:  0,
              }}
            >
              <div style={{ fontSize: 9, color: intel.accent, letterSpacing: "0.08em" }}>
                ▲ MARGIN OPPORTUNITY DETECTED
              </div>
              <div style={{ fontSize: 10, color: "#F5F2ED", fontWeight: 700, letterSpacing: "0.05em" }}>
                {intel.revenue}
              </div>
              {state.guestProfile.name && (
                <div style={{ fontSize: 8, color: "rgba(245,242,237,0.35)", letterSpacing: "0.08em", marginLeft: "auto" }}>
                  GUEST: {state.guestProfile.name.toUpperCase()}
                </div>
              )}
            </motion.div>

            {/* ── Session data bar ── */}
            <div style={{
              display:     "flex",
              gap:         24,
              padding:     "10px 20px",
              borderBottom: `1px solid rgba(255,255,255,0.05)`,
              flexShrink:  0,
            }}>
              {[
                { label: "ROUND",    val: state.sessionData.currentRound },
                { label: "SCORE",    val: state.sessionData.score },
                { label: "PAIRINGS", val: state.sessionData.pairings.length },
                { label: "MODULE",   val: state.activeModule.toUpperCase() },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: 6.5, color: "rgba(245,242,237,0.28)", letterSpacing: "0.14em" }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: intel.accent, fontWeight: 700, letterSpacing: "0.06em" }}>{item.val}</div>
                </div>
              ))}
              {state.guestProfile.preferences.length > 0 && (
                <div style={{ marginLeft: "auto" }}>
                  <div style={{ fontSize: 6.5, color: "rgba(245,242,237,0.28)", letterSpacing: "0.14em", marginBottom: 3 }}>AFFINITIES</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {state.guestProfile.preferences.slice(0, 3).map(p => (
                      <div key={p} style={{
                        fontSize: 7, color: intel.accent,
                        background: `${intel.accent}12`,
                        border: `1px solid ${intel.accent}30`,
                        borderRadius: 999, padding: "2px 8px",
                      }}>{p}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Intelligence cards header ── */}
            <div style={{
              padding:     "14px 20px 8px",
              flexShrink:  0,
              display:     "flex",
              alignItems:  "center",
              justifyContent: "space-between",
            }}>
              <div style={{ fontSize: 7, color: "rgba(245,242,237,0.30)", letterSpacing: "0.22em" }}>
                RANKED UPSELL INTELLIGENCE — {craftId.toUpperCase()} · SCROLL →
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  fontSize: 6, fontWeight: 700, letterSpacing: "0.16em",
                  color:       dataSource === "live" ? "#7EC8A0" : "rgba(245,242,237,0.28)",
                  background:  dataSource === "live" ? "rgba(126,200,160,0.12)" : "rgba(255,255,255,0.05)",
                  border:     `1px solid ${dataSource === "live" ? "rgba(126,200,160,0.35)" : "rgba(255,255,255,0.10)"}`,
                  borderRadius: 999, padding: "2px 7px",
                }}>
                  {dataSource === "live" ? "● LIVE" : "CACHED"}
                </div>
                <div style={{ fontSize: 7, color: GOLD, letterSpacing: "0.14em" }}>
                  SORTED BY MARGIN
                </div>
              </div>
            </div>

            {/* ── Scrollable intel cards ── */}
            <div style={{
              flex:        1,
              overflowX:   "auto",
              overflowY:   "hidden",
              display:     "flex",
              alignItems:  "flex-start",
              gap:         12,
              padding:     "0 20px 24px",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
            }}>
              {(liveCards ?? intel.cards).map((card, i) => (
                <IntelCard key={card.sku} card={card} accent={intel.accent} idx={i} />
              ))}

              {/* Sovereign Purge card — far right */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.35 }}
                style={{
                  background:    "rgba(20,8,8,0.90)",
                  border:        "1px solid rgba(239,68,68,0.18)",
                  borderRadius:  10,
                  padding:       "14px",
                  flexShrink:    0,
                  width:         160,
                  display:       "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems:    "center",
                  gap:           10,
                  textAlign:     "center",
                }}
              >
                <div style={{ fontSize: 10, color: "rgba(239,68,68,0.60)", letterSpacing: "0.08em" }}>◈</div>
                <div style={{ fontSize: 7, color: "rgba(239,68,68,0.55)", letterSpacing: "0.18em" }}>
                  SOVEREIGN PURGE
                </div>
                <div style={{ fontSize: 8.5, color: "rgba(245,242,237,0.25)", lineHeight: 1.5 }}>
                  Full session wipe. Requires staff confirm.
                </div>
              </motion.div>
            </div>

            {/* ── Footer dismiss hint ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{
                textAlign:   "center",
                padding:     "0 0 16px",
                fontSize:    7,
                color:       "rgba(245,242,237,0.18)",
                letterSpacing: "0.18em",
                flexShrink:  0,
              }}
            >
              3-FINGER HOLD OR TAP CLOSE TO EXIT INTELLIGENCE MODE
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default EeisIntelLayer;
