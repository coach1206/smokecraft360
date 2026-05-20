/**
 * EATDashboard — E.A.T. System Hospitality OS
 * Elevated Atmosphere & Transactions · NOVEE OS
 * Rebuilt to match reference design: top-nav, device sidebar,
 * pairing engine, orders, environment controls, floor plan.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "@/lib/socket";
import {
  eatEngine,
  type EnvironmentState,
  type InventoryProduct,
  type CheckoutRequest,
} from "@/lib/eatEngine";
import type { EATModuleFlags } from "@/pages/ExecutiveCommandCenter";

// ── Design tokens ─────────────────────────────────────────────────────────────
const ESPRESSO = "#1E0C04";
const CREAM    = "#F0EBE0";
const CARD     = "#FAF7F1";
const GOLD     = "#D4AF37";
const AMBER    = "#C4860A";
const GREEN    = "#2E7D4F";
const RED_CLR  = "#C0392B";
const DARK     = "#1A1208";
const MED      = "#6B5240";
const LIGHT    = "#A08B70";
const BORDER   = "rgba(180,140,80,0.18)";

// ── Navigation tabs ───────────────────────────────────────────────────────────
const TOP_TABS = [
  "Command Center","Environment","Assets","Transactions",
  "Pairing Engine","Lounge Control","Analytics","Staffing",
] as const;
type TopTab = (typeof TOP_TABS)[number];

// ── Fallback static data ───────────────────────────────────────────────────────
const STATIC_DEVICES = [
  { id:"T-B01", name:"Tablet 01", room:"Main Lounge",    battery:100, signal:4, online:true  },
  { id:"T-B02", name:"Tablet 02", room:"VIP Room 1",     battery:85,  signal:3, online:true  },
  { id:"T-B03", name:"Tablet 03", room:"Cigar Patio",    battery:73,  signal:3, online:true  },
  { id:"T-B04", name:"Tablet 04", room:"Bar Station",    battery:92,  signal:4, online:true  },
  { id:"T-B05", name:"Tablet 05", room:"Humidor",        battery:65,  signal:2, online:true  },
  { id:"T-B06", name:"Tablet 06", room:"Kitchen Display",battery:100, signal:4, online:true  },
  { id:"T-B07", name:"Tablet 07", room:"Wine Cellar",    battery:58,  signal:2, online:false },
  { id:"T-B08", name:"Tablet 08", room:"Private Room 2", battery:41,  signal:1, online:true  },
];

const FEATURED_CIGAR = {
  name:"Padrón 1926 Serie 80", type:"Maduro", origin:"Nicaragua",
  body:"Full Bodied", strength:4, rating:4.5, price:36,
  description:"Rich, bold and complex. Notes of espresso, dark chocolate, earth and black pepper with a long creamy finish.",
};
const PAIRINGS = [
  { name:"The Macallan 18",      sub:"Sherry Oak",            notes:"Rich · Dried Fruit · Oak",   price:42 },
  { name:"Smoked Old Fashioned", sub:"Bourbon · Bitters · Smoke", notes:"Artisan cocktail",       price:18 },
  { name:"Wagyu Sliders",        sub:"Truffle Aioli · Brioche",   notes:"Chef feature tonight",   price:16 },
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
const STATIC_EVENTS = [
  { id:"e1", name:"Smooth Jazz Night",  schedule:"Every Friday 8PM – 12AM",  desc:"Live jazz, crafted cocktails and premium pairings.", emoji:"🎷" },
  { id:"e2", name:"Cigar & Bourbon",    schedule:"Saturdays 7PM",            desc:"", emoji:"🥃" },
  { id:"e3", name:"Wine Down",          schedule:"Wednesdays 6PM",           desc:"", emoji:"🍷" },
  { id:"e4", name:"Latin Night",        schedule:"Thursdays 9PM",            desc:"", emoji:"💃" },
  { id:"e5", name:"Poker Night",        schedule:"Tuesdays 8PM",             desc:"", emoji:"♠️" },
];

const INVENTORY_TABS = ["Kitchen","Bar","Humidor"] as const;
const INVENTORY_DATA: Record<string,{name:string;qty:number;status:"In Stock"|"Low Stock"}[]> = {
  Kitchen:[ {name:"Wagyu Beef",qty:12,status:"In Stock"},{name:"Truffle Oil",qty:4,status:"Low Stock"},{name:"Brioche Buns",qty:28,status:"In Stock"} ],
  Bar:    [ {name:"The Macallan 18",qty:6,status:"Low Stock"},{name:"Pappy Van Winkle",qty:3,status:"Low Stock"},{name:"Hennessy XO",qty:8,status:"In Stock"} ],
  Humidor:[ {name:"Cohiba Behike 52",qty:144,status:"In Stock"},{name:"Padrón 1926 No.9",qty:89,status:"In Stock"},{name:"Oliva Serie V Melanio",qty:112,status:"In Stock"},{name:"Davidoff Millennium",qty:67,status:"In Stock"},{name:"Premium Lighters",qty:23,status:"Low Stock"} ],
};

const MUSIC_OPTIONS = ["Smooth Jazz","Neo-Soul","Ambient Lounge","Classical","Upbeat Jazz"];
const SCENT_OPTIONS = ["Leather & Oak","Cedar & Vanilla","Aged Oak","Sandalwood","Citrus & Cedar"];
const PRESET_OPTIONS= ["Warm Lounge","VIP Experience","Ceremony Mode","Late Night","Service Mode"];

type PanelVis = "on"|"muted"|"hidden";

// ── Component props ───────────────────────────────────────────────────────────
interface EATDashboardProps {
  eatFlags?: EATModuleFlags;
  onBack?: () => void;
}

// ── Micro-components ──────────────────────────────────────────────────────────

function Dot({ color=GREEN }: { color?:string }) {
  return (
    <motion.div
      animate={{ scale:[1,1.5,1], opacity:[1,0.35,1] }}
      transition={{ duration:1.6, repeat:Infinity }}
      style={{ width:7, height:7, borderRadius:"50%", background:color, boxShadow:`0 0 5px ${color}99`, flexShrink:0 }}
    />
  );
}

function BattBar({ pct }: { pct:number }) {
  const c = pct>60 ? GREEN : pct>30 ? AMBER : RED_CLR;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
      <div style={{ width:26, height:9, background:"rgba(0,0,0,0.09)", borderRadius:2, overflow:"hidden", border:"1px solid rgba(0,0,0,0.14)" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:c, transition:"width 0.5s" }} />
      </div>
      <span style={{ fontSize:11, fontWeight:700, color:c }}>{pct}%</span>
    </div>
  );
}

function Stars({ v }: { v:number }) {
  return (
    <div style={{ display:"flex", gap:2 }}>
      {[1,2,3,4,5].map(i=>(
        <span key={i} style={{ fontSize:16, color: i<=v ? GOLD : "rgba(180,140,80,0.22)", lineHeight:1 }}>
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
          width:15, height:15, borderRadius:"50%",
          background: i<v ? AMBER : "rgba(180,140,80,0.15)",
          border:`1.5px solid ${i<v ? AMBER : "rgba(180,140,80,0.22)"}`,
        }} />
      ))}
    </div>
  );
}

function SCard({ children, style }: { children:React.ReactNode; style?:React.CSSProperties }) {
  return (
    <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:10,
      boxShadow:"0 1px 4px rgba(80,40,0,0.06)", ...style }}>
      {children}
    </div>
  );
}

function SectionHead({ title, action, onAction }: { title:string; action?:string; onAction?:()=>void }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
      <span style={{ fontSize:13, fontWeight:900, letterSpacing:"0.16em", color:MED, textTransform:"uppercase" }}>{title}</span>
      {action && <button onClick={onAction} style={{ fontSize:12, color:AMBER, background:"none", border:"none", cursor:"pointer", fontWeight:700, letterSpacing:"0.08em" }}>{action}</button>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function EATDashboard({ eatFlags: _eatFlags, onBack }: EATDashboardProps) {
  const [activeTab, setActiveTab] = useState<TopTab>("Command Center");

  const [panelVis, setPanelVis] = useState<{environment:PanelVis;asset:PanelVis;transaction:PanelVis}>(
    { environment:"on", asset:"on", transaction:"on" }
  );
  const [wsConnected, setWsConnected] = useState(socket.connected);

  const [envState, setEnvState] = useState<EnvironmentState>(eatEngine.getEnvironment());
  const [, setLiveInv]          = useState<InventoryProduct[]>([]);

  const [devices, setDevices]         = useState(STATIC_DEVICES);
  const [floorTables, setFloorTables] = useState<FloorTable[]>(INITIAL_TABLES);
  const [floorView, setFloorView]     = useState<"Floor Plan"|"List View">("Floor Plan");
  const [dragging, setDragging]       = useState<string|number|null>(null);
  const dragOff  = useRef({ x:0, y:0 });
  const floorRef = useRef<HTMLDivElement>(null);

  const [pairingCat, setPairingCat] = useState<"Cigar"|"Spirits"|"Food">("Cigar");
  const [txnTab, setTxnTab]         = useState<"Active Tabs"|"Recent Orders"|"Payments">("Active Tabs");
  const [activeTabs, setActiveTabs] = useState<TabRecord[]>(STATIC_TABS);
  const [selTabId, setSelTabId]     = useState<string>(STATIC_TABS[0].id);
  const [invCat, setInvCat]         = useState<"Kitchen"|"Bar"|"Humidor">("Kitchen");

  const [envPreset, setEnvPreset] = useState(PRESET_OPTIONS[0]);
  const [lighting, setLighting]   = useState(65);
  const [musicMode, setMusicMode] = useState(MUSIC_OPTIONS[0]);
  const [scentMode, setScentMode] = useState(SCENT_OPTIONS[0]);
  const [scentPct, setScentPct]   = useState(40);

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

    fetch("/api/devices", { headers:hdr(token) })
      .then(r=>r.ok?r.json():null)
      .then(d=>{
        if (Array.isArray(d) && d.length>0) {
          setDevices(d.slice(0,8).map((dev:Record<string,unknown>, i:number)=>({
            id:   String(dev.id ?? `T-B0${i+1}`),
            name: String(dev.nickname ?? `Tablet 0${i+1}`),
            room: String(dev.tableNumber ?? "Main Floor"),
            battery: 100, signal: 4,
            online: dev.status === "active",
          })));
        }
      })
      .catch(()=>{});

    const venueId = localStorage.getItem("axiom_venue_id") ?? "default";
    fetch(`/api/tabs/venue/${encodeURIComponent(venueId)}`, { headers:hdr(token) })
      .then(r=>r.ok?r.json():null)
      .then(d=>{
        if(!d) return;
        const rows = (d as {tabs?:unknown[]}).tabs ?? (Array.isArray(d)?d:null);
        if (rows && (rows as unknown[]).length>0) { /* use live data if available */ }
      })
      .catch(()=>{});

    return () => {
      unsubInv(); unsubEnv();
      socket.off("connect",          onConn);
      socket.off("disconnect",       onDisconn);
      socket.off("panel_visibility", onPV);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleAddCigar = useCallback(() => {
    const token = localStorage.getItem("axiom_token") ?? "";
    if(!selectedTab) return;
    fetch(`/api/tabs/${selectedTab.id}/items`, {
      method:"POST",
      headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},
      body:JSON.stringify({ name:FEATURED_CIGAR.name, price:FEATURED_CIGAR.price, qty:1, category:"cigar" }),
    }).catch(()=>{});
  }, [selectedTab]);

  const handleCheckout = useCallback(async () => {
    if(!selectedTab || !selectedTab.items.length) return;
    const req: CheckoutRequest = {
      venueId:     localStorage.getItem("axiom_venue_id") ?? "venue_01",
      tableNumber: selectedTab.tableNumber,
      items:       selectedTab.items.map(i=>({
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
  }, [selectedTab]);

  // ── Left sidebar ──────────────────────────────────────────────────────────
  const renderLeft = () => (
    <aside style={{ width:230, flexShrink:0, borderRight:`1px solid ${BORDER}`, display:"flex", flexDirection:"column", overflow:"hidden", background:CREAM }}>
      <div style={{ flex:1, overflow:"auto", padding:"12px 10px 0" }}>
        <SCard style={{ marginBottom:12 }}>
          <div style={{ padding:"10px 12px 8px", borderBottom:`1px solid ${BORDER}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:12, fontWeight:900, letterSpacing:"0.14em", color:MED, textTransform:"uppercase" }}>Tablet & Device Status</span>
              <button onClick={()=>{}} style={{ fontSize:11, color:AMBER, background:"none", border:"none", cursor:"pointer", fontWeight:700 }}>View All</button>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
              <Dot color={GREEN} />
              <span style={{ fontSize:11, color:LIGHT }}>{devices.filter(d=>d.online).length} Active Devices</span>
              <span style={{ marginLeft:"auto", fontSize:12, fontWeight:900, color:DARK }}>{devices.length} Total</span>
            </div>
          </div>
          <div style={{ maxHeight:200, overflow:"auto" }}>
            {devices.map(dev => (
              <div key={dev.id} style={{ padding:"7px 12px", borderBottom:`1px solid rgba(180,140,80,0.09)`, display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ fontSize:16, opacity: dev.online ? 1 : 0.4 }}>📱</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:12, fontWeight:700, color:DARK }}>{dev.name}</span>
                    <span style={{ fontSize:10, color:LIGHT, fontFamily:"monospace" }}>{dev.id}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:3 }}>
                    <span style={{ fontSize:11, color:LIGHT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:80 }}>{dev.room}</span>
                    <BattBar pct={dev.battery} />
                  </div>
                </div>
                <div style={{ width:7, height:7, borderRadius:"50%", background:dev.online?GREEN:RED_CLR, flexShrink:0 }} />
              </div>
            ))}
          </div>
        </SCard>

        <SCard>
          <div style={{ padding:"10px 12px 8px", borderBottom:`1px solid ${BORDER}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <span style={{ fontSize:12, fontWeight:900, letterSpacing:"0.14em", color:MED, textTransform:"uppercase" }}>Active Tables</span>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              {(["Floor Plan","List View"] as const).map(v=>(
                <button key={v} onClick={()=>setFloorView(v)}
                  style={{ flex:1, padding:"5px 0", fontSize:11, fontWeight:700, cursor:"pointer", borderRadius:6, border:`1px solid ${floorView===v?AMBER:BORDER}`, background:floorView===v?"rgba(196,134,10,0.10)":CREAM, color:floorView===v?AMBER:MED }}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {floorView === "Floor Plan" ? (
            <div ref={floorRef} onMouseMove={onFloorMM} onMouseUp={onFloorMU} onMouseLeave={onFloorMU}
              style={{ position:"relative", height:240, margin:"8px", background:"#EDE6D8", borderRadius:8, overflow:"hidden", cursor:dragging?"grabbing":"default", border:`1px solid rgba(180,140,80,0.20)` }}>
              <div style={{ position:"absolute", inset:8, border:"1px dashed rgba(180,140,80,0.30)", borderRadius:6, pointerEvents:"none" }} />
              {floorTables.map(t=>(
                <motion.div key={String(t.id)} onMouseDown={e=>onTableMD(e,t.id)} animate={{ scale:dragging===t.id?1.1:1 }}
                  style={{ position:"absolute", left:`${t.x}%`, top:`${t.y}%`, transform:"translate(-50%,-50%)",
                    width:t.vip?38:30, height:t.vip?38:30, borderRadius:t.vip?"10px":"50%",
                    background: t.vip ? `linear-gradient(135deg,${GOLD},${AMBER})` : t.active ? `rgba(46,125,79,0.18)` : `rgba(180,140,80,0.15)`,
                    border:`1.5px solid ${t.vip?GOLD:t.active?"rgba(46,125,79,0.6)":BORDER}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    cursor:"grab", userSelect:"none", zIndex:dragging===t.id?10:1 }}>
                  <span style={{ fontSize:t.vip?10:9, fontWeight:900, color:t.vip?ESPRESSO:t.active?GREEN:LIGHT, lineHeight:1 }}>
                    {t.vip?"VIP":String(t.id)}
                  </span>
                  {t.active && t.guests>0 && (
                    <div style={{ position:"absolute", top:-4, right:-4, background:GREEN, color:"white", fontSize:8, fontWeight:900, borderRadius:"50%", width:14, height:14, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {t.guests}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div style={{ maxHeight:240, overflow:"auto" }}>
              {INITIAL_TABLES.filter(t=>t.active).map(t=>(
                <div key={String(t.id)} style={{ padding:"7px 12px", borderBottom:`1px solid rgba(180,140,80,0.09)`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <span style={{ fontSize:12, fontWeight:700, color:DARK }}>Table {String(t.id)}</span>
                    {t.vip && <span style={{ marginLeft:6, fontSize:10, color:GOLD, fontWeight:800, padding:"1px 6px", border:`1px solid ${GOLD}44`, borderRadius:4 }}>VIP</span>}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <Dot color={GREEN} /><span style={{ fontSize:11, color:LIGHT }}>{t.guests} guests</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ padding:"6px 12px 8px", textAlign:"center" }}>
            <span style={{ fontSize:10, color:LIGHT, letterSpacing:"0.06em" }}>Drag & Drop tables to reassign</span>
          </div>
        </SCard>
      </div>
    </aside>
  );

  // ── Pairing Engine ────────────────────────────────────────────────────────
  const renderPairing = () => (
    <div style={{ padding:"12px 14px 0", marginBottom:16 }}>
      <SCard style={{ overflow:"hidden" }}>
        <div style={{ padding:"10px 14px 0", borderBottom:`1px solid ${BORDER}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:13, fontWeight:900, color:MED, letterSpacing:"0.14em", textTransform:"uppercase" }}>Pairing Engine</span>
          <div style={{ display:"flex", gap:0 }}>
            {(["Cigar","Spirits","Food"] as const).map(c=>(
              <button key={c} onClick={()=>setPairingCat(c)}
                style={{ padding:"6px 16px", fontSize:13, fontWeight:700, cursor:"pointer", border:"none", borderBottom:pairingCat===c?`2px solid ${AMBER}`:"2px solid transparent", background:"transparent", color:pairingCat===c?AMBER:LIGHT }}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", gap:0 }}>
          <div style={{ flex:1, padding:"14px", borderRight:`1px solid ${BORDER}` }}>
            <div style={{ display:"flex", gap:14 }}>
              <div style={{ width:110, height:120, borderRadius:8, flexShrink:0, background:"linear-gradient(145deg,#3D1F0A 0%,#5C2D0E 45%,#2A1106 100%)", border:`1px solid rgba(180,140,80,0.25)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:40 }}>🍂</span>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:11, padding:"2px 8px", borderRadius:10, background:`rgba(180,140,80,0.14)`, color:MED, fontWeight:700 }}>{FEATURED_CIGAR.body}</span>
                </div>
                <div style={{ fontSize:18, fontWeight:900, color:DARK, lineHeight:1.2, marginBottom:2 }}>{FEATURED_CIGAR.name}</div>
                <div style={{ fontSize:13, color:LIGHT, marginBottom:10 }}>{FEATURED_CIGAR.type} · {FEATURED_CIGAR.origin}</div>
                <p style={{ fontSize:13, color:MED, lineHeight:1.6, margin:"0 0 10px 0" }}>{FEATURED_CIGAR.description}</p>
                <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:12, color:LIGHT, fontWeight:700, width:64 }}>STRENGTH</span>
                    <Strength v={FEATURED_CIGAR.strength} />
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:12, color:LIGHT, fontWeight:700, width:64 }}>RATING</span>
                    <Stars v={FEATURED_CIGAR.rating} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ width:220, flexShrink:0 }}>
            <div style={{ padding:"10px 12px 8px", borderBottom:`1px solid ${BORDER}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, fontWeight:900, color:MED, letterSpacing:"0.14em", textTransform:"uppercase" }}>Perfect Pairings</span>
              <div style={{ display:"flex", gap:4 }}>
                {["‹","›"].map(a=>(<button key={a} style={{ width:22, height:22, borderRadius:4, border:`1px solid ${BORDER}`, background:CREAM, color:DARK, cursor:"pointer", fontSize:13 }}>{a}</button>))}
              </div>
            </div>
            <div style={{ padding:"8px" }}>
              {PAIRINGS.map((p,i)=>(
                <div key={i} style={{ padding:"8px 10px", borderRadius:8, marginBottom:6, background:CREAM, border:`1px solid ${BORDER}` }}>
                  <div style={{ fontSize:13, fontWeight:800, color:DARK, marginBottom:2 }}>{p.name}</div>
                  <div style={{ fontSize:11, color:LIGHT, marginBottom:4 }}>{p.sub}</div>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:11, color:MED }}>{p.notes}</span>
                    <span style={{ fontSize:13, fontWeight:900, color:AMBER }}>${p.price}.00</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding:"10px 14px", borderTop:`1px solid ${BORDER}`, display:"flex", gap:8 }}>
          <motion.button whileTap={{ scale:0.96 }} onClick={handleAddCigar}
            style={{ flex:1, padding:"12px", borderRadius:8, border:`1px solid rgba(46,125,79,0.40)`, background:"rgba(46,125,79,0.08)", color:GREEN, fontSize:14, fontWeight:800, cursor:"pointer" }}>
            Add Cigar<br/><span style={{ fontSize:12, fontWeight:600 }}>${FEATURED_CIGAR.price}.00</span>
          </motion.button>
          <motion.button whileTap={{ scale:0.96 }}
            style={{ flex:1, padding:"12px", borderRadius:8, border:`1px solid rgba(180,140,80,0.35)`, background:"rgba(180,140,80,0.08)", color:MED, fontSize:14, fontWeight:800, cursor:"pointer" }}>
            Add Pairing<br/><span style={{ fontSize:12, fontWeight:600 }}>From $16.00</span>
          </motion.button>
          <motion.button whileTap={{ scale:0.96 }}
            style={{ flex:2, padding:"12px", borderRadius:8, border:"none", background:`linear-gradient(135deg,${GOLD},${AMBER})`, color:ESPRESSO, fontSize:15, fontWeight:900, cursor:"pointer" }}>
            Add Full Experience<br/><span style={{ fontSize:13 }}>$70.00</span>
          </motion.button>
        </div>
      </SCard>
    </div>
  );

  // ── Orders & Transactions ─────────────────────────────────────────────────
  const renderOrders = () => (
    <div style={{ padding:"0 14px 12px" }}>
      <div style={{ display:"flex", gap:10 }}>
        <SCard style={{ flex:1, overflow:"hidden" }}>
          <div style={{ display:"flex", borderBottom:`1px solid ${BORDER}` }}>
            {(["Active Tabs","Recent Orders","Payments"] as const).map(t=>(
              <button key={t} onClick={()=>setTxnTab(t)}
                style={{ flex:1, padding:"10px 4px", fontSize:12, fontWeight:700, cursor:"pointer", border:"none", borderBottom:txnTab===t?`2px solid ${AMBER}`:"2px solid transparent", background:"transparent", color:txnTab===t?AMBER:LIGHT }}>
                {t}{t==="Active Tabs"?` ${activeTabs.length}`:""}
              </button>
            ))}
          </div>
          {txnTab==="Active Tabs" && (
            <div>
              {selectedTab && (
                <div style={{ padding:"10px 12px", borderBottom:`1px solid ${BORDER}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:15, fontWeight:900, color:DARK }}>Table {selectedTab.tableNumber}</div>
                      <div style={{ fontSize:12, color:LIGHT }}>{selectedTab.guests} Guests · {selectedTab.server}</div>
                    </div>
                    <div style={{ fontSize:18, fontWeight:900, color:AMBER }}>${selectedTab.total.toFixed(2)}</div>
                  </div>
                  {selectedTab.items.map((it,i)=>(
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:`1px solid rgba(180,140,80,0.08)` }}>
                      <div><span style={{ fontSize:12, color:DARK }}>{it.name}</span><span style={{ fontSize:11, color:LIGHT, marginLeft:6 }}>× {it.qty}</span></div>
                      <span style={{ fontSize:13, fontWeight:700, color:MED }}>${(it.qty*it.price).toFixed(2)}</span>
                    </div>
                  ))}
                  {selectedTab.items.length===0 && <div style={{ fontSize:12, color:LIGHT, padding:"8px 0", textAlign:"center" }}>No items yet</div>}
                  {selectedTab.tax>0 && (
                    <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0 0" }}>
                      <span style={{ fontSize:12, color:LIGHT }}>Tax</span>
                      <span style={{ fontSize:12, color:LIGHT }}>${selectedTab.tax.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
              <div style={{ maxHeight:110, overflow:"auto" }}>
                {activeTabs.map(t=>(
                  <div key={t.id} onClick={()=>setSelTabId(t.id)}
                    style={{ padding:"8px 12px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", background:selTabId===t.id?`rgba(196,134,10,0.07)`:"transparent", borderLeft:`3px solid ${selTabId===t.id?AMBER:"transparent"}`, borderBottom:`1px solid rgba(180,140,80,0.08)` }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:DARK }}>{t.name}</div>
                      <div style={{ fontSize:11, color:LIGHT }}>Table {t.tableNumber} · {t.guests} guests</div>
                    </div>
                    <span style={{ fontSize:14, fontWeight:900, color:AMBER }}>${t.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {txnTab!=="Active Tabs" && (
            <div style={{ padding:"10px 12px" }}>
              <div style={{ fontSize:12, color:LIGHT, textAlign:"center", padding:"20px 0" }}>
                {txnTab==="Recent Orders" ? "Loading recent orders…" : "Payment records loading…"}
              </div>
            </div>
          )}
        </SCard>

        <div style={{ width:200, display:"flex", flexDirection:"column", gap:8 }}>
          <SCard style={{ padding:"10px 10px 8px" }}>
            <div style={{ fontSize:11, fontWeight:900, color:MED, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:8 }}>Route Order</div>
            {["Send to Bar","Send to Kitchen","Send to Humidor","Add Items"].map(a=>(
              <motion.button key={a} whileTap={{ scale:0.96 }}
                style={{ width:"100%", padding:"9px", marginBottom:6, borderRadius:7, border:`1px solid ${BORDER}`, background:CREAM, color:DARK, fontSize:12, fontWeight:700, cursor:"pointer", textAlign:"left" }}>
                {a}
              </motion.button>
            ))}
          </SCard>
          <SCard style={{ padding:"10px" }}>
            <div style={{ fontSize:11, fontWeight:900, color:MED, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:8 }}>Payment</div>
            <motion.button whileTap={{ scale:0.97 }} onClick={()=>void handleCheckout()}
              style={{ width:"100%", padding:"12px", borderRadius:8, border:"none", background:`linear-gradient(135deg,${GOLD},${AMBER})`, color:ESPRESSO, fontSize:14, fontWeight:900, cursor:"pointer", marginBottom:8 }}>
              Pay Now<br/><span style={{ fontSize:12, fontWeight:700 }}>${selectedTab?.total.toFixed(2)??""}</span>
            </motion.button>
            <div style={{ display:"flex", justifyContent:"center", gap:6, flexWrap:"wrap" }}>
              {["Apple Pay","Google Pay","QR","Tap"].map(m=>(<span key={m} style={{ fontSize:10, padding:"3px 7px", borderRadius:5, border:`1px solid ${BORDER}`, color:MED, fontWeight:600 }}>{m}</span>))}
            </div>
            <button style={{ width:"100%", marginTop:8, padding:"7px", borderRadius:6, border:`1px solid ${BORDER}`, background:"transparent", color:MED, fontSize:12, cursor:"pointer" }}>More Options</button>
          </SCard>
          <SCard style={{ padding:"10px" }}>
            <div style={{ fontSize:11, color:LIGHT, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.10em" }}>Shift Revenue</div>
            <div style={{ fontSize:22, fontWeight:900, color:AMBER }}>${shiftTotal.toLocaleString()}</div>
            <div style={{ fontSize:11, color:LIGHT }}>{activeTabs.length} active tabs</div>
          </SCard>
        </div>
      </div>
    </div>
  );

  // ── Center (tab-based) ────────────────────────────────────────────────────
  const renderCenter = () => {
    if (activeTab === "Assets") {
      return (
        <div style={{ padding:"12px 14px" }}>
          <SCard style={{ overflow:"hidden" }}>
            <div style={{ display:"flex", borderBottom:`1px solid ${BORDER}` }}>
              {(INVENTORY_TABS as readonly string[]).map(t=>(
                <button key={t} onClick={()=>setInvCat(t as typeof invCat)}
                  style={{ flex:1, padding:"10px 4px", fontSize:12, fontWeight:700, cursor:"pointer", border:"none", borderBottom:invCat===t?`2px solid ${AMBER}`:"2px solid transparent", background:"transparent", color:invCat===t?AMBER:LIGHT }}>
                  {t}
                </button>
              ))}
            </div>
            <div>
              {INVENTORY_DATA[invCat].map((item,i)=>(
                <div key={i} style={{ padding:"10px 14px", borderBottom:`1px solid rgba(180,140,80,0.09)`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:6, background:"rgba(180,140,80,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                      {invCat==="Humidor"?"🚬":invCat==="Bar"?"🥃":"🍽️"}
                    </div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:DARK }}>{item.name}</div>
                      <span style={{ fontSize:11, padding:"2px 7px", borderRadius:8, background:item.status==="In Stock"?"rgba(46,125,79,0.10)":"rgba(196,134,10,0.12)", color:item.status==="In Stock"?GREEN:AMBER, fontWeight:700 }}>{item.status}</span>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:22, fontWeight:900, color:DARK }}>{item.qty}</div>
                    <div style={{ fontSize:11, color:LIGHT }}>In Stock</div>
                  </div>
                </div>
              ))}
            </div>
          </SCard>
        </div>
      );
    }
    if (activeTab === "Transactions") return <div style={{ overflow:"auto", flex:1 }}>{renderOrders()}</div>;
    if (activeTab === "Environment") {
      return (
        <div style={{ padding:"12px 14px" }}>
          <SCard style={{ padding:"16px" }}>
            <SectionHead title="Environment State" />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              {[ {label:"Temperature",value:`${Math.round(envState.temperature)}°F`,color:AMBER}, {label:"Humidity",value:`${Math.round(envState.humidity)}%`,color:"#4AD9C8"}, {label:"Air Quality",value:envState.airQuality,color:GREEN} ].map(m=>(
                <div key={m.label} style={{ padding:"14px", background:CREAM, borderRadius:8, border:`1px solid ${BORDER}`, textAlign:"center" }}>
                  <div style={{ fontSize:28, fontWeight:900, color:m.color }}>{m.value}</div>
                  <div style={{ fontSize:12, color:LIGHT, marginTop:4, textTransform:"uppercase", letterSpacing:"0.10em" }}>{m.label}</div>
                </div>
              ))}
            </div>
          </SCard>
        </div>
      );
    }
    // Default "Command Center"
    return (
      <div style={{ overflow:"auto", flex:1 }}>
        {panelVis.asset !== "hidden" && (
          <div style={{ position:"relative" }}>
            {panelVis.asset === "muted" && (
              <div style={{ position:"absolute", inset:0, zIndex:99, background:"rgba(240,235,224,0.72)", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:10, pointerEvents:"none" }}>
                <span style={{ fontSize:20, fontWeight:900, color:AMBER, letterSpacing:"0.18em" }}>MUTED</span>
              </div>
            )}
            {renderPairing()}
          </div>
        )}
        {panelVis.transaction !== "hidden" && (
          <div style={{ position:"relative" }}>
            {panelVis.transaction === "muted" && (
              <div style={{ position:"absolute", inset:0, zIndex:99, background:"rgba(240,235,224,0.72)", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:10, pointerEvents:"none" }}>
                <span style={{ fontSize:20, fontWeight:900, color:AMBER, letterSpacing:"0.18em" }}>MUTED</span>
              </div>
            )}
            <div style={{ padding:"0 14px", marginBottom:4 }}>
              <div style={{ fontSize:13, fontWeight:900, color:MED, letterSpacing:"0.14em", textTransform:"uppercase", paddingBottom:8, borderBottom:`1px solid ${BORDER}`, marginBottom:8 }}>Orders & Transactions</div>
            </div>
            {renderOrders()}
          </div>
        )}
      </div>
    );
  };

  // ── Right sidebar ─────────────────────────────────────────────────────────
  const renderRight = () => (
    <aside style={{ width:272, flexShrink:0, borderLeft:`1px solid ${BORDER}`, display:"flex", flexDirection:"column", overflow:"hidden", background:CREAM }}>
      <div style={{ flex:1, overflow:"auto", padding:"12px 10px 0" }}>
        {panelVis.environment !== "hidden" && (
          <SCard style={{ marginBottom:12, position:"relative" }}>
            {panelVis.environment === "muted" && (
              <div style={{ position:"absolute", inset:0, zIndex:10, background:"rgba(240,235,224,0.70)", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:10, pointerEvents:"none" }}>
                <span style={{ fontSize:16, fontWeight:900, color:AMBER, letterSpacing:"0.18em" }}>MUTED</span>
              </div>
            )}
            <div style={{ padding:"10px 12px 8px", borderBottom:`1px solid ${BORDER}` }}>
              <SectionHead title="Environment Controls" />
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <span style={{ fontSize:11, color:LIGHT }}>Lounge Preset</span>
                <select value={envPreset} onChange={e=>setEnvPreset(e.target.value)} style={{ flex:1, fontSize:12, padding:"4px 8px", borderRadius:6, border:`1px solid ${BORDER}`, background:CARD, color:DARK, cursor:"pointer" }}>
                  {PRESET_OPTIONS.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div style={{ padding:"10px 12px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
                {[ {label:"Temperature",value:`${Math.round(envState.temperature)}°F`,icon:"🌡️"}, {label:"Humidity",value:`${Math.round(envState.humidity)}%`,icon:"💧"}, {label:"Air Quality",value:envState.airQuality,icon:"🌿"}, {label:"Noise Level",value:"Low",icon:"🔈"} ].map(m=>(
                  <div key={m.label} style={{ padding:"8px 10px", background:CREAM, borderRadius:8, border:`1px solid ${BORDER}`, textAlign:"center" }}>
                    <div style={{ fontSize:16, marginBottom:2 }}>{m.icon}</div>
                    <div style={{ fontSize:15, fontWeight:900, color:DARK, lineHeight:1 }}>{m.value}</div>
                    <div style={{ fontSize:10, color:LIGHT, marginTop:2, textTransform:"uppercase", letterSpacing:"0.08em" }}>{m.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:12, color:MED }}>💡 Lighting</span>
                  <span style={{ fontSize:12, fontWeight:700, color:AMBER }}>{lighting}%</span>
                </div>
                <input type="range" min={0} max={100} value={lighting} onChange={e=>setLighting(Number(e.target.value))} style={{ width:"100%", accentColor:AMBER }} />
              </div>
              <div style={{ marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:12, color:MED, whiteSpace:"nowrap" }}>🎵 Music</span>
                  <select value={musicMode} onChange={e=>setMusicMode(e.target.value)} style={{ flex:1, fontSize:12, padding:"4px 8px", borderRadius:6, border:`1px solid ${BORDER}`, background:CARD, color:DARK }}>
                    {MUSIC_OPTIONS.map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:12, color:MED, whiteSpace:"nowrap" }}>🌸 Scent</span>
                  <select value={scentMode} onChange={e=>setScentMode(e.target.value)} style={{ flex:1, fontSize:12, padding:"4px 8px", borderRadius:6, border:`1px solid ${BORDER}`, background:CARD, color:DARK }}>
                    {SCENT_OPTIONS.map(s=><option key={s}>{s}</option>)}
                  </select>
                  <span style={{ fontSize:12, fontWeight:700, color:AMBER }}>{scentPct}%</span>
                </div>
                <input type="range" min={0} max={100} value={scentPct} onChange={e=>setScentPct(Number(e.target.value))} style={{ width:"100%", accentColor:AMBER }} />
              </div>
              <button style={{ width:"100%", padding:"8px", borderRadius:8, border:`1px solid ${BORDER}`, background:CREAM, color:MED, fontSize:12, fontWeight:700, cursor:"pointer" }}>Advanced Controls</button>
            </div>
          </SCard>
        )}

        <SCard style={{ marginBottom:12, padding:"10px 12px" }}>
          <SectionHead title="HVAC & Air Quality" />
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}><Dot color={GREEN} /><span style={{ fontSize:12, color:MED, fontWeight:700 }}>HVAC Status</span></div>
            <span style={{ fontSize:12, fontWeight:800, color:GREEN, padding:"2px 8px", borderRadius:6, background:"rgba(46,125,79,0.12)", border:"1px solid rgba(46,125,79,0.30)" }}>Optimal</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <div><div style={{ fontSize:11, color:LIGHT, marginBottom:2 }}>Current Temp</div><div style={{ fontSize:22, fontWeight:900, color:DARK }}>{Math.round(envState.temperature)}°F</div></div>
            <div style={{ textAlign:"right" }}><div style={{ fontSize:11, color:LIGHT, marginBottom:2 }}>Humidity</div><div style={{ fontSize:22, fontWeight:900, color:DARK }}>{Math.round(envState.humidity)}%</div></div>
          </div>
          <div style={{ height:36, marginBottom:8 }}>
            <svg width="100%" height="36" viewBox="0 0 240 36" preserveAspectRatio="none">
              <polyline points="0,28 40,22 80,25 120,18 160,20 200,15 240,17" fill="none" stroke={AMBER} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="0,28 40,22 80,25 120,18 160,20 200,15 240,17 240,36 0,36" fill="rgba(196,134,10,0.07)" stroke="none" />
            </svg>
          </div>
          <button style={{ width:"100%", padding:"7px", borderRadius:7, border:`1px solid ${BORDER}`, background:CREAM, color:MED, fontSize:12, fontWeight:700, cursor:"pointer" }}>View Full HVAC System</button>
        </SCard>

        <SCard style={{ marginBottom:12 }}>
          <div style={{ padding:"10px 12px 8px", borderBottom:`1px solid ${BORDER}` }}>
            <SectionHead title="Upcoming Events & Themes" action="View All" />
          </div>
          <div style={{ margin:"10px 10px 6px", borderRadius:8, overflow:"hidden", border:`1px solid ${BORDER}` }}>
            <div style={{ height:64, background:`linear-gradient(135deg,#2B1506,#4A2010)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>{STATIC_EVENTS[0].emoji}</div>
            <div style={{ padding:"8px 10px", background:CARD }}>
              <div style={{ fontSize:13, fontWeight:800, color:DARK, marginBottom:2 }}>{STATIC_EVENTS[0].name}</div>
              <div style={{ fontSize:11, color:AMBER, fontWeight:700, marginBottom:4 }}>{STATIC_EVENTS[0].schedule}</div>
              <p style={{ fontSize:11, color:LIGHT, margin:0, lineHeight:1.5 }}>{STATIC_EVENTS[0].desc}</p>
              <button style={{ marginTop:8, padding:"5px 12px", borderRadius:6, border:`1px solid ${AMBER}44`, background:"rgba(196,134,10,0.10)", color:AMBER, fontSize:11, fontWeight:700, cursor:"pointer" }}>See Details</button>
            </div>
          </div>
          <div style={{ display:"flex", gap:6, padding:"0 10px 8px", flexWrap:"wrap" }}>
            {STATIC_EVENTS.slice(1).map(e=>(
              <div key={e.id} style={{ flex:"1 0 40px", padding:"8px 6px", borderRadius:8, background:CREAM, border:`1px solid ${BORDER}`, textAlign:"center", cursor:"pointer" }}>
                <div style={{ fontSize:18, marginBottom:3 }}>{e.emoji}</div>
                <div style={{ fontSize:9, color:MED, fontWeight:700, lineHeight:1.2 }}>{e.name}</div>
              </div>
            ))}
          </div>
          <div style={{ padding:"0 10px 10px" }}>
            <button style={{ width:"100%", padding:"7px", borderRadius:7, border:`1px solid ${BORDER}`, background:CREAM, color:MED, fontSize:12, fontWeight:700, cursor:"pointer" }}>Manage Themes</button>
          </div>
        </SCard>
      </div>
    </aside>
  );

  // ── Root render ───────────────────────────────────────────────────────────
  return (
    <div style={{ position:"fixed", inset:0, background:CREAM, display:"flex", flexDirection:"column", overflow:"hidden", fontFamily:"'Inter','Helvetica Neue',sans-serif" }}>

      <header style={{ height:64, flexShrink:0, background:ESPRESSO, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 16px", borderBottom:"1px solid rgba(180,140,80,0.18)", boxShadow:"0 2px 12px rgba(0,0,0,0.35)", zIndex:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:0, overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, paddingRight:20, borderRight:"1px solid rgba(180,140,80,0.25)", marginRight:8, flexShrink:0 }}>
            <div style={{ width:36, height:36, borderRadius:8, background:`linear-gradient(135deg,${GOLD},${AMBER})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>⚜️</div>
            <div>
              <div style={{ fontSize:13, fontWeight:900, color:GOLD, letterSpacing:"0.18em", lineHeight:1 }}>E.A.T SYSTEM</div>
              <div style={{ fontSize:9, color:"rgba(212,175,55,0.50)", letterSpacing:"0.10em", lineHeight:1.4 }}>ELEVATED ATMOSPHERE & TRANSACTIONS</div>
            </div>
          </div>
          <div style={{ display:"flex", overflow:"hidden" }}>
            {TOP_TABS.map(tab=>(
              <button key={tab} onClick={()=>setActiveTab(tab)}
                style={{ padding:"0 14px", height:64, border:"none", borderBottom:activeTab===tab?`2px solid ${AMBER}`:"2px solid transparent", background:"transparent", color:activeTab===tab?GOLD:"rgba(212,175,55,0.45)", fontSize:12, fontWeight:700, cursor:"pointer", letterSpacing:"0.06em", whiteSpace:"nowrap" }}>
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <Dot color={wsConnected?GREEN:"#666"} />
            <span style={{ fontSize:11, fontWeight:700, color:wsConnected?GREEN:"#666", letterSpacing:"0.10em" }}>{wsConnected?"LIVE":"OFFLINE"}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 12px", borderRadius:8, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(180,140,80,0.20)" }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg,${GOLD},${AMBER})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:ESPRESSO, fontWeight:900 }}>GM</div>
            <div>
              <div style={{ fontSize:12, fontWeight:800, color:"rgba(255,255,255,0.88)" }}>Marcus C.</div>
              <div style={{ fontSize:10, color:"rgba(212,175,55,0.55)", letterSpacing:"0.08em" }}>General Manager</div>
            </div>
          </div>
          {onBack && (
            <button onClick={onBack} style={{ padding:"8px 14px", borderRadius:8, border:"1px solid rgba(180,140,80,0.30)", background:"rgba(255,255,255,0.05)", color:"rgba(212,175,55,0.65)", fontSize:12, fontWeight:700, cursor:"pointer" }}>
              ← BACK
            </button>
          )}
        </div>
      </header>

      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {renderLeft()}
        <main style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {renderCenter()}
        </main>
        {renderRight()}
      </div>

      <footer style={{ height:56, flexShrink:0, background:ESPRESSO, display:"flex", alignItems:"center", padding:"0 20px", borderTop:"1px solid rgba(180,140,80,0.18)", zIndex:20 }}>
        <div style={{ display:"flex", gap:0, flex:1, justifyContent:"center" }}>
          {["Menu","Reservations","Events","Messages","Reports","Settings"].map((item,i)=>(
            <button key={item} style={{ padding:"0 18px", height:56, border:"none", background:"transparent", color:"rgba(212,175,55,0.45)", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
              {["📋","📅","🎭","✉️","📊","⚙️"][i]} {item}
            </button>
          ))}
        </div>
        <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)" }}>
          <div style={{ width:44, height:44, borderRadius:12, background:`linear-gradient(135deg,${GOLD},${AMBER})`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 20px ${GOLD}44` }}>
            <span style={{ fontSize:14, fontWeight:900, color:ESPRESSO }}>E.A.T</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
