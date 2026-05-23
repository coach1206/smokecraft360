/**
 * StaffTerminal — High-Velocity Staff POS
 * Matches POS3.png: SVG icons only, compact split-panel table cards, large footer
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

// ── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  base:    "#020202",
  glass:   "rgba(14,14,14,0.92)",
  glass2:  "rgba(20,20,20,0.95)",
  gold:    "#D4AF37",
  goldDim: "rgba(212,175,55,0.15)",
  goldGlo: "rgba(212,175,55,0.38)",
  amber:   "#E6A11D",
  chrome:  "#2A2A2A",
  dark:    "#141414",
  white:   "#FFFFFF",
  cream:   "#F0E8D8",
  muted:   "rgba(200,195,188,0.55)",
  red:     "#C0392B",
  redLo:   "rgba(192,57,43,0.22)",
  redHi:   "#E74C3C",
  green:   "#27AE60",
  orange:  "#E67E22",
  sans:    "'Inter','SF Pro Display',sans-serif",
  mono:    "'JetBrains Mono','Courier New',monospace",
};

const BASE = import.meta.env.BASE_URL;
const I    = (n: string) => `${BASE}images/${n}`;

const T = {
  onTouchStart: (e: React.TouchEvent) => { (e.currentTarget as HTMLElement).style.opacity = "0.75"; },
  onTouchEnd:   (e: React.TouchEvent) => { (e.currentTarget as HTMLElement).style.opacity = "1"; },
};

const panel = (x: React.CSSProperties = {}): React.CSSProperties => ({
  background: C.glass, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
  border: `1px solid ${C.chrome}`, borderRadius: 8, overflow: "hidden", ...x,
});

// ── SVG Icon Library ─────────────────────────────────────────────────────────
function Icon({ d, size = 16, color = C.muted, stroke = false }: { d: string; size?: number; color?: string; stroke?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={stroke ? "none" : color}
      stroke={stroke ? color : "none"} strokeWidth={stroke ? 1.8 : 0} style={{ flexShrink: 0 }}>
      <path d={d} />
    </svg>
  );
}
// Icon paths
const PATHS = {
  leaf:    "M17 8C8 10 5.9 16.17 3.82 19.43L2 22l1-1c1-1 4.87-4.23 10.9-6.65 2.1-.82 4.5-1.4 7.1-1.35C22 13 22 11 22 10c0-5.52-4.48-10-10-10C7.56 0 4 2.64 4 2.64S3 6 5 8c1.43 1.43 4 2 12 0z",
  cocktail:"M18.5 2h-13l5.5 9.5V20H8v2h8v-2h-3V11.5L18.5 2zm-9.91 2h6.82l-1.42 2.45H10.01L8.59 4z",
  house:   "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  utensils:"M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z",
  warn:    "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  thermo:  "M17 12.17V4c0-2.76-2.24-5-5-5S7 1.24 7 4v8.17C5.22 13.33 4 15.29 4 17.5 4 20.54 6.46 23 9.5 23h5c3.04 0 5.5-2.46 5.5-5.5 0-2.21-1.22-4.17-3-5.33zM12 21h-2.5C8 21 6 19 6 16.5c0-1.56.83-2.93 2-3.7V4c0-1.66 1.34-3 3-3s3 1.34 3 3v8.8c1.17.77 2 2.14 2 3.7 0 2.48-1.99 4.5-4 4.5z",
  drop:    "M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2C20 10.48 17.33 6.55 12 2z",
  list:    "M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z",
  chart:   "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z",
  signal:  "M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z",
  circle:  "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z",
  filter:  "M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z",
  wifi:    "M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 0 0-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z",
  star:    "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  receipt: "M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20z",
  credit:  "M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z",
};

// ── Clock ─────────────────────────────────────────────────────────────────────
function useClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  const h  = t.getHours() % 12 || 12;
  const m  = String(t.getMinutes()).padStart(2,"0");
  const ap = t.getHours() >= 12 ? "PM" : "AM";
  const d  = t.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }).toUpperCase();
  return { time: `${h}:${m} ${ap}`, date: d };
}

// ── Data ──────────────────────────────────────────────────────────────────────
interface Item { id: string; name: string; brand: string; price: number; qty: number; img?: string; }
interface Ticket { id: string; label: string; section: string; guest: string; elapsedMs: number; vip: boolean; items: Item[]; bg: string; }

const SEED: Ticket[] = [
  {
    id:"t101", label:"TABLE 101", section:"VIP SECTION", guest:"John D.",
    elapsedMs:6_120_000, vip:true, bg:I("scenes/smokecraft-card.jpg"),
    items:[
      { id:"rp",  name:"Rocky Patel",    brand:"Vintage 1992", price:42, qty:1, img:I("cigar1.png") },
      { id:"bt",  name:"Buffalo Trace",  brand:"Bourbon",      price:32, qty:2, img:I("pour/pour_whiskey.png") },
      { id:"rmx", name:"Remy Martin XO", brand:"Cognac",       price:48, qty:1, img:I("pour/pour_aged.png") },
      { id:"ap",  name:"Acqua Panna",    brand:"Water",        price: 8, qty:2 },
    ],
  },
  {
    id:"t102", label:"TABLE 102", section:"MAIN FLOOR", guest:"Maria S.",
    elapsedMs:3_420_000, vip:false, bg:I("scenes/pourcraft-card.jpg"),
    items:[
      { id:"p64", name:"Padron 1964",   brand:"Anniversary", price:48, qty:1, img:I("cigar2.png") },
      { id:"mac", name:"Macallan 12yr", brand:"Scotch",      price:28, qty:2, img:I("pour/pour_whiskey.png") },
    ],
  },
  {
    id:"t103", label:"TABLE 103", section:"MAIN LOUNGE", guest:"Robert K.",
    elapsedMs:1_380_000, vip:false, bg:I("scenes/bold.jpg"),
    items:[
      { id:"af", name:"Arturo Fuente", brand:"Gran Reserva", price:26, qty:2, img:I("cigar3.png") },
    ],
  },
];

const tab  = (items: Item[]) => items.reduce((s,i) => s + i.price * i.qty, 0);
const hhmm = (ms: number) => {
  const h = Math.floor(ms/3_600_000);
  const m = Math.floor((ms%3_600_000)/60_000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}h`;
};

// ── VIP Pill ──────────────────────────────────────────────────────────────────
function VIP() {
  return <span style={{ background:`linear-gradient(135deg,${C.gold},#A67C00)`, color:"#000", fontSize:8, fontWeight:900, letterSpacing:"0.16em", padding:"2px 6px", borderRadius:3 }}>VIP</span>;
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ n }: { n: number }) {
  return <div style={{ width:26, height:26, borderRadius:"50%", flexShrink:0, background:`linear-gradient(135deg,${C.gold},#A67C00)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, color:"#000" }}>{n}</div>;
}

// ── Header ────────────────────────────────────────────────────────────────────
function Header() {
  const { time, date } = useClock();
  const [pulse, setPulse] = useState(true);
  useEffect(() => { const id = setInterval(() => setPulse(p => !p), 1100); return () => clearInterval(id); }, []);

  return (
    <div style={{ height:50, flexShrink:0, background:C.dark, borderBottom:`1px solid ${C.chrome}`, display:"flex", alignItems:"center", padding:"0 16px", gap:12 }}>
      {/* Logo */}
      <div style={{ display:"flex", alignItems:"center", gap:9, width:210, flexShrink:0 }}>
        <img src={I("logo_eat.png")} alt="" style={{ height:30, width:30, objectFit:"contain" }}
          onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:C.gold, letterSpacing:"0.18em" }}>E.A.T. SYSTEM</div>
          <div style={{ fontSize:8, color:C.muted, letterSpacing:"0.24em", textTransform:"uppercase" }}>ELITE ATMOSPHERE TECHNOLOGY</div>
        </div>
      </div>

      {/* Center clock */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:20 }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:15, fontWeight:700, color:C.cream, letterSpacing:"0.08em" }}>{time}</div>
          <div style={{ fontSize:9, color:C.muted, letterSpacing:"0.18em" }}>{date}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <motion.div animate={{ opacity: pulse ? 1 : 0.15 }} transition={{ duration:0.25 }}
            style={{ width:7, height:7, borderRadius:"50%", background:C.green }} />
          <span style={{ fontSize:11, fontWeight:700, color:C.green, letterSpacing:"0.16em" }}>LIVE SYNC</span>
          <div style={{ display:"flex", gap:1, alignItems:"flex-end" }}>
            {[10,14,18,14].map((h,i) => <div key={i} style={{ width:3, height:h, background:C.green, borderRadius:1 }} />)}
          </div>
        </div>
      </div>

      {/* Right */}
      <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
        <span style={{ fontSize:12, fontWeight:700, color:C.cream, letterSpacing:"0.10em" }}>
          NOVEE OS <span style={{ color:C.muted, fontWeight:400 }}>v1.0</span>
        </span>
        <span style={{ fontSize:10, fontWeight:800, color:C.green, border:`1px solid ${C.green}44`, borderRadius:4, padding:"2px 8px", letterSpacing:"0.18em" }}>LIVE</span>
        <Icon d={PATHS.wifi} size={18} color={C.muted} />
      </div>
    </div>
  );
}

// ── Nav Rail ──────────────────────────────────────────────────────────────────
function NavRail({ onBack }: { onBack: () => void }) {
  const items = [
    { icon: PATHS.house,    label:"Hub",            active:true,  fn:onBack   },
    { icon: PATHS.leaf,     label:"SC\nSmoke Craft", active:false, fn:undefined },
    { icon: PATHS.cocktail, label:"PR\nPairing\nEngine", active:false, fn:undefined },
    { icon: PATHS.utensils, label:"CH\nCoach\nHelp", active:false, fn:undefined },
  ];

  return (
    <div style={{ width:64, flexShrink:0, background:"rgba(3,3,3,0.98)", borderRight:`1px solid ${C.chrome}`, display:"flex", flexDirection:"column", alignItems:"center", paddingTop:8, gap:4, height:"100%" }}>
      {items.map(item => (
        <motion.button key={item.label} whileTap={{ scale:0.91 }} onClick={item.fn} {...T}
          style={{
            width:52, minHeight:58, borderRadius:8, cursor:"pointer",
            background: item.active ? C.goldDim : "transparent",
            border:`1px solid ${item.active ? C.gold : C.chrome}`,
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, padding:"6px 2px",
          }}>
          <Icon d={item.icon} size={18} color={item.active ? C.gold : C.muted} />
          <span style={{ fontFamily:C.mono, fontSize:7, color:item.active ? C.gold : C.muted, letterSpacing:"0.10em", textAlign:"center", whiteSpace:"pre-line", lineHeight:1.3 }}>
            {item.label}
          </span>
        </motion.button>
      ))}

      <div style={{ flex:1 }} />

      {/* POS LIVE */}
      <motion.button whileTap={{ scale:0.93 }} {...T}
        style={{ width:52, minHeight:70, marginBottom:10, borderRadius:8, background:`linear-gradient(180deg,rgba(212,175,55,0.20),rgba(212,175,55,0.09))`, border:`1px solid ${C.gold}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", gap:2, boxShadow:`0 0 16px ${C.goldGlo}` }}>
        <span style={{ fontSize:24, fontWeight:900, color:C.gold, letterSpacing:"-0.02em" }}>P</span>
        <span style={{ fontFamily:C.mono, fontSize:7, color:C.gold, letterSpacing:"0.14em", lineHeight:1.4, textAlign:"center" }}>{"POS\nLIVE"}</span>
      </motion.button>
    </div>
  );
}

// ── Column 1: Telemetry ───────────────────────────────────────────────────────
function TelemetryCol() {
  const [puros, setPuros] = useState(145);
  const [pours]           = useState(14);
  const [pending, setPending] = useState(3);
  const [ready,   setReady]   = useState(1);
  const [alert,   setAlert]   = useState(true);

  useEffect(() => { const id = setInterval(() => { if (Math.random()<0.07) setPuros(p => Math.max(0,p-1)); }, 4000); return ()=>clearInterval(id); }, []);

  const stRow = (label: string, val: string, icon: string) => (
    <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.03)", border:`1px solid ${C.chrome}`, borderRadius:7, padding:"7px 10px" }}>
      <Icon d={icon} size={16} color={C.amber} />
      <div>
        <div style={{ fontSize:16, fontWeight:800, color:C.amber }}>{val}</div>
        <div style={{ fontSize:8, color:C.muted, letterSpacing:"0.18em", textTransform:"uppercase" }}>{label}</div>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:7, height:"100%", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:9, flexShrink:0 }}>
        <Badge n={1} />
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:C.white, letterSpacing:"0.05em" }}>REAL-TIME TELEMETRY</div>
          <div style={{ fontSize:8, fontFamily:C.mono, color:C.gold, letterSpacing:"0.26em", textTransform:"uppercase" }}>E.A.T. CORE STATION MONITORS</div>
        </div>
      </div>

      {/* STATION 1: HUMIDOR */}
      <div style={panel({ borderTop:`2px solid ${C.gold}`, flexShrink:0 })}>
        <div style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 12px 7px", borderBottom:`1px solid ${C.chrome}` }}>
          <Icon d={PATHS.leaf} size={15} color={C.gold} />
          <span style={{ fontSize:10, fontWeight:700, color:C.muted, letterSpacing:"0.24em", textTransform:"uppercase" }}>STATION 1: HUMIDOR</span>
        </div>

        {/* Split: metric + image */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", minHeight:108 }}>
          <div style={{ padding:"8px 12px 8px", display:"flex", flexDirection:"column", justifyContent:"center" }}>
            <motion.div
              animate={{ textShadow:[`0 0 18px ${C.amber}44`,`0 0 40px ${C.amber}aa`,`0 0 18px ${C.amber}44`] }}
              transition={{ duration:2.2, repeat:Infinity }}
              style={{ fontSize:60, fontWeight:900, color:C.amber, lineHeight:1, letterSpacing:"-0.02em" }}>
              {puros}
            </motion.div>
            <div style={{ fontSize:9, color:C.muted, letterSpacing:"0.20em", textTransform:"uppercase", marginTop:4 }}>PUROS REMAINING</div>
          </div>
          <div style={{ background:`url(${I("cedar_box.png")}) center/cover no-repeat,linear-gradient(135deg,#3D2510,#0F0A06)`, borderLeft:`1px solid ${C.chrome}` }} />
        </div>

        {/* Climate */}
        <div style={{ padding:"8px 12px", borderTop:`1px solid ${C.chrome}` }}>
          <div style={{ fontSize:8, color:C.muted, letterSpacing:"0.22em", textTransform:"uppercase", marginBottom:6 }}>CLIMATE CONTROL</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
            {stRow("TEMPERATURE","68°F", PATHS.thermo)}
            {stRow("RELATIVE HUMIDITY","71%", PATHS.drop)}
          </div>
        </div>

        {/* Alert */}
        <AnimatePresence>
          {alert && (
            <motion.div animate={{ opacity:[1,0.65,1] }} transition={{ duration:1.3, repeat:Infinity }}
              style={{ display:"flex", alignItems:"center", gap:8, background:C.redLo, borderTop:`1px solid ${C.red}44`, padding:"9px 12px", cursor:"pointer" }}
              onClick={() => setAlert(false)}>
              <Icon d={PATHS.warn} size={14} color={C.redHi} />
              <span style={{ flex:1, fontSize:11, fontWeight:800, color:C.redHi, letterSpacing:"0.14em" }}>TARGET ALERT: LOW STOCK</span>
              <span style={{ fontSize:14, color:C.redHi }}>›</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* STATION 2: BAR METRICS */}
      <div style={panel({ borderTop:"2px solid #3A6BC4", flexShrink:0 })}>
        <div style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 12px 7px", borderBottom:`1px solid ${C.chrome}` }}>
          <Icon d={PATHS.cocktail} size={15} color="#5B8DEF" />
          <span style={{ fontSize:10, fontWeight:700, color:C.muted, letterSpacing:"0.24em", textTransform:"uppercase" }}>STATION 2: BAR METRICS</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto", alignItems:"center", padding:"10px 12px", gap:10 }}>
          <div>
            <div style={{ fontSize:46, fontWeight:900, color:C.white, lineHeight:1, letterSpacing:"-0.02em" }}>{pours}</div>
            <div style={{ fontSize:9, color:C.muted, letterSpacing:"0.18em", textTransform:"uppercase", marginTop:3 }}>ACTIVE POUR SESSIONS</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
            <div style={{ width:48, height:72, borderRadius:7, background:`url(${I("pour/pour_whiskey.png")}) center/cover no-repeat,linear-gradient(180deg,#2C1810,#080808)`, border:`1px solid ${C.chrome}` }} />
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, background:C.redLo, borderTop:`1px solid ${C.red}44`, padding:"9px 12px" }}>
          <Icon d={PATHS.warn} size={13} color={C.redHi} />
          <div>
            <div style={{ fontSize:10, fontWeight:800, color:C.redHi, letterSpacing:"0.16em" }}>LOW STOCK</div>
            <div style={{ fontSize:12, fontWeight:700, color:C.white }}>REMY MARTIN XO</div>
            <div style={{ fontSize:9, color:C.muted, letterSpacing:"0.12em" }}>COGNAC</div>
          </div>
        </div>
      </div>

      {/* STATION 3: KITCHEN LINE */}
      <div style={panel({ borderTop:"2px solid #7B5EA7", flex:1, display:"flex", flexDirection:"column" })}>
        <div style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 12px 7px", borderBottom:`1px solid ${C.chrome}` }}>
          <Icon d={PATHS.utensils} size={15} color="#A78BFA" />
          <span style={{ fontSize:10, fontWeight:700, color:C.muted, letterSpacing:"0.24em", textTransform:"uppercase" }}>STATION 3: KITCHEN LINE</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, padding:"10px 12px" }}>
          {[{val:pending,label:"PENDING ORDERS",color:C.amber},{val:ready,label:"READY ORDERS",color:C.green}].map(m=>(
            <div key={m.label} style={{ background:`${m.color}0a`, border:`1px solid ${m.color}30`, borderRadius:7, padding:"10px 0", textAlign:"center" }}>
              <div style={{ fontSize:36, fontWeight:900, color:m.color, lineHeight:1 }}>{m.val}</div>
              <div style={{ fontSize:8, color:C.muted, letterSpacing:"0.18em", textTransform:"uppercase", marginTop:4 }}>{m.label}</div>
            </div>
          ))}
        </div>
        <motion.button whileTap={{ scale:0.97 }} {...T}
          onClick={() => { setPending(p=>Math.max(0,p-1)); setReady(r=>r+1); }}
          style={{ marginTop:"auto", width:"100%", height:42, background:"rgba(123,94,167,0.10)", border:"none", borderTop:"1px solid rgba(123,94,167,0.30)", color:"#A78BFA", fontSize:12, fontWeight:800, letterSpacing:"0.14em", cursor:"pointer", fontFamily:C.sans, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <Icon d={PATHS.list} size={15} color="#A78BFA" />
          VIEW KITCHEN QUEUE
          <span style={{ fontSize:14 }}>›</span>
        </motion.button>
      </div>
    </div>
  );
}

// ── Ticket Tapper Modal ───────────────────────────────────────────────────────
function TapperModal({ ticket, onClose, onUpdate }: { ticket:Ticket; onClose:()=>void; onUpdate:(items:Item[])=>void; }) {
  const [items, setItems] = useState<Item[]>(ticket.items.map(i=>({...i})));
  const adj = useCallback((id:string,d:number)=>{
    setItems(prev=>{ const n=prev.map(i=>i.id===id?{...i,qty:Math.max(0,i.qty+d)}:i).filter(i=>i.qty>0); onUpdate(n); return n; });
  },[onUpdate]);
  const sub=items.reduce((s,i)=>s+i.price*i.qty,0), tax=sub*.085, tot=sub+tax;
  return (
    <motion.div key="m" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{ position:"fixed", inset:0, zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.84)", backdropFilter:"blur(12px)" }} onClick={onClose} />
      <motion.div initial={{scale:0.94,y:20}} animate={{scale:1,y:0}} exit={{scale:0.94,y:20}}
        style={{ position:"relative", zIndex:1, width:520, maxHeight:"90vh", background:"rgba(8,8,10,0.99)", border:`1px solid ${C.gold}`, borderRadius:14, overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:`0 0 60px ${C.goldGlo}` }}>
        <div style={{ padding:"15px 20px", borderBottom:`1px solid ${C.chrome}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontFamily:C.mono, fontSize:9, color:C.gold, letterSpacing:"0.28em", marginBottom:4 }}>TICKET TAPPER</div>
            <div style={{ fontSize:16, fontWeight:800, color:C.white }}>{ticket.label} — {ticket.guest}</div>
          </div>
          <motion.button whileTap={{scale:0.9}} onClick={onClose}
            style={{ width:32, height:32, borderRadius:8, background:"rgba(255,255,255,0.05)", border:`1px solid ${C.chrome}`, color:C.muted, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" size={14} color={C.muted} />
          </motion.button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"2px 0" }}>
          <AnimatePresence>
            {items.map((item,i)=>(
              <motion.div key={item.id} layout initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:10,height:0}}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 20px", borderBottom:i<items.length-1?`1px solid ${C.chrome}`:"none" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.white }}>{item.name}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{item.brand} · ${item.price.toFixed(2)} ea</div>
                </div>
                {[["−",-1,"rgba(231,76,60,0.14)","rgba(231,76,60,0.42)",C.redHi],["+",1,"rgba(39,174,96,0.14)","rgba(39,174,96,0.42)",C.green]].map(([l,d,bg,br,c])=>(
                  <motion.button key={String(l)} whileTap={{scale:0.88}}
                    onClick={()=>adj(item.id,d as number)}
                    style={{ width:30,height:30,borderRadius:"50%",background:String(bg),border:`1px solid ${String(br)}`,color:String(c),fontSize:18,lineHeight:"28px",textAlign:"center",cursor:"pointer" }}>
                    {l}
                  </motion.button>
                ))}
                <div style={{ fontSize:15, fontWeight:800, color:C.amber, minWidth:24, textAlign:"center" }}>{item.qty}</div>
                <motion.button whileTap={{scale:0.88}} onClick={()=>adj(item.id,-999)}
                  style={{ width:26,height:26,borderRadius:"50%",background:C.goldDim,border:`1px solid ${C.gold}44`,color:C.gold,fontSize:12,lineHeight:"24px",textAlign:"center",cursor:"pointer" }}>x</motion.button>
                <div style={{ fontSize:13,fontWeight:700,color:C.white,minWidth:52,textAlign:"right" }}>${(item.price*item.qty).toFixed(2)}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div style={{ padding:"12px 20px", borderTop:`1px solid ${C.chrome}` }}>
          {[{l:"Subtotal",v:sub},{l:"Tax (8.5%)",v:tax}].map(r=>(
            <div key={r.l} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:12,color:C.muted }}>{r.l}</span>
              <span style={{ fontSize:12,color:C.white }}>${r.v.toFixed(2)}</span>
            </div>
          ))}
          <div style={{ display:"flex", justifyContent:"space-between", padding:"9px 0 0", borderTop:`1px solid ${C.chrome}`, marginTop:5 }}>
            <span style={{ fontSize:15,fontWeight:900,color:C.white }}>TOTAL</span>
            <span style={{ fontSize:18,fontWeight:900,color:C.amber }}>${tot.toFixed(2)}</span>
          </div>
        </div>
        <div style={{ padding:"12px 20px", display:"flex", gap:10 }}>
          <motion.button whileTap={{scale:0.97}} onClick={onClose}
            style={{ flex:1,height:44,borderRadius:8,background:"rgba(255,255,255,0.04)",border:`1px solid ${C.chrome}`,color:C.muted,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:C.sans }}>CANCEL</motion.button>
          <motion.button whileTap={{scale:0.97}}
            style={{ flex:2,height:44,borderRadius:8,background:`linear-gradient(135deg,${C.gold},#A67C00)`,border:"none",color:"#000",fontSize:12,fontWeight:900,letterSpacing:"0.08em",cursor:"pointer",fontFamily:C.sans }}>
            CONFIRM & UPDATE TICKET
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Column 2: Ticket Overview ─────────────────────────────────────────────────
const TABS2 = ["ALL TABLES","VIP SECTION","MAIN FLOOR","OUTDOOR"] as const;
type Tab2 = typeof TABS2[number];

function TicketsCol({ tickets, activeId, onSelect, onUpdate }: {
  tickets: Ticket[]; activeId: string;
  onSelect: (id:string)=>void;
  onUpdate: (id:string, items:Item[])=>void;
}) {
  const [tab, setTab] = useState<Tab2>("ALL TABLES");
  const [tapper, setTapper] = useState<Ticket|null>(null);

  const list = tab==="ALL TABLES" ? tickets
    : tickets.filter(t => t.section.toLowerCase().includes(tab.toLowerCase().replace(" section","").replace(" floor","").replace(" lounge","")));

  const avgMs  = tickets.reduce((s,t)=>s+t.elapsedMs,0)/tickets.length;
  const totVal = tickets.reduce((s,t)=>s+tab2(t.items),0);

  function tab2(items:Item[]){ return items.reduce((s,i)=>s+i.price*i.qty,0); }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:9, flexShrink:0, marginBottom:8 }}>
        <Badge n={2} />
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:C.white, letterSpacing:"0.05em" }}>HIGH-SPEED TICKET OVERVIEW</div>
          <div style={{ fontSize:8, fontFamily:C.mono, color:C.gold, letterSpacing:"0.26em", textTransform:"uppercase" }}>ACTIVE LOUNGE TABLES & QUEUES</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:5, marginBottom:8, flexShrink:0, alignItems:"center" }}>
        {TABS2.map(t=>(
          <motion.button key={t} whileTap={{scale:0.95}} onClick={()=>setTab(t)}
            style={{
              height:26, padding:"0 9px", borderRadius:5, cursor:"pointer",
              background: tab===t ? `linear-gradient(135deg,${C.gold},#A67C00)` : "rgba(255,255,255,0.04)",
              border:`1px solid ${tab===t ? C.gold : C.chrome}`,
              color: tab===t ? "#000" : C.muted,
              fontSize:9, fontWeight:800, letterSpacing:"0.12em", fontFamily:C.sans, whiteSpace:"nowrap",
            }}>{t}</motion.button>
        ))}
        <div style={{ marginLeft:"auto" }}>
          <Icon d={PATHS.filter} size={16} color={C.muted} />
        </div>
      </div>

      {/* Table card list — compact split-panel */}
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:7 }}>
        {list.map(t => {
          const isAct = t.id === activeId;
          const cur   = tab2(t.items);
          return (
            <motion.div key={t.id} whileTap={{scale:0.99}} onClick={()=>onSelect(t.id)}
              animate={{ boxShadow: isAct ? `0 0 18px ${C.goldGlo}` : "0 0 0 transparent" }}
              style={{ ...panel(), border:`1px solid ${isAct ? C.gold : C.chrome}`, flexShrink:0, cursor:"pointer" }}>
              {/* Split row: image left | info right */}
              <div style={{ display:"grid", gridTemplateColumns:"38% 62%", height:120 }}>
                {/* Photo */}
                <div style={{ background:`url(${t.bg}) center/cover no-repeat,linear-gradient(135deg,#2D1A0F,#080808)`, borderRight:`1px solid ${C.chrome}` }} />
                {/* Info */}
                <div style={{ padding:"10px 12px", display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:13, fontWeight:800, color:C.white, letterSpacing:"0.03em" }}>{t.label}</span>
                        {t.vip && <VIP />}
                        {!t.vip && <span style={{ fontSize:9, color:C.muted }}>{t.section}</span>}
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:11, fontWeight:700, color:C.amber }}>{hhmm(t.elapsedMs)}</div>
                        <div style={{ fontSize:8, color:C.muted, letterSpacing:"0.14em" }}>TIME ACTIVE</div>
                      </div>
                    </div>
                    <div style={{ fontSize:11, color:C.muted }}>Guest: {t.guest}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:9, color:C.muted, letterSpacing:"0.18em", textTransform:"uppercase" }}>CURRENT TAB</div>
                    <div style={{ fontSize:20, fontWeight:900, color:C.amber, lineHeight:1.1 }}>${cur.toFixed(2)}</div>
                  </div>
                </div>
              </div>
              {/* Full-width gold tapper bar */}
              <motion.button whileTap={{scale:0.98}} {...T}
                onClick={e=>{ e.stopPropagation(); setTapper(t); }}
                style={{
                  width:"100%", height:42, background:`linear-gradient(90deg,rgba(212,175,55,0.20),rgba(212,175,55,0.11))`,
                  border:"none", borderTop:`1px solid ${C.gold}44`,
                  color:C.gold, fontSize:13, fontWeight:900, letterSpacing:"0.12em",
                  cursor:"pointer", fontFamily:C.sans, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                }}>
                <Icon d={PATHS.star} size={13} color={C.gold} />
                OPEN TICKET TAPPER
                <Icon d={PATHS.star} size={13} color={C.gold} />
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {/* Stats strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", background:C.glass2, border:`1px solid ${C.chrome}`, borderRadius:7, marginTop:7, flexShrink:0, overflow:"hidden" }}>
        {[
          { l:"ACTIVE TABLES",   v:"12"               },
          { l:"VIP TABLES",      v:"4"                },
          { l:"AVERAGE TIME",    v:hhmm(avgMs)         },
          { l:"TOTAL TAB VALUE", v:`$${totVal.toFixed(2)}` },
        ].map((s,i)=>(
          <div key={s.l} style={{ padding:"9px 10px", textAlign:"center", borderRight:i<3?`1px solid ${C.chrome}`:"none" }}>
            <div style={{ fontSize:15, fontWeight:900, color:C.amber }}>{s.v}</div>
            <div style={{ fontSize:8, color:C.muted, letterSpacing:"0.16em", textTransform:"uppercase", marginTop:3 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {tapper && <TapperModal key={tapper.id} ticket={tapper} onClose={()=>setTapper(null)} onUpdate={items=>onUpdate(tapper.id,items)} />}
      </AnimatePresence>
    </div>
  );
}

// ── Column 3: Active Ledger ───────────────────────────────────────────────────
function LedgerCol({ tickets, activeId, onRemove }: { tickets:Ticket[]; activeId:string; onRemove:(tid:string,iid:string)=>void; }) {
  const t = tickets.find(t=>t.id===activeId) ?? tickets[0];
  if (!t) return null;
  const sub = t.items.reduce((s,i)=>s+i.price*i.qty,0);
  const tax = sub*.085;
  const tot = sub+tax;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:9, flexShrink:0, marginBottom:8 }}>
        <Badge n={3} />
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:C.white, letterSpacing:"0.05em" }}>ACTIVE LEDGER</div>
          <div style={{ fontSize:8, fontFamily:C.mono, color:C.gold, letterSpacing:"0.26em", textTransform:"uppercase" }}>PERSISTENT LINE ITEMS</div>
        </div>
      </div>

      {/* Table ID card */}
      <div style={panel({ borderTop:`2px solid ${C.gold}`, padding:"11px 13px", marginBottom:8, flexShrink:0 })}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <span style={{ fontSize:14, fontWeight:800, color:C.white }}>{t.label}</span>
            {t.vip && <VIP />}
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:9, color:C.muted, letterSpacing:"0.18em" }}>BALANCE</div>
            <motion.div animate={{ color:[C.amber,"#FFD700",C.amber] }} transition={{ duration:2.4, repeat:Infinity }}
              style={{ fontSize:20, fontWeight:900 }}>${tot.toFixed(2)}</motion.div>
          </div>
        </div>
        <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{t.guest}</div>
      </div>

      {/* LINE ITEMS label */}
      <div style={{ fontSize:9, fontFamily:C.mono, color:C.muted, letterSpacing:"0.24em", textTransform:"uppercase", marginBottom:5, paddingLeft:2, flexShrink:0 }}>LINE ITEMS</div>

      {/* Item rows */}
      <div style={{ ...panel(), flex:1, overflowY:"auto", padding:"2px 0", marginBottom:7 }}>
        <AnimatePresence>
          {t.items.length===0 && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}}
              style={{ padding:"24px", textAlign:"center", color:C.muted, fontSize:13 }}>Ticket cleared.</motion.div>
          )}
          {t.items.map((item,idx)=>(
            <motion.div key={item.id} layout initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10,height:0,overflow:"hidden"}}
              style={{ display:"flex", alignItems:"center", gap:9, padding:"10px 12px", borderBottom:idx<t.items.length-1?`1px solid ${C.chrome}`:"none" }}>
              {/* Product thumbnail */}
              <div style={{ width:38, height:38, borderRadius:6, flexShrink:0, border:`1px solid ${C.chrome}`,
                background: item.img ? `url(${item.img}) center/cover no-repeat,#1A1A1A` : "linear-gradient(135deg,#2A1810,#111)" }} />
              {/* Qty badge */}
              <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0, background:`linear-gradient(135deg,${C.gold},#A67C00)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:"#000" }}>{item.qty}x</div>
              {/* Name */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.white, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</div>
                <div style={{ fontSize:10, color:C.muted, fontStyle:"italic" }}>{item.brand}</div>
              </div>
              {/* Price */}
              <div style={{ fontSize:13, fontWeight:700, color:C.white, minWidth:42, textAlign:"right" }}>${item.price.toFixed(2)}</div>
              {/* Remove */}
              <motion.button whileTap={{scale:0.84}} {...T} onClick={()=>onRemove(t.id,item.id)}
                style={{ width:26,height:26,borderRadius:"50%",background:C.goldDim,border:`1px solid ${C.gold}44`,color:C.gold,fontSize:13,lineHeight:"24px",textAlign:"center",cursor:"pointer",flexShrink:0 }}>x</motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Totals + actions */}
      <div style={panel({ padding:"13px 13px 0", flexShrink:0 })}>
        {[{l:"SUBTOTAL",v:sub},{l:"TAX",v:tax}].map(r=>(
          <div key={r.l} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ fontSize:12, color:C.muted, letterSpacing:"0.14em" }}>{r.l}</span>
            <span style={{ fontSize:12, color:C.white }}>${r.v.toFixed(2)}</span>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", padding:"9px 0 11px", borderTop:`1px solid ${C.chrome}` }}>
          <span style={{ fontSize:17, fontWeight:900, color:C.white, letterSpacing:"0.05em" }}>TOTAL</span>
          <span style={{ fontSize:22, fontWeight:900, color:C.amber }}>${tot.toFixed(2)}</span>
        </div>

        <motion.button whileTap={{scale:0.97}} {...T}
          style={{ width:"100%",height:42,marginBottom:8,background:"rgba(255,255,255,0.04)",border:`1px solid ${C.chrome}`,borderRadius:8,color:C.cream,fontSize:12,fontWeight:800,letterSpacing:"0.14em",cursor:"pointer",fontFamily:C.sans,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          <Icon d={PATHS.receipt} size={14} color={C.cream} />
          VIEW FULL LEDGER
          <span style={{ color:C.gold }}>›</span>
        </motion.button>

        <motion.button whileTap={{scale:0.97}} {...T}
          style={{ width:"100%",height:52,marginBottom:12,background:`linear-gradient(135deg,${C.gold},#A67C00)`,border:"none",borderRadius:8,color:"#000",fontSize:14,fontWeight:900,letterSpacing:"0.10em",cursor:"pointer",fontFamily:C.sans,boxShadow:`0 0 24px ${C.goldGlo}`,display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
          <Icon d={PATHS.credit} size={17} color="#000" />
          PROCESS PAYMENT
        </motion.button>
      </div>
    </div>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
const STAFF_DATA = [
  { name:"Alex R.",    role:"Manager",   dot:C.green  },
  { name:"Jasmine L.", role:"Server",    dot:C.green  },
  { name:"Marco B.",   role:"Bartender", dot:C.green  },
  { name:"Tanya G.",   role:"Runner",    dot:C.green  },
  { name:"Devon H.",   role:"Host",      dot:C.green  },
];

const SYS = [
  { icon:PATHS.leaf,    label:"HUMIDOR", status:"Optimal",   color:C.green  },
  { icon:PATHS.cocktail,label:"BAR",     status:"Normal",    color:C.green  },
  { icon:PATHS.utensils,label:"KITCHEN", status:"Busy",      color:C.orange },
  { icon:PATHS.signal,  label:"NETWORK", status:"Excellent", color:C.green  },
];

function Footer() {
  return (
    <div style={{ flexShrink:0, height:118, background:C.dark, borderTop:`1px solid ${C.chrome}`, display:"grid", gridTemplateColumns:"1fr 1fr 1fr" }}>

      {/* Staff on Floor */}
      <div style={{ padding:"10px 16px", borderRight:`1px solid ${C.chrome}` }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
          <span style={{ fontSize:10, fontFamily:C.mono, color:C.gold, letterSpacing:"0.26em", textTransform:"uppercase" }}>STAFF ON FLOOR</span>
          <span style={{ fontSize:10, color:C.muted, cursor:"pointer", letterSpacing:"0.12em" }}>VIEW ALL ›</span>
        </div>
        <div style={{ display:"flex", gap:12, alignItems:"flex-end" }}>
          {STAFF_DATA.map(s=>(
            <div key={s.name} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
              <div style={{ position:"relative" }}>
                <div style={{ width:38, height:38, borderRadius:"50%", background:"linear-gradient(135deg,#3D2B1F,#1A120A)", border:`2px solid ${C.chrome}`, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Icon d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" size={22} color={C.muted} />
                </div>
                <div style={{ position:"absolute", bottom:1, right:1, width:9, height:9, borderRadius:"50%", background:s.dot, border:`1.5px solid ${C.dark}` }} />
              </div>
              <div style={{ fontSize:10, color:C.cream, textAlign:"center", lineHeight:1.2, maxWidth:44, fontWeight:600 }}>{s.name}</div>
              <div style={{ fontSize:9, color:C.muted, textAlign:"center" }}>{s.role}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Venue Insights */}
      <div style={{ padding:"10px 16px", borderRight:`1px solid ${C.chrome}` }}>
        <div style={{ fontSize:10, fontFamily:C.mono, color:C.gold, letterSpacing:"0.26em", textTransform:"uppercase", marginBottom:8 }}>VENUE INSIGHTS</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10 }}>
          {[
            { l:"SALES/HOUR",     v:"$2,847", s:"+18% vs last hour", c:C.green },
            { l:"AVG CHECK",      v:"$86.40",  s:"+12% vs last hour", c:C.green },
            { l:"TOP CATEGORY",   v:"Cognac",  s:"38% of sales",      c:C.amber },
            { l:"PAIRING SUCCESS",v:"92%",     s:"High Impact",       c:C.green },
          ].map(m=>(
            <div key={m.l}>
              <div style={{ fontSize:17, fontWeight:900, color:m.c, lineHeight:1 }}>{m.v}</div>
              <div style={{ fontSize:9, color:C.muted, letterSpacing:"0.14em", textTransform:"uppercase", margin:"3px 0 2px" }}>{m.l}</div>
              <div style={{ fontSize:9, color:m.c }}>{m.s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div style={{ padding:"10px 16px" }}>
        <div style={{ fontSize:10, fontFamily:C.mono, color:C.gold, letterSpacing:"0.26em", textTransform:"uppercase", marginBottom:8 }}>SYSTEM STATUS</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
          {SYS.map(s=>(
            <div key={s.label} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <div style={{ width:36, height:36, borderRadius:8, background:`${s.color}1a`, border:`1px solid ${s.color}44`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon d={s.icon} size={18} color={s.color} />
              </div>
              <div style={{ fontSize:10, color:s.color, fontWeight:700, textAlign:"center" }}>{s.status}</div>
              <div style={{ fontSize:8, color:C.muted, letterSpacing:"0.14em", textAlign:"center" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function StaffTerminal({ onBack: onBackProp }: { onBack?: () => void } = {}) {
  const [, navigate] = useLocation();
  const back = onBackProp ?? (() => navigate("/craft-hub"));

  const [tickets, setTickets] = useState<Ticket[]>(SEED);
  const [activeId, setActiveId] = useState<string>(SEED[0].id);

  const handleUpdate = useCallback((id:string, items:Item[]) => {
    setTickets(prev => prev.map(t => t.id===id ? {...t, items} : t));
  }, []);

  const handleRemove = useCallback((tid:string, iid:string) => {
    setTickets(prev => prev.map(t => t.id===tid ? {...t, items:t.items.filter(i=>i.id!==iid)} : t));
  }, []);

  return (
    <div style={{ position:"fixed", inset:0, background:C.base, display:"flex", flexDirection:"column", fontFamily:C.sans, overflow:"hidden", backgroundImage:"radial-gradient(ellipse 100% 35% at 50% 0%,rgba(212,175,55,0.05),transparent 60%)" }}>
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", boxShadow:"inset 0 0 110px rgba(0,0,0,0.70)", zIndex:0 }} />

      <div style={{ position:"relative", zIndex:2 }}><Header /></div>

      <div style={{ flex:1, display:"flex", overflow:"hidden", position:"relative", zIndex:1 }}>
        <NavRail onBack={back} />
        <div style={{ flex:1, display:"grid", gridTemplateColumns:"296px 1fr 276px", gap:10, padding:"10px 12px 10px 10px", overflow:"hidden" }}>
          <TelemetryCol />
          <TicketsCol tickets={tickets} activeId={activeId} onSelect={setActiveId} onUpdate={handleUpdate} />
          <LedgerCol   tickets={tickets} activeId={activeId} onRemove={handleRemove} />
        </div>
      </div>

      <div style={{ position:"relative", zIndex:2 }}><Footer /></div>
    </div>
  );
}
