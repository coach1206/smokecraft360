/**
 * TrainingManual — /training/manual
 * Axiom OS Master Operator's Manual.
 * Classified — Elite Operator Access Only.
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence }     from "framer-motion";
import { useLocation }                 from "wouter";
import {
  ArrowLeft, Lock, Zap, Package, Plane, Volume2,
  ChevronRight, Eye, Shield, AlertTriangle, Check,
} from "lucide-react";

const C = {
  bg:      "#F5F2ED",
  card:    "#EFEBE0",
  border:  "rgba(212,139,0,0.15)",
  obsidian:"#1A1A1B",
  gold:    "#D48B00",
  muted:   "rgba(26,26,27,0.48)",
  light:   "rgba(26,26,27,0.70)",
  red:     "#ef4444",
  green:   "#34d399",
  blue:    "#60a5fa",
  purple:  "#a78bfa",
  amber:   "#f59e0b",
};

const SECTIONS = [
  { id: "gates",     label: "Hidden Gates",        code: "OP-01", icon: Lock,    color: C.red    },
  { id: "revenue",   label: "Revenue Brain",        code: "OP-02", icon: Zap,     color: C.gold   },
  { id: "inventory", label: "Inventory Catalog",    code: "OP-03", icon: Package, color: C.green  },
  { id: "dayone",    label: "DayOne360 Affiliate",  code: "OP-04", icon: Plane,   color: C.purple },
  { id: "sensory",   label: "Sensory & Atmosphere", code: "OP-05", icon: Volume2, color: C.blue   },
];

const CIGARS = [
  { name: "Padron 1964 Anniversary",   origin: "Nicaragua", strength: "Full",   price: "$28", tags: ["cedar", "cocoa", "leather"], score: 92 },
  { name: "Arturo Fuente Opus X",      origin: "Dom. Rep.",  strength: "Full",   price: "$34", tags: ["cedar", "spice", "earth"],   score: 95 },
  { name: "Cohiba Behike BHK 52",      origin: "Cuba",       strength: "Medium", price: "$45", tags: ["cream", "oak", "tobacco"],   score: 98 },
  { name: "Liga Privada No. 9",        origin: "Nicaragua",  strength: "Full",   price: "$22", tags: ["earth", "cocoa", "coffee"],  score: 91 },
  { name: "Oliva Serie V",             origin: "Nicaragua",  strength: "Full",   price: "$14", tags: ["cedar", "nut", "spice"],     score: 90 },
  { name: "My Father Le Bijou 1922",   origin: "Nicaragua",  strength: "Full",   price: "$18", tags: ["leather", "pepper", "oak"],  score: 93 },
  { name: "Davidoff Millennium Blend", origin: "Dom. Rep.",  strength: "Medium", price: "$26", tags: ["cream", "cedar", "vanilla"], score: 91 },
  { name: "Montecristo No. 2",         origin: "Cuba",       strength: "Medium", price: "$32", tags: ["nutty", "cedar", "cream"],   score: 90 },
];

const SPIRITS = [
  { name: "Pappy Van Winkle 23yr",        category: "Bourbon",       proof: "95.6",  price: "$85",  tags: ["vanilla", "caramel", "oak"],       score: 99 },
  { name: "Macallan 18 Sherry Oak",       category: "Scotch",        proof: "86",    price: "$52",  tags: ["dried-fruit", "spice", "oak"],     score: 97 },
  { name: "Clase Azul Reposado",          category: "Tequila",       proof: "80",    price: "$38",  tags: ["agave", "vanilla", "caramel"],     score: 94 },
  { name: "Hennessy Paradis",             category: "Cognac",        proof: "80",    price: "$62",  tags: ["floral", "honey", "toast"],        score: 96 },
  { name: "Buffalo Trace Antique BTAC",   category: "Bourbon",       proof: "90",    price: "$44",  tags: ["caramel", "cherry", "spice"],      score: 93 },
  { name: "Balvenie 21yr Portwood",       category: "Scotch",        proof: "94",    price: "$48",  tags: ["toffee", "port", "vanilla"],       score: 95 },
  { name: "Don Julio 1942",               category: "Tequila Añejo", proof: "80",    price: "$32",  tags: ["agave", "oak", "cocoa"],           score: 92 },
  { name: "Rémy Martin Louis XIII",       category: "Cognac",        proof: "80",    price: "$120", tags: ["rose", "plum", "leather"],         score: 99 },
];

const BREWS = [
  { name: "Chimay Blue Grand Réserve",   style: "Belgian Quad",    abv: "9.0%",  price: "$14", tags: ["plum", "dark-fruit", "caramel"],   score: 94 },
  { name: "Weihenstephaner Hefeweiss",   style: "Hefeweizen",      abv: "5.4%",  price: "$9",  tags: ["banana", "clove", "wheat"],        score: 92 },
  { name: "Rodenbach Grand Cru",         style: "Flanders Red Ale",abv: "6.0%",  price: "$16", tags: ["cherry", "oak", "sour"],           score: 93 },
  { name: "Ayinger Celebrator",          style: "Doppelbock",      abv: "6.7%",  price: "$12", tags: ["chocolate", "dark-malt", "coffee"],score: 95 },
  { name: "Pliny the Elder",             style: "Double IPA",      abv: "8.0%",  price: "$18", tags: ["pine", "citrus", "floral"],        score: 96 },
  { name: "Guinness Foreign Extra",      style: "Stout",           abv: "7.5%",  price: "$10", tags: ["roasted-grain", "coffee", "cream"],score: 91 },
];

// ── Tag chip ──────────────────────────────────────────────────────────────────

function Tag({ label }: { label: string }) {
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 5,
      background: `${C.gold}15`, border: `1px solid ${C.gold}30`,
      fontSize: 10, color: C.gold, fontWeight: 600, letterSpacing: "0.05em",
    }}>
      {label}
    </span>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHead({ id, code, label, color, icon: Icon }: typeof SECTIONS[number]) {
  return (
    <div id={id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingTop: 8 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: `${color}18`, border: `1px solid ${color}35`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 700 }}>{code}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.obsidian, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.04em" }}>
          {label}
        </div>
      </div>
      <div style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 5, background: `${color}12`, border: `1px solid ${color}30`, fontSize: 9, fontWeight: 700, color, letterSpacing: "0.12em", textTransform: "uppercase" }}>
        CLASSIFIED
      </div>
    </div>
  );
}

// ── Callout box ───────────────────────────────────────────────────────────────

function Callout({ type = "info", children }: { type?: "info"|"warn"|"danger"|"tip"; children: React.ReactNode }) {
  const map = {
    info:   { color: C.blue,   Icon: Eye,           label: "NOTE" },
    warn:   { color: C.amber,  Icon: AlertTriangle,  label: "CAUTION" },
    danger: { color: C.red,    Icon: Shield,         label: "CRITICAL" },
    tip:    { color: C.green,  Icon: Check,          label: "OPERATOR TIP" },
  };
  const { color, Icon, label } = map[type];
  return (
    <div style={{
      padding: "12px 16px", borderRadius: 10,
      background: `${color}0d`, border: `1px solid ${color}30`,
      display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14,
    }}>
      <Icon size={14} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 12, color: C.light, lineHeight: 1.65 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: 1, background: C.border, margin: "28px 0" }} />;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function TrainingManual() {
  const [, navigate]    = useLocation();
  const [active, setActive] = useState("gates");
  const contentRef          = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  // Scroll-spy
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => {
      for (const s of [...SECTIONS].reverse()) {
        const node = document.getElementById(s.id);
        if (node && node.getBoundingClientRect().top <= 140) {
          setActive(s.id);
          break;
        }
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: C.bg, color: C.obsidian, fontFamily: "'Inter','SF Pro Display',sans-serif", overflow: "hidden" }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14, padding: "13px 24px",
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(16,14,12,0.97)", backdropFilter: "blur(20px)", flexShrink: 0,
        boxShadow: "0 1px 0 rgba(212,139,0,0.08)",
      }}>
        <motion.button whileTap={{ scale: 0.92 }} onClick={() => navigate("/training")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 9, background: "rgba(245,242,237,0.08)", border: `1px solid ${C.border}`, color: "rgba(245,235,220,0.65)", fontSize: 11, cursor: "pointer" }}>
          <ArrowLeft size={13} /> Training
        </motion.button>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.gold, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.08em" }}>
            NOVEE OS · Master Operator's Manual
          </div>
          <div style={{ fontSize: 9, color: "rgba(245,235,220,0.38)", letterSpacing: "0.16em", textTransform: "uppercase" }}>
            Classified · Elite Operator Access · Rev 2.6.0
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <Lock size={11} color={C.gold} />
          <span style={{ fontSize: 9, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>Secure Channel</span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Sidebar TOC ── */}
        <div style={{
          width: 220, flexShrink: 0, borderRight: `1px solid ${C.border}`,
          padding: "24px 0", overflowY: "auto", background: "rgba(26,26,27,0.03)",
        }}>
          <div style={{ padding: "0 18px", fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 12 }}>
            Operational Directives
          </div>
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = active === s.id;
            return (
              <motion.button key={s.id} onClick={() => scrollTo(s.id)}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 18px", background: isActive ? `${s.color}12` : "transparent",
                  border: "none", borderLeft: `3px solid ${isActive ? s.color : "transparent"}`,
                  cursor: "pointer", textAlign: "left", transition: "all 0.18s",
                }}>
                <Icon size={13} color={isActive ? s.color : C.muted} />
                <div>
                  <div style={{ fontSize: 8, color: isActive ? s.color : C.muted, fontWeight: 700, letterSpacing: "0.1em" }}>{s.code}</div>
                  <div style={{ fontSize: 11, color: isActive ? C.obsidian : C.light, fontWeight: isActive ? 700 : 400 }}>{s.label}</div>
                </div>
                {isActive && <ChevronRight size={10} color={s.color} style={{ marginLeft: "auto" }} />}
              </motion.button>
            );
          })}

          {/* Stamp */}
          <div style={{ margin: "28px 18px 0", padding: "10px 12px", borderRadius: 8, border: `1px dashed ${C.border}`, textAlign: "center" }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: "0.18em", textTransform: "uppercase" }}>Document Class</div>
            <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginTop: 2 }}>TS-ELITE-OPS</div>
            <div style={{ fontSize: 8, color: C.muted, marginTop: 4 }}>Not for general distribution</div>
          </div>
        </div>

        {/* ── Content ── */}
        <div ref={contentRef} style={{ flex: 1, overflowY: "auto", padding: "32px 40px 60px" }}>

          {/* ═══════════════════ OP-01: HIDDEN GATES ═══════════════════ */}
          <SectionHead {...SECTIONS[0]} />

          <p style={{ fontSize: 13, color: C.light, lineHeight: 1.75, marginBottom: 20 }}>
            NOVEE OS embeds two concealed access portals into the patron-facing kiosk surface.
            These gates are invisible to patrons and require a deliberate multi-second press to activate.
            No UI affordance is displayed until the hold threshold is crossed.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            {[
              {
                label: "GATE A — Staff POS",
                trigger: "3-second hold",
                location: "NOVEE OS / CraftHub Title Area",
                result: "Launches the Staff POS overlay — card processing, cart, inventory decrement, PIN auth.",
                color: C.amber,
                code: "HOLD_MS = 3000",
              },
              {
                label: "GATE B — Founder Dashboard",
                trigger: "5-second hold",
                location: "NOVEE OS Logo in patron greeting screen",
                result: "Opens the Founder / Patron profile panel — occupancy, revenue lift, XP, dynamic pricing toggle.",
                color: C.purple,
                code: "logoHoldTimer = 5000ms",
              },
            ].map((g) => (
              <div key={g.label} style={{ padding: "18px 20px", borderRadius: 12, background: C.card, border: `1px solid ${g.color}30` }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: g.color, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>{g.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.obsidian, fontFamily: "'Cormorant Garamond',serif", marginBottom: 8 }}>{g.trigger}</div>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 10 }}>Location: <span style={{ color: C.light }}>{g.location}</span></div>
                <div style={{ fontSize: 11, color: C.light, lineHeight: 1.6, marginBottom: 10 }}>{g.result}</div>
                <div style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(26,26,27,0.06)", fontFamily: "monospace", fontSize: 10, color: g.color }}>{g.code}</div>
              </div>
            ))}
          </div>

          <Callout type="warn">
            Do not share these hold-sequences with patrons. If a patron accidentally triggers Gate B,
            close the panel with the × button — no data is exposed, but the Founder view reveals occupancy and pricing state.
          </Callout>

          <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: "18px 20px", marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.obsidian, marginBottom: 12 }}>Kiosk Lockdown — What Is Disabled & Why</div>
            {[
              { feature: "Right-click context menu", method: "document.addEventListener('contextmenu', e => e.preventDefault())", reason: "Prevents patrons from inspecting DOM, saving images, or accessing browser tools." },
              { feature: "Text selection", method: "CSS user-select: none on root", reason: "Prevents patrons highlighting or copying pricing/product data." },
              { feature: "Scroll bounce / overscroll", method: "overflow: hidden on html/body + per-panel scroll areas", reason: "Prevents rubber-band scroll exposing raw browser chrome on iOS." },
              { feature: "Session auto-refresh", method: "bootstrapKioskAuth() every 30 minutes", reason: "Silently renews the anonymous kiosk JWT so the venue is never logged out mid-service." },
            ].map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr", gap: 12, padding: "9px 0", borderBottom: i < 3 ? `1px solid ${C.border}` : "none", alignItems: "start" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.obsidian }}>{row.feature}</div>
                <div style={{ fontFamily: "monospace", fontSize: 9.5, color: C.gold, background: "rgba(212,139,0,0.08)", padding: "3px 7px", borderRadius: 5 }}>{row.method}</div>
                <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.55 }}>{row.reason}</div>
              </div>
            ))}
          </div>

          <Callout type="tip">
            Test both gates before every investor or staff demo. A failed hold (released too early)
            produces no visible feedback — this is intentional to avoid patron curiosity.
          </Callout>

          <Divider />

          {/* ═══════════════════ OP-02: REVENUE BRAIN ═══════════════════ */}
          <SectionHead {...SECTIONS[1]} />

          <p style={{ fontSize: 13, color: C.light, lineHeight: 1.75, marginBottom: 20 }}>
            The Revenue Brain is a real-time dynamic pricing engine embedded in the Founder Dashboard
            and Axiom Store. It monitors venue occupancy and automatically shifts drink/smoke pricing
            between base and surge tiers.
          </p>

          <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: "20px 22px", marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.obsidian, marginBottom: 16 }}>Occupancy → Price Mapping</div>
            {[
              { pct: "0–20%",  label: "Dead Floor",  tier: "Volume Incentive", desc: "Slow-period discounts auto-activate. Revenue Brain targets throughput over margin.", color: C.blue },
              { pct: "21–55%", label: "Normal Demand",tier: "Base Price",       desc: "Standard pricing. No modifiers applied. Projections use static $38/hr baseline.", color: C.green },
              { pct: "56–80%", label: "Warm House",   tier: "Dynamic Watch",    desc: "Revenue Brain enters observation mode. Surge eligible but not yet triggered.", color: C.amber },
              { pct: "81–100%",label: "At Capacity",  tier: "Surge Price",      desc: "Dynamic pricing fires. Margin multiplier ×1.64 vs static baseline. Flash campaigns auto-trigger for Legend tier.", color: C.red },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", gap: 14, padding: "11px 0", borderBottom: i < 3 ? `1px solid ${C.border}` : "none", alignItems: "flex-start" }}>
                <div style={{ width: 50, padding: "3px 0", textAlign: "center", borderRadius: 6, background: `${row.color}15`, border: `1px solid ${row.color}30`, fontSize: 11, fontWeight: 700, color: row.color, flexShrink: 0 }}>{row.pct}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.obsidian }}>{row.label}</span>
                    <span style={{ padding: "1px 7px", borderRadius: 4, background: `${row.color}12`, fontSize: 9, fontWeight: 700, color: row.color, letterSpacing: "0.08em" }}>{row.tier}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.55 }}>{row.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: "18px 20px", marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.obsidian, marginBottom: 6 }}>Member Lock</div>
            <div style={{ fontSize: 12, color: C.light, lineHeight: 1.7, marginBottom: 14 }}>
              Member Lock exempts a specific patron from surge pricing regardless of venue occupancy.
              It is applied per-patron via the Loyalty tab in the Admin Console.
              A locked patron always receives base pricing — the system will not apply dynamic multipliers to their order.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "How to enable", steps: ["Open Admin Console → Loyalty", "Search patron by name or member ID", "Toggle 'Surge Lock' to ON", "Change takes effect immediately — no restart required"] },
                { label: "Use cases", steps: ["VIP guest arriving during peak hour", "Venue sponsor or brand ambassador", "Member whose loyalty tier warrants protection", "Staff testing the surge state without incurring charges"] },
              ].map((col) => (
                <div key={col.label}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: C.gold, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{col.label}</div>
                  {col.steps.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
                      <span style={{ width: 16, height: 16, borderRadius: "50%", background: `${C.gold}20`, fontSize: 9, fontWeight: 700, color: C.gold, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i+1}</span>
                      <span style={{ fontSize: 11, color: C.light, lineHeight: 1.5 }}>{s}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <Callout type="danger">
            Enabling Dynamic Pricing without calibrating your base prices first will expose margin gaps.
            Always run a Revenue Simulation (Founder Dashboard → Revenue tab) before activating surge
            in a live venue for the first time.
          </Callout>

          <Divider />

          {/* ═══════════════════ OP-03: INVENTORY CATALOG ═══════════════════ */}
          <SectionHead {...SECTIONS[2]} />

          <p style={{ fontSize: 13, color: C.light, lineHeight: 1.75, marginBottom: 20 }}>
            All products in the CRAFT_DATA array are AI-indexed with sensory tags. The Revenue Brain
            uses these tags for taste-match scoring. Staff should memorise the primary tags for top-sellers
            so they can guide guests verbally before the AI recommendation fires.
          </p>

          {[
            { label: "Smoke — Cigars", color: "#e85d26", items: CIGARS, cols: ["Name", "Origin", "Strength", "Price", "Sensory Tags", "Score"] },
            { label: "Pour — Spirits", color: C.purple, items: SPIRITS, cols: ["Name", "Category", "Proof", "Price", "Sensory Tags", "Score"] },
            { label: "Brew — Beer",    color: C.amber,  items: BREWS,  cols: ["Name", "Style", "ABV", "Price", "Sensory Tags", "Score"] },
          ].map((section) => (
            <div key={section.label} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: section.color, letterSpacing: "0.06em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: section.color }} />
                {section.label}
              </div>
              <div style={{ borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.7fr 0.7fr 2fr 0.6fr", gap: 0, background: "rgba(26,26,27,0.06)", padding: "8px 14px", borderBottom: `1px solid ${C.border}` }}>
                  {section.cols.map((col) => (
                    <div key={col} style={{ fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>{col}</div>
                  ))}
                </div>
                {section.items.map((item, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.7fr 0.7fr 2fr 0.6fr", gap: 0, padding: "10px 14px", borderBottom: i < section.items.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "center" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.obsidian }}>{item.name}</div>
                    <div style={{ fontSize: 10, color: C.light }}>{"origin" in item ? (item as typeof CIGARS[0]).origin : "category" in item ? (item as typeof SPIRITS[0]).category : (item as typeof BREWS[0]).style}</div>
                    <div style={{ fontSize: 10, color: C.light }}>{"strength" in item ? (item as typeof CIGARS[0]).strength : "proof" in item ? (item as typeof SPIRITS[0]).proof : (item as typeof BREWS[0]).abv}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: section.color }}>{item.price}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {item.tags.map((t) => <Tag key={t} label={t} />)}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: item.score >= 95 ? C.green : item.score >= 90 ? C.gold : C.light }}>{item.score}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <Callout type="info">
            Score is computed by the Revenue Brain v2 formula: 40% taste-match / 25% margin /
            15% stock health / 10% vendor reliability / 10% premium signal. Scores update live as
            inventory changes. A score below 80 triggers a soft reorder alert.
          </Callout>

          <Divider />

          {/* ═══════════════════ OP-04: DAYONE360 ═══════════════════ */}
          <SectionHead {...SECTIONS[3]} />

          <p style={{ fontSize: 13, color: C.light, lineHeight: 1.75, marginBottom: 20 }}>
            DayOne360 is an embedded affiliate travel concierge. It appears as a sponsored card in
            both the Patron CraftHub and the Mobile Hub. Every interaction is tracked for affiliate
            attribution and reported back to the DayOne360 partner dashboard.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: "18px 20px" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.purple, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>How the Card Appears</div>
              <div style={{ fontSize: 11, color: C.light, lineHeight: 1.7 }}>
                A fifth card labelled <strong>"DayOne360 Travel"</strong> renders alongside the four craft cards (Smoke, Pour, Brew, Vape) on the CraftHub landing.
                It uses a purple/midnight gradient distinct from the craft palette and displays "Travel · Lifestyle · Rewards" as a subtitle.
                On the Mobile Hub it appears under the "Travel &amp; Lifestyle" section header.
              </div>
            </div>
            <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: "18px 20px" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.purple, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Where Leads Go</div>
              <div style={{ fontSize: 11, color: C.light, lineHeight: 1.7 }}>
                Tapping the card fires <strong>onTap → setTravelOpen(true)</strong>, opening the full Travel Concierge modal.
                Inside, guests browse curated travel packages. Each package link carries a UTM-style affiliate tag back to DayOne360.
                Clicks are logged in the Axiom audit trail under <code style={{ background: "rgba(212,139,0,0.1)", padding: "1px 5px", borderRadius: 4, fontSize: 10 }}>campaign.affiliate_click</code>.
              </div>
            </div>
          </div>

          <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: "18px 20px", marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.obsidian, marginBottom: 12 }}>Sponsorship Deck Logic</div>
            {[
              { step: "Impression", desc: "Card renders on screen. Counted as an impression in the DayOne360 partner portal. No patron action required." },
              { step: "Tap / Click", desc: "Patron taps the card. Modal opens. Event logged as 'affiliate_click'. This is the primary conversion signal." },
              { step: "Package Browse", desc: "Patron views individual travel cards inside the modal. Each card swipe/view is a secondary engagement event." },
              { step: "Offer Tap", desc: "Patron taps a specific offer (hotel, experience, etc.). This is a qualified lead. DayOne360 receives the venue ID and session token for attribution." },
              { step: "Receipt Upsell", desc: "Post-payment receipt screen (AxiomReceipt) shows a DayOne360 upsell banner. Second conversion opportunity after a completed transaction." },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: i < 4 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: `${C.purple}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 9, fontWeight: 700, color: C.purple }}>{i+1}</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.obsidian, marginBottom: 2 }}>{row.step}</div>
                  <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.55 }}>{row.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <Callout type="tip">
            To maximise affiliate revenue, place the kiosk where a guest has 10–15 seconds of idle
            time (e.g. waiting for a drink delivery). DayOne360 impression-to-click rates increase 3×
            when the kiosk is visible during natural pause moments in the experience.
          </Callout>

          <Divider />

          {/* ═══════════════════ OP-05: SENSORY & ATMOSPHERE ═══════════════════ */}
          <SectionHead {...SECTIONS[4]} />

          <p style={{ fontSize: 13, color: C.light, lineHeight: 1.75, marginBottom: 20 }}>
            NOVEE OS is a multi-sensory platform. Visual and audio signals are synchronised to
            reinforce the "lounge" atmosphere. The acoustic branding layer is generated in-browser
            using the Web Audio API — no external audio files are required.
          </p>

          <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: "20px 22px", marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.obsidian, marginBottom: 14 }}>58 Hz Ambient Hum — Technical Specification</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "Primary Frequency",  value: "58 Hz", note: "Sub-bass sine wave. Below speech range. Felt more than heard." },
                { label: "Waveform",           value: "Sine",  note: "Pure tone — no harmonics. Keeps the room warm without fatigue." },
                { label: "LFO Rate",           value: "0.08 Hz", note: "One breath cycle every ~12.5 seconds. Creates a living, breathing feel." },
                { label: "LFO Depth",          value: "0.006 gain", note: "Subtle flutter — imperceptible individually, subliminally rhythmic." },
                { label: "Master Gain",        value: "0.022", note: "~2% of full scale. Never audible as a distinct tone — purely atmospheric." },
                { label: "Fade-out",           value: "400 ms", note: "Smooth linear ramp to silence on component unmount." },
              ].map((row) => (
                <div key={row.label} style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(26,26,27,0.05)", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: C.blue, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>{row.label}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: C.obsidian, fontFamily: "'Cormorant Garamond',serif", marginBottom: 4 }}>{row.value}</div>
                  <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.55 }}>{row.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: "18px 20px", marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.obsidian, marginBottom: 12 }}>Audio Signal Stack</div>
            {[
              { signal: "Ambient Hum (58Hz)",  trigger: "Experience page mount",        purpose: "Baseline atmosphere — continuous during patron session" },
              { signal: "Mechanical Click",    trigger: "Any tile tap in Command Hub",   purpose: "Tactile confirmation — reinforces every navigation decision" },
              { signal: "Clink (glass tone)",  trigger: "Order confirmed",               purpose: "Reward signal — Pavlovian completion satisfaction" },
              { signal: "Whoosh",             trigger: "Card swipe in SwipeEngine",      purpose: "Motion physics audio — matches visual drag velocity" },
            ].map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "160px 180px 1fr", gap: 12, padding: "8px 0", borderBottom: i < 3 ? `1px solid ${C.border}` : "none", alignItems: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.blue }}>{row.signal}</div>
                <div style={{ fontSize: 10, color: C.muted, fontStyle: "italic" }}>{row.trigger}</div>
                <div style={{ fontSize: 11, color: C.light, lineHeight: 1.55 }}>{row.purpose}</div>
              </div>
            ))}
          </div>

          <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: "18px 20px", marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.obsidian, marginBottom: 12 }}>Volume Calibration Procedure</div>
            {[
              "Set room music (if any) to ≤ 55 dB at the listening position — this is your baseline.",
              "Open the Axiom kiosk and navigate to any experience page. The 58Hz hum activates automatically.",
              "Using a free SPL meter app (iPhone: Decibel X), measure at the tablet surface. Target: 62–65 dB.",
              "If the hum is audible as a distinct tone, reduce tablet system volume by 10% and re-test. The hum should feel like the room has a heartbeat — not a speaker.",
              "If the room has an HVAC hum near 60Hz, the Axiom hum will blend into it. This is intentional and desirable.",
              "Re-calibrate any time the venue changes audio setup or room configuration.",
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: `${C.blue}18`, fontSize: 9, fontWeight: 700, color: C.blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i+1}</span>
                <span style={{ fontSize: 11, color: C.light, lineHeight: 1.65 }}>{step}</span>
              </div>
            ))}
          </div>

          <Callout type="warn">
            The Web Audio API requires a user gesture to initialise on iOS/iPadOS. If the hum is silent
            after launch, tap anywhere on the screen once — this unlocks the audio context.
            This is an OS-level restriction, not a bug.
          </Callout>

          {/* Footer stamp */}
          <div style={{ marginTop: 40, padding: "18px 20px", borderRadius: 10, border: `1px dashed ${C.border}`, textAlign: "center" }}>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 4 }}>End of Document · NOVEE OS Master Operator's Manual</div>
            <div style={{ fontSize: 8, color: C.muted }}>TS-ELITE-OPS · Rev 2.6.0 · For authorised operators only · Axiom Intelligence Corp.</div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
              {["Confidential", "Not for distribution", "Print access: Elite only"].map((badge) => (
                <span key={badge} style={{ padding: "2px 10px", borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 8, color: C.muted, letterSpacing: "0.1em" }}>
                  {badge}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Suppress unused state warning for revealed */}
      {revealed && null}
    </div>
  );
}
