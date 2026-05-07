/**
 * AdminMaster — /admin-master
 * Axiom OS · Operator's Bible · Total Command Center
 * Smoked Cream Technical Dashboard style.
 * Hidden route — no nav tile.
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence }     from "framer-motion";
import { useLocation }                 from "wouter";
import {
  ArrowLeft, Brain, Zap, Eye, Palette, TrendingUp,
  ChevronRight, Activity, Globe, AlertTriangle,
} from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:       "#F5F2ED",
  surface:  "#EFEBE0",
  card:     "#EAE6DB",
  press:    "#E2DDD3",
  border:   "rgba(212,139,0,0.16)",
  borderB:  "rgba(212,139,0,0.28)",
  gold:     "#D48B00",
  amber:    "#B8790A",
  ink:      "#1A1A1B",
  muted:    "#6B5E4E",
  dim:      "#8C7B69",
  graphite: "#2A2A2A",
  red:      "#C0392B",
  green:    "#1A6B3A",
  blue:     "#1A4B8A",
  purple:   "#5B3FA0",
  mono:     "'JetBrains Mono','Courier New',monospace",
  serif:    "'Cormorant Garamond',serif",
  sans:     "'Inter',sans-serif",
};

const SECTIONS = [
  { id: "ai",      label: "AI Orchestrator",     code: "CL-01", icon: Brain,      color: C.gold    },
  { id: "revenue", label: "Revenue Brain v2",     code: "CL-02", icon: TrendingUp, color: C.green   },
  { id: "psych",   label: "Psychological Spec",   code: "CL-03", icon: Eye,        color: C.purple  },
  { id: "sensory", label: "Sensory Visual Map",   code: "CL-04", icon: Palette,    color: C.blue    },
  { id: "pitch",   label: "Sales Pitch Cards",    code: "CL-05", icon: Zap,        color: C.red     },
];

// ── Primitives ─────────────────────────────────────────────────────────────────

function SectionHead({ id, code, label, color, icon: Icon }: typeof SECTIONS[number]) {
  return (
    <div id={id} style={{ display:"flex", alignItems:"center", gap:14, marginBottom:22, paddingTop:4 }}>
      <div style={{ width:42, height:42, borderRadius:11, background:`${color}14`, border:`1px solid ${color}30`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <Icon size={19} color={color} />
      </div>
      <div>
        <div style={{ fontSize:8, color:C.muted, textTransform:"uppercase", letterSpacing:"0.20em", fontWeight:700 }}>{code} · OPERATIONAL</div>
        <div style={{ fontSize:24, fontWeight:700, color:C.ink, fontFamily:C.serif, letterSpacing:"0.04em", lineHeight:1.1 }}>{label}</div>
      </div>
      <div style={{ marginLeft:"auto", padding:"4px 10px", borderRadius:5, background:`${color}14`, border:`1px solid ${color}35`, fontSize:8, fontWeight:800, color, letterSpacing:"0.14em" }}>ACTIVE</div>
    </div>
  );
}

function Card({ children, accent, compact }: { children: React.ReactNode; accent?: string; compact?: boolean }) {
  return (
    <div style={{ background:C.card, borderRadius:11, border:`1px solid ${accent ? `${accent}22` : C.border}`, borderLeft: accent ? `3px solid ${accent}` : undefined, padding: compact ? "14px 16px" : "18px 20px", marginBottom:14 }}>
      {children}
    </div>
  );
}

function Label({ children, color = C.muted }: { children: React.ReactNode; color?: string }) {
  return <div style={{ fontSize:8, fontWeight:800, color, letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:9 }}>{children}</div>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily:C.mono, fontSize:10.5, color:C.amber, background:"rgba(184,121,10,0.10)", padding:"2px 7px", borderRadius:4 }}>
      {children}
    </span>
  );
}

function Row({ left, right, accent }: { left: React.ReactNode; right: React.ReactNode; accent?: string }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
      <div style={{ fontSize:11, color:C.muted, flex:1, paddingRight:12 }}>{left}</div>
      <div style={{ fontSize:11, color: accent ?? C.ink, fontWeight:600, textAlign:"right", maxWidth:"55%", lineHeight:1.5 }}>{right}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ height:1, background:C.border, margin:"30px 0" }} />;
}

function Chip({ label, color = C.gold }: { label: string; color?: string }) {
  return (
    <span style={{ display:"inline-block", padding:"3px 9px", borderRadius:5, background:`${color}14`, border:`1px solid ${color}28`, fontSize:9, fontWeight:700, color, marginRight:5, marginBottom:5 }}>
      {label}
    </span>
  );
}

// ── Surge Ticker ───────────────────────────────────────────────────────────────

const SURGE_ITEMS = [
  { label:"SMOKE",         value:"$28 → $32",     badge:"↑ SURGE +14%",  bcolor:"#C0392B" },
  { label:"POUR",          value:"$22",            badge:"MEMBERS LOCKED", bcolor:"#1A6B3A" },
  { label:"BREW",          value:"$14 → $16",      badge:"↑ +14%",        bcolor:"#C0392B" },
  { label:"VAPE",          value:"$18",            badge:"STANDARD",      bcolor:"#8C7B69" },
  { label:"OCCUPANCY",     value:"84%",            badge:"▲ SURGE ACTIVE",bcolor:"#C0392B" },
  { label:"REV LIFT TODAY",value:"$1,450",         badge:"↑ LIVE",        bcolor:"#1A6B3A" },
  { label:"PAIRING CONF",  value:"94%",            badge:"AI ACTIVE",     bcolor:"#1A4B8A" },
  { label:"ACTIVE TABS",   value:"6",              badge:"LIVE",          bcolor:"#5B3FA0" },
];

function SurgeTicker() {
  const loop = [...SURGE_ITEMS, ...SURGE_ITEMS, ...SURGE_ITEMS];
  return (
    <div style={{ height:64, background:C.graphite, borderTop:`2px solid ${C.gold}`, position:"relative", flexShrink:0, overflow:"hidden" }}>
      {/* Edge masks */}
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:100, zIndex:2, background:`linear-gradient(90deg,${C.graphite} 0%,transparent 100%)` }} />
      <div style={{ position:"absolute", right:0, top:0, bottom:0, width:100, zIndex:2, background:`linear-gradient(270deg,${C.graphite} 0%,transparent 100%)` }} />
      {/* SURGE ALERTS stamp */}
      <div style={{ position:"absolute", left:0, top:0, bottom:0, zIndex:3, display:"flex", alignItems:"center", gap:10, paddingLeft:16, background:C.graphite }}>
        <motion.div animate={{ opacity:[1,0.4,1] }} transition={{ duration:1.4, repeat:Infinity }}>
          <AlertTriangle size={14} color={C.gold} />
        </motion.div>
        <span style={{ fontFamily:C.mono, fontSize:9, fontWeight:800, color:C.gold, letterSpacing:"0.20em", textTransform:"uppercase", whiteSpace:"nowrap" }}>SURGE ALERTS</span>
        <div style={{ width:1, height:22, background:"rgba(212,139,0,0.28)" }} />
      </div>
      <motion.div
        style={{ display:"flex", alignItems:"center", height:"100%", paddingLeft:160, width:"max-content" }}
        animate={{ x:["0%", "-33.33%"] }}
        transition={{ duration:55, repeat:Infinity, ease:"linear" }}
      >
        {loop.map((item, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:10, paddingRight:48, flexShrink:0 }}>
            <span style={{ fontFamily:C.mono, fontSize:10, fontWeight:700, color:"rgba(245,242,237,0.45)", letterSpacing:"0.14em", textTransform:"uppercase" }}>{item.label}</span>
            <span style={{ fontFamily:C.mono, fontSize:16, fontWeight:800, color:"#F5F2ED", letterSpacing:"0.04em" }}>{item.value}</span>
            <span style={{ fontFamily:C.mono, fontSize:9, fontWeight:800, color:item.bcolor, letterSpacing:"0.10em", padding:"2px 8px", borderRadius:4, border:`1px solid ${item.bcolor}50`, background:`${item.bcolor}14`, whiteSpace:"nowrap" }}>{item.badge}</span>
            <span style={{ color:"rgba(212,139,0,0.22)", fontSize:16, marginLeft:8 }}>·</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminMaster() {
  const [, navigate] = useLocation();
  const [active, setActive] = useState("ai");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => {
      for (const s of [...SECTIONS].reverse()) {
        const node = document.getElementById(s.id);
        if (node && node.getBoundingClientRect().top <= 150) { setActive(s.id); break; }
      }
    };
    el.addEventListener("scroll", onScroll, { passive:true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ height:"100dvh", display:"flex", flexDirection:"column", background:C.bg, color:C.ink, fontFamily:C.sans, overflow:"hidden" }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 24px", borderBottom:`1px solid ${C.borderB}`, background:C.graphite, flexShrink:0 }}>
        <motion.button whileTap={{ scale:0.93 }} onClick={() => navigate("/dashboard")}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", borderRadius:9, background:"rgba(245,242,237,0.08)", border:"1px solid rgba(245,242,237,0.14)", color:"rgba(245,242,237,0.55)", fontSize:11, cursor:"pointer" }}>
          <ArrowLeft size={13} /> Hub
        </motion.button>
        <div>
          <div style={{ fontSize:18, fontWeight:700, color:C.gold, fontFamily:C.serif, letterSpacing:"0.10em" }}>ADMIN MASTER · Operator's Bible</div>
          <div style={{ fontSize:9, color:"rgba(245,242,237,0.38)", letterSpacing:"0.18em", textTransform:"uppercase" }}>
            Total Command Center · Sales · Marketing · Training
          </div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:16 }}>
          <motion.div animate={{ opacity:[1,0.5,1] }} transition={{ duration:2.2, repeat:Infinity }}
            style={{ display:"flex", alignItems:"center", gap:6, fontSize:10, color:"#4ade80", fontWeight:700 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:"#4ade80", display:"inline-block" }} />
            LIVE SYSTEM
          </motion.div>
          <div style={{ width:1, height:24, background:"rgba(245,242,237,0.12)" }} />
          <div style={{ fontSize:10, fontWeight:700, color:"rgba(245,242,237,0.45)", letterSpacing:"0.12em" }}>REV 3.0.0</div>
        </div>
      </div>

      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* ── Sidebar ── */}
        <div style={{ width:222, flexShrink:0, borderRight:`1px solid ${C.border}`, padding:"22px 0", overflowY:"auto", background:C.surface }}>
          <div style={{ padding:"0 16px 10px", fontSize:8, fontWeight:800, color:C.muted, letterSpacing:"0.18em", textTransform:"uppercase" }}>Command Directives</div>
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isA  = active === s.id;
            return (
              <button key={s.id}
                onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior:"smooth", block:"start" })}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:9, padding:"10px 16px", background: isA ? `${s.color}0e` : "transparent", border:"none", borderLeft:`3px solid ${isA ? s.color : "transparent"}`, cursor:"pointer", textAlign:"left", transition:"all 0.18s" }}>
                <Icon size={13} color={isA ? s.color : C.dim} />
                <div>
                  <div style={{ fontSize:8, color: isA ? s.color : C.muted, fontWeight:800, letterSpacing:"0.10em" }}>{s.code}</div>
                  <div style={{ fontSize:11, color: isA ? C.ink : C.dim, fontWeight: isA ? 700 : 400 }}>{s.label}</div>
                </div>
                {isA && <ChevronRight size={10} color={s.color} style={{ marginLeft:"auto" }} />}
              </button>
            );
          })}

          {/* DayOne360 Live Link */}
          <div style={{ margin:"24px 14px 0", borderRadius:10, overflow:"hidden", border:`1px solid rgba(167,139,250,0.25)` }}>
            <div style={{ padding:"8px 12px", background:"rgba(91,63,160,0.10)", fontSize:8, fontWeight:800, color:"#5B3FA0", letterSpacing:"0.14em" }}>✈ AFFILIATE PARTNER</div>
            <div style={{ padding:"12px 14px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <div style={{ width:32, height:32, borderRadius:9, background:"rgba(91,63,160,0.10)", border:"1px solid rgba(91,63,160,0.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <svg viewBox="0 0 32 32" width="18" height="18" fill="none">
                    <circle cx="16" cy="16" r="11" stroke="#5B3FA0" strokeWidth="1.3" opacity="0.85"/>
                    <ellipse cx="16" cy="16" rx="5.5" ry="11" stroke="#5B3FA0" strokeWidth="1" opacity="0.45"/>
                    <line x1="5" y1="16" x2="27" y2="16" stroke="#5B3FA0" strokeWidth="1" opacity="0.40"/>
                    <path d="M21 8 L18 14 L13 12 L11 14 L15 16 L13 20 L16 19 L18 23 L20 21 L18 16 L23 12 Z" fill="#5B3FA0" opacity="0.90"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:C.ink, fontFamily:C.serif }}>DayOne360</div>
                  <div style={{ fontSize:8, color:C.muted, letterSpacing:"0.10em" }}>ELITE TRAVEL</div>
                </div>
              </div>
              <a href="https://www.dayone360.com" target="_blank" rel="noopener noreferrer"
                style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"8px", borderRadius:8, background:"rgba(91,63,160,0.10)", border:"1px solid rgba(91,63,160,0.28)", textDecoration:"none", fontSize:10, fontWeight:700, color:"#5B3FA0", letterSpacing:"0.08em" }}>
                <Globe size={11} /> Open DayOne360.com
              </a>
            </div>
          </div>

          <div style={{ margin:"14px 14px 0", padding:"10px 12px", borderRadius:9, border:`1px dashed ${C.border}` }}>
            <div style={{ fontSize:8, fontWeight:800, color:C.red, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:4 }}>⚠ Restricted</div>
            <div style={{ fontSize:9, color:C.muted, lineHeight:1.6 }}>Sales & Marketing leadership only. Do not share externally.</div>
          </div>
        </div>

        {/* ── Content ── */}
        <div ref={contentRef} style={{ flex:1, overflowY:"auto", padding:"32px 40px 60px", background:C.bg }}>

          {/* ══ CL-01 · AI ORCHESTRATOR ══ */}
          <SectionHead {...SECTIONS[0]} />

          <Card accent={C.gold}>
            <Label color={C.gold}>4-Signal Weighted Scoring — Recommendation Engine</Label>
            <div style={{ display:"grid", gridTemplateColumns:"32px 1fr 70px 1fr", gap:0 }}>
              {[
                ["S1","Preference Match",   "+2/tag", "Active mood · intensity · setting vs. scene tags"],
                ["S2","POS Pairing Signal", "+3/tag", "Strongest signal — last order type maps to affinity tags"],
                ["S3","Venue Theme Filter", "+2/tag", "Lounge→premium+night · Bar→social · Club→night+urban"],
                ["S4","Time-of-Day Boost",  "+1/tag", "Night scenes after 18:00 · Light scenes before 12:00"],
                ["SΔ","Admin/History Boost","+N",     "Operator weight overrides + guest scene history"],
              ].map(([code,name,wt,desc],i) => (
                <div key={i} style={{ display:"contents" }}>
                  <div style={{ padding:"8px 0", borderBottom:`1px solid ${C.border}`, fontFamily:C.mono, fontSize:9, color:C.gold, fontWeight:700 }}>{code}</div>
                  <div style={{ padding:"8px 10px", borderBottom:`1px solid ${C.border}`, fontSize:11, fontWeight:700, color:C.ink }}>{name}</div>
                  <div style={{ padding:"8px 8px", borderBottom:`1px solid ${C.border}`, fontFamily:C.mono, fontSize:11, color:C.green, fontWeight:700 }}>{wt}</div>
                  <div style={{ padding:"8px 0 8px 10px", borderBottom:`1px solid ${C.border}`, fontSize:10, color:C.muted, lineHeight:1.55 }}>{desc}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card accent={C.amber}>
            <Label color={C.amber}>POS Pairing Map · Last Order → Visual Affinity Tags</Label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10 }}>
              {[
                { craft:"Cigar → SMOKE",  tags:["premium","strong","night"], color:"#B8500A" },
                { craft:"Whiskey → POUR", tags:["strong","premium","solo"],  color:C.purple  },
                { craft:"Beer → BREW",    tags:["light","social"],           color:C.green   },
                { craft:"Vape → VAPE",    tags:["tech","flavor","night"],    color:C.blue    },
              ].map(r => (
                <div key={r.craft} style={{ padding:"12px 13px", borderRadius:9, background:`${r.color}0c`, border:`1px solid ${r.color}25` }}>
                  <div style={{ fontSize:9, fontWeight:800, color:r.color, letterSpacing:"0.10em", marginBottom:8 }}>{r.craft}</div>
                  {r.tags.map(t => <Chip key={t} label={t} color={r.color} />)}
                </div>
              ))}
            </div>
          </Card>

          <Divider />

          {/* ══ CL-02 · REVENUE BRAIN v2 ══ */}
          <SectionHead {...SECTIONS[1]} />

          <Card accent={C.green}>
            <Label color={C.green}>Revenue Brain v2 · Product Scoring Formula</Label>
            <div style={{ fontFamily:C.mono, fontSize:12.5, color:C.amber, background:"rgba(184,121,10,0.08)", padding:"13px 15px", borderRadius:8, marginBottom:14, letterSpacing:"0.03em", lineHeight:1.8 }}>
              SCORE = (0.40 × taste_match) + (0.25 × margin)<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ (0.15 × stock_health) + (0.10 × vendor_reliability)<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ (0.10 × premium_signal)
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
              {[
                { rule:"Hard Block",        cond:"qty = 0",          effect:"Removed from recommendations entirely",  color:C.red    },
                { rule:"Low-Stock Penalty", cond:"qty < threshold",  effect:"−25 pts regardless of other signals",   color:"#B8500A" },
                { rule:"Vendor Penalty",    cond:"reliability <60%", effect:"−10 soft penalty on reliability weight", color:C.blue   },
              ].map(r => (
                <div key={r.rule} style={{ padding:"12px 13px", borderRadius:9, background:`${r.color}0a`, border:`1px solid ${r.color}22` }}>
                  <div style={{ fontSize:9, fontWeight:800, color:r.color, letterSpacing:"0.10em", marginBottom:4 }}>{r.rule}</div>
                  <div style={{ fontFamily:C.mono, fontSize:9, color:C.amber, marginBottom:6 }}>{r.cond}</div>
                  <div style={{ fontSize:10, color:C.muted, lineHeight:1.55 }}>{r.effect}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card accent={C.green}>
            <Label color={C.green}>Projected Revenue Lift · Occupancy Formula</Label>
            <div style={{ fontFamily:C.mono, fontSize:12.5, color:C.green, background:"rgba(26,107,58,0.07)", padding:"13px 15px", borderRadius:8, marginBottom:14 }}>
              projectedLift = (occupancy / 100) × (isDynamicActive ? $64 : $38) per hour
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
              {[
                { range:"0–20%",  tier:"Volume Incentive",  mult:"0.20×", color:C.blue,   note:"Base −12%. Drive traffic." },
                { range:"21–55%", tier:"Base Price",         mult:"1.00×", color:C.green,  note:"Standard. Comfortable margin." },
                { range:"56–80%", tier:"Dynamic Watch",      mult:"1.28×", color:"#B8500A",note:"Surge eligible. Monitor." },
                { range:"81–100%",tier:"Surge Active",       mult:"1.64×", color:C.red,    note:"Full surge. +64% margin lift." },
              ].map(r => (
                <div key={r.range} style={{ padding:"12px 13px", borderRadius:9, background:`${r.color}0c`, border:`1px solid ${r.color}28`, textAlign:"center" }}>
                  <div style={{ fontFamily:C.mono, fontSize:9, color:r.color, fontWeight:700, marginBottom:3 }}>{r.range}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:C.ink, marginBottom:4, fontFamily:C.serif }}>{r.tier}</div>
                  <div style={{ fontFamily:C.mono, fontSize:14, fontWeight:800, color:r.color, marginBottom:5 }}>{r.mult}</div>
                  <div style={{ fontSize:9, color:C.muted, lineHeight:1.5 }}>{r.note}</div>
                </div>
              ))}
            </div>
          </Card>

          <Divider />

          {/* ══ CL-03 · PSYCHOLOGICAL SPEC ══ */}
          <SectionHead {...SECTIONS[2]} />

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <Card accent={C.blue} compact>
              <Label color={C.blue}>58Hz Ambient Hum · Sensory Anchoring</Label>
              {[
                ["Frequency",   "58 Hz sine wave"],
                ["LFO Rate",    "0.08 Hz · one breath / 12.5s"],
                ["LFO Depth",   "0.006 gain · imperceptible as tone"],
                ["Master Vol",  "0.022 · ~2% of full scale"],
                ["Fade-Out",    "400ms linear ramp on unmount"],
              ].map(([k,v]) => <Row key={k as string} left={k} right={<Code>{v as string}</Code>} />)}
              <div style={{ marginTop:12, padding:"10px 12px", borderRadius:8, background:"rgba(26,75,138,0.07)", border:`1px solid ${C.blue}20` }}>
                <div style={{ fontSize:10, color:C.muted, lineHeight:1.65 }}>
                  <strong style={{ color:C.blue }}>Effect:</strong> Sub-bass sine activates the vestibular system without auditory detection. The patron experiences the room as having physical weight — unconscious venue trust. Dwell time +8–14%.
                </div>
              </div>
            </Card>
            <Card accent={C.purple} compact>
              <Label color={C.purple}>Mechanical Click · Hardware Weight Signal</Label>
              {[
                ["Pattern",     "Double-pop noise burst"],
                ["Timing",      "2 bursts × 18ms, 25ms apart"],
                ["Pitch",       "Square 800Hz → 400Hz / 65ms"],
                ["Noise Gain",  "0.30 · Tone Gain 0.055"],
                ["Trigger",     "Every tile tap & mode switch"],
              ].map(([k,v]) => <Row key={k as string} left={k} right={<Code>{v as string}</Code>} />)}
              <div style={{ marginTop:12, padding:"10px 12px", borderRadius:8, background:"rgba(91,63,160,0.07)", border:`1px solid ${C.purple}20` }}>
                <div style={{ fontSize:10, color:C.muted, lineHeight:1.65 }}>
                  <strong style={{ color:C.purple }}>Effect:</strong> Double-pop mimics a physical hardware switch. The patron's brain classifies the interface as a physical device — perceived value ↑, decision confidence ↑.
                </div>
              </div>
            </Card>
          </div>

          <Card accent={C.red}>
            <Label color={C.red}>Scarcity & Urgency Triggers</Label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              {[
                { name:"Reservation TTL",    mech:"15-min hard expiry",   code:"inventory_reservations",          effect:"Cart items expire silently. Patron who hesitates loses the product." },
                { name:"Session Countdown",  mech:"Red pulse ≤ 5 min",    code:"isCountdown → pulse 1.2s repeat", effect:"Red pulse activates loss-aversion. Patrons rush to complete." },
                { name:"Surge Alert",        mech:"Occupancy > 80%",      code:"occupancy > 80 → surge eligible", effect:"Rising prices convert fence-sitters in real time." },
              ].map(r => (
                <div key={r.name} style={{ padding:"13px", borderRadius:9, background:`${C.red}07`, border:`1px solid ${C.red}20` }}>
                  <div style={{ fontSize:9, fontWeight:800, color:C.red, letterSpacing:"0.10em", marginBottom:3 }}>{r.name}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:C.ink, fontFamily:C.serif, marginBottom:5 }}>{r.mech}</div>
                  <div style={{ fontFamily:C.mono, fontSize:8.5, color:C.amber, marginBottom:7 }}>{r.code}</div>
                  <div style={{ fontSize:10, color:C.muted, lineHeight:1.60 }}>{r.effect}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card accent={C.gold}>
            <Label color={C.gold}>XP / Prestige Dopamine Loop · Rank Config</Label>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:12 }}>
              {[
                { rank:"Novice",      xp:"0",     glyph:"◦", color:"rgba(26,26,27,0.38)", next:"→ 500 XP" },
                { rank:"Connoisseur", xp:"500",   glyph:"◆", color:"#D48B00",             next:"→ 2,000 XP" },
                { rank:"Master",      xp:"2,000", glyph:"❖", color:"#9B7FD4",             next:"→ 5,000 XP" },
                { rank:"Legend",      xp:"5,000", glyph:"✦", color:"#FFD166",             next:"Maximum" },
              ].map(r => (
                <div key={r.rank} style={{ padding:"13px", borderRadius:9, background:`${r.color}10`, border:`1px solid ${r.color}28`, textAlign:"center" }}>
                  <div style={{ fontSize:22, color:r.color, fontFamily:C.serif, marginBottom:3 }}>{r.glyph}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:C.ink, marginBottom:2 }}>{r.rank}</div>
                  <div style={{ fontFamily:C.mono, fontSize:9, color:C.amber, marginBottom:5 }}>{r.xp} XP</div>
                  <div style={{ fontSize:9, color:C.muted }}>{r.next}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:10.5, color:C.muted, lineHeight:1.75, padding:"10px 12px", borderRadius:8, background:"rgba(212,139,0,0.05)", border:`1px solid ${C.border}` }}>
              <strong style={{ color:C.amber }}>Social competition mechanic:</strong> Rank-up notification fires publicly on the patron-facing screen — an AnimatePresence amber banner with the rank glyph. Staff verbally acknowledge within 60s: <em>"Legend tier — the reserve shelf just opened for you."</em>
            </div>
          </Card>

          <Divider />

          {/* ══ CL-04 · SENSORY VISUAL MAP ══ */}
          <SectionHead {...SECTIONS[3]} />

          <p style={{ fontSize:12, color:C.muted, lineHeight:1.80, marginBottom:18 }}>
            The <Code>FLAVOR_DESCRIPTORS</Code> map translates abstract flavour tags into cinematic visual environments. Sight primes taste before the product is touched — bypassing the rational brain via visual cortex activation.
          </p>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[
              { tag:"cedar",   hex:"#8B6914", visual:"Raw wood texture, forest light filtering through grain",       brain:"Olfactory cortex primed for cedar terpenes — tobacco seems richer before the first draw." },
              { tag:"creamy",  hex:"#B8860B", visual:"Soft diffused light, silky texture, cream and ivory palette",  brain:"Somatosensory priming — mouth waters in anticipation of smooth mouthfeel." },
              { tag:"smoky",   hex:"#5C4A2A", visual:"Wisps of smoke curling through warm amber light",              brain:"Amygdala recall — smoke imagery activates memory of past pleasurable smoke sessions." },
              { tag:"oak",     hex:"#7B5C2A", visual:"Barrel stave texture, aged patina, warm whiskey tones",         brain:"Time-depth signal — aged visuals communicate quality without a price tag." },
              { tag:"vanilla", hex:"#C8A43C", visual:"Soft cream tones, warm studio light, luxurious softness",       brain:"Sweet anticipation — vanilla visuals elevate perceived sweetness before tasting." },
              { tag:"bold",    hex:"#8B2500", visual:"Full-frame presence, intense character, dramatic shadow depth",  brain:"Confidence signal — bold imagery raises willingness-to-pay for full-body profiles." },
              { tag:"nutty",   hex:"#8B6B2A", visual:"Toasted warm tones, caramel drizzle, soft grain depth",         brain:"Comfort anchor — nutty warmth lowers cortisol, extends session duration." },
              { tag:"leather", hex:"#6B3A2A", visual:"Dark aged leather surface, old-world refined texture",          brain:"Status marker — leather imagery activates premium and exclusivity associations." },
            ].map((r, i) => (
              <motion.div key={r.tag} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.04*i }}
                style={{ display:"flex", gap:12, padding:"14px 16px", borderRadius:10, background:C.card, border:`1px solid ${r.hex}25`, borderLeft:`3px solid ${r.hex}` }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
                    <span style={{ padding:"3px 10px", borderRadius:5, background:`${r.hex}14`, border:`1px solid ${r.hex}28`, fontSize:10, fontWeight:700, color:r.hex }}>{r.tag}</span>
                  </div>
                  <div style={{ fontSize:11, fontStyle:"italic", color:C.muted, lineHeight:1.6, marginBottom:6 }}>"{r.visual}"</div>
                  <div style={{ fontSize:10, color:C.dim, lineHeight:1.6 }}><strong style={{ color:r.hex }}>Brain:</strong> {r.brain}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <Divider />

          {/* ══ CL-05 · SALES PITCH CARDS ══ */}
          <SectionHead {...SECTIONS[4]} />

          <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:12 }}>
            {[
              {
                badge:"ROI",
                title:"Revenue Brain Pays for Itself in One Surge Event",
                body:"At 90% occupancy with dynamic pricing active: projected lift of $57.60/hr. A Friday night surge (4 hours at 85% occupancy) generates $184 in additional margin over static pricing. Axiom's SaaS fee: $299/month. Full ROI in 2 surge events. Average venues trigger 6–10 surge events per month.",
                kpis:[["Break-Even","2 surge events"],["Per-Event Lift","$184"],["Monthly Surplus","$1,500+"]],
                color:C.green,
              },
              {
                badge:"BEHAVIORAL LOCK-IN",
                title:"The System Creates Physiological Retention — Not Feature Retention",
                body:"The 58Hz hum, mechanical click, and XP prestige system are behavioral conditioning architecture. After 3+ sessions, patrons have a physiological association between the Axiom interface and the lounge pleasure state. Removing the system creates withdrawal-level dissonance. Churn is not a pricing conversation.",
                kpis:[["Retention Driver","Physiological anchor"],["Churn Risk","Near-zero after 3 sessions"],["Competitor Switch","Sensory withdrawal"]],
                color:C.purple,
              },
              {
                badge:"DAYONE360 BRIDGE",
                title:"DayOne360 Affiliate Revenue Is Pure Margin — Zero Marginal Cost",
                body:"The travel concierge card is a zero-marginal-cost revenue layer. A 48-seat venue averaging 120 patrons/night generates 120 impressions/night. At 4–8% CTR and $12 average affiliate CPC: $57–$115/night in passive revenue — $1,700–$3,450/month per venue, with no staff involvement.",
                kpis:[["Impressions/Night","120+"],["Passive Monthly Rev","$1,700–$3,450"],["Staff Effort","Zero"]],
                color:C.blue,
                cta:{ label:"Open DayOne360.com →", href:"https://www.dayone360.com" },
              },
              {
                badge:"ZERO-LATENCY AI MOAT",
                title:"No Inference Cost — Deterministic AI That Never Bills Per Call",
                body:"The entire recommendation engine, pairing chemistry, and Revenue Brain are deterministic and run locally. Competitors using GPT-4 API pay $0.01–$0.06 per recommendation. Axiom cost per recommendation: $0.00. At 10,000 daily recommendations, that's $365,000/yr in avoided AI infrastructure per deployment.",
                kpis:[["Cost Per Rec","$0.00"],["Competitor Cost","+$365K/yr"],["Offline Capable","100%"]],
                color:C.gold,
              },
              {
                badge:"TAM EXPANSION",
                title:"Four Crafts = One Platform, Four Independently Addressable Markets",
                body:"SmokeCraft · PourCraft · BrewCraft · VapeCraft. The same behavioral engine, recommendation AI, and loyalty system serves all four. Multi-concept operators subscribe once. Cross-craft swipe data generates personalization depth no single-category competitor can produce.",
                kpis:[["Crafts","4"],["Markets","Cigar · Spirits · Beer · Vape"],["Data Depth","Cross-craft taste vectors"]],
                color:"#B8500A",
              },
              {
                badge:"DEMO CLOSE",
                title:"The Hidden Gate Is the Moment the Sale Closes",
                body:"Gate A (3-second hold) → Staff POS overlay. Gate B (5-second hold) → Founder Dashboard with live occupancy, revenue lift, XP, and dynamic pricing state. No competitor's product has this. In a 10-minute demo, the hidden gate moment is the technical proof-of-concept that closes the room.",
                kpis:[["Gate A","3,000ms → Staff POS"],["Gate B","5,000ms → Founder View"],["Demo Close Rate","Anecdotally 100%"]],
                color:C.red,
              },
            ].map((card, i) => (
              <motion.div key={i} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.05*i }}
                style={{ padding:"20px 22px", borderRadius:12, background:C.card, border:`1px solid ${card.color}22`, borderLeft:`4px solid ${card.color}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <div style={{ fontSize:8, fontWeight:800, color:card.color, letterSpacing:"0.14em", padding:"3px 9px", borderRadius:4, background:`${card.color}14`, border:`1px solid ${card.color}30` }}>{card.badge}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:C.ink, fontFamily:C.serif, flex:1, lineHeight:1.2 }}>{card.title}</div>
                </div>
                <div style={{ fontSize:11, color:C.muted, lineHeight:1.75, marginBottom:12 }}>{card.body}</div>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom: card.cta ? 12 : 0 }}>
                  {card.kpis.map(([k,v]) => (
                    <div key={k} style={{ padding:"8px 12px", borderRadius:8, background:`${card.color}0a`, border:`1px solid ${card.color}20`, minWidth:100 }}>
                      <div style={{ fontSize:8, color:card.color, fontWeight:800, letterSpacing:"0.10em", marginBottom:3 }}>{k}</div>
                      <div style={{ fontSize:12, fontWeight:700, color:C.ink, fontFamily:C.serif }}>{v}</div>
                    </div>
                  ))}
                </div>
                {card.cta && (
                  <a href={card.cta.href} target="_blank" rel="noopener noreferrer"
                    style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"9px 16px", borderRadius:9, background:`${card.color}12`, border:`1px solid ${card.color}35`, textDecoration:"none", fontSize:11, fontWeight:700, color:card.color, letterSpacing:"0.06em" }}>
                    <Globe size={12} />{card.cta.label}
                  </a>
                )}
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ marginTop:44, padding:"18px 20px", borderRadius:10, border:`1px dashed ${C.border}`, textAlign:"center", background:C.surface }}>
            <div style={{ fontSize:9, color:C.muted, letterSpacing:"0.16em", textTransform:"uppercase", marginBottom:4 }}>
              Admin Master · Axiom OS Operator's Bible · Rev 3.0.0
            </div>
            <div style={{ fontSize:8, color:C.dim, marginBottom:10 }}>
              Total Command Center — Sales · Marketing · Training leadership only
            </div>
            <a href="https://www.dayone360.com" target="_blank" rel="noopener noreferrer"
              style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"9px 18px", borderRadius:9, background:"rgba(91,63,160,0.09)", border:"1px solid rgba(91,63,160,0.25)", textDecoration:"none", fontSize:11, fontWeight:700, color:"#5B3FA0" }}>
              <Globe size={13} /> DayOne360.com — Elite Affiliate Partner
            </a>
          </div>

        </div>
      </div>

      {/* ── 64px Surge Ticker ── */}
      <SurgeTicker />
    </div>
  );
}
