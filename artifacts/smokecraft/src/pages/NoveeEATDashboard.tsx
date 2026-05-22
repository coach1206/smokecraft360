/**
 * EATDashboard — E.A.T. System Hospitality OS
 * Ivory Cream + Solid Obsidian aesthetic — matches reference screenshot v6
 * ZERO GLYPH / ZERO EMOJI mandate enforced throughout
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "@/lib/socket";
import { useNoveeGuest } from "@/contexts/NoveeGuestProfileContext";
import {
  eatEngine,
  type EnvironmentState,
  type InventoryProduct,
  type CheckoutRequest,
} from "@/lib/eatEngine";
import type { EATModuleFlags } from "@/pages/NoveeExecutiveCommandCenter";

const BASE = import.meta.env.BASE_URL;
const IMG  = (n: string) => `${BASE}images/${n}`;

// ── Design tokens ─────────────────────────────────────────────────────────────
const IVORY   = "#F4F3EF";
const OBSID   = "#010101";
const AMBER   = "#D4AF37";
const AMBER2  = "#C4860A";
const GREEN   = "#2E7D4F";
const RED_CLR = "#C0392B";
const TEXT1   = "#1A1208";
const TEXT2   = "#5A4020";
const TEXT3   = "#8E8E93";
const BORDER  = "#E5DFD0";
const PAGE_BG = "#EDE8DA";
const CARD_BG = "#FAFAF6";

// ── Navigation ────────────────────────────────────────────────────────────────
const TOP_TABS = [
  "Command Center","Assets","Transactions","Pairing Engine","Analytics","Staff","Venue Intelligence",
] as const;
type TopTab = (typeof TOP_TABS)[number];

const EAT_TAB_SLUG_MAP: Record<string, TopTab> = {
  "command-center": "Command Center",
  "assets":         "Assets",
  "transactions":   "Transactions",
  "pairing-engine": "Pairing Engine",
  "analytics":      "Analytics",
  "staff":          "Staff",
  "venue-intelligence": "Venue Intelligence",
};

function eatTabToSlug(tab: TopTab): string {
  return tab.toLowerCase().replace(/\s+/g, "-");
}
function parseEATTabFromSearch(search: string): TopTab {
  try {
    const p = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const r = p.get("tab");
    if (r && r in EAT_TAB_SLUG_MAP) return EAT_TAB_SLUG_MAP[r];
  } catch { /* ignore */ }
  return "Command Center";
}

// ── Static data ───────────────────────────────────────────────────────────────
const STATIC_DEVICES = [
  { id:"T-B01", name:"Tablet 01", zone:"B01", battery:100, online:true  },
  { id:"T-B02", name:"Tablet 02", zone:"B02", battery:85,  online:true  },
  { id:"T-B03", name:"Tablet 03", zone:"B03", battery:73,  online:true  },
  { id:"T-B04", name:"Tablet 04", zone:"B04", battery:92,  online:true  },
  { id:"T-B05", name:"Tablet 05", zone:"B05", battery:65,  online:true  },
  { id:"T-B06", name:"Tablet 06", zone:"B06", battery:100, online:true  },
  { id:"T-B07", name:"Tablet 07", zone:"B07", battery:58,  online:false },
  { id:"T-B08", name:"Tablet 08", zone:"B08", battery:41,  online:true  },
];

const FEATURED_CIGAR = {
  name:"Rocky Patel Vintage 1992", type:"Maduro", origin:"Nicaragua",
  body:"Full Bodied", strength:4, rating:4, price:42,
  description:"Rich, bold and complex. Notes of espresso, dark chocolate, earth and black pepper with a long creamy finish.",
  imageUrl: undefined as string | undefined,
};
const PAIRINGS = [
  { name:"Rocky Patel Vintage 1992", sub:"cigar",   notes:"Rich · Dried Fruit · Oak", price:42 },
  { name:"Buffalo Trace Bourbon",    sub:"alcohol",  notes:"Artisan · cocktail",       price:18 },
  { name:"Maker's Mark Bourbon",     sub:"alcohol",  notes:"Chef feature tonight",     price:16 },
];

const STAFF_ROSTER = [
  { name:"Sofia R.",  role:"Lead Sommelier",   status:"online",  tables:"7–14",  sales:1240 },
  { name:"Jordan K.", role:"Lounge Attendant", status:"online",  tables:"3–6",   sales:890  },
  { name:"Dev P.",    role:"Bartender",        status:"online",  tables:"Bar",   sales:760  },
  { name:"Amy L.",    role:"Hostess",          status:"break",   tables:"Entry", sales:0    },
  { name:"Chris M.",  role:"Lounge Attendant", status:"offline", tables:"—",     sales:0    },
];
const ASSET_CATALOG = [
  { name:"Rocky Patel Vintage 1992",  cat:"Cigars",      sku:"RVP-92",  stock:24, min:10, price:42  },
  { name:"Cohiba Behike BHK 52",      cat:"Cigars",      sku:"COH-BHK", stock:8,  min:10, price:118 },
  { name:"Ashton VSG Torpedo",        cat:"Cigars",      sku:"ASH-VSG", stock:18, min:8,  price:38  },
  { name:"Davidoff Millennium Blend", cat:"Cigars",      sku:"DAV-MIL", stock:6,  min:10, price:52  },
  { name:"Buffalo Trace Bourbon",     cat:"Spirits",     sku:"BTR-001", stock:12, min:6,  price:18  },
  { name:"Remy Martin XO",            cat:"Spirits",     sku:"RMY-XO",  stock:3,  min:4,  price:48  },
  { name:"Hennessy VSOP",             cat:"Spirits",     sku:"HEN-VSP", stock:9,  min:5,  price:22  },
  { name:"Premium Cutter Set",        cat:"Accessories", sku:"ACC-CUT", stock:14, min:5,  price:28  },
];
const TXN_LOG = [
  { id:"T-2847", table:7,  items:"Rocky Patel + Bourbon",      total:82,  status:"closed", ago:"8m"     },
  { id:"T-2846", table:12, items:"Cohiba BHK + XO Cognac",     total:248, status:"open",   ago:"14m"    },
  { id:"T-2845", table:3,  items:"Ashton VSG + Espresso",      total:58,  status:"closed", ago:"31m"    },
  { id:"T-2844", table:9,  items:"Davidoff + Aged Rum",        total:96,  status:"open",   ago:"47m"    },
  { id:"T-2843", table:5,  items:"Padron 1964 + Hendricks",    total:112, status:"closed", ago:"1h"     },
  { id:"T-2842", table:11, items:"Rocky Patel + Maker's Mark", total:74,  status:"closed", ago:"1h 12m" },
];
const PAIRING_RECS = [
  { name:"Buffalo Trace Bourbon",  type:"Whiskey",    match:94, notes:"Caramel · Oak · Vanilla",       price:18, img:IMG("pour/pour_whiskey.png"),  gradient:"135deg,#2C1800,#4A2A10" },
  { name:"Remy Martin XO",         type:"Cognac",     match:88, notes:"Dried Fruit · Vanilla · Spice", price:48, img:IMG("pour/pour_aged.png"),     gradient:"135deg,#1A0E08,#3A1E0E" },
  { name:"Blue Mountain Coffee",   type:"Coffee",     match:82, notes:"Earthy · Roasted · Bold",       price:9,  img:IMG("pour/pour_bar.png"),      gradient:"135deg,#3D2008,#5A3010" },
  { name:"Dark Chocolate Truffle", type:"Confection", match:76, notes:"Bitter · Sweet · Rich",         price:12, img:IMG("pour/pour_cocktail.png"), gradient:"135deg,#1A0A04,#2D120A" },
  { name:"Hennessy VSOP",          type:"Cognac",     match:71, notes:"Floral · Toasted Oak · Citrus", price:22, img:IMG("pour/pour_tasting.png"), gradient:"135deg,#1E1208,#3A2010" },
  { name:"Single Origin Espresso", type:"Coffee",     match:68, notes:"Bold · Smoky · Nutty",          price:7,  img:IMG("pour/pour_bar.png"),      gradient:"135deg,#2C1800,#4A2A0A" },
];
const WEEKLY_REV = [
  { day:"Mon", pct:72 },{ day:"Tue", pct:63 },{ day:"Wed", pct:92 },{ day:"Thu", pct:81 },
  { day:"Fri", pct:100},{ day:"Sat", pct:94 },{ day:"Sun", pct:60 },
];
const TOP_PRODS = [
  { name:"Rocky Patel Vintage 1992", sold:47, rev:1974 },
  { name:"Cohiba Behike BHK 52",     sold:23, rev:2714 },
  { name:"Buffalo Trace Bourbon",    sold:64, rev:1152 },
  { name:"Ashton VSG Torpedo",       sold:31, rev:1178 },
  { name:"Remy Martin XO",           sold:18, rev:864  },
];

interface FloorTable { id:number|string; x:number; y:number; vip:boolean; active:boolean; guests:number; }
const INITIAL_TABLES: FloorTable[] = [
  { id:101, x:8,  y:6,  vip:false, active:false, guests:0 },
  { id:102, x:43, y:6,  vip:false, active:true,  guests:2 },
  { id:103, x:25, y:26, vip:false, active:true,  guests:3 },
  { id:104, x:62, y:6,  vip:false, active:false, guests:0 },
  { id:105, x:8,  y:46, vip:false, active:false, guests:0 },
  { id:106, x:62, y:46, vip:false, active:true,  guests:4 },
  { id:107, x:43, y:28, vip:false, active:false, guests:0 },
  { id:108, x:62, y:28, vip:false, active:true,  guests:2 },
  { id:109, x:8,  y:34, vip:false, active:false, guests:0 },
  { id:110, x:25, y:58, vip:false, active:false, guests:0 },
  { id:111, x:62, y:68, vip:false, active:false, guests:0 },
  { id:112, x:8,  y:66, vip:false, active:false, guests:0 },
  { id:"VIP1", x:34, y:50, vip:true, active:true, guests:5 },
];

interface TabRecord {
  id:string; name:string; guests:number; server:string;
  tableNumber:string; total:number; tax:number;
  items:{ name:string; qty:number; price:number }[];
}
const STATIC_TABS: TabRecord[] = [
  { id:"t1", name:"John D.", guests:3, server:"Alex T.", tableNumber:"103", total:248.75, tax:18.75,
    items:[
      { name:"Rocky Patel Vintage 1992", qty:1, price:42 },
      { name:"Buffalo Trace Bourbon",    qty:2, price:18 },
      { name:"Wagyu Sliders",            qty:1, price:32 },
      { name:"Smoked Old Fashioned",     qty:2, price:18 },
    ] },
  { id:"t2", name:"Marcus B.", guests:2, server:"Sam K.",   tableNumber:"104",  total:340, tax:0, items:[] },
  { id:"t3", name:"Elena R.",  guests:4, server:"Alex T.",  tableNumber:"107",  total:198, tax:0, items:[] },
  { id:"t4", name:"David C.",  guests:2, server:"Chris M.", tableNumber:"108",  total:127, tax:0, items:[] },
  { id:"t5", name:"Group VIP", guests:5, server:"Alex T.",  tableNumber:"VIP1", total:820, tax:0, items:[] },
];

const MUSIC_OPTIONS  = ["Smooth Jazz","Neo-Soul","Ambient Lounge","Classical","Upbeat Jazz"];
const SCENT_OPTIONS  = ["Leather & Oak","Cedar & Vanilla","Aged Oak","Sandalwood","Citrus & Cedar"];
const PRESET_OPTIONS = ["Warm Lounge","VIP Experience","Ceremony Mode","Late Night","Service Mode"];

const BOT_NAV = [
  { label:"MENU",         img:IMG("lounge_bg.jpg"),      active:false },
  { label:"RESERVATIONS", img:IMG("lounge-bg.png"),      active:false },
  { label:"EVENTS",       img:IMG("cigar_hero.jpg"),     active:false },
  { label:"E.A.T",        img:IMG("cigar_hero.jpg"),     active:true  },
  { label:"MESSAGES",     img:IMG("pour-1.jpg"),         active:false },
  { label:"REPORTS",      img:IMG("pourcraft-card.jpg"), active:false },
  { label:"SETTINGS",     img:IMG("lounge-bg.jpg"),      active:false },
];

type PanelVis = "on"|"muted"|"hidden";
interface EATDashboardProps { eatFlags?: EATModuleFlags; onBack?: () => void; }

// ── Micro-components (zero-glyph) ─────────────────────────────────────────────

function PulseDot({ color=GREEN }: { color?:string }) {
  return (
    <motion.div
      animate={{ scale:[1,1.45,1], opacity:[1,0.4,1] }}
      transition={{ duration:1.7, repeat:Infinity }}
      style={{ width:7, height:7, borderRadius:"50%", background:color, flexShrink:0 }}
    />
  );
}

function BattBar({ pct }: { pct:number }) {
  const c = pct > 60 ? GREEN : pct > 30 ? AMBER2 : RED_CLR;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
      <div style={{ display:"flex", alignItems:"center" }}>
        <div style={{ width:22, height:8, borderRadius:"2px 0 0 2px", overflow:"hidden", border:`1px solid ${BORDER}`, borderRight:"none", background:"rgba(0,0,0,0.07)" }}>
          <div style={{ width:`${pct}%`, height:"100%", background:c, transition:"width 0.5s" }} />
        </div>
        <div style={{ width:3, height:5, borderRadius:"0 1px 1px 0", background:BORDER }} />
      </div>
      <span style={{ fontSize:11, fontWeight:700, color:c }}>{pct}%</span>
    </div>
  );
}

function RatingDots({ v, max=5 }: { v:number; max?:number }) {
  return (
    <div style={{ display:"flex", gap:3 }}>
      {Array.from({length:max},(_,i)=>(
        <div key={i} style={{
          width:13, height:13, borderRadius:2,
          background: i < v ? AMBER : "rgba(212,175,55,0.15)",
          border:`1px solid ${i < v ? AMBER : "rgba(212,175,55,0.22)"}`,
        }} />
      ))}
    </div>
  );
}

function StrengthDots({ v, max=5 }: { v:number; max?:number }) {
  return (
    <div style={{ display:"flex", gap:5 }}>
      {Array.from({length:max},(_,i)=>(
        <div key={i} style={{
          width:14, height:14, borderRadius:"50%",
          background: i < v ? AMBER : "rgba(212,175,55,0.15)",
          border:`1.5px solid ${i < v ? AMBER : "rgba(212,175,55,0.22)"}`,
        }} />
      ))}
    </div>
  );
}

function KineticSlider({ value, onChange }: { value:number; onChange:(v:number)=>void }) {
  const pct = value;
  return (
    <div style={{ position:"relative", height:12, borderRadius:6, background:"#F4F3EF", cursor:"pointer", boxShadow:"inset 0 1px 3px rgba(0,0,0,0.12)" }}>
      <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${AMBER},${AMBER2})`, borderRadius:6 }} />
      <input type="range" min={0} max={100} value={value} onChange={e=>onChange(Number(e.target.value))}
        style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0, cursor:"pointer", margin:0 }} />
      <div style={{ position:"absolute", top:"50%", left:`${pct}%`, transform:"translate(-50%,-50%)", width:28, height:28, borderRadius:"50%", background:IVORY, border:"1px solid #2C2C30", boxShadow:"0 3px 8px rgba(0,0,0,0.22)", pointerEvents:"none" }} />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function EATDashboard({ eatFlags: _eatFlags }: EATDashboardProps) {
  const { profile, setPhase } = useNoveeGuest();
  const venueId = (profile as { venueId?: string }).venueId ?? localStorage.getItem("axiom_venue_id") ?? "default";
  const [activeTab, setTabState] = useState<TopTab>(() => parseEATTabFromSearch(window.location.search));
  const setActiveTab = useCallback((t: TopTab) => {
    setTabState(t);
    const url = new URL(window.location.href);
    t === "Command Center" ? url.searchParams.delete("tab") : url.searchParams.set("tab", eatTabToSlug(t));
    window.history.replaceState({}, "", url.toString());
  }, []);
  useEffect(() => {
    const h = () => setTabState(parseEATTabFromSearch(window.location.search));
    window.addEventListener("popstate", h);
    return () => window.removeEventListener("popstate", h);
  }, []);

  const [, setPanelVis]    = useState<{environment:PanelVis;asset:PanelVis;transaction:PanelVis}>({ environment:"on", asset:"on", transaction:"on" });
  const [wsConnected, setWsConnected] = useState(socket.connected);
  const [envState, setEnvState]       = useState<EnvironmentState>(eatEngine.getEnvironment());
  const [, setLiveInv]                = useState<InventoryProduct[]>([]);
  const [devices, setDevices]         = useState(STATIC_DEVICES);
  const [floorTables, setFloorTables] = useState<FloorTable[]>(INITIAL_TABLES);
  const [floorView, setFloorView]     = useState<"Floor Plan"|"List View">("Floor Plan");
  const [dragging, setDragging]       = useState<string|number|null>(null);
  const dragOff  = useRef({ x:0, y:0 });
  const floorRef = useRef<HTMLDivElement>(null);
  const [activeTabs, setActiveTabs]   = useState<TabRecord[]>(STATIC_TABS);
  const [selTabId, setSelTabId]       = useState(STATIC_TABS[0].id);
  type OrderRow = { id:string; tableNumber:string; items:{name:string;qty:number;price:number}[]; total:number; status:string; createdAt:string };
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);
  const [featuredCigar, setFeaturedCigar] = useState(FEATURED_CIGAR);
  const [livePairings, setLivePairings]   = useState(PAIRINGS);
  const [envPreset, setEnvPreset]   = useState(PRESET_OPTIONS[0]);
  const [lighting, setLighting]     = useState(65);
  const [musicMode, setMusicMode]   = useState(MUSIC_OPTIONS[0]);
  const [scentMode, setScentMode]   = useState(SCENT_OPTIONS[0]);
  const [scentPct, setScentPct]     = useState(40);
  const [pairingIdx, setPairingIdx] = useState(0);
  const [isCommandCenterOpen, setIsCommandCenterOpen] = useState(false);
  const [highReadabilityMode, setHighReadabilityMode] = useState(false);
  const [toastMsg, setToastMsg] = useState<string|null>(null);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffList, setStaffList] = useState(() => STAFF_ROSTER.map(s => ({ ...s })));
  const [newStaff, setNewStaff] = useState({ name:"", role:"", tables:"", status:"online" as "online"|"break"|"offline" });
  const [activeModule, setActiveModule] = useState<string>("E.A.T");
  const [cmdSubSection, setCmdSubSection] = useState<"overview"|"kitchen"|"humidor"|"bar">("overview");
  const [tableDelegations, setTableDelegations] = useState<Record<string, string>>({});
  const [delegateTarget, setDelegateTarget] = useState<number|null>(null);
  const [broadcastModal, setBroadcastModal] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ product:"", price:"", message:"", timer:30 });
  const [activeBroadcast, setActiveBroadcast] = useState<null|{product:string;price:string;message:string;expiresAt:number}>(null);
  const [ticketTapper, setTicketTapper] = useState<null|{name:string;sub:string;price:number;notes:string}>(null);
  const [productEditModal, setProductEditModal] = useState(false);
  const [productEditForm, setProductEditForm] = useState({ name:FEATURED_CIGAR.name, price:String(FEATURED_CIGAR.price), description:FEATURED_CIGAR.description });
  const [tabletMonitor, setTabletMonitor] = useState<null|{id:string;name:string;zone:string}>(null);
  const [analyticsSubTab, setAnalyticsSubTab] = useState<"overview"|"contest"|"vault"|"reconciliation">("overview");
  const [tableFilter, setTableFilter] = useState<string|null>(null);

  // ── E.A.T. VI — Venue Intelligence state ───────────────────────────────────
  interface VIServiceSignal   { table:string; signal:string; urgency:"HIGH"|"MED"|"LOW" }
  interface VIStaffDeployment { zone:string; action:string; priority:"URGENT"|"STANDARD"|"NOMINAL" }
  interface VIOccupancy       { table:string; forecast:string; eta:string }
  interface VIData {
    score:number; risk:string; activeSessions:number; engagementLevel:string;
    serviceSignals:VIServiceSignal[]; staffDeployment:VIStaffDeployment[];
    occupancyForecast:VIOccupancy[]; activeScene:string; sceneOptions:string[];
    orchestrationStatus:string; revenueSignal:string; lastSync:string;
  }
  const VI_DEFAULTS: VIData = {
    score:0.485, risk:"high", activeSessions:4, engagementLevel:"BUILDING",
    serviceSignals:[
      { table:"Table 4",  signal:"Guests flagged — 40 min no order",   urgency:"HIGH" },
      { table:"VIP 1",    signal:"Upsell window open — 82% taste match",urgency:"MED"  },
      { table:"Table 2",  signal:"Check-in recommended soon",           urgency:"LOW"  },
    ],
    staffDeployment:[
      { zone:"Main Lounge",  action:"Deploy server — 3 tables unattended", priority:"URGENT"   },
      { zone:"VIP Section",  action:"Sommelier recommended for new party",  priority:"STANDARD" },
      { zone:"Humidor Bar",  action:"Maintain current coverage",            priority:"NOMINAL"  },
    ],
    occupancyForecast:[
      { table:"Table 1", forecast:"Departure likely",        eta:"~15 min" },
      { table:"Table 3", forecast:"Extended stay expected",   eta:">60 min" },
      { table:"Table 6", forecast:"Turnover imminent",        eta:"~8 min"  },
    ],
    activeScene:"Smokecraft Dimmed Lounge",
    sceneOptions:["Deep Lounge","VIP Reserve","Bright Service","Closing Ritual"],
    orchestrationStatus:"ACTIVE", revenueSignal:"UPSELL WINDOW", lastSync:"just now",
  };
  const [viData, setViData]       = useState<VIData>(VI_DEFAULTS);
  const [viFetching, setViFetching] = useState(false);

  useEffect(() => {
    if (activeTab !== "Venue Intelligence") return;
    setViFetching(true);
    const vid = venueId;
    fetch(`/api/intelligence/hospitality/${encodeURIComponent(vid)}`)
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then((h: Record<string,unknown> | null) => {
        if (!h) return;
        setViData(prev => ({
          ...prev,
          score:             typeof h.score === "number"            ? h.score             : prev.score,
          risk:              typeof h.risk  === "string"            ? h.risk              : prev.risk,
          activeSessions:    typeof h.activeSessions === "number"   ? h.activeSessions    : prev.activeSessions,
          engagementLevel:   typeof h.engagementLevel === "string"  ? h.engagementLevel   : prev.engagementLevel,
          serviceSignals:    Array.isArray(h.serviceSignals)  && h.serviceSignals.length  ? h.serviceSignals  as typeof prev.serviceSignals  : prev.serviceSignals,
          staffDeployment:   Array.isArray(h.staffDeployment) && h.staffDeployment.length ? h.staffDeployment as typeof prev.staffDeployment : prev.staffDeployment,
          occupancyForecast: Array.isArray(h.occupancyForecast) && h.occupancyForecast.length ? h.occupancyForecast as typeof prev.occupancyForecast : prev.occupancyForecast,
          orchestrationStatus: typeof h.orchestrationStatus === "string" ? h.orchestrationStatus : prev.orchestrationStatus,
          revenueSignal:     typeof h.revenueSignal === "string"    ? h.revenueSignal     : prev.revenueSignal,
          lastSync:          new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"}),
        }));
      })
      .finally(() => setViFetching(false));
  }, [activeTab, venueId]);

  function activateVIScene(sceneName: string) {
    setViData(prev => ({ ...prev, activeScene: sceneName }));
    fetch("/api/intelligence/scene", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ venueId, sceneId: sceneName.toLowerCase().replace(/\s+/g,"_"), triggeredBy:"eat_vi_panel" }),
    }).catch(()=>{});
  }
  const [clock, setClock] = useState(() => {
    const d = new Date();
    return d.toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"}).toUpperCase() + " | " + d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  });

  useEffect(() => {
    const tick = setInterval(() => {
      const d = new Date();
      setClock(d.toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"}).toUpperCase() + " | " + d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));
    }, 30000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    eatEngine.start();
    const unsubInv = eatEngine.subscribeInventory(setLiveInv);
    const unsubEnv = eatEngine.subscribeEnvironment(setEnvState);
    const onConn    = () => setWsConnected(true);
    const onDisconn = () => setWsConnected(false);
    const onPV = (d: Partial<{environment:PanelVis;asset:PanelVis;transaction:PanelVis}>) => setPanelVis(prev => ({ ...prev, ...d }));
    socket.on("connect", onConn); socket.on("disconnect", onDisconn); socket.on("panel_visibility", onPV);
    const token = localStorage.getItem("axiom_token") ?? "";
    const hdr = (t:string): Record<string,string> => t ? { Authorization:`Bearer ${t}` } : {};
    const vId  = venueId;

    fetch("/api/admin/panel-config", { headers:hdr(token) }).then(r=>r.ok?r.json():null).then(d=>{ if(d) setPanelVis(p=>({...p,...d})); }).catch(()=>{});

    const fetchDevices = () => {
      fetch(`/api/devices/venue/${encodeURIComponent(vId)}`, { headers:hdr(token) }).then(r=>r.ok?r.json():null).then(d=>{
        if (Array.isArray(d) && d.length>0) {
          setDevices(d.slice(0,8).map((dev:Record<string,unknown>,i:number)=>({
            id:String(dev.id??`T-B0${i+1}`), name:String(dev.nickname??`Tablet 0${i+1}`), zone:String(dev.zone??`B0${i+1}`),
            battery:typeof dev.battery==="number"?dev.battery:100, online:dev.status==="active",
          })));
        }
      }).catch(()=>{});
    };
    fetchDevices();
    const devicePoll = setInterval(fetchDevices, 30000);

    fetch(`/api/pairing-engine/suggest`, { headers:hdr(token) }).then(r=>r.ok?r.json():null).then(d=>{
      if(d && typeof d==="object") {
        const rec = d as Record<string,unknown>;
        const suggestions: unknown[] = Array.isArray(rec.suggestions)?rec.suggestions:Array.isArray(rec.recommendations)?rec.recommendations:[];
        const item = (suggestions[0]??rec) as Record<string,unknown>;
        if (item && item.name) {
          setFeaturedCigar(prev=>({...prev, name:String(item.name??prev.name), body:String(item.body??item.wrapper??prev.body),
            origin:String(item.origin??item.country??prev.origin), type:String(item.type??item.brand??prev.type),
            description:String(item.description??item.flavorNotes??prev.description), strength:Number(item.strength??prev.strength),
            rating:Number(item.rating??item.score??prev.rating),
            price:item.costCents!=null?Math.round(Number(item.costCents)/100):item.price!=null?Number(item.price):prev.price,
            imageUrl:(item.imageUrl&&!/^https?:\/\//i.test(String(item.imageUrl)))?String(item.imageUrl):prev.imageUrl,
          }));
        }
        if (suggestions.length>0) {
          setLivePairings(suggestions.slice(0,3).map((s:unknown,i:number)=>{
            const sg=s as Record<string,unknown>;
            return { name:String(sg.name??PAIRINGS[i]?.name??"House Pairing"), sub:String(sg.category??sg.sub??PAIRINGS[i]?.sub??""),
              notes:String(sg.description??sg.notes??PAIRINGS[i]?.notes??"Premium pairing"),
              price:sg.costCents!=null?Math.round(Number(sg.costCents)/100):sg.price!=null?Number(sg.price):(PAIRINGS[i]?.price??18) };
          }));
        }
      }
    }).catch(()=>{});

    fetch(`/api/tabs/venue/${encodeURIComponent(vId)}`, { headers:hdr(token) }).then(r=>r.ok?r.json():null).then(d=>{
      if(!d) return;
      const rows:unknown[]=(d as {tabs?:unknown[]}).tabs??(Array.isArray(d)?d:[]);
      if(rows.length>0){
        setActiveTabs(rows.slice(0,6).map((t:unknown,i:number)=>{
          const tab=t as Record<string,unknown>;
          return { id:String(tab.id??`tab_${i}`), name:String(tab.guestName??tab.name??`Table ${i+1}`),
            server:String(tab.serverName??tab.server??"Staff"), tableNumber:String(tab.tableNumber??String(i+1)),
            guests:Number(tab.guestCount??tab.guests??1),
            items:Array.isArray(tab.items)?tab.items.map((it:unknown)=>{const item=it as Record<string,unknown>;return{name:String(item.name??"Item"),qty:Number(item.qty??1),price:Number(item.price??0)};}):[],
            total:Number(tab.total??0), tax:Number(tab.tax??0) };
        }));
        setSelTabId(String((rows[0] as Record<string,unknown>).id??"tab_0"));
      }
    }).catch(()=>{});

    fetch(`/api/environment/${encodeURIComponent(vId)}`, { headers:hdr(token) }).then(r=>r.ok?r.json():null).then(d=>{ if(d&&typeof d==="object") setEnvState(prev=>({...prev,...d})); }).catch(()=>{});
    fetch(`/api/events/venue/${encodeURIComponent(vId)}`, { headers:hdr(token) }).then(r=>r.ok?r.json():null).catch(()=>{});
    fetch(`/api/orders/venue/${encodeURIComponent(vId)}?limit=20`, { headers:hdr(token) }).then(r=>r.ok?r.json():null).then(d=>{
      const list:unknown[]=Array.isArray(d)?d:((d as {orders?:unknown[]}).orders??[]);
      if(list.length>0){ setRecentOrders(list.map((o:unknown)=>{ const order=o as Record<string,unknown>; return { id:String(order.id??""), tableNumber:String(order.tableNumber??order.table??""), items:Array.isArray(order.items)?order.items.map((it:unknown)=>{const item=it as Record<string,unknown>;return{name:String(item.name??""),qty:Number(item.qty??1),price:Number(item.price??0)};}):[],total:Number(order.total??0),status:String(order.status??""),createdAt:String(order.createdAt??order.created_at??"") }; })); }
    }).catch(()=>{});

    return () => {
      eatEngine.stop(); unsubInv(); unsubEnv(); clearInterval(devicePoll);
      socket.off("connect",onConn); socket.off("disconnect",onDisconn); socket.off("panel_visibility",onPV);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const envDebounce = useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(() => {
    if(envDebounce.current) clearTimeout(envDebounce.current);
    envDebounce.current = setTimeout(() => {
      const token = localStorage.getItem("axiom_token")??"";
      fetch(`/api/environment/${encodeURIComponent(venueId)}`,{ method:"PATCH", headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})}, body:JSON.stringify({lighting,scent:scentPct,musicMode,scentMode}) }).catch(()=>{});
    }, 800);
    return () => { if(envDebounce.current) clearTimeout(envDebounce.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lighting,scentPct,musicMode,scentMode]);

  useEffect(() => {
    if(!envPreset) return;
    const token = localStorage.getItem("axiom_token")??"";
    fetch(`/api/environment/${encodeURIComponent(venueId)}/preset`,{ method:"POST", headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})}, body:JSON.stringify({preset:envPreset}) }).catch(()=>{});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envPreset]);

  const onTableMD = useCallback((e:React.MouseEvent, id:string|number) => {
    e.preventDefault();
    const matchTab = activeTabs.find(t=>t.tableNumber===String(id));
    if(matchTab) setSelTabId(matchTab.id);
    setTableFilter(String(id));
    const rect = floorRef.current?.getBoundingClientRect(); if(!rect) return;
    const t = floorTables.find(t=>t.id===id); if(!t) return;
    dragOff.current = { x:e.clientX-rect.left-(t.x/100)*rect.width, y:e.clientY-rect.top-(t.y/100)*rect.height };
    setDragging(id);
  }, [floorTables, activeTabs]);
  const onFloorMM = useCallback((e:React.MouseEvent) => {
    if(!dragging||!floorRef.current) return;
    const rect = floorRef.current.getBoundingClientRect();
    const x = Math.max(2,Math.min(88,((e.clientX-rect.left-dragOff.current.x)/rect.width)*100));
    const y = Math.max(2,Math.min(88,((e.clientY-rect.top-dragOff.current.y)/rect.height)*100));
    setFloorTables(prev=>prev.map(t=>t.id===dragging?{...t,x,y}:t));
  }, [dragging]);
  const onFloorMU = useCallback(() => {
    if(dragging){ const t=floorTables.find(t=>t.id===dragging); if(t){ const token=localStorage.getItem("axiom_token")??""; fetch(`/api/staffFloor/table/${encodeURIComponent(String(dragging))}`,{method:"PATCH",headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({x:t.x,y:t.y})}).catch(()=>{}); } setDragging(null); }
  }, [dragging,floorTables]);

  const selectedTab  = activeTabs.find(t=>t.id===selTabId)?? activeTabs[0];

  const handleAddCigar = useCallback(() => {
    const token=localStorage.getItem("axiom_token")??""; if(!selectedTab) return;
    fetch(`/api/tabs/${selectedTab.id}/items`,{method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({productName:featuredCigar.name,unitCents:Math.round(featuredCigar.price*100),quantity:1,craftType:"smoke"})}).catch(()=>{});
    setToastMsg(`✓ ${featuredCigar.name} added to Tab ${selectedTab.tableNumber}`);
    setTimeout(()=>setToastMsg(null),2400);
  },[selectedTab,featuredCigar]);
  const handleAddPairing = useCallback(() => {
    const token=localStorage.getItem("axiom_token")??""; if(!selectedTab) return;
    fetch(`/api/tabs/${selectedTab.id}/items`,{method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({productName:"Premium Pairing Selection",unitCents:2800,quantity:1,craftType:"pour"})}).catch(()=>{});
    setToastMsg("✓ Cigar + Single-Barrel Bourbon pairing added to tab");
    setTimeout(()=>setToastMsg(null),2400);
  },[selectedTab]);
  const handleRoute = useCallback((dest:string) => {
    const token=localStorage.getItem("axiom_token")??"";
    setCmdSubSection(dest as "kitchen"|"humidor"|"bar");
    if(selectedTab) {
      fetch(`/api/tabs/${selectedTab.id}/route`,{method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({destination:dest,items:selectedTab.items})}).catch(()=>{});
    }
    setToastMsg(`✓ Order sent to ${dest.charAt(0).toUpperCase()+dest.slice(1)} — view in Command Center`);
    setTimeout(()=>setToastMsg(null),2800);
  },[selectedTab]);
  const handleCheckout = useCallback(async () => {
    if(!selectedTab||!selectedTab.items.length) return;
    setToastMsg("⏳ Checkout initiated — processing payment...");
    const req:CheckoutRequest={ venueId:localStorage.getItem("axiom_venue_id")??"venue_01", tableNumber:selectedTab.tableNumber, items:selectedTab.items.map(i=>({productId:`item_${i.name.replace(/\s+/g,"_")}`,name:i.name,qty:i.qty,price:i.price})), successUrl:window.location.href, cancelUrl:window.location.href };
    try { const result=await eatEngine.checkout(req); if(result.checkoutUrl?.startsWith("http")) window.open(result.checkoutUrl,"_blank"); setToastMsg("✓ Checkout complete — tab cleared"); setTimeout(()=>setToastMsg(null),2400); } catch { setToastMsg("✗ Checkout failed — please retry"); setTimeout(()=>setToastMsg(null),3000); }
  },[selectedTab]);

  void envState; void recentOrders;

  // ── RENDER ────────────────────────────────────────────────────────────────
  const SEL = (s:React.CSSProperties): React.CSSProperties => s;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:PAGE_BG, fontFamily:"'Inter','Helvetica Neue',sans-serif", overflow:"hidden" }}>

      {/* ── DUAL-TIER TOP DECK ───────────────────────────────────────────── */}
      <header style={{ flexShrink:0, zIndex:50 }}>

        {/* ROW 1 — Global Module Selector (ivory, 72px) */}
        <div style={{ height:72, background:"#F9F8F6", borderBottom:`1px solid ${BORDER}`, display:"flex", alignItems:"stretch", boxShadow:"0 1px 3px rgba(0,0,0,0.07)" }}>

          {/* Left — Return button */}
          <div style={{ width:210, flexShrink:0, display:"flex", alignItems:"center", gap:10, paddingLeft:14, borderRight:`1px solid ${BORDER}` }}>
            <motion.button whileTap={{scale:0.94}} onClick={()=>setPhase("crafthub")}
              style={{ padding:"10px 14px", borderRadius:6, border:`1px solid ${BORDER}`, background:"transparent", color:OBSID, cursor:"pointer", fontSize:10, fontWeight:900, letterSpacing:"0.12em", textTransform:"uppercase", whiteSpace:"nowrap", fontFamily:"'Space Mono','Courier New',monospace" }}>
              [ BACK ]
            </motion.button>
          </div>

          {/* Center — Module tabs */}
          <nav style={{ flex:1, display:"flex", alignItems:"stretch" }}>
            {(["MENU","RESERVATIONS","EVENTS","E.A.T. OVERLAY","MESSAGES","REPORTS","SETTINGS"] as const).map(m => {
              const isEAT = m === "E.A.T. OVERLAY";
              const isActive = isEAT ? activeModule === "E.A.T" : activeModule === m;
              return (
                <motion.button key={m} whileTap={{scale:0.97}}
                  onClick={()=>setActiveModule(isEAT ? "E.A.T" : m)}
                  style={{ flex:1, position:"relative", fontSize:10, fontWeight:isActive?900:600, letterSpacing:"0.10em", cursor:"pointer", border:"none", borderRight:`1px solid ${BORDER}`, background:isActive?"rgba(212,175,55,0.06)":"transparent", color:isActive?OBSID:TEXT3, textTransform:"uppercase", whiteSpace:"nowrap", padding:"0 4px", transition:"all 0.12s" }}>
                  {m}
                  {isActive && <div style={{ position:"absolute", bottom:0, left:"10%", right:"10%", height:3, background:isEAT?AMBER:OBSID, borderRadius:"3px 3px 0 0" }} />}
                  {isEAT && <div style={{ position:"absolute", inset:4, border:`1.5px solid ${AMBER}`, borderRadius:4, opacity:isActive?0.55:0.18, pointerEvents:"none" }} />}
                </motion.button>
              );
            })}
          </nav>

          {/* Right — User + clock */}
          <div style={{ width:200, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"flex-end", gap:10, paddingRight:14, borderLeft:`1px solid ${BORDER}` }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:12, fontWeight:700, color:TEXT1, lineHeight:1 }}>Marcus C.</div>
              <div style={{ fontSize:10, color:TEXT3, marginTop:2 }}>General Manager</div>
              <div style={{ fontSize:10, color:GREEN, marginTop:2, display:"flex", alignItems:"center", justifyContent:"flex-end", gap:4 }}>
                <div style={{ width:5, height:5, borderRadius:"50%", background:GREEN }} />
                {clock}
              </div>
            </div>
            <div style={{ width:36, height:36, borderRadius:"50%", background:`linear-gradient(135deg,${AMBER},${AMBER2})`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, overflow:"hidden" }}>
              <img src={IMG("mentor_dominican.jpg")} alt="Marcus C." style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
            </div>
          </div>
        </div>

        {/* ROW 2 — Subsurface Operations Nav (satin chrome, 52px) */}
        <div style={{ height:52, background:"#121214", display:"flex", alignItems:"center", paddingLeft:14, paddingRight:14, borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          {TOP_TABS.map(tab => (
            <motion.button key={tab} whileTap={{scale:0.96}}
              onClick={()=>{ setActiveModule("E.A.T"); setActiveTab(tab); }}
              style={{ marginRight:32, fontSize:12, fontWeight:activeTab===tab?700:400, letterSpacing:"0.06em", cursor:"pointer", border:"none", background:"transparent", color:activeTab===tab?"#F5F5F7":"rgba(245,245,247,0.40)", whiteSpace:"nowrap", minHeight:52, position:"relative", transition:"color 0.12s", padding:0 }}>
              {tab}
              {activeTab===tab && <div style={{ position:"absolute", bottom:0, left:0, right:0, height:2, background:AMBER, borderRadius:"2px 2px 0 0" }} />}
            </motion.button>
          ))}
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      {activeModule !== "E.A.T" ? (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:PAGE_BG }}>
          <div style={{ textAlign:"center", padding:"40px 32px", maxWidth:500 }}>
            <div style={{ fontSize:10, fontWeight:900, letterSpacing:"0.24em", color:TEXT3, textTransform:"uppercase", marginBottom:16 }}>Active Module</div>
            <div style={{ fontSize:32, fontWeight:900, color:OBSID, letterSpacing:"0.04em", marginBottom:14 }}>{activeModule}</div>
            <div style={{ width:56, height:3, background:`linear-gradient(90deg,${AMBER},${AMBER2})`, borderRadius:2, margin:"0 auto 20px" }} />
            <div style={{ fontSize:13, color:TEXT3, marginBottom:32, lineHeight:1.7 }}>This module interface is being configured.<br />Full interactive layout loading shortly.</div>
            <motion.button whileTap={{scale:0.96}} onClick={()=>setActiveModule("E.A.T")}
              style={{ padding:"12px 28px", borderRadius:8, border:"none", background:OBSID, color:"#F9F8F6", fontSize:11, fontWeight:900, letterSpacing:"0.14em", textTransform:"uppercase", cursor:"pointer" }}>
              Return to E.A.T. Overlay
            </motion.button>
          </div>
        </div>
      ) : (
      <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>

        {/* COL 1 — Active Task */}
        <aside style={{ width:192, flexShrink:0, background:CARD_BG, borderRight:`1px solid ${BORDER}`, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ flex:1, overflowY:"auto", padding:"12px 10px" }}>

            {/* Active task card */}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.18em", color:TEXT3, textTransform:"uppercase", marginBottom:6 }}>Active Task</div>
              <div style={{ background:IVORY, border:`1px solid ${BORDER}`, borderRadius:8, padding:"10px 10px 8px" }}>
                <div style={{ fontSize:12, fontWeight:700, color:TEXT1, marginBottom:8, lineHeight:1.4 }}>Add a celebratory unlock banner</div>
                <div style={{ height:5, borderRadius:3, background:"rgba(0,0,0,0.08)", overflow:"hidden", marginBottom:5 }}>
                  <div style={{ width:"75%", height:"100%", background:`linear-gradient(90deg,${AMBER},${AMBER2})`, borderRadius:3 }} />
                </div>
                <div style={{ fontSize:10, color:TEXT3, textAlign:"right" }}>75%</div>
              </div>
            </div>

            {/* Activity log */}
            <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:10 }}>
              {[
                { text:"16 messages & 43 actions", color:TEXT3 },
                { text:"Checkpoint made 2 minutes ago", color:TEXT3 },
                { text:"Worked for 6 minutes", color:TEXT3 },
              ].map((item,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:7, padding:"5px 0" }}>
                  <div style={{ width:14, height:14, borderRadius:3, background:`rgba(0,0,0,0.07)`, border:`1px solid ${BORDER}`, flexShrink:0 }} />
                  <span style={{ fontSize:11, color:item.color, lineHeight:1.3 }}>{item.text}</span>
                </div>
              ))}
            </div>

            {/* Preview block */}
            <div style={{ background:IVORY, border:`1px solid ${BORDER}`, borderRadius:8, padding:"8px", marginBottom:10, overflow:"hidden" }}>
              <div style={{ width:"100%", height:64, borderRadius:5, overflow:"hidden", background:`linear-gradient(135deg,#2C1A08,#4A2A10)`, marginBottom:6 }}>
                <img src={IMG("cigar_hero.jpg")} alt="task preview" style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.8 }} onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
              </div>
              <div style={{ fontSize:10, color:TEXT3 }}>Pasted-REWRITE-</div>
              <div style={{ fontSize:10, color:TEXT3, marginTop:2 }}>Just now</div>
            </div>

            {/* Agent note */}
            <div style={{ background:"rgba(0,0,0,0.03)", border:`1px solid ${BORDER}`, borderRadius:8, padding:"8px 10px", marginBottom:8 }}>
              <div style={{ fontSize:11, color:TEXT2, lineHeight:1.55 }}>Planning EAT Console UI cleanup (6...<br />The EAT System is now visible — good.</div>
              <div style={{ display:"flex", gap:4, marginTop:6 }}>
                {["1","2","3","4","5"].map(n=>(
                  <div key={n} style={{ width:20, height:20, borderRadius:4, background:`rgba(0,0,0,0.06)`, border:`1px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <div style={{ width:8, height:8, borderRadius:1, background:TEXT3 }} />
                  </div>
                ))}
                <span style={{ fontSize:10, color:TEXT3, marginLeft:"auto", alignSelf:"center" }}>5 actions</span>
              </div>
            </div>

          </div>

          {/* Queue bar */}
          <div style={{ borderTop:`1px solid ${BORDER}`, padding:"8px 10px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:AMBER, flexShrink:0 }} />
              <span style={{ fontSize:11, color:TEXT2, fontWeight:700 }}>Queue (1 item)</span>
              <div style={{ width:14, height:14, borderRadius:"50%", border:`1px solid ${BORDER}`, marginLeft:"auto", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ width:4, height:4, borderRadius:"50%", background:TEXT3 }} />
              </div>
            </div>
            <div style={{ display:"flex", gap:4 }}>
              <div style={{ flex:1, height:32, borderRadius:6, background:IVORY, border:`1px solid ${BORDER}` }} />
              <div style={{ padding:"6px 12px", borderRadius:6, background:OBSID, color:IVORY, fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center" }}>Plan</div>
            </div>
          </div>
        </aside>

        {/* COL 2 — Devices + Tables */}
        <aside style={{ width:210, flexShrink:0, background:CARD_BG, borderRight:`1px solid ${BORDER}`, display:"flex", flexDirection:"column", overflowY:"auto" }}>
          <div style={{ padding:"12px 10px 0" }}>

            {/* Device status */}
            <div style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                <span style={{ fontSize:10, fontWeight:800, letterSpacing:"0.16em", color:TEXT3, textTransform:"uppercase" }}>Tablet & Device Status</span>
                <button style={{ fontSize:11, color:AMBER2, background:"none", border:"none", cursor:"pointer", fontWeight:700, padding:0 }}>View All</button>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                <PulseDot color={GREEN} />
                <span style={{ fontSize:11, color:TEXT2 }}>{devices.filter(d=>d.online).length} Active Devices</span>
                <span style={{ marginLeft:"auto", fontSize:12, fontWeight:800, color:TEXT1 }}>{devices.length} Total</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
                {devices.slice(0,5).map(dev=>(
                  <div key={dev.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px", borderRadius:6, background:IVORY, border:`1px solid ${BORDER}` }}>
                    <div style={{ width:28, height:28, borderRadius:6, background:"rgba(0,0,0,0.06)", border:`1px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <div style={{ width:14, height:18, borderRadius:2, background:dev.online?"rgba(46,125,79,0.25)":"rgba(192,57,43,0.18)", border:`1.5px solid ${dev.online?GREEN:RED_CLR}` }} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                        <span style={{ fontSize:12, fontWeight:700, color:TEXT1 }}>{dev.name}</span>
                        <span style={{ fontSize:10, color:TEXT3, fontFamily:"monospace" }}>{dev.zone}</span>
                      </div>
                      <BattBar pct={dev.battery} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active tables */}
            <div>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.16em", color:TEXT3, textTransform:"uppercase", marginBottom:6 }}>Active Tables</div>
              <div style={{ display:"flex", gap:5, marginBottom:8 }}>
                {(["Floor Plan","List View"] as const).map(v=>(
                  <motion.button key={v} whileTap={{scale:0.96}} onClick={()=>setFloorView(v)}
                    style={{ flex:1, padding:"6px 0", fontSize:11, fontWeight:700, cursor:"pointer", borderRadius:6, border:`1px solid ${floorView===v?AMBER:BORDER}`, background:floorView===v?`rgba(212,175,55,0.12)`:IVORY, color:floorView===v?AMBER2:TEXT2 }}>
                    {v}
                  </motion.button>
                ))}
              </div>

              {floorView === "Floor Plan" ? (
                <div ref={floorRef} onMouseMove={onFloorMM} onMouseUp={onFloorMU} onMouseLeave={onFloorMU}
                  style={{ position:"relative", height:220, background:"#EDE8DA", borderRadius:8, overflow:"hidden", cursor:dragging?"grabbing":"default", border:`1px solid ${BORDER}` }}>
                  <div style={{ position:"absolute", inset:8, border:"1px dashed rgba(180,140,80,0.30)", borderRadius:6, pointerEvents:"none" }} />
                  {floorTables.map(t=>(
                    <motion.div key={String(t.id)} onMouseDown={e=>onTableMD(e,t.id)} animate={{ scale:dragging===t.id?1.1:1 }}
                      style={{ position:"absolute", left:`${t.x}%`, top:`${t.y}%`, transform:"translate(-50%,-50%)",
                        width:t.vip?36:28, height:t.vip?36:28, borderRadius:t.vip?"8px":"50%",
                        background:t.vip?`linear-gradient(135deg,${AMBER},${AMBER2})`:t.active?"rgba(46,125,79,0.20)":"rgba(180,140,80,0.18)",
                        border:`1.5px solid ${t.vip?AMBER:t.active?"rgba(46,125,79,0.55)":BORDER}`,
                        display:"flex", alignItems:"center", justifyContent:"center", cursor:"grab", userSelect:"none", zIndex:dragging===t.id?10:1 }}>
                      <span style={{ fontSize:t.vip?9:8, fontWeight:900, color:t.vip?"#1A0C00":t.active?GREEN:TEXT3, lineHeight:1 }}>{t.vip?"VIP":String(t.id)}</span>
                      {t.active && t.guests>0 && (
                        <div style={{ position:"absolute", top:-4, right:-4, background:GREEN, color:"white", fontSize:7, fontWeight:900, borderRadius:"50%", width:13, height:13, display:"flex", alignItems:"center", justifyContent:"center" }}>{t.guests}</div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div style={{ maxHeight:220, overflowY:"auto" }}>
                  {floorTables.filter(t=>t.active).map(t=>(
                    <div key={String(t.id)} style={{ padding:"6px 8px", borderBottom:`1px solid ${BORDER}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <span style={{ fontSize:12, fontWeight:700, color:TEXT1 }}>Table {String(t.id)}</span>
                        {t.vip && <span style={{ marginLeft:6, fontSize:9, color:AMBER, fontWeight:800, padding:"1px 5px", border:`1px solid ${AMBER}44`, borderRadius:3 }}>VIP</span>}
                      </div>
                      <span style={{ fontSize:11, color:TEXT3 }}>{t.guests} guests</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* COL 3 — Main product + pairing / E.A.T. VI Panel */}
        <main style={{ flex:1, minHeight:0, overflowY:"auto", background:PAGE_BG, minWidth:0 }}>
          {activeTab === "Venue Intelligence" && (
            <div style={{ padding:"16px 14px" }}>

              {/* VI Header */}
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:10, letterSpacing:"0.28em", color:TEXT3, textTransform:"uppercase", fontWeight:800, marginBottom:4 }}>E.A.T. VI</div>
                  <div style={{ fontSize:22, fontWeight:900, color:TEXT1, lineHeight:1, marginBottom:3 }}>Venue Intelligence</div>
                  <div style={{ fontSize:11, color:TEXT3 }}>Hospitality Signal Engine{viFetching?" · Syncing...":" · Live"}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:10, color:TEXT3, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Intelligence Score</div>
                  <div style={{ fontSize:40, fontWeight:900, lineHeight:1, color:viData.risk==="low"?GREEN:viData.risk==="medium"?AMBER2:RED_CLR }}>{Math.round(viData.score*100)}</div>
                  <div style={{ fontSize:10, color:TEXT3 }}>/ 100</div>
                </div>
              </div>

              {/* Metric row */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:14 }}>
                {([
                  { label:"Awareness Score", value:`${Math.round(viData.score*100)}`, sub:viData.risk.toUpperCase(), color:viData.risk==="high"?RED_CLR:viData.risk==="medium"?AMBER2:GREEN },
                  { label:"Active Sessions",  value:String(viData.activeSessions),     sub:"FLOOR NOW",              color:GREEN  },
                  { label:"Engagement Level", value:viData.engagementLevel,            sub:"MOMENTUM",               color:AMBER2 },
                ] as {label:string;value:string;sub:string;color:string}[]).map(m=>(
                  <div key={m.label} style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:8, padding:"12px" }}>
                    <div style={{ fontSize:10, color:TEXT3, letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:700, marginBottom:6 }}>{m.label}</div>
                    <div style={{ fontSize:26, fontWeight:900, color:m.color, lineHeight:1, marginBottom:2 }}>{m.value}</div>
                    <div style={{ fontSize:9, color:m.color, letterSpacing:"0.14em", fontWeight:700 }}>{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Signal grid */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>

                {/* Table Service Signals */}
                <div style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:8, padding:"12px 14px" }}>
                  <div style={{ fontSize:10, color:TEXT3, letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:700, marginBottom:8 }}>Table Service Signals</div>
                  {viData.serviceSignals.map((s,i)=>(
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:i<viData.serviceSignals.length-1?`1px solid ${BORDER}`:"none" }}>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:TEXT1 }}>{s.table}</div>
                        <div style={{ fontSize:10, color:TEXT3, lineHeight:1.4 }}>{s.signal}</div>
                      </div>
                      <span style={{ flexShrink:0, marginLeft:8, fontSize:10, fontWeight:800, color:s.urgency==="HIGH"?RED_CLR:s.urgency==="MED"?AMBER2:GREEN, padding:"2px 8px", border:`1px solid ${s.urgency==="HIGH"?RED_CLR:s.urgency==="MED"?AMBER2:GREEN}66`, borderRadius:4 }}>{s.urgency}</span>
                    </div>
                  ))}
                </div>

                {/* Staff Deployment */}
                <div style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:8, padding:"12px 14px" }}>
                  <div style={{ fontSize:10, color:TEXT3, letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:700, marginBottom:8 }}>Staff Deployment</div>
                  {viData.staffDeployment.map((d,i)=>(
                    <div key={i} style={{ padding:"6px 0", borderBottom:i<viData.staffDeployment.length-1?`1px solid ${BORDER}`:"none" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:TEXT1 }}>{d.zone}</span>
                        <span style={{ fontSize:10, fontWeight:800, color:d.priority==="URGENT"?RED_CLR:d.priority==="STANDARD"?AMBER2:GREEN }}>{d.priority}</span>
                      </div>
                      <div style={{ fontSize:10, color:TEXT3 }}>{d.action}</div>
                    </div>
                  ))}
                </div>

                {/* Predictive Occupancy */}
                <div style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:8, padding:"12px 14px" }}>
                  <div style={{ fontSize:10, color:TEXT3, letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:700, marginBottom:8 }}>Predictive Occupancy</div>
                  {viData.occupancyForecast.map((o,i)=>(
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:i<viData.occupancyForecast.length-1?`1px solid ${BORDER}`:"none" }}>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:TEXT1 }}>{o.table}</div>
                        <div style={{ fontSize:10, color:TEXT3 }}>{o.forecast}</div>
                      </div>
                      <div style={{ fontSize:12, fontWeight:800, color:AMBER2 }}>{o.eta}</div>
                    </div>
                  ))}
                </div>

                {/* Ambient Scene Engine */}
                <div style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:8, padding:"12px 14px" }}>
                  <div style={{ fontSize:10, color:TEXT3, letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:700, marginBottom:8 }}>Ambient Scene Engine</div>
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontSize:13, fontWeight:800, color:TEXT1, marginBottom:2 }}>{viData.activeScene}</div>
                    <div style={{ fontSize:10, color:TEXT3 }}>Active ambient configuration</div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {viData.sceneOptions.map(s=>(
                      <motion.button key={s} whileTap={{scale:0.96}} onClick={()=>activateVIScene(s)}
                        style={{ padding:"5px 10px", fontSize:10, fontWeight:700, borderRadius:5, border:`1px solid ${viData.activeScene===s?AMBER:BORDER}`, background:viData.activeScene===s?`rgba(212,175,55,0.10)`:IVORY, color:viData.activeScene===s?AMBER2:TEXT2, cursor:"pointer" }}>
                        {s}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Digital Twin status bar */}
              <div style={{ background:OBSID, borderRadius:8, padding:"14px 18px", display:"flex", gap:24, flexWrap:"wrap", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.38)", letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:3 }}>Digital Twin</div>
                  <div style={{ fontSize:12, fontWeight:800, color:AMBER }}>SYNCHRONIZED</div>
                </div>
                <div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.38)", letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:3 }}>Orchestration</div>
                  <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.85)" }}>{viData.orchestrationStatus}</div>
                </div>
                <div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.38)", letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:3 }}>Revenue Signal</div>
                  <div style={{ fontSize:12, fontWeight:800, color:GREEN }}>{viData.revenueSignal}</div>
                </div>
                <div style={{ marginLeft:"auto" }}>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.38)", letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:3 }}>Last Sync</div>
                  <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.65)" }}>{viData.lastSync}</div>
                </div>
              </div>

            </div>
          )}

          {/* ── ASSETS ─────────────────────────────────────────────────────── */}
          {activeTab === "Assets" && (
            <div style={{ padding:"16px 14px" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:10, letterSpacing:"0.28em", color:TEXT3, textTransform:"uppercase", fontWeight:800, marginBottom:4 }}>E.A.T. SYSTEM</div>
                  <div style={{ fontSize:22, fontWeight:900, color:TEXT1, lineHeight:1, marginBottom:3 }}>Assets</div>
                  <div style={{ fontSize:11, color:TEXT3 }}>Inventory + Catalog</div>
                </div>
                <motion.button whileTap={{scale:0.96}} style={{ padding:"10px 18px", borderRadius:7, border:`1px solid ${AMBER}`, background:`rgba(212,175,55,0.08)`, color:AMBER2, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                  Add Product
                </motion.button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
                {([{ label:"Cigars", count:4, low:2 },{ label:"Spirits", count:3, low:1 },{ label:"Accessories", count:1, low:0 }] as {label:string;count:number;low:number}[]).map(c=>(
                  <div key={c.label} style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:8, padding:"12px 14px" }}>
                    <div style={{ fontSize:10, color:TEXT3, letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:700, marginBottom:6 }}>{c.label}</div>
                    <div style={{ fontSize:26, fontWeight:900, color:TEXT1, lineHeight:1, marginBottom:4 }}>{c.count}</div>
                    {c.low > 0 ? <div style={{ fontSize:10, fontWeight:700, color:RED_CLR }}>{c.low} LOW STOCK</div> : <div style={{ fontSize:10, color:GREEN, fontWeight:700 }}>All stocked</div>}
                  </div>
                ))}
              </div>
              <div style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:10, overflow:"hidden" }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 90px 80px 70px 50px 80px", padding:"8px 14px", background:IVORY, borderBottom:`1px solid ${BORDER}` }}>
                  {["Product","Category","SKU","Stock","Min","Price"].map(h=>(
                    <div key={h} style={{ fontSize:10, fontWeight:800, color:TEXT3, letterSpacing:"0.12em", textTransform:"uppercase" }}>{h}</div>
                  ))}
                </div>
                {ASSET_CATALOG.map((a,i)=>{
                  const low = a.stock < a.min;
                  return (
                    <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 90px 80px 70px 50px 80px", padding:"10px 14px", borderBottom:i<ASSET_CATALOG.length-1?`1px solid ${BORDER}`:"none", background:low?"rgba(192,57,43,0.02)":"transparent", alignItems:"center" }}>
                      <div style={{ fontSize:13, fontWeight:700, color:TEXT1 }}>{a.name}</div>
                      <div style={{ fontSize:11, color:TEXT3 }}>{a.cat}</div>
                      <div style={{ fontSize:11, color:TEXT3, fontFamily:"monospace" }}>{a.sku}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:low?RED_CLR:TEXT1 }}>{a.stock}</span>
                        {low && <span style={{ fontSize:9, fontWeight:800, color:RED_CLR, border:`1px solid ${RED_CLR}55`, padding:"1px 5px", borderRadius:3 }}>LOW</span>}
                      </div>
                      <div style={{ fontSize:11, color:TEXT3 }}>{a.min}</div>
                      <div style={{ fontSize:13, fontWeight:700, color:AMBER2 }}>${a.price}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TRANSACTIONS ──────────────────────────────────────────────── */}
          {activeTab === "Transactions" && (
            <div style={{ padding:"16px 14px" }}>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:10, letterSpacing:"0.28em", color:TEXT3, textTransform:"uppercase", fontWeight:800, marginBottom:4 }}>E.A.T. SYSTEM</div>
                <div style={{ fontSize:22, fontWeight:900, color:TEXT1, lineHeight:1, marginBottom:3 }}>Transactions</div>
                <div style={{ fontSize:11, color:TEXT3 }}>Live Revenue Feed</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
                {([
                  { label:"Today Revenue", value:"$2,847", sub:"12% vs yesterday",  color:GREEN    },
                  { label:"Orders",        value:"18",     sub:"4 currently open",  color:TEXT1    },
                  { label:"Avg Spend",     value:"$158",   sub:"Per table",         color:AMBER2   },
                  { label:"Open Tabs",     value:"4",      sub:"Awaiting checkout", color:RED_CLR  },
                ] as {label:string;value:string;sub:string;color:string}[]).map(k=>(
                  <div key={k.label} style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:8, padding:"12px 14px" }}>
                    <div style={{ fontSize:10, color:TEXT3, letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:700, marginBottom:6 }}>{k.label}</div>
                    <div style={{ fontSize:26, fontWeight:900, color:k.color, lineHeight:1, marginBottom:3 }}>{k.value}</div>
                    <div style={{ fontSize:10, color:TEXT3 }}>{k.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:10, overflow:"hidden" }}>
                <div style={{ display:"grid", gridTemplateColumns:"80px 50px 1fr 80px 80px 60px", padding:"8px 14px", background:IVORY, borderBottom:`1px solid ${BORDER}` }}>
                  {["Order","Table","Items","Total","Status","Time"].map(h=>(
                    <div key={h} style={{ fontSize:10, fontWeight:800, color:TEXT3, letterSpacing:"0.12em", textTransform:"uppercase" }}>{h}</div>
                  ))}
                </div>
                {TXN_LOG.map((t,i)=>(
                  <div key={i} onClick={()=>{ setTableFilter(String(t.table)); setToastMsg(`Filtered to T-${t.table}`); setTimeout(()=>setToastMsg(null),1800); }}
                    style={{ display:"grid", gridTemplateColumns:"80px 50px 1fr 80px 80px 60px", padding:"10px 14px", borderBottom:i<TXN_LOG.length-1?`1px solid ${BORDER}`:"none", alignItems:"center", cursor:"pointer", background:tableFilter===String(t.table)?`rgba(212,175,55,0.05)`:"transparent", transition:"background 0.2s" }}>
                    <div style={{ fontSize:11, fontFamily:"monospace", color:TEXT3 }}>{t.id}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:tableFilter===String(t.table)?AMBER2:TEXT1 }}>T-{t.table}</div>
                    <div style={{ fontSize:12, color:TEXT2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.items}</div>
                    <div style={{ fontSize:13, fontWeight:800, color:AMBER2 }}>${t.total}</div>
                    <div><span style={{ fontSize:10, fontWeight:800, color:t.status==="open"?GREEN:TEXT3, border:`1px solid ${t.status==="open"?GREEN+"66":BORDER}`, padding:"2px 8px", borderRadius:4, textTransform:"uppercase" }}>{t.status}</span></div>
                    <div style={{ fontSize:11, color:TEXT3 }}>{t.ago}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PAIRING ENGINE ────────────────────────────────────────────── */}
          {activeTab === "Pairing Engine" && (
            <div style={{ padding:"16px 14px" }}>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:10, letterSpacing:"0.28em", color:TEXT3, textTransform:"uppercase", fontWeight:800, marginBottom:4 }}>E.A.T. SYSTEM</div>
                <div style={{ fontSize:22, fontWeight:900, color:TEXT1, lineHeight:1, marginBottom:3 }}>Pairing Engine</div>
                <div style={{ fontSize:11, color:TEXT3 }}>AI-Matched Recommendations</div>
              </div>
              <div style={{ background:OBSID, borderRadius:10, padding:"14px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ width:48, height:48, borderRadius:8, overflow:"hidden", background:`linear-gradient(135deg,#2C1A08,#3A1A06)`, flexShrink:0 }}>
                  <img src={IMG("cigar_hero.jpg")} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:IVORY, lineHeight:1.3 }}>{featuredCigar.name}</div>
                  <div style={{ fontSize:11, color:AMBER, marginTop:2 }}>{featuredCigar.type} · {featuredCigar.origin}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.40)", letterSpacing:"0.16em", textTransform:"uppercase", marginBottom:2 }}>AI Confidence</div>
                  <div style={{ fontSize:20, fontWeight:900, color:GREEN }}>94%</div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {PAIRING_RECS.map((p,i)=>(
                  <div key={i} style={{ background:CARD_BG, border:`1px solid ${i===0?AMBER:BORDER}`, borderRadius:10, padding:"12px 14px", display:"flex", gap:10, alignItems:"center", cursor:"pointer", position:"relative", overflow:"hidden" }}>
                    {i===0 && <div style={{ position:"absolute", top:0, right:0, fontSize:9, fontWeight:800, color:"#1A0C00", background:AMBER, padding:"4px 10px", borderRadius:"0 8px 0 6px", textTransform:"uppercase", letterSpacing:"0.10em" }}>Best Match</div>}
                    <div style={{ width:44, height:44, borderRadius:8, overflow:"hidden", flexShrink:0, background:`linear-gradient(${p.gradient})` }}>
                      <img src={p.img} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:2 }}>
                        <div style={{ fontSize:13, fontWeight:800, color:TEXT1, lineHeight:1.3 }}>{p.name}</div>
                        <div style={{ fontSize:15, fontWeight:900, color:AMBER2, flexShrink:0, marginLeft:6 }}>${p.price}</div>
                      </div>
                      <div style={{ fontSize:10, color:TEXT3, marginBottom:3 }}>{p.type} · <span style={{ color:i===0?AMBER2:TEXT2, fontWeight:700 }}>{p.match}% match</span></div>
                      <div style={{ fontSize:11, color:TEXT2 }}>{p.notes}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ANALYTICS ─────────────────────────────────────────────────── */}
          {activeTab === "Analytics" && (
            <div style={{ padding:"16px 14px" }}>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:10, letterSpacing:"0.28em", color:TEXT3, textTransform:"uppercase", fontWeight:800, marginBottom:4 }}>E.A.T. SYSTEM</div>
                <div style={{ fontSize:22, fontWeight:900, color:TEXT1, lineHeight:1, marginBottom:3 }}>Analytics & Intelligence</div>
              </div>
              {/* Sub-tabs */}
              <div style={{ display:"flex", gap:6, marginBottom:16, borderBottom:`1px solid ${BORDER}`, paddingBottom:10 }}>
                {([{id:"overview",label:"Overview"},{id:"contest",label:"Staff Contest"},{id:"vault",label:"The Vault"},{id:"reconciliation",label:"Reconciliation"}] as {id:"overview"|"contest"|"vault"|"reconciliation";label:string}[]).map(t=>(
                  <motion.button key={t.id} whileTap={{scale:0.95}} onClick={()=>setAnalyticsSubTab(t.id)}
                    style={{ padding:"6px 14px", borderRadius:6, border:`1px solid ${analyticsSubTab===t.id?AMBER:BORDER}`, background:analyticsSubTab===t.id?`rgba(212,175,55,0.10)`:IVORY, color:analyticsSubTab===t.id?AMBER2:TEXT2, fontSize:11, fontWeight:analyticsSubTab===t.id?800:600, cursor:"pointer" }}>
                    {t.label}
                  </motion.button>
                ))}
              </div>

              {/* OVERVIEW */}
              {analyticsSubTab === "overview" && (<>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
                  {([
                    { label:"Month Revenue", value:"$18,420", sub:"22% vs last month",  color:GREEN  },
                    { label:"Sessions",      value:"143",     sub:"This month",          color:TEXT1  },
                    { label:"Avg Spend",     value:"$129",    sub:"Per session",         color:AMBER2 },
                    { label:"Conversion",    value:"68%",     sub:"Swipe to purchase",   color:GREEN  },
                  ] as {label:string;value:string;sub:string;color:string}[]).map(k=>(
                    <div key={k.label} style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:8, padding:"12px 14px" }}>
                      <div style={{ fontSize:10, color:TEXT3, letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:700, marginBottom:6 }}>{k.label}</div>
                      <div style={{ fontSize:26, fontWeight:900, color:k.color, lineHeight:1, marginBottom:3 }}>{k.value}</div>
                      <div style={{ fontSize:10, color:TEXT3 }}>{k.sub}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:10, padding:"16px" }}>
                    <div style={{ fontSize:11, fontWeight:800, color:TEXT1, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:14 }}>Weekly Revenue</div>
                    <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:120 }}>
                      {WEEKLY_REV.map(w=>(
                        <div key={w.day} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, height:"100%" }}>
                          <div style={{ flex:1, display:"flex", alignItems:"flex-end", width:"100%" }}>
                            <div style={{ width:"100%", height:`${w.pct}%`, background:`linear-gradient(180deg,${AMBER},${AMBER2})`, borderRadius:"3px 3px 0 0", minHeight:4 }} />
                          </div>
                          <div style={{ fontSize:9, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:700 }}>{w.day}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:10, padding:"16px" }}>
                    <div style={{ fontSize:11, fontWeight:800, color:TEXT1, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:14 }}>Top Products</div>
                    {TOP_PRODS.map((p,i)=>(
                      <div key={i} style={{ padding:"8px 0", borderBottom:i<TOP_PRODS.length-1?`1px solid ${BORDER}`:"none" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                          <span style={{ fontSize:12, fontWeight:700, color:TEXT1 }}>{p.name}</span>
                          <span style={{ fontSize:12, fontWeight:800, color:AMBER2 }}>${p.rev.toLocaleString()}</span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ flex:1, height:4, borderRadius:2, background:"rgba(0,0,0,0.08)", overflow:"hidden" }}>
                            <div style={{ width:`${Math.round((p.rev/2714)*100)}%`, height:"100%", background:`linear-gradient(90deg,${AMBER},${AMBER2})`, borderRadius:2 }} />
                          </div>
                          <span style={{ fontSize:10, color:TEXT3, flexShrink:0 }}>{p.sold} sold</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>)}

              {/* STAFF CONTEST */}
              {analyticsSubTab === "contest" && (<>
                <div style={{ fontSize:13, fontWeight:800, color:TEXT1, marginBottom:12 }}>Staff Sales Leaderboard — Tonight</div>
                {staffList.filter(s=>s.sales>0).sort((a,b)=>b.sales-a.sales).map((s,i)=>(
                  <div key={s.name} style={{ padding:"12px 14px", borderRadius:9, border:`1px solid ${i===0?AMBER:BORDER}`, background:i===0?`rgba(212,175,55,0.06)`:IVORY, marginBottom:8, display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{ width:30, height:30, borderRadius:"50%", background:i===0?`linear-gradient(135deg,${AMBER},${AMBER2})`:`linear-gradient(135deg,#6B5E4E,#2A2A2A)`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span style={{ fontSize:12, fontWeight:900, color:i===0?"#1A0C00":"#F0E8D4" }}>#{i+1}</span>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:800, color:TEXT1 }}>{s.name}</div>
                      <div style={{ fontSize:11, color:TEXT3 }}>{s.role}</div>
                    </div>
                    <div style={{ textAlign:"right" as const }}>
                      <div style={{ fontSize:20, fontWeight:900, color:i===0?AMBER2:TEXT1 }}>${s.sales.toLocaleString()}</div>
                      <div style={{ fontSize:10, color:TEXT3 }}>Tonight</div>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop:14, padding:"14px", background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:10 }}>
                  <div style={{ fontSize:12, fontWeight:800, color:TEXT1, marginBottom:10 }}>Top Asset by Server</div>
                  {[
                    { server:"Sofia R.",  product:"Padron 1926 Anniversary", qty:4, rev:208 },
                    { server:"Jordan K.", product:"Blanton's Bourbon",       qty:6, rev:192 },
                    { server:"Dev P.",    product:"Hennessy XO",             qty:3, rev:144 },
                  ].map((r,i)=>(
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:i<2?`1px solid ${BORDER}`:"none" }}>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:TEXT1 }}>{r.server}</div>
                        <div style={{ fontSize:10, color:TEXT3 }}>{r.product} · {r.qty} sold</div>
                      </div>
                      <span style={{ fontSize:14, fontWeight:800, color:GREEN }}>${r.rev}</span>
                    </div>
                  ))}
                </div>
              </>)}

              {/* THE VAULT */}
              {analyticsSubTab === "vault" && (<>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:TEXT1 }}>Historical Ledger</div>
                  <motion.button whileTap={{scale:0.96}} onClick={()=>{ setToastMsg("Generating CSV export..."); setTimeout(()=>setToastMsg(null),2500); }}
                    style={{ padding:"6px 14px", borderRadius:6, border:`1px solid ${BORDER}`, background:IVORY, color:TEXT2, fontSize:11, fontWeight:700, cursor:"pointer" }}>
                    Export CSV
                  </motion.button>
                </div>
                <div style={{ display:"flex", flexDirection:"column" as const, gap:6 }}>
                  {[
                    { id:"TXN-2046", guest:"Sofia Chen",      table:"7",     items:["Cohiba Behike 52","Hennessy XO"],                       total:166, time:"9:47 PM" },
                    { id:"TXN-2045", guest:"Marcus T.",       table:"3",     items:["Padron 1964 Torpedo","Buffalo Trace x2"],                total:96,  time:"9:31 PM" },
                    { id:"TXN-2044", guest:"Private Party",   table:"VIP-1", items:["Davidoff Churchill","Macallan 12","Cheese Board"],       total:248, time:"8:55 PM" },
                    { id:"TXN-2043", guest:"James R.",        table:"11",    items:["Rocky Patel Vintage","Maker's Mark"],                   total:58,  time:"8:22 PM" },
                    { id:"TXN-2042", guest:"Anniversary",     table:"VIP-2", items:["Cohiba Behike x2","Don Julio 1942","Wagyu"],             total:494, time:"7:45 PM" },
                  ].map((t,i)=>(
                    <div key={i} style={{ padding:"12px 14px", borderRadius:9, border:`1px solid ${BORDER}`, background:IVORY }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5 }}>
                        <div>
                          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                            <span style={{ fontSize:12, fontWeight:800, color:TEXT1 }}>{t.guest}</span>
                            <span style={{ fontSize:10, color:TEXT3 }}>Table {t.table}</span>
                            <span style={{ fontSize:9, padding:"2px 6px", borderRadius:3, background:`rgba(46,125,79,0.12)`, color:GREEN, fontWeight:700 }}>CLOSED</span>
                          </div>
                          <div style={{ fontSize:11, color:TEXT3, marginTop:3 }}>{t.items.join(" · ")}</div>
                        </div>
                        <div style={{ textAlign:"right" as const }}>
                          <div style={{ fontSize:16, fontWeight:900, color:AMBER2 }}>${t.total}</div>
                          <div style={{ fontSize:10, color:TEXT3 }}>{t.time}</div>
                        </div>
                      </div>
                      <div style={{ fontSize:10, color:TEXT3, fontFamily:"'Space Mono','Courier New',monospace" }}>{t.id}</div>
                    </div>
                  ))}
                </div>
              </>)}

              {/* RECONCILIATION */}
              {analyticsSubTab === "reconciliation" && (<>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:14 }}>
                  {[
                    { label:"Reconciliation Score", val:"97%",  color:GREEN,     sub:"High accuracy"  },
                    { label:"Closed Tabs",          val:"18",   color:TEXT1,     sub:"Tonight"        },
                    { label:"Discrepancies",        val:"1",    color:"#EF4444", sub:"Needs review"   },
                  ].map(m=>(
                    <div key={m.label} style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:8, padding:"12px 14px" }}>
                      <div style={{ fontSize:9, color:TEXT3, textTransform:"uppercase" as const, letterSpacing:"0.10em", fontWeight:700, marginBottom:6 }}>{m.label}</div>
                      <div style={{ fontSize:22, fontWeight:900, color:m.color }}>{m.val}</div>
                      <div style={{ fontSize:10, color:TEXT3 }}>{m.sub}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:12, fontWeight:800, color:TEXT1, marginBottom:10 }}>End-of-Night Audit</div>
                {[
                  { account:"Cash Drawer",       expected:2840, actual:2840, status:"match"    },
                  { account:"Card Payments",      expected:8642, actual:8642, status:"match"    },
                  { account:"Tab T-2844 (Void)",  expected:0,    actual:28,   status:"mismatch" },
                  { account:"Comps & Staff Meals",expected:140,  actual:140,  status:"match"    },
                ].map((r,i)=>(
                  <div key={i} style={{ padding:"10px 14px", borderRadius:8, border:`1px solid ${r.status==="mismatch"?"#FCA5A5":BORDER}`, background:IVORY, marginBottom:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:TEXT1 }}>{r.account}</div>
                      <div style={{ fontSize:11, color:TEXT3 }}>Expected: ${r.expected.toLocaleString()}</div>
                    </div>
                    <div style={{ textAlign:"right" as const }}>
                      <div style={{ fontSize:14, fontWeight:900, color:r.status==="match"?GREEN:"#EF4444" }}>${r.actual.toLocaleString()}</div>
                      <div style={{ fontSize:10, fontWeight:700, color:r.status==="match"?GREEN:"#EF4444" }}>{r.status==="match"?"MATCHED":"MISMATCH"}</div>
                    </div>
                  </div>
                ))}
                <motion.button whileTap={{scale:0.97}} onClick={()=>{ setToastMsg("Reconciliation report generated"); setTimeout(()=>setToastMsg(null),2500); }}
                  style={{ width:"100%", marginTop:12, padding:"13px", borderRadius:8, border:"none", background:`linear-gradient(135deg,${AMBER},${AMBER2})`, color:"#1A0C00", fontSize:13, fontWeight:900, cursor:"pointer" }}>
                  Generate Reconciliation Report
                </motion.button>
              </>)}
            </div>
          )}

          {/* ── STAFF ──────────────────────────────────────────────────────── */}
          {activeTab === "Staff" && (
            <div style={{ padding:"16px 14px" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:10, letterSpacing:"0.28em", color:TEXT3, textTransform:"uppercase", fontWeight:800, marginBottom:4 }}>E.A.T. SYSTEM</div>
                  <div style={{ fontSize:22, fontWeight:900, color:TEXT1, lineHeight:1, marginBottom:3 }}>Staff</div>
                  <div style={{ fontSize:11, color:TEXT3 }}>Floor Management · 3 Active</div>
                </div>
                <motion.button whileTap={{scale:0.96}} onClick={()=>setShowAddStaff(true)} style={{ padding:"10px 18px", borderRadius:7, border:`1px solid ${AMBER}`, background:`rgba(212,175,55,0.08)`, color:AMBER2, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                  Add Staff
                </motion.button>
              </div>
              {showAddStaff && (
                <div style={{ marginBottom:14, background:CARD_BG, border:`1px solid ${AMBER}`, borderRadius:10, padding:"16px 18px" }}>
                  <div style={{ fontSize:13, fontWeight:900, color:TEXT1, marginBottom:12 }}>New Staff Member</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:4 }}>Full Name</div>
                      <input value={newStaff.name} onChange={e=>setNewStaff(p=>({...p,name:e.target.value}))} placeholder="e.g. Jordan M." style={{ width:"100%", boxSizing:"border-box" as const, padding:"8px 10px", borderRadius:6, border:`1px solid ${BORDER}`, background:"#FDFCF8", color:TEXT1, fontSize:13, fontWeight:600, outline:"none" }} />
                    </div>
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:4 }}>Role</div>
                      <input value={newStaff.role} onChange={e=>setNewStaff(p=>({...p,role:e.target.value}))} placeholder="e.g. Lounge Attendant" style={{ width:"100%", boxSizing:"border-box" as const, padding:"8px 10px", borderRadius:6, border:`1px solid ${BORDER}`, background:"#FDFCF8", color:TEXT1, fontSize:13, fontWeight:600, outline:"none" }} />
                    </div>
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:4 }}>Tables / Station</div>
                      <input value={newStaff.tables} onChange={e=>setNewStaff(p=>({...p,tables:e.target.value}))} placeholder="e.g. 1–6 or Bar" style={{ width:"100%", boxSizing:"border-box" as const, padding:"8px 10px", borderRadius:6, border:`1px solid ${BORDER}`, background:"#FDFCF8", color:TEXT1, fontSize:13, fontWeight:600, outline:"none" }} />
                    </div>
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:4 }}>Status</div>
                      <select value={newStaff.status} onChange={e=>setNewStaff(p=>({...p,status:e.target.value as "online"|"break"|"offline"}))} style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:`1px solid ${BORDER}`, background:"#FDFCF8", color:TEXT1, fontSize:13, fontWeight:600, outline:"none" }}>
                        <option value="online">Online</option>
                        <option value="break">On Break</option>
                        <option value="offline">Offline</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                    <motion.button whileTap={{scale:0.96}} onClick={()=>{ setShowAddStaff(false); setNewStaff({name:"",role:"",tables:"",status:"online"}); }} style={{ padding:"8px 16px", borderRadius:6, border:`1px solid ${BORDER}`, background:"transparent", color:TEXT3, fontSize:12, fontWeight:700, cursor:"pointer" }}>Cancel</motion.button>
                    <motion.button whileTap={{scale:0.96}} onClick={()=>{
                      if(!newStaff.name.trim()||!newStaff.role.trim()) return;
                      setStaffList(prev=>[...prev,{ name:newStaff.name.trim(), role:newStaff.role.trim(), status:newStaff.status, tables:newStaff.tables.trim()||"TBD", sales:0 }]);
                      setNewStaff({name:"",role:"",tables:"",status:"online"});
                      setShowAddStaff(false);
                      setToastMsg(`${newStaff.name.trim()} added to floor`);
                      setTimeout(()=>setToastMsg(null),2800);
                    }} style={{ padding:"8px 18px", borderRadius:6, border:`1px solid ${AMBER}`, background:`rgba(212,175,55,0.14)`, color:AMBER2, fontSize:12, fontWeight:800, cursor:"pointer" }}>Add Member</motion.button>
                  </div>
                </div>
              )}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
                {staffList.map((s,i)=>{
                  const sc = s.status==="online"?GREEN:s.status==="break"?AMBER2:TEXT3;
                  return (
                    <div key={i} style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:10, padding:"14px 16px", display:"flex", gap:14, alignItems:"center" }}>
                      <div style={{ width:44, height:44, borderRadius:"50%", background:`linear-gradient(135deg,${AMBER},${AMBER2})`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <span style={{ fontSize:16, fontWeight:900, color:"#1A0C00" }}>{s.name.charAt(0)}</span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:2 }}>
                          <div style={{ fontSize:14, fontWeight:800, color:TEXT1 }}>{s.name}</div>
                          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                            <div style={{ width:6, height:6, borderRadius:"50%", background:sc }} />
                            <span style={{ fontSize:10, fontWeight:700, color:sc, textTransform:"capitalize" }}>{s.status}</span>
                          </div>
                        </div>
                        <div style={{ fontSize:11, color:TEXT3, marginBottom:6 }}>{s.role}</div>
                        <div style={{ display:"flex", gap:14 }}>
                          <div>
                            <div style={{ fontSize:9, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:1 }}>Tables</div>
                            <div style={{ fontSize:12, fontWeight:700, color:TEXT1 }}>
                              {Object.entries(tableDelegations).filter(([,v])=>v===s.name).map(([k])=>`T${k}`).join(", ")||s.tables}
                            </div>
                          </div>
                          {s.sales > 0 && (
                            <div>
                              <div style={{ fontSize:9, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:1 }}>Sales</div>
                              <div style={{ fontSize:12, fontWeight:700, color:GREEN }}>${s.sales.toLocaleString()}</div>
                            </div>
                          )}
                        </div>
                        <div style={{ marginTop:8, paddingTop:7, borderTop:`1px solid ${BORDER}`, display:"flex", justifyContent:"flex-end" }}>
                          <motion.button whileTap={{scale:0.96}} onClick={()=>setDelegateTarget(delegateTarget===i?null:i)}
                            style={{ padding:"4px 12px", borderRadius:5, border:`1px solid ${delegateTarget===i?AMBER:BORDER}`, background:delegateTarget===i?`rgba(212,175,55,0.10)`:"transparent", color:delegateTarget===i?AMBER2:TEXT3, fontSize:10, fontWeight:700, cursor:"pointer" }}>
                            {delegateTarget===i?"Done":"Assign Tables"}
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── TABLE DELEGATION MODAL ───────────────────────────────── */}
              {delegateTarget !== null && staffList[delegateTarget] && (
                <div style={{ marginTop:12, background:CARD_BG, border:`1px solid ${AMBER}`, borderRadius:10, padding:"16px 18px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                    <div style={{ fontSize:13, fontWeight:900, color:TEXT1 }}>
                      Assign Tables — {staffList[delegateTarget].name}
                    </div>
                    <span style={{ fontSize:10, color:TEXT3 }}>Tap table to toggle assignment</span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
                    {floorTables.map(t=>{
                      const tLabel = `T${t.id}`;
                      const assignedTo = tableDelegations[String(t.id)];
                      const isThisStaff = assignedTo === staffList[delegateTarget!]?.name;
                      return (
                        <motion.button key={t.id} whileTap={{scale:0.94}}
                          onClick={()=>{
                            const staffName = staffList[delegateTarget!]?.name;
                            if(!staffName) return;
                            setTableDelegations(prev=>{
                              const n={...prev};
                              if(isThisStaff) { delete n[String(t.id)]; } else { n[String(t.id)]=staffName; }
                              return n;
                            });
                            setToastMsg(isThisStaff?`${tLabel} unassigned from ${staffName}`:`${tLabel} → ${staffName}`);
                            setTimeout(()=>setToastMsg(null),2000);
                          }}
                          style={{ padding:"8px 6px", borderRadius:7, border:`1px solid ${isThisStaff?AMBER:assignedTo?`rgba(212,175,55,0.3)`:BORDER}`, background:isThisStaff?`rgba(212,175,55,0.12)`:IVORY, color:isThisStaff?AMBER2:assignedTo&&!isThisStaff?TEXT3:TEXT1, fontSize:11, fontWeight:isThisStaff?800:600, cursor:"pointer", textAlign:"center" as const }}>
                          {tLabel}
                          {assignedTo && !isThisStaff && <div style={{ fontSize:8, color:TEXT3, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{assignedTo.split(" ")[0]}</div>}
                          {isThisStaff && <div style={{ fontSize:8, color:AMBER2, marginTop:2 }}>Assigned</div>}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── COMMAND CENTER ────────────────────────────────────────────── */}
          {activeTab === "Command Center" && (
          <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:12 }}>

            {/* ── COMMAND CENTER SUB-NAV ──────────────────────────────────── */}
            <div style={{ display:"flex", gap:6, flexShrink:0, alignItems:"center" }}>
              {(["overview","kitchen","humidor","bar"] as const).map(s=>(
                <motion.button key={s} whileTap={{scale:0.95}} onClick={()=>setCmdSubSection(s)}
                  style={{ padding:"7px 16px", borderRadius:7, border:`1px solid ${cmdSubSection===s?AMBER:BORDER}`, background:cmdSubSection===s?`rgba(212,175,55,0.12)`:IVORY, color:cmdSubSection===s?AMBER2:TEXT2, fontSize:12, fontWeight:cmdSubSection===s?800:600, cursor:"pointer", textTransform:"capitalize", letterSpacing:"0.03em", flexShrink:0 }}>
                  {s==="overview"?"Overview":s==="kitchen"?"Kitchen":s==="humidor"?"Humidor":"Bar"}
                </motion.button>
              ))}
              <div style={{ flex:1 }} />
              <motion.button whileTap={{scale:0.95}} onClick={()=>setBroadcastModal(true)}
                style={{ padding:"7px 16px", borderRadius:7, border:`1px solid ${activeBroadcast?"#EF4444":AMBER}`, background:activeBroadcast?`rgba(239,68,68,0.12)`:`rgba(212,175,55,0.12)`, color:activeBroadcast?"#EF4444":AMBER2, fontSize:11, fontWeight:800, cursor:"pointer", flexShrink:0, letterSpacing:"0.06em", textTransform:"uppercase" }}>
                {activeBroadcast?"LIVE":"Broadcast"}
              </motion.button>
            </div>

            {/* ── TRIPLE-IMAGE HERO PAIRING MATRIX ─────────────────────────── */}
            {cmdSubSection === "overview" && <div style={{ display:"flex", gap:14, minHeight:340 }}>

              {/* LEFT PANEL — portrait image canvas */}
              <div style={{ flex:"0 0 48%", position:"relative", borderRadius:12, overflow:"hidden", background:"#0D0600", boxShadow:"0 4px 28px rgba(0,0,0,0.32)" }}>
                <img
                  src={featuredCigar.imageUrl || IMG("cigar_hero.jpg")}
                  alt={featuredCigar.name}
                  style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top", position:"absolute", inset:0, opacity:0.95 }}
                  onError={e=>{ (e.target as HTMLImageElement).src = IMG("cigar_hero.jpg"); }}
                />
                {/* smoke/depth gradient */}
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom,rgba(0,0,0,0.04) 0%,rgba(8,4,0,0.48) 78%,rgba(8,4,0,0.72) 100%)", pointerEvents:"none" }} />
                {/* volumetric smoke animation loop — 25% opacity drift */}
                <motion.div
                  animate={{ y:[0,-14,0], opacity:[0.22,0.28,0.22] }}
                  transition={{ duration:9, repeat:Infinity, ease:"easeInOut" }}
                  style={{ position:"absolute", inset:"-15%", zIndex:1, pointerEvents:"none",
                    backgroundImage:`url(${IMG("smoke/smoke_urban.png")})`,
                    backgroundSize:"cover", backgroundPosition:"center",
                    mixBlendMode:"screen" as const }} />
                {/* amber ambient glow at bottom */}
                <div style={{ position:"absolute", bottom:0, left:0, right:0, height:90, background:"linear-gradient(to top,rgba(196,134,10,0.18),transparent)", pointerEvents:"none" }} />
                {/* body badge */}
                <div style={{ position:"absolute", top:12, left:12 }}>
                  <span style={{ fontSize:10, fontWeight:900, letterSpacing:"0.18em", textTransform:"uppercase", color:AMBER, background:"rgba(0,0,0,0.58)", border:`1px solid rgba(212,175,55,0.35)`, padding:"4px 10px", borderRadius:4, backdropFilter:"blur(4px)" }}>
                    {featuredCigar.body}
                  </span>
                </div>
                {/* Edit product overlay — top right */}
                <motion.button whileTap={{scale:0.95}} onClick={()=>{ setProductEditForm({ name:featuredCigar.name, price:String(featuredCigar.price), description:featuredCigar.description||"" }); setProductEditModal(true); }}
                  style={{ position:"absolute", top:12, right:12, zIndex:10, padding:"4px 10px", borderRadius:5, border:`1px solid ${AMBER}`, background:"rgba(0,0,0,0.60)", backdropFilter:"blur(4px)", color:AMBER, fontSize:10, fontWeight:800, cursor:"pointer", letterSpacing:"0.10em", textTransform:"uppercase" as const }}>
                  Edit
                </motion.button>
                {/* featured label overlay bottom-left */}
                <div style={{ position:"absolute", bottom:14, left:14 }}>
                  <div style={{ fontSize:9, letterSpacing:"0.22em", textTransform:"uppercase", color:"rgba(240,232,212,0.60)", fontWeight:700, marginBottom:3 }}>FEATURED SELECTION</div>
                  <div style={{ fontSize:15, fontWeight:900, color:"#F0E8D4", lineHeight:1.2, textShadow:"0 2px 8px rgba(0,0,0,0.70)" }}>{featuredCigar.name}</div>
                </div>
              </div>

              {/* RIGHT PANEL — product specification block */}
              <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"space-between" }}>

                {/* Header */}
                <div>
                  <div style={{ fontSize:9, letterSpacing:"0.26em", textTransform:"uppercase", color:TEXT3, fontWeight:800, marginBottom:5 }}>PRODUCT SPECIFICATION</div>
                  <div style={{ fontSize:20, fontWeight:900, color:TEXT1, lineHeight:1.18, marginBottom:4 }}>{featuredCigar.name}</div>
                  <div style={{ fontSize:12, color:TEXT2, fontWeight:600, marginBottom:10, letterSpacing:"0.04em" }}>
                    {featuredCigar.type} &middot; Honduras / Nicaragua Wrapper
                  </div>
                  <p style={{ fontSize:12, color:TEXT2, lineHeight:1.65, margin:"0 0 12px 0" }}>
                    {featuredCigar.description || "Silky dark cocoa and robust espresso open the palate, deepening into black pepper and seasoned leather with a long, creamy finish."}
                  </p>
                </div>

                {/* Strength / Rating dots */}
                <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:12 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:TEXT3, width:58, textTransform:"uppercase", letterSpacing:"0.10em", flexShrink:0 }}>Strength</span>
                    <StrengthDots v={featuredCigar.strength} />
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:TEXT3, width:58, textTransform:"uppercase", letterSpacing:"0.10em", flexShrink:0 }}>Rating</span>
                    <RatingDots v={featuredCigar.rating} />
                  </div>
                </div>

                {/* 94 / 100 evaluation badge */}
                <div style={{ background:OBSID, border:`1px solid ${AMBER}`, borderRadius:8, padding:"10px 14px", marginBottom:12 }}>
                  <div style={{ fontFamily:"'Space Mono','Courier New',monospace", fontSize:22, fontWeight:700, color:AMBER, letterSpacing:"0.06em", lineHeight:1 }}>
                    94 / 100
                  </div>
                  <div style={{ fontFamily:"'Space Mono','Courier New',monospace", fontSize:9, fontWeight:700, letterSpacing:"0.22em", color:"rgba(212,175,55,0.70)", textTransform:"uppercase", marginTop:4 }}>
                    POINT EVALUATION
                  </div>
                </div>

                {/* Quick pairing chips */}
                <div style={{ display:"flex", gap:6 }}>
                  {[
                    { label:"Buffalo Trace", sub:"Bourbon" },
                    { label:"Blue Mountain", sub:"Coffee"  },
                  ].map((c,i)=>(
                    <div key={i} style={{ flex:1, background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:7, padding:"7px 8px" }}>
                      <div style={{ fontSize:11, fontWeight:700, color:TEXT1 }}>{c.label}</div>
                      <div style={{ fontSize:9, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.10em" }}>{c.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>}

            {/* ── BOTTOM THUMBNAIL PREVIEW STRIP ────────────────────────────── */}
            {cmdSubSection === "overview" && <div style={{ display:"flex", gap:10 }}>
              {[
                { src:IMG("lounge_bg.jpg"),      label:"LOUNGE SEATING",   sub:"Luxury leather seating",   section:"overview" as const },
                { src:IMG("pour-1.jpg"),          label:"SPIRIT SERVICE",   sub:"Premium pour selection",   section:"bar" as const      },
                { src:IMG("cigar1.png"),          label:"HUMIDOR RESERVE",  sub:"Tobacconist selection",    section:"humidor" as const  },
              ].map((card,i)=>(
                <div key={i} onClick={()=>setCmdSubSection(card.section)} style={{ flex:1, borderRadius:9, overflow:"hidden", background:`linear-gradient(135deg,#1C0A02,#0D0600)`, border:`1.5px solid ${BORDER}`, cursor:"pointer", position:"relative", height:92 }}>
                  <img src={card.src} alt={card.label} style={{ width:"100%", height:"100%", objectFit:"cover", position:"absolute", inset:0, opacity:0.82 }}
                    onError={e=>{ (e.target as HTMLImageElement).style.display="none"; }}
                  />
                  <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(0,0,0,0.62) 0%,rgba(0,0,0,0.08) 60%)", pointerEvents:"none" }} />
                  <div style={{ position:"absolute", bottom:8, left:9, right:9 }}>
                    <div style={{ fontSize:9, fontWeight:900, letterSpacing:"0.16em", color:"rgba(240,232,212,0.95)", textTransform:"uppercase", lineHeight:1 }}>{card.label}</div>
                    <div style={{ fontSize:8, color:"rgba(240,232,212,0.55)", marginTop:2 }}>{card.sub}</div>
                  </div>
                </div>
              ))}
            </div>}

            {/* ── KITCHEN PANEL ─────────────────────────────────────────────── */}
            {cmdSubSection === "kitchen" && (
            <div style={{ background:CARD_BG, borderRadius:12, border:`1px solid ${BORDER}`, overflow:"hidden" }}>
              <div style={{ background:`linear-gradient(135deg,#1C0A02,#0D0600)`, padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:10, letterSpacing:"0.22em", color:TEXT3, textTransform:"uppercase", fontWeight:800, marginBottom:2 }}>COMMAND CENTER</div>
                  <div style={{ fontSize:18, fontWeight:900, color:"#F0E8D4" }}>Kitchen Operations</div>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:GREEN }} />
                  <span style={{ fontSize:11, color:GREEN, fontWeight:700 }}>LIVE</span>
                </div>
              </div>
              <div style={{ padding:"14px 16px" }}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:14 }}>
                  {[
                    { label:"Active Orders", val:"4", color:AMBER2 },
                    { label:"Avg Wait", val:"8 min", color:TEXT1 },
                    { label:"Status", val:"BUSY", color:"#EF4444" },
                  ].map(m=>(
                    <div key={m.label} style={{ background:IVORY, borderRadius:8, padding:"10px 12px", border:`1px solid ${BORDER}` }}>
                      <div style={{ fontSize:9, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.10em", fontWeight:700, marginBottom:4 }}>{m.label}</div>
                      <div style={{ fontSize:16, fontWeight:900, color:m.color }}>{m.val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:10, fontWeight:800, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:8 }}>Order Queue</div>
                {[
                  { table:"Table 1", items:"Wagyu Carpaccio, Cheese Flight", status:"Plating", elapsed:"4m" },
                  { table:"Table 4", items:"Smoked Short Rib Sliders x2", status:"Cooking", elapsed:"7m" },
                  { table:"Table 7", items:"Truffle Charcuterie Board", status:"Ready", elapsed:"12m" },
                  { table:"Bar", items:"Dark Chocolate Tart x3", status:"Plating", elapsed:"3m" },
                ].map((o,i)=>(
                  <div key={i} style={{ padding:"10px 12px", borderRadius:8, border:`1px solid ${BORDER}`, background:IVORY, marginBottom:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:3 }}>
                        <span style={{ fontSize:12, fontWeight:800, color:TEXT1 }}>{o.table}</span>
                        <span style={{ fontSize:10, padding:"2px 7px", borderRadius:4, background:o.status==="Ready"?`rgba(46,125,79,0.15)`:o.status==="Cooking"?`rgba(212,175,55,0.14)`:`rgba(59,130,246,0.10)`, color:o.status==="Ready"?GREEN:o.status==="Cooking"?AMBER2:"#3B82F6", fontWeight:700 }}>{o.status}</span>
                      </div>
                      <div style={{ fontSize:11, color:TEXT3 }}>{o.items}</div>
                    </div>
                    <div style={{ fontSize:12, fontWeight:700, color:TEXT3 }}>{o.elapsed}</div>
                  </div>
                ))}
                <div style={{ fontSize:10, fontWeight:800, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.14em", marginTop:14, marginBottom:8 }}>Kitchen Staff</div>
                <div style={{ display:"flex", gap:8 }}>
                  {["Chef Marco R.", "Line Cook — A. Park", "Expo — D. Chen"].map((s,i)=>(
                    <div key={i} style={{ flex:1, padding:"8px 10px", borderRadius:7, border:`1px solid ${BORDER}`, background:IVORY, textAlign:"center" as const }}>
                      <div style={{ fontSize:11, fontWeight:700, color:TEXT1 }}>{s.split("—")[0].trim()}</div>
                      {s.includes("—") && <div style={{ fontSize:10, color:TEXT3 }}>{s.split("—")[1].trim()}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            )}

            {/* ── HUMIDOR PANEL ─────────────────────────────────────────────── */}
            {cmdSubSection === "humidor" && (
            <div style={{ background:CARD_BG, borderRadius:12, border:`1px solid ${BORDER}`, overflow:"hidden" }}>
              <div style={{ background:`linear-gradient(135deg,#1C0A02,#0D0600)`, padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:10, letterSpacing:"0.22em", color:TEXT3, textTransform:"uppercase", fontWeight:800, marginBottom:2 }}>COMMAND CENTER</div>
                  <div style={{ fontSize:18, fontWeight:900, color:"#F0E8D4" }}>Humidor Reserve</div>
                </div>
                <div style={{ textAlign:"right" as const }}>
                  <div style={{ fontSize:10, color:TEXT3, fontWeight:700 }}>Climate</div>
                  <div style={{ fontSize:13, fontWeight:900, color:AMBER2 }}>68°F · 70% RH</div>
                </div>
              </div>
              <div style={{ padding:"14px 16px" }}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:14 }}>
                  {[
                    { label:"Temperature", val:"68°F", ok:true },
                    { label:"Humidity", val:"70%", ok:true },
                    { label:"In Stock", val:"284", ok:true },
                    { label:"Low Stock", val:"3", ok:false },
                  ].map(m=>(
                    <div key={m.label} style={{ background:IVORY, borderRadius:8, padding:"10px 10px", border:`1px solid ${m.ok?BORDER:"#FCA5A5"}` }}>
                      <div style={{ fontSize:8, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.09em", fontWeight:700, marginBottom:3 }}>{m.label}</div>
                      <div style={{ fontSize:15, fontWeight:900, color:m.ok?TEXT1:"#EF4444" }}>{m.val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:10, fontWeight:800, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:8 }}>Cigar Inventory — By Brand</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {[
                    { brand:"Arturo Fuente", models:"Opus X, Hemingway, Don Carlos", qty:42, stock:"in_stock" },
                    { brand:"Padron", models:"1926, 1964 Anniversary", qty:28, stock:"low_stock" },
                    { brand:"Liga Privada", models:"No. 9, T52, Papas Fritas", qty:16, stock:"low_stock" },
                    { brand:"Oliva", models:"Serie V Melanio, Serie O", qty:55, stock:"in_stock" },
                    { brand:"Davidoff", models:"Winston Churchill, Grand Cru", qty:31, stock:"in_stock" },
                    { brand:"My Father", models:"Le Bijou, El Centurion", qty:19, stock:"in_stock" },
                    { brand:"Rocky Patel", models:"Decade, Edge", qty:8, stock:"out_of_stock" },
                    { brand:"Cohiba", models:"Behike 52, BHK", qty:6, stock:"low_stock" },
                  ].map((c,i)=>(
                    <div key={i} style={{ padding:"9px 12px", borderRadius:7, border:`1px solid ${BORDER}`, background:IVORY, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <div style={{ fontSize:12, fontWeight:800, color:TEXT1 }}>{c.brand}</div>
                        <div style={{ fontSize:10, color:TEXT3 }}>{c.models}</div>
                      </div>
                      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                        <span style={{ fontSize:13, fontWeight:800, color:TEXT1 }}>{c.qty}</span>
                        <span style={{ fontSize:10, padding:"2px 7px", borderRadius:4, fontWeight:700, background:c.stock==="in_stock"?`rgba(46,125,79,0.12)`:c.stock==="low_stock"?`rgba(212,175,55,0.14)`:`rgba(239,68,68,0.12)`, color:c.stock==="in_stock"?GREEN:c.stock==="low_stock"?AMBER2:"#EF4444" }}>{c.stock==="in_stock"?"IN STOCK":c.stock==="low_stock"?"LOW":"OUT"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            )}

            {/* ── BAR PANEL ─────────────────────────────────────────────────── */}
            {cmdSubSection === "bar" && (
            <div style={{ background:CARD_BG, borderRadius:12, border:`1px solid ${BORDER}`, overflow:"hidden" }}>
              <div style={{ background:`linear-gradient(135deg,#1C0A02,#0D0600)`, padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:10, letterSpacing:"0.22em", color:TEXT3, textTransform:"uppercase", fontWeight:800, marginBottom:2 }}>COMMAND CENTER</div>
                  <div style={{ fontSize:18, fontWeight:900, color:"#F0E8D4" }}>Bar Operations</div>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:GREEN }} />
                  <span style={{ fontSize:11, color:GREEN, fontWeight:700 }}>LIVE</span>
                </div>
              </div>
              <div style={{ padding:"14px 16px" }}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:14 }}>
                  {[
                    { label:"Open Bar Tabs", val:String(activeTabs.length), color:AMBER2 },
                    { label:"Tab Revenue", val:"$"+activeTabs.reduce((a,t)=>a+t.total,0).toFixed(0), color:GREEN },
                    { label:"Pours Served", val:"24", color:TEXT1 },
                  ].map(m=>(
                    <div key={m.label} style={{ background:IVORY, borderRadius:8, padding:"10px 12px", border:`1px solid ${BORDER}` }}>
                      <div style={{ fontSize:9, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.10em", fontWeight:700, marginBottom:4 }}>{m.label}</div>
                      <div style={{ fontSize:16, fontWeight:900, color:m.color }}>{m.val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:10, fontWeight:800, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:8 }}>Spirit Inventory</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {[
                    { brand:"Bourbon", items:"Blanton's, Woodford, Maker's, Knob Creek", qty:18, stock:"in_stock" },
                    { brand:"Scotch", items:"Macallan, Balvenie, Lagavulin, Glenfiddich", qty:12, stock:"in_stock" },
                    { brand:"Cognac", items:"Hennessy XO/VSOP, Rémy Martin XO", qty:9, stock:"low_stock" },
                    { brand:"Tequila", items:"Don Julio 1942, Clase Azul, Casamigos", qty:14, stock:"in_stock" },
                    { brand:"Rum", items:"Ron Zacapa 23, Mount Gay Black Barrel", qty:7, stock:"low_stock" },
                    { brand:"Mezcal", items:"Del Maguey Vida, Clase Azul Guerrero", qty:5, stock:"low_stock" },
                  ].map((s,i)=>(
                    <div key={i} style={{ padding:"9px 12px", borderRadius:7, border:`1px solid ${BORDER}`, background:IVORY, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <div style={{ fontSize:12, fontWeight:800, color:TEXT1 }}>{s.brand}</div>
                        <div style={{ fontSize:10, color:TEXT3 }}>{s.items}</div>
                      </div>
                      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                        <span style={{ fontSize:13, fontWeight:800, color:TEXT1 }}>{s.qty}</span>
                        <span style={{ fontSize:10, padding:"2px 7px", borderRadius:4, fontWeight:700, background:s.stock==="in_stock"?`rgba(46,125,79,0.12)`:`rgba(212,175,55,0.14)`, color:s.stock==="in_stock"?GREEN:AMBER2 }}>{s.stock==="in_stock"?"IN STOCK":"LOW"}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:10, fontWeight:800, color:TEXT3, textTransform:"uppercase", letterSpacing:"0.14em", marginTop:14, marginBottom:8 }}>Active Bar Tabs</div>
                {activeTabs.slice(0,3).map(t=>(
                  <div key={t.id} style={{ padding:"9px 12px", borderRadius:7, border:`1px solid ${BORDER}`, background:IVORY, marginBottom:5, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:800, color:TEXT1 }}>{t.name}</div>
                      <div style={{ fontSize:10, color:TEXT3 }}>Table {t.tableNumber} · {t.items.length} items</div>
                    </div>
                    <span style={{ fontSize:14, fontWeight:900, color:AMBER2 }}>${t.total.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* ── ACTION BUTTONS ─────────────────────────────────────────────── */}
            <div style={{ display:"flex", gap:8 }}>
              <motion.button whileTap={{scale:0.96}} onClick={handleAddCigar}
                style={{ flex:1, minHeight:48, padding:"10px 12px", borderRadius:8, border:`1px solid rgba(46,125,79,0.35)`, background:"rgba(46,125,79,0.07)", color:GREEN, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                Add Cigar — ${featuredCigar.price}
              </motion.button>
              <motion.button whileTap={{scale:0.96}} onClick={handleAddPairing}
                style={{ flex:1, minHeight:48, padding:"10px 12px", borderRadius:8, border:`1px solid ${BORDER}`, background:IVORY, color:TEXT2, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                Add Pairing — From $16
              </motion.button>
              <motion.button whileTap={{scale:0.96}} onClick={()=>void handleCheckout()}
                style={{ flex:1, minHeight:48, padding:"10px 12px", borderRadius:8, border:"none", background:`linear-gradient(135deg,${AMBER},${AMBER2})`, color:"#1A0C00", fontSize:13, fontWeight:900, cursor:"pointer" }}>
                Checkout — ${selectedTab?.total.toFixed(2) ?? "0.00"}
              </motion.button>
            </div>
          </div>
          )}
          {/* bottom clearance — prevents fixed hitbox clipping last row */}
          <div style={{ height:90, flexShrink:0 }} />
        </main>

        {/* COL 4 — Perfect Pairings */}
        <aside style={{ width:222, flexShrink:0, background:CARD_BG, borderLeft:`1px solid ${BORDER}`, overflowY:"auto" }}>
          <div style={{ padding:"12px 12px 0" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontSize:10, fontWeight:800, letterSpacing:"0.16em", color:TEXT3, textTransform:"uppercase" }}>Perfect Pairings</span>
              <div style={{ display:"flex", gap:4 }}>
                {["<",">"].map(a=>(
                  <motion.button key={a} whileTap={{scale:0.94}} onClick={()=>setPairingIdx(i=>a==="<"?Math.max(0,i-1):Math.min(livePairings.length-1,i+1))}
                    style={{ width:24, height:24, borderRadius:4, border:`1px solid ${BORDER}`, background:IVORY, color:TEXT1, cursor:"pointer", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {a}
                  </motion.button>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {livePairings.map((p,i)=>(
                <div key={i} style={{ padding:"12px 10px", borderRadius:8, border:`1px solid ${i===pairingIdx?AMBER:BORDER}`, background:i===pairingIdx?`rgba(212,175,55,0.06)`:IVORY, cursor:"pointer" }} onClick={()=>setPairingIdx(i)}>
                  <div style={{ fontSize:13, fontWeight:800, color:TEXT1, marginBottom:2, lineHeight:1.3 }}>{p.name}</div>
                  <div style={{ fontSize:11, color:TEXT3, marginBottom:3 }}>{p.sub}</div>
                  <div style={{ fontSize:11, color:TEXT2, marginBottom:6, lineHeight:1.4 }}>{p.notes}</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <motion.button whileTap={{scale:0.95}} onClick={(e)=>{ e.stopPropagation(); setTicketTapper(p); }}
                      style={{ padding:"4px 10px", borderRadius:5, border:`1px solid ${AMBER}`, background:"transparent", color:AMBER2, fontSize:10, fontWeight:700, cursor:"pointer" }}>
                      Tap to Add
                    </motion.button>
                    <span style={{ fontSize:17, fontWeight:900, color:AMBER2 }}>${p.price}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Tab selector */}
            <div style={{ marginTop:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.16em", color:TEXT3, textTransform:"uppercase" }}>
                  Active Tabs{tableFilter ? ` — T${tableFilter}` : ""}
                </div>
                {tableFilter && (
                  <motion.button whileTap={{scale:0.95}} onClick={()=>setTableFilter(null)}
                    style={{ fontSize:9, fontWeight:700, color:AMBER2, background:"transparent", border:"none", cursor:"pointer", textDecoration:"underline", padding:0 }}>
                    Clear
                  </motion.button>
                )}
              </div>
              {(tableFilter ? activeTabs.filter(t=>t.tableNumber===tableFilter) : activeTabs).slice(0,4).map(t=>(
                <div key={t.id} onClick={()=>setSelTabId(t.id)}
                  style={{ padding:"8px 10px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", background:selTabId===t.id?`rgba(212,175,55,0.08)`:"transparent", borderLeft:`3px solid ${selTabId===t.id?AMBER:"transparent"}`, borderBottom:`1px solid ${BORDER}`, borderRadius:selTabId===t.id?"0 6px 6px 0":"0" }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:TEXT1 }}>{t.name}</div>
                    <div style={{ fontSize:10, color:TEXT3 }}>Table {t.tableNumber}</div>
                  </div>
                  <span style={{ fontSize:13, fontWeight:800, color:AMBER2 }}>${t.total.toFixed(0)}</span>
                </div>
              ))}
            </div>

            {/* Route buttons */}
            <div style={{ marginTop:12, paddingBottom:12 }}>
              {["bar","kitchen","humidor"].map(dest=>(
                <motion.button key={dest} whileTap={{scale:0.96}} onClick={()=>handleRoute(dest)}
                  style={{ width:"100%", padding:"9px 10px", marginBottom:5, borderRadius:7, border:`1px solid ${BORDER}`, background:IVORY, color:TEXT2, fontSize:12, fontWeight:700, cursor:"pointer", textAlign:"left", textTransform:"capitalize" }}>
                  Send to {dest.charAt(0).toUpperCase()+dest.slice(1)}
                </motion.button>
              ))}
            </div>
          </div>
        </aside>

        {/* COL 5 — Environment Controls */}
        <aside style={{ width:244, flexShrink:0, background:CARD_BG, borderLeft:`1px solid ${BORDER}`, overflowY:"auto" }}>
          <div style={{ padding:"12px 12px 0" }}>

            {/* Environment controls header */}
            <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.16em", color:TEXT3, textTransform:"uppercase", marginBottom:8 }}>Environment Controls</div>

            {/* Lounge preset */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontSize:11, color:TEXT2, fontWeight:600 }}>Lounge Preset</span>
              <select value={envPreset} onChange={e=>setEnvPreset(e.target.value)}
                style={{ fontSize:11, color:TEXT1, fontWeight:700, background:IVORY, border:`1px solid ${BORDER}`, borderRadius:5, padding:"4px 8px", cursor:"pointer", maxWidth:120 }}>
                {PRESET_OPTIONS.map(o=><option key={o}>{o}</option>)}
              </select>
            </div>

            {/* Lounge image */}
            <div style={{ width:"100%", height:80, borderRadius:8, overflow:"hidden", marginBottom:12, background:`linear-gradient(135deg,#2C1A08,#1A0C02)` }}>
              <img src={IMG("cigar_hero.jpg")} alt="Cigar lounge" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
            </div>

            {/* Lighting */}
            <div style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <span style={{ fontSize:11, color:TEXT2, fontWeight:600 }}>Lighting</span>
                <span style={{ fontSize:11, color:TEXT3, fontWeight:700 }}>{lighting}%</span>
              </div>
              <KineticSlider value={lighting} onChange={setLighting} />
            </div>

            {/* Music */}
            <div style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                <span style={{ fontSize:11, color:TEXT2, fontWeight:600 }}>Music</span>
              </div>
              <select value={musicMode} onChange={e=>setMusicMode(e.target.value)}
                style={{ width:"100%", fontSize:11, color:TEXT1, background:IVORY, border:`1px solid ${BORDER}`, borderRadius:5, padding:"6px 8px", cursor:"pointer" }}>
                {MUSIC_OPTIONS.map(o=><option key={o}>{o}</option>)}
              </select>
            </div>

            {/* Scent */}
            <div style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                <span style={{ fontSize:11, color:TEXT2, fontWeight:600 }}>Scent</span>
                <span style={{ fontSize:11, color:TEXT3, fontWeight:700 }}>{scentPct}%</span>
              </div>
              <select value={scentMode} onChange={e=>setScentMode(e.target.value)}
                style={{ width:"100%", fontSize:11, color:TEXT1, background:IVORY, border:`1px solid ${BORDER}`, borderRadius:5, padding:"6px 8px", cursor:"pointer", marginBottom:6 }}>
                {SCENT_OPTIONS.map(o=><option key={o}>{o}</option>)}
              </select>
              <KineticSlider value={scentPct} onChange={setScentPct} />
            </div>

            {/* Advanced controls */}
            <motion.button whileTap={{scale:0.96}}
              style={{ width:"100%", padding:"9px", borderRadius:7, border:`1px solid ${BORDER}`, background:IVORY, color:TEXT2, fontSize:12, fontWeight:700, cursor:"pointer", marginBottom:14 }}>
              Advanced Controls
            </motion.button>

            {/* HVAC divider */}
            <div style={{ height:1, background:BORDER, marginBottom:12 }} />

            {/* HVAC */}
            <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.16em", color:TEXT3, textTransform:"uppercase", marginBottom:8 }}>HVAC &amp; Air Quality</div>
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:11, color:TEXT3 }}>HVAC Status</span>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:GREEN }} />
                  <span style={{ fontSize:11, color:GREEN, fontWeight:700 }}>Optimal</span>
                </div>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:11, color:TEXT3 }}>Current Temp</span>
                <span style={{ fontSize:12, fontWeight:700, color:TEXT1 }}>70°F</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:11, color:TEXT3 }}>Humidity</span>
                <span style={{ fontSize:12, fontWeight:700, color:TEXT1 }}>52%</span>
              </div>
            </div>

          </div>
        </aside>
      </div>
      )}

      {/* ── LIGHTING DIM OVERLAY ─────────────────────────────────────────── */}
      {lighting < 95 && (
        <div style={{ position:"fixed", inset:0, background:`rgba(0,0,0,${((95-lighting)/100)*0.42})`, pointerEvents:"none", zIndex:2, transition:"background 0.4s ease" }} />
      )}

      {/* ── TOAST NOTIFICATION ──────────────────────────────────────────── */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:20}} transition={{duration:0.22}}
            style={{ position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)", background:"#0D0D0E", border:`1px solid ${AMBER}`, borderRadius:10, padding:"12px 22px", fontSize:13, fontWeight:700, color:IVORY, zIndex:1000, whiteSpace:"nowrap", boxShadow:"0 4px 24px rgba(0,0,0,0.45)", letterSpacing:"0.02em" }}>
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ADMIN COMMAND CENTER — 80×80 bottom-right capacitive hitbox ──── */}
      <div onTouchStart={()=>setIsCommandCenterOpen(true)} onClick={()=>setIsCommandCenterOpen(true)}
        className="command-center-trigger-envelope"
        style={{ position:"fixed", bottom:0, right:0, width:80, height:80, zIndex:999999, cursor:"pointer", background:"transparent" }}>
        <div style={{ position:"absolute", bottom:8, right:8, width:28, height:28, borderRadius:6, background:"rgba(212,175,55,0.08)", border:"1px solid rgba(212,175,55,0.18)", display:"flex", alignItems:"center", justifyContent:"center", opacity:0.55 }}>
          <div style={{ display:"grid", gridTemplateColumns:"5px 5px", gap:"2px", width:12, height:12 }}>
            {[0,1,2,3].map(i=><div key={i} style={{ background:AMBER, borderRadius:1, width:5, height:5 }} />)}
          </div>
        </div>
      </div>

      {/* ── ADMIN COMMAND CENTER — always-mounted CSS-transform drawer ─────── */}
      {/* Backdrop — opacity toggle, no backdropFilter (prevents WebKit black flash) */}
      <div onClick={()=>setIsCommandCenterOpen(false)}
        style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:999998,
          opacity: isCommandCenterOpen ? 1 : 0,
          pointerEvents: isCommandCenterOpen ? "auto" : "none",
          transition:"opacity 0.2s ease" }} />

      {/* Drawer panel — opacity+translate, always in viewport so WebKit pre-paints content */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:999999,
        background:"#0D0D0E", borderTop:"1px solid rgba(212,175,55,0.22)",
        borderRadius:"20px 20px 0 0", maxHeight:"72vh", overflow:"hidden",
        display:"flex", flexDirection:"column", boxShadow:"0 -8px 60px rgba(0,0,0,0.65)",
        opacity: isCommandCenterOpen ? 1 : 0,
        transform: isCommandCenterOpen ? "translateY(0)" : "translateY(28px)",
        pointerEvents: isCommandCenterOpen ? "auto" : "none",
        willChange: "opacity, transform",
        transition:"opacity 0.20s ease, transform 0.26s cubic-bezier(0.32,0.72,0,1)" }}>

        <div style={{ display:"flex", justifyContent:"center", padding:"14px 0 6px" }}>
          <div style={{ width:40, height:4, borderRadius:2, background:"rgba(255,255,255,0.15)" }} />
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 20px 14px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <div style={{ fontSize:11, fontWeight:900, letterSpacing:"0.22em", color:AMBER, textTransform:"uppercase" }}>Admin Command Center</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.40)", marginTop:2 }}>Venue-level controls — authorized personnel only</div>
          </div>
          <motion.button whileTap={{scale:0.93}} onClick={()=>setIsCommandCenterOpen(false)}
            style={{ padding:"8px 16px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, color:"rgba(255,255,255,0.75)", fontSize:11, fontWeight:700, cursor:"pointer", letterSpacing:"0.08em" }}>
            CLOSE COMMAND DRAWER
          </motion.button>
        </div>

        <div style={{ overflowY:"auto", flex:1, padding:"16px 20px 24px" }}>

          {/* ── PRIMARY TACTICAL ACTIONS ── */}
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            <motion.button whileTap={{scale:0.96}}
              onClick={()=>{
                setHighReadabilityMode(m => { const next = !m; setToastMsg(next ? "High-readability mode ON — text enlarged for low-light" : "High-readability mode OFF"); setTimeout(()=>setToastMsg(null),2800); return next; });
                setIsCommandCenterOpen(false);
              }}
              style={{ flex:1, padding:"14px 10px", borderRadius:10, border:`2px solid ${highReadabilityMode ? AMBER : "rgba(212,175,55,0.40)"}`, background:highReadabilityMode ? `rgba(212,175,55,0.14)` : "rgba(212,175,55,0.05)", color:AMBER, fontSize:11, fontWeight:900, cursor:"pointer", letterSpacing:"0.07em", textTransform:"uppercase" as const }}>
              {highReadabilityMode ? "HIGH-READABILITY ON" : "FORCE HIGH-READABILITY"}
            </motion.button>
            <motion.button whileTap={{scale:0.96}}
              onClick={()=>{
                setLighting(65); setScentPct(40); setEnvPreset(PRESET_OPTIONS[0]);
                setToastMsg("Active venue reset — environment restored to defaults");
                setTimeout(()=>setToastMsg(null),2800);
                setIsCommandCenterOpen(false);
              }}
              style={{ flex:1, padding:"14px 10px", borderRadius:10, border:"1px solid rgba(255,255,255,0.18)", background:"rgba(255,255,255,0.05)", color:"rgba(255,255,255,0.82)", fontSize:11, fontWeight:900, cursor:"pointer", letterSpacing:"0.07em", textTransform:"uppercase" as const }}>
              RESET ACTIVE VENUE
            </motion.button>
          </div>

          <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.18em", color:"rgba(255,255,255,0.35)", textTransform:"uppercase", marginBottom:10 }}>Quick Actions</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:18 }}>
            {([
              { label:"Kill Switch",   tag:"[X]", desc:"Halt all transactions"  },
              { label:"Force Sync",    tag:"[S]", desc:"Push config to devices" },
              { label:"Broadcast",     tag:"[B]", desc:"Send staff message"      },
              { label:"Panic Mode",    tag:"[!]", desc:"Lock down venue ops"     },
              { label:"Vent Override", tag:"[V]", desc:"Open HVAC manual mode"  },
              { label:"Dev Mode",      tag:"[D]", desc:"Debug overlay toggle"   },
            ] as {label:string;tag:string;desc:string}[]).map(a=>(
              <motion.button key={a.label} whileTap={{scale:0.95}}
                style={{ padding:"12px 8px", borderRadius:10, border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.04)", cursor:"pointer", textAlign:"center" as const }}>
                <div style={{ fontSize:11, fontWeight:900, color:"rgba(255,255,255,0.55)", marginBottom:4, fontFamily:"'Space Mono','Courier New',monospace", letterSpacing:"0.06em" }}>{a.tag}</div>
                <div style={{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,0.85)", marginBottom:2 }}>{a.label}</div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", lineHeight:1.4 }}>{a.desc}</div>
              </motion.button>
            ))}
          </div>

          <div style={{ display:"flex", gap:8, marginBottom:18 }}>
            {([
              { label:"Tables",   val:String(activeTabs.length),                               unit:"active"    },
              { label:"Revenue",  val:`$${activeTabs.reduce((s,t)=>s+t.total,0).toFixed(0)}`,  unit:"open tabs" },
              { label:"Devices",  val:String(devices.filter(d=>d.online).length),              unit:"online"    },
              { label:"Lighting", val:`${lighting}%`,                                          unit:"current"   },
            ] as {label:string;val:string;unit:string}[]).map(s=>(
              <div key={s.label} style={{ flex:1, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:8, padding:"10px 8px", textAlign:"center" as const }}>
                <div style={{ fontSize:16, fontWeight:900, color:"rgba(255,255,255,0.9)" }}>{s.val}</div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.40)", textTransform:"uppercase" as const, letterSpacing:"0.10em", marginTop:2 }}>{s.label}</div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)", marginTop:1 }}>{s.unit}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.18em", color:"rgba(255,255,255,0.35)", textTransform:"uppercase", marginBottom:10 }}>Environment Fast Controls</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" as const, marginBottom:18 }}>
            {PRESET_OPTIONS.map(p=>(
              <motion.button key={p} whileTap={{scale:0.95}} onClick={()=>{setEnvPreset(p);setIsCommandCenterOpen(false);}}
                style={{ padding:"8px 14px", borderRadius:20, border:`1px solid ${envPreset===p?AMBER:"rgba(255,255,255,0.12)"}`, background:envPreset===p?`rgba(212,175,55,0.15)`:"transparent", color:envPreset===p?AMBER:"rgba(255,255,255,0.60)", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                {p}
              </motion.button>
            ))}
          </div>

          <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:8, padding:"12px 14px" }}>
            <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.18em", color:"rgba(255,255,255,0.35)", textTransform:"uppercase", marginBottom:8 }}>System Status</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {([
                { name:"WebSocket",   ok:wsConnected },
                { name:"POS Bridge",  ok:true        },
                { name:"Environment", ok:true        },
                { name:"Stripe",      ok:true        },
              ] as {name:string;ok:boolean}[]).map(s=>(
                <div key={s.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:11, color:"rgba(255,255,255,0.50)" }}>{s.name}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", background:s.ok?"#27AE60":"#C0392B" }} />
                    <span style={{ fontSize:11, fontWeight:700, color:s.ok?"#27AE60":"#C0392B" }}>{s.ok?"Online":"Offline"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTIVE BROADCAST BANNER ─────────────────────────────────────── */}
      {activeBroadcast && (
        <motion.div initial={{ y:-80 }} animate={{ y:0 }}
          style={{ position:"fixed", top:0, left:0, right:0, zIndex:9999, background:`linear-gradient(90deg,${AMBER},${AMBER2})`, padding:"10px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 24px rgba(212,175,55,0.45)" }}>
          <div style={{ display:"flex", gap:14, alignItems:"center" }}>
            <motion.div animate={{ scale:[1,1.4,1] }} transition={{ repeat:Infinity, duration:1.2 }}
              style={{ width:8, height:8, borderRadius:"50%", background:"#1A0C00", flexShrink:0 }} />
            <div>
              <span style={{ fontSize:13, fontWeight:900, color:"#1A0C00", letterSpacing:"0.06em" }}>LIVE FLASH SPECIAL — </span>
              <span style={{ fontSize:13, fontWeight:800, color:"#1A0C00" }}>{activeBroadcast.product}</span>
              {activeBroadcast.price && <span style={{ fontSize:13, fontWeight:700, color:"#1A0C00" }}> · ${activeBroadcast.price}</span>}
              {activeBroadcast.message && <span style={{ fontSize:12, color:"rgba(0,0,0,0.55)", marginLeft:10 }}>{activeBroadcast.message}</span>}
            </div>
          </div>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <span style={{ fontSize:11, fontWeight:700, color:"rgba(0,0,0,0.50)" }}>
              Expires {new Date(activeBroadcast.expiresAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
            </span>
            <motion.button whileTap={{scale:0.96}} onClick={()=>setActiveBroadcast(null)}
              style={{ padding:"4px 12px", borderRadius:5, border:"1px solid rgba(0,0,0,0.20)", background:"rgba(0,0,0,0.10)", color:"#1A0C00", fontSize:11, fontWeight:700, cursor:"pointer" }}>
              End
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* ── BROADCAST MODAL ─────────────────────────────────────────────── */}
      {broadcastModal && (
        <div style={{ position:"fixed", inset:0, zIndex:9998, background:"rgba(0,0,0,0.74)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <motion.div initial={{scale:0.92,opacity:0}} animate={{scale:1,opacity:1}}
            style={{ background:CARD_BG, border:`1px solid ${AMBER}`, borderRadius:16, padding:"28px 32px", width:"100%", maxWidth:520, boxShadow:"0 24px 60px rgba(0,0,0,0.40)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
              <div>
                <div style={{ fontSize:10, letterSpacing:"0.22em", color:TEXT3, fontWeight:800, textTransform:"uppercase" as const, marginBottom:5 }}>COMMAND CENTER</div>
                <div style={{ fontSize:22, fontWeight:900, color:TEXT1 }}>Push Broadcaster</div>
                <div style={{ fontSize:12, color:TEXT3, marginTop:3 }}>Inject a flash special to all active guest tablets</div>
              </div>
              <motion.button whileTap={{scale:0.95}} onClick={()=>setBroadcastModal(false)}
                style={{ padding:"6px 14px", borderRadius:6, border:`1px solid ${BORDER}`, background:"transparent", color:TEXT3, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                Close
              </motion.button>
            </div>
            <div style={{ display:"flex", flexDirection:"column" as const, gap:14 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:TEXT3, textTransform:"uppercase" as const, letterSpacing:"0.10em", marginBottom:6 }}>Flash Product</div>
                <input value={broadcastForm.product} onChange={e=>setBroadcastForm(f=>({...f,product:e.target.value}))}
                  placeholder="e.g. Padron 1926 Anniversary"
                  style={{ width:"100%", padding:"11px 13px", borderRadius:7, border:`1px solid ${BORDER}`, background:IVORY, color:TEXT1, fontSize:13, fontWeight:600, outline:"none", boxSizing:"border-box" as const }} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:TEXT3, textTransform:"uppercase" as const, letterSpacing:"0.10em", marginBottom:6 }}>Flash Price</div>
                  <input value={broadcastForm.price} onChange={e=>setBroadcastForm(f=>({...f,price:e.target.value}))}
                    placeholder="$38"
                    style={{ width:"100%", padding:"11px 13px", borderRadius:7, border:`1px solid ${BORDER}`, background:IVORY, color:TEXT1, fontSize:13, fontWeight:600, outline:"none", boxSizing:"border-box" as const }} />
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:TEXT3, textTransform:"uppercase" as const, letterSpacing:"0.10em", marginBottom:6 }}>Duration</div>
                  <div style={{ display:"flex", gap:6 }}>
                    {[15,30,60].map(ti=>(
                      <motion.button key={ti} whileTap={{scale:0.95}} onClick={()=>setBroadcastForm(f=>({...f,timer:ti}))}
                        style={{ flex:1, padding:"10px 4px", borderRadius:7, border:`1px solid ${broadcastForm.timer===ti?AMBER:BORDER}`, background:broadcastForm.timer===ti?`rgba(212,175,55,0.12)`:IVORY, color:broadcastForm.timer===ti?AMBER2:TEXT2, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                        {ti}m
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:TEXT3, textTransform:"uppercase" as const, letterSpacing:"0.10em", marginBottom:6 }}>Message (optional)</div>
                <input value={broadcastForm.message} onChange={e=>setBroadcastForm(f=>({...f,message:e.target.value}))}
                  placeholder="e.g. Tonight only — limited stock"
                  style={{ width:"100%", padding:"11px 13px", borderRadius:7, border:`1px solid ${BORDER}`, background:IVORY, color:TEXT1, fontSize:13, fontWeight:600, outline:"none", boxSizing:"border-box" as const }} />
              </div>
              <motion.button whileTap={{scale:0.97}} onClick={()=>{
                  if(!broadcastForm.product) return;
                  const expiresAt = Date.now() + broadcastForm.timer * 60 * 1000;
                  setActiveBroadcast({ product:broadcastForm.product, price:broadcastForm.price, message:broadcastForm.message, expiresAt });
                  setBroadcastModal(false);
                  setBroadcastForm({ product:"", price:"", message:"", timer:30 });
                  setToastMsg(`Broadcast LIVE — ${broadcastForm.product}`);
                  setTimeout(()=>setToastMsg(null),3000);
                  setTimeout(()=>setActiveBroadcast(null), broadcastForm.timer * 60 * 1000);
                }}
                style={{ padding:"14px", borderRadius:8, border:"none", background:`linear-gradient(135deg,${AMBER},${AMBER2})`, color:"#1A0C00", fontSize:14, fontWeight:900, cursor:"pointer" }}>
                Broadcast to All Tablets
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── TICKET TAPPER MODAL ──────────────────────────────────────────── */}
      {ticketTapper && (
        <div style={{ position:"fixed", inset:0, zIndex:9998, background:"rgba(0,0,0,0.74)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <motion.div initial={{scale:0.92,opacity:0}} animate={{scale:1,opacity:1}}
            style={{ background:CARD_BG, border:`1px solid ${AMBER}`, borderRadius:16, padding:"28px 32px", width:"100%", maxWidth:460, boxShadow:"0 24px 60px rgba(0,0,0,0.40)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
              <div>
                <div style={{ fontSize:10, letterSpacing:"0.22em", color:TEXT3, fontWeight:800, textTransform:"uppercase" as const, marginBottom:5 }}>TICKET TAPPER</div>
                <div style={{ fontSize:20, fontWeight:900, color:TEXT1 }}>{ticketTapper.name}</div>
                <div style={{ fontSize:12, color:TEXT3, marginTop:3 }}>{ticketTapper.notes} · <span style={{ color:AMBER2, fontWeight:800 }}>${ticketTapper.price}</span></div>
              </div>
              <motion.button whileTap={{scale:0.95}} onClick={()=>setTicketTapper(null)}
                style={{ padding:"6px 14px", borderRadius:6, border:`1px solid ${BORDER}`, background:"transparent", color:TEXT3, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                Close
              </motion.button>
            </div>
            <div style={{ fontSize:11, fontWeight:800, color:TEXT3, textTransform:"uppercase" as const, letterSpacing:"0.12em", marginBottom:10 }}>Add to Which Tab?</div>
            <div style={{ display:"flex", flexDirection:"column" as const, gap:8 }}>
              {activeTabs.map(t=>(
                <motion.button key={t.id} whileTap={{scale:0.97}}
                  onClick={()=>{
                    const token=localStorage.getItem("axiom_token")??"";
                    fetch(`/api/tabs/${t.id}/items`,{method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({productName:ticketTapper.name,unitCents:Math.round(ticketTapper.price*100),quantity:1,craftType:ticketTapper.sub})}).catch(()=>{});
                    setToastMsg(`${ticketTapper.name} added to ${t.name}`);
                    setTimeout(()=>setToastMsg(null),2400);
                    setTicketTapper(null);
                  }}
                  style={{ padding:"12px 16px", borderRadius:8, border:`1px solid ${BORDER}`, background:IVORY, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ textAlign:"left" as const }}>
                    <div style={{ fontSize:13, fontWeight:800, color:TEXT1 }}>{t.name}</div>
                    <div style={{ fontSize:11, color:TEXT3 }}>Table {t.tableNumber} · {t.items.length} items · ${t.total.toFixed(0)}</div>
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color:AMBER2 }}>Add +</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* ── PRODUCT EDIT MODAL ──────────────────────────────────────────── */}
      {productEditModal && (
        <div style={{ position:"fixed", inset:0, zIndex:9998, background:"rgba(0,0,0,0.74)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <motion.div initial={{scale:0.92,opacity:0}} animate={{scale:1,opacity:1}}
            style={{ background:CARD_BG, border:`1px solid ${AMBER}`, borderRadius:16, padding:"28px 32px", width:"100%", maxWidth:480, boxShadow:"0 24px 60px rgba(0,0,0,0.40)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
              <div>
                <div style={{ fontSize:10, letterSpacing:"0.22em", color:TEXT3, fontWeight:800, textTransform:"uppercase" as const, marginBottom:5 }}>ASSET CATALOG</div>
                <div style={{ fontSize:22, fontWeight:900, color:TEXT1 }}>Edit Product</div>
              </div>
              <motion.button whileTap={{scale:0.95}} onClick={()=>setProductEditModal(false)}
                style={{ padding:"6px 14px", borderRadius:6, border:`1px solid ${BORDER}`, background:"transparent", color:TEXT3, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                Close
              </motion.button>
            </div>
            <div style={{ display:"flex", flexDirection:"column" as const, gap:14 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:TEXT3, textTransform:"uppercase" as const, letterSpacing:"0.10em", marginBottom:6 }}>Product Name</div>
                <input value={productEditForm.name} onChange={e=>setProductEditForm(f=>({...f,name:e.target.value}))}
                  style={{ width:"100%", padding:"11px 13px", borderRadius:7, border:`1px solid ${BORDER}`, background:IVORY, color:TEXT1, fontSize:13, fontWeight:600, outline:"none", boxSizing:"border-box" as const }} />
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:TEXT3, textTransform:"uppercase" as const, letterSpacing:"0.10em", marginBottom:6 }}>Price ($)</div>
                <input type="number" value={productEditForm.price} onChange={e=>setProductEditForm(f=>({...f,price:e.target.value}))}
                  style={{ width:"100%", padding:"11px 13px", borderRadius:7, border:`1px solid ${BORDER}`, background:IVORY, color:TEXT1, fontSize:13, fontWeight:600, outline:"none", boxSizing:"border-box" as const }} />
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:TEXT3, textTransform:"uppercase" as const, letterSpacing:"0.10em", marginBottom:6 }}>Description</div>
                <textarea value={productEditForm.description} onChange={e=>setProductEditForm(f=>({...f,description:e.target.value}))} rows={3}
                  style={{ width:"100%", padding:"11px 13px", borderRadius:7, border:`1px solid ${BORDER}`, background:IVORY, color:TEXT1, fontSize:12, fontWeight:500, outline:"none", boxSizing:"border-box" as const, resize:"none" as const, lineHeight:1.55 }} />
              </div>
              <div style={{ display:"flex", gap:10, marginTop:4 }}>
                <motion.button whileTap={{scale:0.96}} onClick={()=>setProductEditModal(false)}
                  style={{ flex:1, padding:"12px", borderRadius:8, border:`1px solid ${BORDER}`, background:IVORY, color:TEXT2, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  Cancel
                </motion.button>
                <motion.button whileTap={{scale:0.97}} onClick={()=>{
                    setFeaturedCigar(fc=>({...fc, name:productEditForm.name, price:Number(productEditForm.price)||fc.price, description:productEditForm.description}));
                    setProductEditModal(false);
                    setToastMsg("Product updated");
                    setTimeout(()=>setToastMsg(null),2200);
                  }}
                  style={{ flex:1, padding:"12px", borderRadius:8, border:"none", background:`linear-gradient(135deg,${AMBER},${AMBER2})`, color:"#1A0C00", fontSize:13, fontWeight:900, cursor:"pointer" }}>
                  Save Changes
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── TABLET MONITOR OVERLAY ──────────────────────────────────────── */}
      {tabletMonitor && (
        <div style={{ position:"fixed", inset:0, zIndex:9997, background:"rgba(0,0,0,0.40)" }} onClick={()=>setTabletMonitor(null)}>
          <motion.div initial={{x:340,opacity:0}} animate={{x:0,opacity:1}} onClick={e=>e.stopPropagation()}
            style={{ position:"absolute", top:60, right:24, background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:16, padding:"24px 26px", width:360, boxShadow:"0 24px 60px rgba(0,0,0,0.40)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <div>
                <div style={{ fontSize:10, letterSpacing:"0.22em", color:TEXT3, fontWeight:800, textTransform:"uppercase" as const, marginBottom:4 }}>LIVE MONITOR</div>
                <div style={{ fontSize:18, fontWeight:900, color:TEXT1 }}>{tabletMonitor.name}</div>
                <div style={{ fontSize:11, color:TEXT3 }}>Zone {tabletMonitor.zone}</div>
              </div>
              <motion.button whileTap={{scale:0.95}} onClick={()=>setTabletMonitor(null)}
                style={{ padding:"6px 12px", borderRadius:6, border:`1px solid ${BORDER}`, background:"transparent", color:TEXT3, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                Close
              </motion.button>
            </div>
            <div style={{ background:OBSID, borderRadius:10, padding:"14px 16px", marginBottom:14 }}>
              <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:12 }}>
                <motion.div animate={{ opacity:[1,0.3,1] }} transition={{ repeat:Infinity, duration:1.4 }}
                  style={{ width:7, height:7, borderRadius:"50%", background:GREEN }} />
                <span style={{ fontSize:11, fontWeight:700, color:"rgba(240,232,212,0.70)", letterSpacing:"0.10em" }}>LIVE SESSION</span>
              </div>
              {[
                { label:"Current Screen",   val:"Humidor Reserve",         note:"2 min" },
                { label:"Previous Screen",  val:"CraftHub — Smoke",        note:"4 min" },
                { label:"Items Viewed",     val:"Rocky Patel, Padron 1964",note:""      },
                { label:"Cart Status",      val:"Empty — still browsing",  note:""      },
                { label:"Session Duration", val:"18 min",                  note:""      },
              ].map(r=>(
                <div key={r.label} style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontSize:11, color:"rgba(240,232,212,0.40)" }}>{r.label}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:"rgba(240,232,212,0.88)" }}>
                    {r.val}{r.note && <span style={{ fontSize:10, color:"rgba(240,232,212,0.30)", marginLeft:6 }}>{r.note} ago</span>}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <motion.button whileTap={{scale:0.96}}
                onClick={()=>{ setToastMsg(`Push alert sent to ${tabletMonitor.name}`); setTimeout(()=>setToastMsg(null),2200); setTabletMonitor(null); }}
                style={{ flex:1, padding:"10px", borderRadius:7, border:`1px solid ${AMBER}`, background:`rgba(212,175,55,0.10)`, color:AMBER2, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                Send Alert
              </motion.button>
              <motion.button whileTap={{scale:0.96}}
                onClick={()=>{ setTicketTapper(livePairings[0]); setTabletMonitor(null); }}
                style={{ flex:1, padding:"10px", borderRadius:7, border:`1px solid ${BORDER}`, background:IVORY, color:TEXT2, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                Tap Item
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
