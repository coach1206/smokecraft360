/**
 * EATDashboard — E.A.T. System Hospitality OS
 * Elevated Atmosphere & Transactions · NOVEE OS
 * Cinematic dark redesign — matches reference eat_system_1111.png
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

// ── Image helper ───────────────────────────────────────────────────────────────
const BASE = import.meta.env.BASE_URL;
const IMG = (n: string) => `${BASE}images/${n}`;

// ── Design tokens — cinematic dark ────────────────────────────────────────────
const GOLD     = "#D4AF37";
const AMBER    = "#C8890A";
const GREEN    = "#4CAF7D";
const RED_CLR  = "#E05050";
const ESPRESSO = "#0E0A04";
const TEXT_PRI = "#FFFFFF";
const TEXT_SEC = "rgba(255,255,255,0.60)";
const TEXT_DIM = "rgba(255,255,255,0.35)";
const SURFACE  = "rgba(18,12,5,0.84)";
const BORDER_G = "rgba(212,175,55,0.20)";
const BORDER_W = "rgba(255,255,255,0.09)";

// ── Navigation tabs ───────────────────────────────────────────────────────────
const TOP_TABS = [
  "Command Center","Assets","Transactions",
  "Pairing Engine","Analytics","Staff",
] as const;
type TopTab = (typeof TOP_TABS)[number];

// ── URL tab sync helpers ──────────────────────────────────────────────────────
const EAT_TAB_SLUG_MAP: Record<string, TopTab> = {
  "command-center": "Command Center",
  "assets":         "Assets",
  "transactions":   "Transactions",
  "pairing-engine": "Pairing Engine",
  "analytics":      "Analytics",
  "staff":          "Staff",
};

export function eatTabToSlug(tab: TopTab): string {
  return tab.toLowerCase().replace(/\s+/g, "-");
}

function parseEATTabFromSearch(search: string): TopTab {
  try {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const raw = params.get("tab");
    if (raw && raw in EAT_TAB_SLUG_MAP) return EAT_TAB_SLUG_MAP[raw];
  } catch { /* ignore */ }
  return "Command Center";
}

// ── Fallback static data ───────────────────────────────────────────────────────
const STATIC_DEVICES = [
  { id:"T-B01", name:"Tablet 01", room:"Main Lounge",     battery:100, signal:4, online:true  },
  { id:"T-B02", name:"Tablet 02", room:"VIP Room 1",      battery:85,  signal:3, online:true  },
  { id:"T-B03", name:"Tablet 03", room:"Cigar Patio",     battery:73,  signal:3, online:true  },
  { id:"T-B04", name:"Tablet 04", room:"Bar Station",     battery:92,  signal:4, online:true  },
  { id:"T-B05", name:"Tablet 05", room:"Humidor",         battery:65,  signal:2, online:true  },
  { id:"T-B06", name:"Tablet 06", room:"Kitchen Display", battery:100, signal:4, online:true  },
  { id:"T-B07", name:"Tablet 07", room:"Wine Cellar",     battery:58,  signal:2, online:false },
  { id:"T-B08", name:"Tablet 08", room:"Private Room 2",  battery:41,  signal:1, online:true  },
];

const FEATURED_CIGAR = {
  name:"Padrón 1926 Serie 80", type:"Maduro", origin:"Nicaragua",
  body:"Full Bodied", strength:4, rating:4.5, price:36,
  description:"Rich, bold and complex. Notes of espresso, dark chocolate, earth and black pepper with a long creamy finish.",
  imageUrl: undefined as string | undefined,
};
const PAIRINGS = [
  { name:"Rocky Patel Vintage 1992", sub:"cigar",   notes:"Rich · Dried Fruit · Oak", price:42 },
  { name:"Buffalo Trace Bourbon",    sub:"alcohol", notes:"Artisan cocktail",          price:18 },
  { name:"Maker's Mark Bourbon",     sub:"alcohol", notes:"Chef feature tonight",      price:16 },
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
      { name:"Padrón 1926 Serie 80", qty:1, price:36 },
      { name:"The Macallan 18",      qty:2, price:42 },
      { name:"Wagyu Sliders",        qty:1, price:32 },
      { name:"Smoked Old Fashioned", qty:2, price:18 },
      { name:"Lounge Charge",        qty:1, price:20 },
    ] },
  { id:"t2", name:"Marcus B.", guests:2, server:"Sam K.",   tableNumber:"104",  total:340,  tax:0, items:[] },
  { id:"t3", name:"Elena R.",  guests:4, server:"Alex T.",  tableNumber:"107",  total:198,  tax:0, items:[] },
  { id:"t4", name:"David C.",  guests:2, server:"Chris M.", tableNumber:"108",  total:127,  tax:0, items:[] },
  { id:"t5", name:"Group VIP", guests:5, server:"Alex T.",  tableNumber:"VIP1", total:820,  tax:0, items:[] },
];

const INVENTORY_TABS = ["Kitchen","Bar","Humidor"] as const;
const INVENTORY_DATA: Record<string,{name:string;qty:number;status:"In Stock"|"Low Stock"}[]> = {
  Kitchen:[ {name:"Wagyu Beef",qty:12,status:"In Stock"},{name:"Truffle Oil",qty:4,status:"Low Stock"},{name:"Brioche Buns",qty:28,status:"In Stock"} ],
  Bar:    [ {name:"The Macallan 18",qty:6,status:"Low Stock"},{name:"Pappy Van Winkle",qty:3,status:"Low Stock"},{name:"Hennessy XO",qty:8,status:"In Stock"} ],
  Humidor:[ {name:"Cohiba Behike 52",qty:144,status:"In Stock"},{name:"Padrón 1926 No.9",qty:89,status:"In Stock"},{name:"Oliva Serie V Melanio",qty:112,status:"In Stock"},{name:"Davidoff Millennium",qty:67,status:"In Stock"},{name:"Premium Lighters",qty:23,status:"Low Stock"} ],
};

const MUSIC_OPTIONS  = ["Smooth Jazz","Neo-Soul","Ambient Lounge","Classical","Upbeat Jazz"];
const SCENT_OPTIONS  = ["Leather & Oak","Cedar & Vanilla","Aged Oak","Sandalwood","Citrus & Cedar"];
const PRESET_OPTIONS = ["Warm Lounge","VIP Experience","Ceremony Mode","Late Night","Service Mode"];

type PanelVis = "on"|"muted"|"hidden";

// ── Bottom nav config ─────────────────────────────────────────────────────────
const BOT_NAV = [
  { label:"MENU",         img:IMG("lounge_bg.jpg")      },
  { label:"RESERVATIONS", img:IMG("lounge-bg.png")      },
  { label:"EVENTS",       img:IMG("cigar_hero.jpg")     },
  { label:"E.A.T",        img:"",           eat:true    },
  { label:"MESSAGES",     img:IMG("lounge_bg.jpg")      },
  { label:"REPORTS",      img:IMG("pourcraft-card.jpg") },
  { label:"SETTINGS",     img:IMG("cigar_hero.png")     },
] as const;

// ── Props ─────────────────────────────────────────────────────────────────────
interface EATDashboardProps {
  eatFlags?: EATModuleFlags;
  onBack?: () => void;
}

// ── Micro-components ──────────────────────────────────────────────────────────

function Dot({ color=GREEN }: { color?:string }) {
  return (
    <motion.div
      animate={{ scale:[1,1.4,1], opacity:[1,0.4,1] }}
      transition={{ duration:1.8, repeat:Infinity }}
      style={{ width:7, height:7, borderRadius:"50%", background:color, boxShadow:`0 0 6px ${color}99`, flexShrink:0 }}
    />
  );
}

function BattBar({ pct }: { pct:number }) {
  const c = pct>60 ? GREEN : pct>30 ? AMBER : RED_CLR;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:3 }}>
      <div style={{ width:24, height:8, background:"rgba(255,255,255,0.10)", borderRadius:2, overflow:"hidden", border:`1px solid rgba(255,255,255,0.14)` }}>
        <div style={{ width:`${pct}%`, height:"100%", background:c, transition:"width 0.5s" }} />
      </div>
      <span style={{ fontSize:10, fontWeight:700, color:c }}>{pct}%</span>
    </div>
  );
}

function Stars({ v }: { v:number }) {
  return (
    <div style={{ display:"flex", gap:2 }}>
      {[1,2,3,4,5].map(i=>(
        <span key={i} style={{ fontSize:14, color: i<=v ? GOLD : "rgba(212,175,55,0.25)", lineHeight:1 }}>
          {i<=v ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}

function Strength({ v, max=5 }: { v:number; max?:number }) {
  return (
    <div style={{ display:"flex", gap:5 }}>
      {Array.from({length:max},(_,i)=>(
        <div key={i} style={{
          width:13, height:13, borderRadius:"50%",
          background: i<v ? AMBER : "rgba(180,140,80,0.15)",
          border:`1.5px solid ${i<v ? AMBER : "rgba(180,140,80,0.22)"}`,
        }} />
      ))}
    </div>
  );
}

function GlassPanel({ children, style }: { children:React.ReactNode; style?:React.CSSProperties }) {
  return (
    <div style={{
      background: SURFACE,
      border:`1px solid ${BORDER_G}`,
      borderRadius:12,
      backdropFilter:"blur(16px)",
      WebkitBackdropFilter:"blur(16px)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function SHead({ title, action, onAction }: { title:string; action?:string; onAction?:()=>void }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
      <span style={{ fontSize:11, fontWeight:800, letterSpacing:"0.14em", color:TEXT_DIM, textTransform:"uppercase" }}>{title}</span>
      {action && <button onClick={onAction} style={{ fontSize:11, color:GOLD, background:"none", border:"none", cursor:"pointer", fontWeight:700 }}>{action}</button>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function EATDashboard({ eatFlags: _eatFlags, onBack }: EATDashboardProps) {
  const { profile } = useGuest();
  const venueId = (profile as { venueId?: string }).venueId ?? localStorage.getItem("axiom_venue_id") ?? "default";

  const [activeTab, setTabState] = useState<TopTab>(() => parseEATTabFromSearch(window.location.search));

  const setActiveTab = useCallback((t: TopTab) => {
    setTabState(t);
    const url = new URL(window.location.href);
    if (t === "Command Center") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", eatTabToSlug(t));
    }
    window.history.replaceState({}, "", url.toString());
  }, []);

  useEffect(() => {
    const onPopState = () => setTabState(parseEATTabFromSearch(window.location.search));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const [panelVis, setPanelVis] = useState<{environment:PanelVis;asset:PanelVis;transaction:PanelVis}>(
    { environment:"on", asset:"on", transaction:"on" }
  );
  const [wsConnected, setWsConnected] = useState(socket.connected);
  const [envState, setEnvState]       = useState<EnvironmentState>(eatEngine.getEnvironment());
  const [liveInv, setLiveInv]         = useState<InventoryProduct[]>([]);
  const [devices, setDevices]         = useState(STATIC_DEVICES);
  const [floorTables, setFloorTables] = useState<FloorTable[]>(INITIAL_TABLES);
  const [floorView, setFloorView]     = useState<"Floor Plan"|"List View">("Floor Plan");
  const [dragging, setDragging]       = useState<string|number|null>(null);
  const dragOff = useRef({ x:0, y:0 });
  const floorRef = useRef<HTMLDivElement>(null);
  const [pairingCat, setPairingCat] = useState<"Cigar"|"Spirits"|"Food">("Cigar");
  const [txnTab, setTxnTab]         = useState<"Active Tabs"|"Recent Orders"|"Payments">("Active Tabs");
  const [activeTabs, setActiveTabs] = useState<TabRecord[]>(STATIC_TABS);
  const [selTabId, setSelTabId]     = useState<string>(STATIC_TABS[0].id);
  type OrderRow = { id:string; tableNumber:string; items:{name:string;qty:number;price:number}[]; total:number; status:string; createdAt:string };
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);
  const [envHistory, setEnvHistory] = useState<number[]>([28,22,25,18,20,15,17]);
  const [featuredCigar, setFeaturedCigar] = useState(FEATURED_CIGAR);
  const [livePairings, setLivePairings]   = useState(PAIRINGS);
  const [invCat, setInvCat] = useState<"Kitchen"|"Bar"|"Humidor">("Kitchen");
  const [envPreset, setEnvPreset]   = useState(PRESET_OPTIONS[0]);
  const [lighting, setLighting]     = useState(65);
  const [musicMode, setMusicMode]   = useState(MUSIC_OPTIONS[0]);
  const [scentMode, setScentMode]   = useState(SCENT_OPTIONS[0]);
  const [scentPct, setScentPct]     = useState(40);
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}));

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      setClock(new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}));
    }, 30000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    eatEngine.start();
    const unsubInv = eatEngine.subscribeInventory(setLiveInv);
    const unsubEnv = eatEngine.subscribeEnvironment(setEnvState);
    const onConn    = () => setWsConnected(true);
    const onDisconn = () => setWsConnected(false);
    const onPV = (d: Partial<typeof panelVis>) => setPanelVis(prev => ({ ...prev, ...d }));
    socket.on("connect",          onConn);
    socket.on("disconnect",       onDisconn);
    socket.on("panel_visibility", onPV);

    const token = localStorage.getItem("axiom_token") ?? "";
    const hdr = (t:string): Record<string,string> => t ? { Authorization:`Bearer ${t}` } : {};

    fetch("/api/admin/panel-config", { headers:hdr(token) })
      .then(r=>r.ok?r.json():null)
      .then(d=>{ if(d) setPanelVis(p=>({...p,...d})); })
      .catch(()=>{});

    const fetchDevices = () => {
      fetch(`/api/devices/venue/${encodeURIComponent(venueId)}`, { headers:hdr(token) })
        .then(r=>r.ok?r.json():null)
        .then(d=>{
          if (Array.isArray(d) && d.length>0) {
            setDevices(d.slice(0,8).map((dev:Record<string,unknown>, i:number)=>({
              id:      String(dev.id ?? `T-B0${i+1}`),
              name:    String(dev.nickname ?? `Tablet 0${i+1}`),
              room:    String(dev.tableNumber ?? "Main Floor"),
              battery: typeof dev.battery === "number" ? dev.battery : 100,
              signal:  typeof dev.signal  === "number" ? dev.signal  : 4,
              online:  dev.status === "active",
            })));
          }
        }).catch(()=>{});
    };
    fetchDevices();
    const devicePoll = setInterval(fetchDevices, 30000);

    fetch(`/api/pairing-engine/suggest`, { headers:hdr(token) })
      .then(r=>r.ok?r.json():null)
      .then(d=>{
        if(d && typeof d === "object") {
          const rec = d as Record<string,unknown>;
          const suggestions: unknown[] = Array.isArray(rec.suggestions) ? rec.suggestions
            : Array.isArray(rec.recommendations) ? rec.recommendations : [];
          const item = (suggestions[0] ?? rec) as Record<string,unknown>;
          if (item && item.name) {
            setFeaturedCigar(prev => ({
              ...prev,
              name:        String(item.name    ?? prev.name),
              body:        String(item.body    ?? item.wrapper ?? prev.body),
              origin:      String(item.origin  ?? item.country ?? prev.origin),
              type:        String(item.type    ?? item.brand   ?? prev.type),
              description: String(item.description ?? item.flavorNotes ?? prev.description),
              strength:    Number(item.strength ?? prev.strength),
              rating:      Number(item.rating   ?? item.score ?? prev.rating),
              price:       item.costCents != null ? Math.round(Number(item.costCents)/100)
                         : item.price    != null ? Number(item.price) : prev.price,
              imageUrl:    item.imageUrl ? String(item.imageUrl) : prev.imageUrl,
            }));
          }
          if (suggestions.length > 0) {
            setLivePairings(suggestions.slice(0, 3).map((s: unknown, i: number) => {
              const sg = s as Record<string,unknown>;
              return {
                name:  String(sg.name ?? PAIRINGS[i]?.name ?? "House Pairing"),
                sub:   String(sg.category ?? sg.sub ?? PAIRINGS[i]?.sub ?? ""),
                notes: String(sg.description ?? sg.notes ?? PAIRINGS[i]?.notes ?? "Premium pairing"),
                price: sg.costCents != null ? Math.round(Number(sg.costCents)/100)
                     : sg.price    != null ? Number(sg.price)
                     : (PAIRINGS[i]?.price ?? 18),
              };
            }));
          }
        }
      }).catch(()=>{});

    const fetchTabs = () => {
      fetch(`/api/tabs/venue/${encodeURIComponent(venueId)}`, { headers:hdr(token) })
        .then(r=>r.ok?r.json():null)
        .then(d=>{
          if(!d) return;
          const rows: unknown[] = (d as {tabs?:unknown[]}).tabs ?? (Array.isArray(d)?d:[]);
          if (rows.length > 0) {
            setActiveTabs(rows.slice(0,6).map((t:unknown, i:number) => {
              const tab = t as Record<string,unknown>;
              return {
                id:          String(tab.id ?? `tab_${i}`),
                name:        String(tab.guestName ?? tab.name ?? `Table ${i+1}`),
                server:      String(tab.serverName ?? tab.server ?? "Staff"),
                tableNumber: String(tab.tableNumber ?? String(i+1)),
                guests:      Number(tab.guestCount ?? tab.guests ?? 1),
                items:       Array.isArray(tab.items) ? tab.items.map((it:unknown) => {
                  const item = it as Record<string,unknown>;
                  return { name:String(item.name??"Item"), qty:Number(item.qty??1), price:Number(item.price??0) };
                }) : [],
                total: Number(tab.total ?? 0),
                tax:   Number(tab.tax ?? 0),
              };
            }));
            setSelTabId(String((rows[0] as Record<string,unknown>).id ?? "tab_0"));
          }
        }).catch(()=>{});
    };
    fetchTabs();
    const tabPoll = setInterval(fetchTabs, 60_000);

    const fetchEnv = () => {
      fetch(`/api/environment/${encodeURIComponent(venueId)}`, { headers:hdr(token) })
        .then(r=>r.ok?r.json():null)
        .then(d=>{ if(d && typeof d === "object") setEnvState(prev => ({ ...prev, ...d })); })
        .catch(()=>{});
    };
    fetchEnv();
    const envPoll = setInterval(fetchEnv, 30_000);

    fetch(`/api/environment/${encodeURIComponent(venueId)}/history`, { headers:hdr(token) })
      .then(r=>r.ok?r.json():null)
      .then(d=>{
        const list: unknown[] = Array.isArray(d) ? d : ((d as {history?:unknown[]}).history ?? []);
        if (list.length > 0) {
          const temps = list.slice(0, 7).map((p:unknown) => {
            const point = p as Record<string,unknown>;
            const t = Number(point.temperature ?? point.temp ?? 72);
            return Math.max(0, Math.min(36, 36 - ((t - 60) / 20) * 36));
          });
          setEnvHistory(temps);
        }
      }).catch(()=>{});

    fetch(`/api/orders/venue/${encodeURIComponent(venueId)}?limit=20`, { headers:hdr(token) })
      .then(r=>r.ok?r.json():null)
      .then(d=>{
        const list: unknown[] = Array.isArray(d) ? d : ((d as {orders?:unknown[]}).orders ?? []);
        if (list.length > 0) {
          setRecentOrders(list.map((o:unknown) => {
            const order = o as Record<string,unknown>;
            return {
              id:         String(order.id ?? ""),
              tableNumber:String(order.tableNumber ?? order.table ?? ""),
              items:      Array.isArray(order.items) ? order.items.map((it:unknown) => {
                const item = it as Record<string,unknown>;
                return { name:String(item.name??""), qty:Number(item.qty??1), price:Number(item.price??0) };
              }) : [],
              total:    Number(order.total ?? 0),
              status:   String(order.status ?? ""),
              createdAt:String(order.createdAt ?? order.created_at ?? ""),
            };
          }));
        }
      }).catch(()=>{});

    return () => {
      eatEngine.stop();
      unsubInv(); unsubEnv();
      clearInterval(devicePoll);
      clearInterval(tabPoll);
      clearInterval(envPoll);
      socket.off("connect",          onConn);
      socket.off("disconnect",       onDisconn);
      socket.off("panel_visibility", onPV);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Floor drag handlers
  const onTableMD = useCallback((e:React.MouseEvent, id:string|number) => {
    e.preventDefault();
    const rect = floorRef.current?.getBoundingClientRect();
    if(!rect) return;
    const t = floorTables.find(t=>t.id===id);
    if(!t) return;
    dragOff.current = {
      x: e.clientX - rect.left - (t.x/100)*rect.width,
      y: e.clientY - rect.top  - (t.y/100)*rect.height,
    };
    setDragging(id);
  }, [floorTables]);

  const envDebounce = useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(() => {
    if(envDebounce.current) clearTimeout(envDebounce.current);
    envDebounce.current = setTimeout(() => {
      const token = localStorage.getItem("axiom_token") ?? "";
      fetch(`/api/environment/${encodeURIComponent(venueId)}`, {
        method:"PATCH",
        headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},
        body:JSON.stringify({ lighting, scent:scentPct, musicMode, scentMode }),
      }).catch(()=>{});
    }, 800);
    return () => { if(envDebounce.current) clearTimeout(envDebounce.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lighting, scentPct, musicMode, scentMode]);

  useEffect(() => {
    if(!envPreset) return;
    const token = localStorage.getItem("axiom_token") ?? "";
    fetch(`/api/environment/${encodeURIComponent(venueId)}/preset`, {
      method:"POST",
      headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},
      body:JSON.stringify({ preset:envPreset }),
    }).catch(()=>{});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envPreset]);

  const onFloorMM = useCallback((e:React.MouseEvent) => {
    if(!dragging || !floorRef.current) return;
    const rect = floorRef.current.getBoundingClientRect();
    const x = Math.max(2, Math.min(88, ((e.clientX-rect.left-dragOff.current.x)/rect.width)*100));
    const y = Math.max(2, Math.min(88, ((e.clientY-rect.top -dragOff.current.y)/rect.height)*100));
    setFloorTables(prev => prev.map(t => t.id===dragging ? {...t, x, y} : t));
  }, [dragging]);

  const onFloorMU = useCallback(() => {
    if(dragging) {
      const t = floorTables.find(t=>t.id===dragging);
      if(t) {
        const token = localStorage.getItem("axiom_token") ?? "";
        fetch(`/api/staffFloor/table/${encodeURIComponent(String(dragging))}`, {
          method:"PATCH",
          headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},
          body:JSON.stringify({x:t.x,y:t.y}),
        }).catch(()=>{});
      }
      setDragging(null);
    }
  }, [dragging, floorTables]);

  const selectedTab = activeTabs.find(t=>t.id===selTabId) ?? activeTabs[0];
  const shiftTotal  = activeTabs.reduce((s,t)=>s+t.total,0);

  // Suppress unused warning
  void liveInv;

  const handleAddCigar = useCallback(() => {
    const token = localStorage.getItem("axiom_token") ?? "";
    if(!selectedTab) return;
    fetch(`/api/tabs/${selectedTab.id}/items`, {
      method:"POST",
      headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},
      body:JSON.stringify({ name:featuredCigar.name, price:featuredCigar.price, qty:1, category:"cigar" }),
    }).catch(()=>{});
  }, [selectedTab, featuredCigar]);

  const handleAddPairing = useCallback(() => {
    const token = localStorage.getItem("axiom_token") ?? "";
    if(!selectedTab) return;
    fetch(`/api/tabs/${selectedTab.id}/items`, {
      method:"POST",
      headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},
      body:JSON.stringify({ name:"Premium Pairing Selection", price:28, qty:1, category:"pairing" }),
    }).catch(()=>{});
  }, [selectedTab]);

  const handleAddFullExperience = useCallback(() => {
    const token = localStorage.getItem("axiom_token") ?? "";
    if(!selectedTab) return;
    fetch(`/api/tabs/${selectedTab.id}/items`, {
      method:"POST",
      headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},
      body:JSON.stringify({ name:"Full Cigar & Pairing Experience", price:featuredCigar.price + 28, qty:1, category:"experience" }),
    }).catch(()=>{});
  }, [selectedTab, featuredCigar]);

  const handleRoute = useCallback((action: string) => {
    const token = localStorage.getItem("axiom_token") ?? "";
    if(!selectedTab) return;
    const dest = action.replace("Send to ","").toLowerCase();
    fetch(`/api/tabs/${selectedTab.id}/route`, {
      method:"POST",
      headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},
      body:JSON.stringify({ destination:dest, items:selectedTab.items }),
    }).catch(()=>{});
  }, [selectedTab]);

  const handleCheckout = useCallback(async () => {
    if(!selectedTab || !selectedTab.items.length) return;
    const req: CheckoutRequest = {
      venueId,
      tableNumber: selectedTab.tableNumber,
      items: selectedTab.items.map(i=>({
        productId:`item_${i.name.replace(/\s+/g,"_")}`,
        name:i.name, qty:i.qty, price:i.price,
      })),
      successUrl: window.location.href,
      cancelUrl:  window.location.href,
    };
    try {
      const result = await eatEngine.checkout(req);
      if(result.checkoutUrl && result.checkoutUrl.startsWith("http")) {
        window.open(result.checkoutUrl, "_blank");
      }
    } catch { /* silent */ }
  }, [selectedTab, venueId]);

  // ── Render: Left Sidebar ──────────────────────────────────────────────────
  const renderLeft = () => (
    <aside style={{
      width:236, flexShrink:0, borderRight:`1px solid ${BORDER_G}`,
      display:"flex", flexDirection:"column", overflow:"hidden",
      background:"rgba(10,8,4,0.70)", backdropFilter:"blur(12px)",
    }}>
      <div style={{ flex:1, overflow:"auto", padding:"10px 8px 0" }}>

        {/* Active Task */}
        <GlassPanel style={{ marginBottom:10, padding:"10px 12px" }}>
          <div style={{ fontSize:10, fontWeight:800, color:TEXT_DIM, letterSpacing:"0.16em", textTransform:"uppercase", marginBottom:8 }}>Active Task</div>
          <div style={{ fontSize:12, fontWeight:700, color:TEXT_PRI, marginBottom:6, lineHeight:1.4 }}>
            Add a celebratory unlock banner
          </div>
          <div style={{ width:"100%", height:4, background:"rgba(255,255,255,0.10)", borderRadius:2, overflow:"hidden", marginBottom:4 }}>
            <motion.div
              initial={{ width:0 }} animate={{ width:"75%" }}
              transition={{ duration:1.2, ease:[0.22,1,0.36,1] }}
              style={{ height:"100%", background:`linear-gradient(90deg,${GOLD},${AMBER})` }}
            />
          </div>
          <div style={{ fontSize:10, color:TEXT_DIM, textAlign:"right" }}>75%</div>
        </GlassPanel>

        {/* Device Status */}
        <GlassPanel style={{ marginBottom:10 }}>
          <div style={{ padding:"8px 12px 6px", borderBottom:`1px solid ${BORDER_W}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:10, fontWeight:800, letterSpacing:"0.14em", color:TEXT_DIM, textTransform:"uppercase" }}>Tablet & Device Status</span>
              <button onClick={()=>{}} style={{ fontSize:10, color:GOLD, background:"none", border:"none", cursor:"pointer", fontWeight:700 }}>View All</button>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
              <Dot color={GREEN} />
              <span style={{ fontSize:11, color:TEXT_SEC }}>{devices.filter(d=>d.online).length} Active Devices</span>
              <span style={{ marginLeft:"auto", fontSize:11, fontWeight:900, color:TEXT_PRI }}>{devices.length} Total</span>
            </div>
          </div>
          <div style={{ maxHeight:150, overflow:"auto" }}>
            {devices.slice(0,4).map(dev => (
              <div key={dev.id} style={{ padding:"6px 12px", borderBottom:`1px solid rgba(255,255,255,0.05)`, display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ fontSize:14, opacity: dev.online ? 1 : 0.35 }}>📱</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:12, fontWeight:700, color:TEXT_PRI }}>{dev.name}</span>
                    <span style={{ fontSize:10, color:TEXT_DIM, fontFamily:"'SF Mono','Fira Mono',monospace" }}>{dev.id}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:2, gap:4 }}>
                    <span style={{ fontSize:10, color:TEXT_SEC, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:70 }}>{dev.room}</span>
                    <BattBar pct={dev.battery} />
                  </div>
                </div>
                <div style={{ width:6, height:6, borderRadius:"50%", background:dev.online?GREEN:RED_CLR, flexShrink:0 }} />
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Active Tables */}
        <GlassPanel>
          <div style={{ padding:"8px 12px 6px", borderBottom:`1px solid ${BORDER_W}` }}>
            <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.14em", color:TEXT_DIM, textTransform:"uppercase", marginBottom:6 }}>Active Tables</div>
            <div style={{ display:"flex", gap:6 }}>
              {(["Floor Plan","List View"] as const).map(v=>(
                <button key={v} onClick={()=>setFloorView(v)}
                  style={{
                    flex:1, padding:"4px 0", fontSize:10, fontWeight:700, cursor:"pointer",
                    borderRadius:6, border:`1px solid ${floorView===v?GOLD:BORDER_W}`,
                    background:floorView===v?"rgba(212,175,55,0.15)":"transparent",
                    color:floorView===v?GOLD:TEXT_SEC,
                  }}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {floorView === "Floor Plan" ? (
            <div
              ref={floorRef}
              onMouseMove={onFloorMM}
              onMouseUp={onFloorMU}
              onMouseLeave={onFloorMU}
              style={{
                position:"relative", height:200, margin:"8px",
                background:"rgba(255,255,255,0.04)", borderRadius:8, overflow:"hidden",
                cursor:dragging?"grabbing":"default",
                border:`1px solid ${BORDER_W}`,
              }}>
              <div style={{ position:"absolute", inset:8, border:"1px dashed rgba(212,175,55,0.18)", borderRadius:6, pointerEvents:"none" }} />
              {floorTables.map(t=>{
                const isVip = t.vip;
                const isActive = t.active;
                return (
                  <motion.div
                    key={String(t.id)}
                    onMouseDown={e=>onTableMD(e,t.id)}
                    animate={{ scale: dragging===t.id ? 1.1 : 1 }}
                    style={{
                      position:"absolute",
                      left:`${t.x}%`, top:`${t.y}%`,
                      transform:"translate(-50%,-50%)",
                      width:isVip?36:28, height:isVip?36:28,
                      borderRadius:isVip?"8px":"50%",
                      background: isVip
                        ? `linear-gradient(135deg,${GOLD},${AMBER})`
                        : isActive ? `rgba(76,175,125,0.25)` : `rgba(255,255,255,0.08)`,
                      border:`1.5px solid ${isVip?GOLD:isActive?"rgba(76,175,125,0.60)":BORDER_W}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      cursor:"grab", userSelect:"none", zIndex:dragging===t.id?10:1,
                    }}>
                    <span style={{ fontSize:isVip?9:8, fontWeight:900, color:isVip?ESPRESSO:isActive?GREEN:TEXT_DIM, lineHeight:1 }}>
                      {isVip?"VIP":String(t.id)}
                    </span>
                    {isActive && t.guests>0 && (
                      <div style={{ position:"absolute", top:-4, right:-4, background:GREEN, color:"white", fontSize:7, fontWeight:900, borderRadius:"50%", width:12, height:12, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {t.guests}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div style={{ maxHeight:200, overflow:"auto" }}>
              {floorTables.filter(t=>t.active).map(t=>(
                <div key={String(t.id)} style={{ padding:"6px 12px", borderBottom:`1px solid rgba(255,255,255,0.05)`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <span style={{ fontSize:12, fontWeight:700, color:TEXT_PRI }}>Table {String(t.id)}</span>
                    {t.vip && <span style={{ marginLeft:6, fontSize:9, color:GOLD, fontWeight:800, padding:"1px 5px", border:`1px solid ${GOLD}44`, borderRadius:4 }}>VIP</span>}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <Dot color={GREEN} />
                    <span style={{ fontSize:10, color:TEXT_SEC }}>{t.guests} guests</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>
    </aside>
  );

  // ── Render: Pairing Engine (Command Center main view) ─────────────────────
  const renderPairing = () => (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"auto", padding:"10px 12px" }}>
      <GlassPanel style={{ marginBottom:10, overflow:"hidden" }}>
        <div style={{ display:"flex", gap:0 }}>
          {/* Hero image */}
          <div style={{ width:300, flexShrink:0, position:"relative", background:`linear-gradient(145deg,#2A1208,#0E0A04)`, minHeight:240 }}>
            <img
              src={featuredCigar.imageUrl ?? IMG("cigar_hero.jpg")}
              alt={featuredCigar.name}
              style={{ width:"100%", height:"100%", objectFit:"cover", position:"absolute", inset:0 }}
              onError={e=>{(e.target as HTMLImageElement).src=IMG("cigar1.png");}}
            />
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to right, transparent 60%, rgba(10,8,4,0.85))" }} />
          </div>

          {/* Product info */}
          <div style={{ flex:1, padding:"16px 18px" }}>
            <div style={{ display:"flex", gap:0, marginBottom:12, borderBottom:`1px solid ${BORDER_W}`, paddingBottom:0 }}>
              {(["Cigar","Spirits","Food"] as const).map(c=>(
                <button key={c} onClick={()=>setPairingCat(c)}
                  style={{
                    padding:"6px 16px", fontSize:12, fontWeight:700, cursor:"pointer",
                    border:"none", borderBottom:pairingCat===c?`2px solid ${GOLD}`:"2px solid transparent",
                    background:"transparent", color:pairingCat===c?GOLD:TEXT_DIM,
                    letterSpacing:"0.06em", marginBottom:-1,
                  }}>
                  {c}
                </button>
              ))}
            </div>

            <div style={{ marginBottom:8 }}>
              <span style={{ fontSize:10, padding:"3px 10px", borderRadius:12,
                background:"rgba(212,175,55,0.18)", color:GOLD, fontWeight:800, letterSpacing:"0.10em", textTransform:"uppercase" }}>
                {featuredCigar.body}
              </span>
            </div>

            <div style={{ fontSize:20, fontWeight:900, color:TEXT_PRI, lineHeight:1.2, marginBottom:3 }}>{featuredCigar.name}</div>
            <div style={{ fontSize:13, color:TEXT_SEC, marginBottom:10 }}>{featuredCigar.type} · {featuredCigar.origin}</div>
            <p style={{ fontSize:12, color:TEXT_SEC, lineHeight:1.6, margin:"0 0 12px 0", maxWidth:340 }}>{featuredCigar.description}</p>

            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:11, color:TEXT_DIM, fontWeight:700, width:60, letterSpacing:"0.08em", textTransform:"uppercase" }}>Strength</span>
                <Strength v={featuredCigar.strength} />
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:11, color:TEXT_DIM, fontWeight:700, width:60, letterSpacing:"0.08em", textTransform:"uppercase" }}>Rating</span>
                <Stars v={featuredCigar.rating} />
              </div>
            </div>
          </div>
        </div>

        {/* Thumbnail strip */}
        <div style={{ display:"flex", gap:8, padding:"10px 14px", borderTop:`1px solid ${BORDER_W}` }}>
          {[IMG("cigar1.png"), IMG("cigar2.png"), IMG("cigar3.png")].map((src,i)=>(
            <div key={i} style={{ width:90, height:64, borderRadius:8, overflow:"hidden", border:`1px solid ${BORDER_W}`, cursor:"pointer", background:"rgba(255,255,255,0.05)", flexShrink:0 }}>
              <img src={src} alt={`Cigar ${i+1}`} style={{ width:"100%", height:"100%", objectFit:"cover" }}
                onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
            </div>
          ))}
        </div>

        {/* Pairing Suggestion */}
        <div style={{ padding:"10px 14px 12px", borderTop:`1px solid ${BORDER_W}` }}>
          <div style={{ fontSize:11, fontWeight:800, color:TEXT_DIM, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:6 }}>Pairing Suggestion</div>
          <div style={{ fontSize:12, color:TEXT_SEC, marginBottom:10 }}>Pairs exceptionally well with aged bourbon or a rich espresso.</div>
          <div style={{ display:"flex", gap:10 }}>
            {[
              { name:"Buffalo Trace Bourbon", notes:"Rich · Caramel · Vanilla", img:IMG("pourcraft-card.jpg") },
              { name:"Espresso",              notes:"Bold · Aromatic · Smooth",  img:""                        },
            ].map((ps,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, flex:1, padding:"8px 10px", borderRadius:8, background:"rgba(255,255,255,0.04)", border:`1px solid ${BORDER_W}` }}>
                <div style={{ width:36, height:36, borderRadius:6, overflow:"hidden", flexShrink:0, background:"rgba(255,255,255,0.08)" }}>
                  {ps.img ? (
                    <img src={ps.img} alt={ps.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}
                      onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
                  ) : (
                    <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>☕</div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:TEXT_PRI }}>{ps.name}</div>
                  <div style={{ fontSize:10, color:TEXT_DIM }}>{ps.notes}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassPanel>

      {/* Action bar */}
      <div style={{ display:"flex", gap:8 }}>
        <motion.button whileTap={{ scale:0.96 }} onClick={handleAddCigar}
          style={{ flex:1, minHeight:44, padding:"10px 12px", borderRadius:8, border:`1px solid rgba(76,175,125,0.35)`,
            background:"rgba(76,175,125,0.10)", color:GREEN, fontSize:13, fontWeight:800, cursor:"pointer", letterSpacing:"0.06em" }}>
          Add Cigar · <span style={{ color:GOLD }}>${featuredCigar.price}</span>
        </motion.button>
        <motion.button whileTap={{ scale:0.96 }} onClick={handleAddPairing}
          style={{ flex:1, minHeight:44, padding:"10px 12px", borderRadius:8, border:`1px solid ${BORDER_G}`,
            background:"rgba(212,175,55,0.08)", color:TEXT_SEC, fontSize:13, fontWeight:800, cursor:"pointer", letterSpacing:"0.06em" }}>
          Add Pairing · <span style={{ color:GOLD }}>From $16</span>
        </motion.button>
        <motion.button whileTap={{ scale:0.96 }} onClick={handleAddFullExperience}
          style={{ flex:1.5, minHeight:44, padding:"10px 12px", borderRadius:8, border:"none",
            background:`linear-gradient(135deg,${GOLD},${AMBER})`,
            color:ESPRESSO, fontSize:13, fontWeight:900, cursor:"pointer", letterSpacing:"0.08em" }}>
          Full Experience · ${featuredCigar.price + 28}
        </motion.button>
      </div>
    </div>
  );

  // ── Render: Orders ────────────────────────────────────────────────────────
  const renderOrders = () => (
    <div style={{ flex:1, padding:"10px 12px", overflow:"auto" }}>
      <GlassPanel style={{ overflow:"hidden" }}>
        <div style={{ display:"flex", borderBottom:`1px solid ${BORDER_W}` }}>
          {(["Active Tabs","Recent Orders","Payments"] as const).map(t=>(
            <button key={t} onClick={()=>setTxnTab(t)}
              style={{
                flex:1, minHeight:40, padding:"8px 4px", fontSize:12, fontWeight:700, cursor:"pointer",
                border:"none", borderBottom:txnTab===t?`2px solid ${GOLD}`:"2px solid transparent",
                background:"transparent", color:txnTab===t?GOLD:TEXT_DIM, letterSpacing:"0.06em",
              }}>
              {t}{t==="Active Tabs"?` (${activeTabs.length})`:""}
            </button>
          ))}
        </div>

        {txnTab==="Active Tabs" && (
          <div>
            {selectedTab && (
              <div style={{ padding:"10px 12px", borderBottom:`1px solid ${BORDER_W}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:900, color:TEXT_PRI }}>Table {selectedTab.tableNumber}</div>
                    <div style={{ fontSize:11, color:TEXT_SEC }}>{selectedTab.guests} Guests · {selectedTab.server}</div>
                  </div>
                  <div style={{ fontSize:16, fontWeight:900, color:GOLD }}>${selectedTab.total.toFixed(2)}</div>
                </div>
                {selectedTab.items.map((it,i)=>(
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:`1px solid rgba(255,255,255,0.05)` }}>
                    <div>
                      <span style={{ fontSize:12, color:TEXT_PRI }}>{it.name}</span>
                      <span style={{ fontSize:11, color:TEXT_DIM, marginLeft:6 }}>× {it.qty}</span>
                    </div>
                    <span style={{ fontSize:12, fontWeight:700, color:TEXT_SEC }}>${(it.qty*it.price).toFixed(2)}</span>
                  </div>
                ))}
                {selectedTab.items.length===0 && (
                  <div style={{ fontSize:12, color:TEXT_DIM, padding:"8px 0", textAlign:"center" }}>No items yet</div>
                )}
              </div>
            )}
            <div style={{ maxHeight:120, overflow:"auto" }}>
              {activeTabs.map(t=>(
                <div key={t.id} onClick={()=>setSelTabId(t.id)}
                  style={{
                    padding:"8px 12px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center",
                    background:selTabId===t.id?"rgba(212,175,55,0.08)":"transparent",
                    borderLeft:`3px solid ${selTabId===t.id?GOLD:"transparent"}`,
                    borderBottom:`1px solid rgba(255,255,255,0.05)`,
                  }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:TEXT_PRI }}>{t.name}</div>
                    <div style={{ fontSize:10, color:TEXT_DIM }}>Table {t.tableNumber} · {t.guests} guests</div>
                  </div>
                  <span style={{ fontSize:13, fontWeight:900, color:GOLD }}>${t.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {txnTab==="Recent Orders" && (
          <div style={{ padding:"10px 12px" }}>
            {recentOrders.length === 0 ? (
              <div style={{ fontSize:12, color:TEXT_DIM, textAlign:"center", padding:"20px 0" }}>No recent orders found.</div>
            ) : (
              recentOrders.map(o=>(
                <div key={o.id} style={{ padding:"8px 0", borderBottom:`1px solid ${BORDER_W}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:800, color:TEXT_PRI }}>Table {o.tableNumber}</div>
                    <div style={{ fontSize:11, color:TEXT_DIM }}>{o.items.length} items · {o.createdAt ? new Date(o.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) : ""}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:13, fontWeight:900, color:GOLD }}>${o.total.toFixed(2)}</div>
                    <div style={{ fontSize:10, color:TEXT_DIM, textTransform:"uppercase", letterSpacing:"0.1em" }}>{o.status}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {txnTab==="Payments" && (
          <div style={{ padding:"10px 12px" }}>
            <motion.button whileTap={{ scale:0.97 }} onClick={()=>void handleCheckout()}
              style={{ width:"100%", padding:"12px", borderRadius:8, border:"none",
                background:`linear-gradient(135deg,${GOLD},${AMBER})`,
                color:ESPRESSO, fontSize:14, fontWeight:900, cursor:"pointer", marginBottom:8 }}>
              Pay Now · ${selectedTab?.total.toFixed(2)??"0.00"}
            </motion.button>
            <div style={{ display:"flex", justifyContent:"center", gap:6, flexWrap:"wrap", marginBottom:8 }}>
              {["Apple Pay","Google Pay","QR","Tap"].map(m=>(
                <span key={m} style={{ fontSize:10, padding:"3px 7px", borderRadius:5, border:`1px solid ${BORDER_W}`, color:TEXT_SEC, fontWeight:600 }}>{m}</span>
              ))}
            </div>
            <div style={{ textAlign:"center", marginTop:8 }}>
              <div style={{ fontSize:11, color:TEXT_DIM, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.10em" }}>Shift Revenue</div>
              <div style={{ fontSize:20, fontWeight:900, color:GOLD }}>${shiftTotal.toLocaleString()}</div>
              <div style={{ fontSize:10, color:TEXT_DIM }}>{activeTabs.length} active tabs</div>
            </div>
          </div>
        )}
      </GlassPanel>

      <div style={{ display:"flex", gap:6, marginTop:8 }}>
        {["Send to Bar","Send to Kitchen","Send to Humidor"].map(a=>(
          <motion.button key={a} whileTap={{ scale:0.96 }} onClick={()=>handleRoute(a)}
            style={{ flex:1, padding:"8px", borderRadius:7, border:`1px solid ${BORDER_W}`,
              background:"rgba(255,255,255,0.04)", color:TEXT_SEC, fontSize:11, fontWeight:700, cursor:"pointer" }}>
            {a}
          </motion.button>
        ))}
      </div>
    </div>
  );

  // ── Render: Right Sidebar ─────────────────────────────────────────────────
  const renderRight = () => (
    <aside style={{
      width:280, flexShrink:0, borderLeft:`1px solid ${BORDER_G}`,
      display:"flex", flexDirection:"column", overflow:"hidden",
      background:"rgba(10,8,4,0.70)", backdropFilter:"blur(12px)",
    }}>
      <div style={{ flex:1, overflow:"auto", padding:"10px 8px 0" }}>

        {/* Perfect Pairings */}
        <GlassPanel style={{ marginBottom:10 }}>
          <div style={{ padding:"8px 12px 6px", borderBottom:`1px solid ${BORDER_W}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:10, fontWeight:800, color:TEXT_DIM, letterSpacing:"0.14em", textTransform:"uppercase" }}>Perfect Pairings</span>
            <div style={{ display:"flex", gap:4 }}>
              {["‹","›"].map(a=>(
                <button key={a} style={{ width:22, height:22, borderRadius:4, border:`1px solid ${BORDER_W}`, background:"rgba(255,255,255,0.06)", color:TEXT_PRI, cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>{a}</button>
              ))}
            </div>
          </div>
          <div style={{ padding:"8px" }}>
            {livePairings.map((p,i)=>(
              <div key={i} style={{ padding:"10px", borderRadius:8, marginBottom:6, background:"rgba(255,255,255,0.04)", border:`1px solid ${BORDER_W}` }}>
                <div style={{ fontSize:13, fontWeight:800, color:TEXT_PRI, marginBottom:2 }}>{p.name}</div>
                <div style={{ fontSize:11, color:TEXT_DIM, marginBottom:4 }}>{p.sub}</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:11, color:TEXT_SEC }}>{p.notes}</span>
                  <span style={{ fontSize:15, fontWeight:900, color:GOLD }}>${p.price}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Environment Controls */}
        {panelVis.environment !== "hidden" && (
          <GlassPanel style={{ marginBottom:10, position:"relative", opacity:panelVis.environment==="muted"?0.45:1 }}>
            <div style={{ padding:"8px 12px 6px", borderBottom:`1px solid ${BORDER_W}` }}>
              <div style={{ fontSize:10, fontWeight:800, color:TEXT_DIM, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:8 }}>Environment Controls</div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <span style={{ fontSize:10, color:TEXT_DIM, whiteSpace:"nowrap" }}>Lounge Preset</span>
                <select value={envPreset} onChange={e=>setEnvPreset(e.target.value)}
                  style={{ flex:1, fontSize:11, padding:"4px 8px", borderRadius:6, border:`1px solid ${BORDER_G}`, background:"rgba(30,20,8,0.90)", color:TEXT_PRI, cursor:"pointer" }}>
                  {PRESET_OPTIONS.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div style={{ margin:"8px 10px 0", borderRadius:8, overflow:"hidden", height:72, position:"relative" }}>
              <img src={IMG("lounge_bg.jpg")} alt="Lounge"
                style={{ width:"100%", height:"100%", objectFit:"cover" }}
                onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to right,rgba(0,0,0,0.3),rgba(0,0,0,0.1))" }} />
            </div>

            <div style={{ padding:"10px 12px" }}>
              <div style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:11, color:TEXT_SEC }}>💡 Lighting</span>
                  <span style={{ fontSize:11, fontWeight:700, color:GOLD }}>{lighting}%</span>
                </div>
                <input type="range" min={0} max={100} value={lighting} onChange={e=>setLighting(Number(e.target.value))} style={{ width:"100%", accentColor:GOLD }} />
              </div>
              <div style={{ marginBottom:10, display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:11, color:TEXT_SEC, whiteSpace:"nowrap" }}>🎵 Music</span>
                <select value={musicMode} onChange={e=>setMusicMode(e.target.value)}
                  style={{ flex:1, fontSize:11, padding:"4px 8px", borderRadius:6, border:`1px solid ${BORDER_W}`, background:"rgba(30,20,8,0.90)", color:TEXT_PRI }}>
                  {MUSIC_OPTIONS.map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:11, color:TEXT_SEC, whiteSpace:"nowrap" }}>🌸 Scent</span>
                  <select value={scentMode} onChange={e=>setScentMode(e.target.value)}
                    style={{ flex:1, fontSize:11, padding:"4px 8px", borderRadius:6, border:`1px solid ${BORDER_W}`, background:"rgba(30,20,8,0.90)", color:TEXT_PRI }}>
                    {SCENT_OPTIONS.map(s=><option key={s}>{s}</option>)}
                  </select>
                  <span style={{ fontSize:11, fontWeight:700, color:GOLD }}>{scentPct}%</span>
                </div>
                <input type="range" min={0} max={100} value={scentPct} onChange={e=>setScentPct(Number(e.target.value))} style={{ width:"100%", accentColor:GOLD }} />
              </div>
              <button style={{ width:"100%", padding:"8px", borderRadius:8, border:`1px solid ${BORDER_G}`, background:"rgba(212,175,55,0.08)", color:GOLD, fontSize:11, fontWeight:700, cursor:"pointer" }}>
                Advanced Controls
              </button>
            </div>
          </GlassPanel>
        )}

        {/* HVAC & Air Quality */}
        <GlassPanel style={{ marginBottom:10, padding:"10px 12px" }}>
          <SHead title="HVAC & Air Quality" />
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <Dot color={GREEN} />
              <span style={{ fontSize:11, color:TEXT_SEC, fontWeight:700 }}>HVAC Status</span>
            </div>
            <span style={{ fontSize:11, fontWeight:800, color:GREEN, padding:"2px 8px", borderRadius:6, background:"rgba(76,175,125,0.14)", border:"1px solid rgba(76,175,125,0.30)" }}>Optimal</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <div>
              <div style={{ fontSize:10, color:TEXT_DIM, marginBottom:2 }}>Current Temp</div>
              <div style={{ fontSize:18, fontWeight:900, color:TEXT_PRI }}>{Math.round(envState.temperature)}°F</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:10, color:TEXT_DIM, marginBottom:2 }}>Humidity</div>
              <div style={{ fontSize:18, fontWeight:900, color:TEXT_PRI }}>{Math.round(envState.humidity)}%</div>
            </div>
          </div>
          <div style={{ height:32, marginBottom:8, position:"relative", overflow:"hidden" }}>
            {(() => {
              const pts = envHistory.length >= 2 ? envHistory : [28,22,25,18,20,15,17];
              const xs  = pts.map((_,i) => Math.round((i / (pts.length - 1)) * 240));
              const line = pts.map((y,i) => `${xs[i]},${y}`).join(" ");
              const fill = line + ` ${xs[xs.length-1]},32 0,32`;
              return (
                <svg width="100%" height="32" viewBox="0 0 240 32" preserveAspectRatio="none">
                  <polyline points={fill} fill={`${GOLD}14`} stroke="none" />
                  <polyline points={line} fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              );
            })()}
          </div>
          <button style={{ width:"100%", padding:"6px", borderRadius:7, border:`1px solid ${BORDER_W}`, background:"rgba(255,255,255,0.04)", color:TEXT_SEC, fontSize:11, fontWeight:700, cursor:"pointer" }}>
            View Full HVAC System
          </button>
        </GlassPanel>
      </div>
    </aside>
  );

  // ── Render: Center (tab router) ────────────────────────────────────────────
  const renderCenter = () => {
    if (activeTab === "Assets") {
      return (
        <div style={{ flex:1, padding:"10px 12px", overflow:"auto" }}>
          <GlassPanel style={{ overflow:"hidden" }}>
            <div style={{ display:"flex", borderBottom:`1px solid ${BORDER_W}` }}>
              {(INVENTORY_TABS as readonly string[]).map(t=>(
                <button key={t} onClick={()=>setInvCat(t as typeof invCat)}
                  style={{ flex:1, padding:"10px 4px", fontSize:12, fontWeight:700, cursor:"pointer",
                    border:"none", borderBottom:invCat===t?`2px solid ${GOLD}`:"2px solid transparent",
                    background:"transparent", color:invCat===t?GOLD:TEXT_DIM }}>
                  {t}
                </button>
              ))}
            </div>
            <div>
              {INVENTORY_DATA[invCat].map((item,i)=>(
                <div key={i} style={{ padding:"10px 14px", borderBottom:`1px solid rgba(255,255,255,0.05)`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:34, height:34, borderRadius:6, background:"rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                      {invCat==="Humidor"?"🚬":invCat==="Bar"?"🥃":"🍽️"}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:TEXT_PRI }}>{item.name}</div>
                      <span style={{ fontSize:10, padding:"2px 7px", borderRadius:8,
                        background:item.status==="In Stock"?"rgba(76,175,125,0.12)":"rgba(200,137,10,0.14)",
                        color:item.status==="In Stock"?GREEN:AMBER, fontWeight:700 }}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:18, fontWeight:900, color:TEXT_PRI }}>{item.qty}</div>
                    <div style={{ fontSize:10, color:TEXT_DIM }}>In Stock</div>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      );
    }

    if (activeTab === "Transactions") {
      return renderOrders();
    }

    // Default: Command Center
    return (
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {panelVis.asset !== "hidden" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", opacity:panelVis.asset==="muted"?0.45:1, transition:"opacity 0.3s" }}>
            {renderPairing()}
          </div>
        )}
      </div>
    );
  };

  // ── Root render ───────────────────────────────────────────────────────────
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:500,
      display:"flex", flexDirection:"column", overflow:"hidden",
      fontFamily:"'Inter','Helvetica Neue',sans-serif",
      background:ESPRESSO,
    }}>
      {/* Background venue image */}
      <div style={{
        position:"absolute", inset:0, zIndex:0,
        backgroundImage:`url(${IMG("lounge_bg.jpg")})`,
        backgroundSize:"cover", backgroundPosition:"center",
        filter:"brightness(0.35) saturate(0.8)",
      }} />
      <div style={{ position:"absolute", inset:0, zIndex:1, background:"rgba(8,5,2,0.65)" }} />

      {/* ── Header ── */}
      <header style={{
        position:"relative", zIndex:20, flexShrink:0,
        height:60, display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 16px",
        borderBottom:`1px solid ${BORDER_G}`,
        background:"rgba(8,5,2,0.82)",
        backdropFilter:"blur(20px)",
        boxShadow:"0 1px 24px rgba(0,0,0,0.60)",
      }}>
        {/* Branding */}
        <div style={{ flexShrink:0, paddingRight:20, borderRight:`1px solid ${BORDER_G}`, marginRight:0 }}>
          <div style={{ fontSize:15, fontWeight:900, color:TEXT_PRI, letterSpacing:"0.16em", lineHeight:1 }}>E.A.T SYSTEM</div>
          <div style={{ fontSize:9, color:TEXT_DIM, letterSpacing:"0.12em", lineHeight:1.6 }}>ELEVATED ATMOSPHERE & TRANSACTIONS</div>
        </div>

        {/* Tabs */}
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:2, padding:"0 16px" }}>
          {TOP_TABS.map(tab=>(
            <button key={tab} onClick={()=>setActiveTab(tab)}
              style={{
                padding:"7px 16px", borderRadius:8, border:"none", cursor:"pointer",
                background:activeTab===tab ? TEXT_PRI : "transparent",
                color:activeTab===tab ? ESPRESSO : TEXT_SEC,
                fontSize:12, fontWeight:700, letterSpacing:"0.04em",
                transition:"all 0.15s", whiteSpace:"nowrap",
              }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Status + user */}
        <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <Dot color={wsConnected?GREEN:"#666"} />
            <span style={{ fontSize:10, fontWeight:700, color:wsConnected?GREEN:"#666", letterSpacing:"0.10em" }}>
              {wsConnected?"LIVE":"OFFLINE"}
            </span>
          </div>
          <div style={{ width:1, height:24, background:BORDER_W }} />
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{
              width:32, height:32, borderRadius:"50%", overflow:"hidden",
              border:`2px solid ${GOLD}44`, flexShrink:0,
              background:`linear-gradient(135deg,${GOLD},${AMBER})`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:12, color:ESPRESSO, fontWeight:900,
            }}>GM</div>
            <div>
              <div style={{ fontSize:12, fontWeight:800, color:TEXT_PRI, lineHeight:1.2 }}>
                {(profile as { firstName?: string }).firstName ? `${(profile as { firstName?: string }).firstName} C.` : "Marcus C."}
              </div>
              <div style={{ fontSize:10, color:TEXT_DIM, lineHeight:1.2 }}>General Manager</div>
            </div>
          </div>
          <div style={{ width:1, height:24, background:BORDER_W }} />
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:10, color:TEXT_DIM, letterSpacing:"0.08em" }}>
              {new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}).toUpperCase()}
            </div>
            <div style={{ fontSize:12, fontWeight:700, color:TEXT_PRI }}>{clock}</div>
          </div>
          {onBack && (
            <button onClick={onBack}
              style={{ padding:"6px 12px", borderRadius:7, border:`1px solid ${BORDER_G}`,
                background:"rgba(255,255,255,0.05)", color:TEXT_SEC, fontSize:11, fontWeight:700, cursor:"pointer" }}>
              ← Back
            </button>
          )}
        </div>
      </header>

      {/* ── Main body ── */}
      <div style={{ position:"relative", zIndex:10, flex:1, display:"flex", overflow:"hidden" }}>
        {renderLeft()}
        <main style={{ flex:1, display:"flex", overflow:"hidden" }}>
          {renderCenter()}
        </main>
        {renderRight()}
      </div>

      {/* ── Bottom nav ── */}
      <footer style={{
        position:"relative", zIndex:20, flexShrink:0,
        height:68, display:"flex", alignItems:"stretch",
        borderTop:`1px solid ${BORDER_G}`,
        background:"rgba(6,4,2,0.92)",
        backdropFilter:"blur(20px)",
        overflow:"hidden",
      }}>
        {BOT_NAV.map((item, i) => {
          const isEAT = "eat" in item && item.eat;
          return (
            <motion.button
              key={item.label}
              whileTap={{ scale:0.96 }}
              style={{
                flex: isEAT ? 1.3 : 1,
                position:"relative",
                border:"none",
                borderRight: i < BOT_NAV.length-1 ? `1px solid rgba(212,175,55,0.10)` : "none",
                cursor:"pointer", overflow:"hidden",
                background:isEAT ? `linear-gradient(135deg,${GOLD},${AMBER})` : "transparent",
                display:"flex", alignItems:"center", justifyContent:"center",
                flexDirection:"column", gap:4, padding:"6px 8px",
              }}>
              {!isEAT && item.img && (
                <>
                  <div style={{
                    position:"absolute", inset:0,
                    backgroundImage:`url(${item.img})`,
                    backgroundSize:"cover", backgroundPosition:"center",
                    filter:"brightness(0.25) saturate(0.7)",
                  }} />
                  <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.35)" }} />
                </>
              )}
              <span style={{
                position:"relative", zIndex:1,
                fontSize:10, fontWeight:800, color:isEAT ? ESPRESSO : TEXT_PRI,
                letterSpacing:"0.10em", textTransform:"uppercase",
              }}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </footer>
    </div>
  );
}
