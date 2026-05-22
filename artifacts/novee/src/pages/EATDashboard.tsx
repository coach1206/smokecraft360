/**
 * EATDashboard — E.A.T. System Hospitality OS
 * Ivory Cream + Solid Obsidian aesthetic — matches reference screenshot v6
 * ZERO GLYPH / ZERO EMOJI mandate enforced throughout
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { socket } from "@/lib/socket";
import { useGuest } from "@/context/GuestProfileContext";
import {
  eatEngine,
  type EnvironmentState,
  type InventoryProduct,
  type CheckoutRequest,
} from "@/lib/eatEngine";
import type { EATModuleFlags } from "@/pages/ExecutiveCommandCenter";

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
    <div style={{ position:"relative", height:12, borderRadius:6, background:"rgba(0,0,0,0.09)", cursor:"pointer", boxShadow:"inset 0 1px 2px rgba(0,0,0,0.10)" }}>
      <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${AMBER},${AMBER2})`, borderRadius:6 }} />
      <input type="range" min={0} max={100} value={value} onChange={e=>onChange(Number(e.target.value))}
        style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0, cursor:"pointer", margin:0 }} />
      <div style={{ position:"absolute", top:"50%", left:`${pct}%`, transform:"translate(-50%,-50%)", width:20, height:20, borderRadius:"50%", background:IVORY, border:"1.5px solid #2C2C30", boxShadow:"0 2px 6px rgba(0,0,0,0.20)", pointerEvents:"none" }} />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function EATDashboard({ eatFlags: _eatFlags }: EATDashboardProps) {
  const { profile } = useGuest();
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
      { table:"Table 4",  signal:"Guests flagged — 40 min no order",    urgency:"HIGH" },
      { table:"VIP 1",    signal:"Upsell window open — 82% taste match", urgency:"MED"  },
      { table:"Table 2",  signal:"Check-in recommended soon",            urgency:"LOW"  },
    ],
    staffDeployment:[
      { zone:"Main Lounge",  action:"Deploy server — 3 tables unattended", priority:"URGENT"   },
      { zone:"VIP Section",  action:"Sommelier recommended for new party",  priority:"STANDARD" },
      { zone:"Humidor Bar",  action:"Maintain current coverage",            priority:"NOMINAL"  },
    ],
    occupancyForecast:[
      { table:"Table 1", forecast:"Departure likely",       eta:"~15 min" },
      { table:"Table 3", forecast:"Extended stay expected",  eta:">60 min" },
      { table:"Table 6", forecast:"Turnover imminent",       eta:"~8 min"  },
    ],
    activeScene:"Smokecraft Dimmed Lounge",
    sceneOptions:["Deep Lounge","VIP Reserve","Bright Service","Closing Ritual"],
    orchestrationStatus:"ACTIVE", revenueSignal:"UPSELL WINDOW", lastSync:"just now",
  };
  const [viData, setViData]         = useState<VIData>(VI_DEFAULTS);
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
            imageUrl:item.imageUrl?String(item.imageUrl):prev.imageUrl,
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

    const fetchEnv = () => {
      fetch(`/api/environment/${encodeURIComponent(vId)}`, { headers:hdr(token) }).then(r=>r.ok?r.json():null).then(d=>{ if(d&&typeof d==="object") setEnvState(prev=>({...prev,...d})); }).catch(()=>{});
    };
    fetchEnv();
    const envPoll = setInterval(fetchEnv, 30_000);

    fetch(`/api/orders/venue/${encodeURIComponent(vId)}?limit=20`, { headers:hdr(token) }).then(r=>r.ok?r.json():null).then(d=>{
      const list:unknown[]=Array.isArray(d)?d:((d as {orders?:unknown[]}).orders??[]);
      if(list.length>0){ setRecentOrders(list.map((o:unknown)=>{ const order=o as Record<string,unknown>; return { id:String(order.id??""), tableNumber:String(order.tableNumber??order.table??""), items:Array.isArray(order.items)?order.items.map((it:unknown)=>{const item=it as Record<string,unknown>;return{name:String(item.name??""),qty:Number(item.qty??1),price:Number(item.price??0)};}):[],total:Number(order.total??0),status:String(order.status??""),createdAt:String(order.createdAt??order.created_at??"") }; })); }
    }).catch(()=>{});

    return () => {
      eatEngine.stop(); unsubInv(); unsubEnv();
      clearInterval(devicePoll); clearInterval(envPoll);
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
    const rect = floorRef.current?.getBoundingClientRect(); if(!rect) return;
    const t = floorTables.find(t=>t.id===id); if(!t) return;
    dragOff.current = { x:e.clientX-rect.left-(t.x/100)*rect.width, y:e.clientY-rect.top-(t.y/100)*rect.height };
    setDragging(id);
  }, [floorTables]);
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

  const selectedTab = activeTabs.find(t=>t.id===selTabId)?? activeTabs[0];

  const handleAddCigar = useCallback(() => {
    const token=localStorage.getItem("axiom_token")??""; if(!selectedTab) return;
    fetch(`/api/tabs/${selectedTab.id}/items`,{method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({productName:featuredCigar.name,unitCents:Math.round(featuredCigar.price*100),quantity:1,craftType:"smoke"})}).catch(()=>{});
  },[selectedTab,featuredCigar]);
  const handleAddPairing = useCallback(() => {
    const token=localStorage.getItem("axiom_token")??""; if(!selectedTab) return;
    fetch(`/api/tabs/${selectedTab.id}/items`,{method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({productName:"Premium Pairing Selection",unitCents:2800,quantity:1,craftType:"pour"})}).catch(()=>{});
  },[selectedTab]);
  const handleRoute = useCallback((dest:string) => {
    const token=localStorage.getItem("axiom_token")??""; if(!selectedTab) return;
    fetch(`/api/tabs/${selectedTab.id}/route`,{method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({destination:dest,items:selectedTab.items})}).catch(()=>{});
  },[selectedTab]);
  const handleCheckout = useCallback(async () => {
    if(!selectedTab||!selectedTab.items.length) return;
    const req:CheckoutRequest={ venueId:localStorage.getItem("axiom_venue_id")??"venue_01", tableNumber:selectedTab.tableNumber, items:selectedTab.items.map(i=>({productId:`item_${i.name.replace(/\s+/g,"_")}`,name:i.name,qty:i.qty,price:i.price})), successUrl:window.location.href, cancelUrl:window.location.href };
    try { const result=await eatEngine.checkout(req); if(result.checkoutUrl?.startsWith("http")) window.open(result.checkoutUrl,"_blank"); } catch { /* silent */ }
  },[selectedTab]);

  void envState; void recentOrders; void wsConnected;

  // ── RENDER ────────────────────────────────────────────────────────────────
  const SEL = (s:React.CSSProperties): React.CSSProperties => s;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:PAGE_BG, fontFamily:"'Inter','Helvetica Neue',sans-serif", overflow:"hidden" }}>

      {/* ── TOP NAV ──────────────────────────────────────────────────────── */}
      <header style={{ height:72, background:IVORY, borderBottom:`1px solid ${BORDER}`, display:"flex", alignItems:"center", padding:"0 20px", gap:0, flexShrink:0, boxShadow:"0 1px 3px rgba(0,0,0,0.07)", zIndex:50 }}>

        {/* Brand */}
        <div style={{ width:220, flexShrink:0 }}>
          <div style={{ fontSize:17, fontWeight:900, color:OBSID, letterSpacing:"0.04em", lineHeight:1 }}>E.A.T SYSTEM</div>
          <div style={{ fontSize:9, fontWeight:600, color:TEXT3, letterSpacing:"0.18em", marginTop:2, textTransform:"uppercase" }}>Elevated Atmosphere &amp; Transactions</div>
        </div>

        {/* Nav tabs */}
        <nav style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
          {TOP_TABS.map(tab => (
            <motion.button key={tab} onClick={()=>setActiveTab(tab)} whileTap={{ scale:0.96 }}
              style={SEL({ padding:"10px 18px", fontSize:13, fontWeight:500, letterSpacing:"0.03em", cursor:"pointer", borderRadius:4, border:"none", background:activeTab===tab?OBSID:"transparent", color:activeTab===tab?IVORY:TEXT3, transition:"all 0.12s cubic-bezier(0.25,0.46,0.45,0.94)", whiteSpace:"nowrap", minHeight:40 })}>
              {tab}
            </motion.button>
          ))}
        </nav>

        {/* User + clock */}
        <div style={{ width:220, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"flex-end", gap:12 }}>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:13, fontWeight:700, color:TEXT1, lineHeight:1 }}>Marcus C.</div>
            <div style={{ fontSize:11, color:TEXT3, marginTop:2 }}>General Manager</div>
            <div style={{ fontSize:10, color:GREEN, marginTop:3, display:"flex", alignItems:"center", justifyContent:"flex-end", gap:4 }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:GREEN }} />
              {clock}
            </div>
          </div>
          <div style={{ width:38, height:38, borderRadius:"50%", background:`linear-gradient(135deg,${AMBER},${AMBER2})`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, overflow:"hidden" }}>
            <img src={IMG("mentor_dominican.jpg")} alt="Marcus C." style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
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
              <div style={{ fontSize:11, color:TEXT2, lineHeight:1.55 }}>Planning EAT Console UI cleanup...<br />The EAT System is now visible — good.</div>
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
        <main style={{ flex:1, overflowY:"auto", background:PAGE_BG, minWidth:0 }}>
          {activeTab === "Venue Intelligence" ? (
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
          ) : (
          <div style={{ padding:"12px 14px" }}>

            {/* Hero image */}
            <div style={{ position:"relative", borderRadius:10, overflow:"hidden", marginBottom:12, height:260, background:`linear-gradient(135deg,#1C0A02,#3A1A06)` }}>
              <img src={featuredCigar.imageUrl || IMG("cigar_hero.jpg")} alt={featuredCigar.name}
                style={{ width:"100%", height:"100%", objectFit:"cover", position:"absolute", inset:0, opacity:0.92 }}
                onError={e=>{(e.target as HTMLImageElement).src=IMG("cigar_hero.jpg");}} />
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom,rgba(0,0,0,0.10) 0%,rgba(0,0,0,0.55) 100%)" }} />
              <div style={{ position:"absolute", top:12, left:12 }}>
                <span style={{ fontSize:11, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", color:AMBER, background:"rgba(0,0,0,0.50)", padding:"4px 10px", borderRadius:4 }}>{featuredCigar.body}</span>
              </div>
            </div>

            {/* Product details */}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:22, fontWeight:900, color:TEXT1, lineHeight:1.2, marginBottom:3 }}>{featuredCigar.name}</div>
              <div style={{ fontSize:13, color:TEXT3, marginBottom:8 }}>{featuredCigar.type} · {featuredCigar.origin}</div>
              <p style={{ fontSize:13, color:TEXT2, lineHeight:1.6, margin:"0 0 12px 0" }}>{featuredCigar.description}</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:TEXT3, width:60, textTransform:"uppercase", letterSpacing:"0.10em" }}>Strength</span>
                  <StrengthDots v={featuredCigar.strength} />
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:TEXT3, width:60, textTransform:"uppercase", letterSpacing:"0.10em" }}>Rating</span>
                  <RatingDots v={featuredCigar.rating} />
                </div>
              </div>
            </div>

            {/* Thumbnail row */}
            <div style={{ display:"flex", gap:8, marginBottom:14 }}>
              {[IMG("cigar_hero.jpg"), IMG("whiskey.png"), IMG("pour-1.jpg"), IMG("cigar1.png")].map((src,i)=>(
                <div key={i} style={{ flex:1, height:72, borderRadius:7, overflow:"hidden", background:`linear-gradient(135deg,#2C1A08,#1A0C02)`, border:`2px solid ${i===0?AMBER:BORDER}`, cursor:"pointer" }}>
                  <img src={src} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
                </div>
              ))}
            </div>

            {/* Pairing suggestion */}
            <div style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:10, padding:"12px 14px" }}>
              <div style={{ fontSize:13, fontWeight:800, color:TEXT1, marginBottom:4, letterSpacing:"0.04em" }}>Pairing Suggestion</div>
              <div style={{ fontSize:12, color:TEXT3, marginBottom:10 }}>Pairs exceptionally well with aged bourbon or a rich espresso.</div>
              <div style={{ display:"flex", gap:10 }}>
                {[
                  { name:"Buffalo Trace Bourbon", tags:"Rich · Caramel · Vanilla", img:IMG("whiskey.png") },
                  { name:"Espresso",               tags:"Bold · Aromatic · Smooth",  img:IMG("cigar2.png")  },
                ].map((item,i)=>(
                  <div key={i} style={{ flex:1, display:"flex", gap:8, alignItems:"center", background:IVORY, border:`1px solid ${BORDER}`, borderRadius:8, padding:"8px 10px" }}>
                    <div style={{ width:44, height:44, borderRadius:6, overflow:"hidden", background:`linear-gradient(135deg,#2C1A08,#1A0C02)`, flexShrink:0 }}>
                      <img src={item.img} alt={item.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
                    </div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:TEXT1 }}>{item.name}</div>
                      <div style={{ fontSize:10, color:TEXT3 }}>{item.tags}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display:"flex", gap:8, marginTop:12 }}>
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
                  <div style={{ display:"flex", justifyContent:"flex-end" }}>
                    <span style={{ fontSize:17, fontWeight:900, color:AMBER2 }}>${p.price}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Tab selector */}
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.16em", color:TEXT3, textTransform:"uppercase", marginBottom:6 }}>Active Tabs</div>
              {activeTabs.slice(0,4).map(t=>(
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
                  style={{ width:"100%", padding:"9px 10px", marginBottom:5, borderRadius:7, border:`1px solid ${BORDER}`, background:IVORY, color:TEXT2, fontSize:12, fontWeight:700, cursor:"pointer", textAlign:"left" }}>
                  Send to {dest.charAt(0).toUpperCase()+dest.slice(1)}
                </motion.button>
              ))}
            </div>
          </div>
        </aside>

        {/* COL 5 — Environment Controls */}
        <aside style={{ width:244, flexShrink:0, background:CARD_BG, borderLeft:`1px solid ${BORDER}`, overflowY:"auto" }}>
          <div style={{ padding:"12px 12px 0" }}>

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
              <div style={{ marginBottom:5 }}>
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

            <div style={{ height:1, background:BORDER, marginBottom:12 }} />

            {/* HVAC */}
            <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.16em", color:TEXT3, textTransform:"uppercase", marginBottom:8 }}>HVAC &amp; Air Quality</div>
            <div style={{ display:"flex", flexDirection:"column", gap:7, paddingBottom:12 }}>
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

      {/* ── BOTTOM TAB BAR ───────────────────────────────────────────────── */}
      <footer style={{ height:60, background:"#0F0A04", display:"flex", flexShrink:0, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
        {BOT_NAV.map(nav=>(
          <motion.div key={nav.label} whileTap={{scale:0.94}}
            style={{ flex:1, position:"relative", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", overflow:"hidden" }}>
            {nav.img && (
              <img src={nav.img} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", opacity:0.22 }} onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
            )}
            <div style={{ position:"absolute", inset:0, background:nav.active?"rgba(212,175,55,0.12)":"rgba(0,0,0,0.20)" }} />
            {nav.active && <div style={{ position:"absolute", top:0, left:"20%", right:"20%", height:2, background:AMBER, borderRadius:"0 0 2px 2px" }} />}
            <span style={{ position:"relative", fontSize:10, fontWeight:700, letterSpacing:"0.14em", color:nav.active?AMBER:"rgba(255,255,255,0.55)", textTransform:"uppercase" }}>
              {nav.label}
            </span>
          </motion.div>
        ))}
      </footer>

    </div>
  );
}
