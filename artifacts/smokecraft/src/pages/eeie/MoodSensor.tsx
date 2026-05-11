/**
 * EEIE Mood Sensor Tab — Venue mood states, heatmap, sensor layer.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Thermometer, Wifi, WifiOff, Activity, MapPin } from "lucide-react";
import { type Theme, Badge, LiveDot, Meter, Panel, triggerHaptic } from "./shared";
import "@/styles/eeie-motion.css";

interface MoodState {
  id: string; label: string; color: string; desc: string; icon: string;
  upsell: "aggressive" | "standard" | "soft"; pace: string;
}

const MOOD_STATES: MoodState[] = [
  { id: "calm",         label: "Calm",            color: "#38BDF8", desc: "Relaxed, intimate, low-pressure service", icon: "◎", upsell: "soft",       pace: "Slow & attentive" },
  { id: "social",       label: "Social",          color: "#60A5FA", desc: "Conversational, group energy rising",     icon: "◈", upsell: "standard",   pace: "Natural rhythm" },
  { id: "premium",      label: "Premium",         color: "#3B82F6", desc: "High-value guests, luxury mode active",  icon: "◆", upsell: "aggressive",  pace: "Curated moments" },
  { id: "high_energy",  label: "High Energy",     color: "#22D3EE", desc: "Energetic room, fast service needed",    icon: "◉", upsell: "standard",   pace: "Quick & efficient" },
  { id: "crowded",      label: "Crowded",         color: "#F59E0B", desc: "High occupancy, monitor wait times",     icon: "◐", upsell: "soft",       pace: "Manage flow first" },
  { id: "slow",         label: "Slow",            color: "#C084FC", desc: "Low occupancy, time for personalization",icon: "○", upsell: "aggressive",  pace: "Deep engagement" },
  { id: "vip",          label: "VIP Active",      color: "#A78BFA", desc: "VIP table needs elevated attention",     icon: "★", upsell: "aggressive",  pace: "Concierge level" },
  { id: "pressure",     label: "Svc Pressure",    color: "#F87171", desc: "Staff overwhelmed, prioritize tables",   icon: "▲", upsell: "soft",       pace: "Triage mode" },
  { id: "recovery",     label: "Recovery",        color: "#34D399", desc: "Post-rush recovery, stabilizing",        icon: "◑", upsell: "standard",   pace: "Steady & calm" },
  { id: "afterhours",   label: "After-Hours",     color: "#6366F1", desc: "Late-night premium mode active",         icon: "◇", upsell: "aggressive",  pace: "Signature experience" },
];

interface SensorCard {
  id: string; name: string; area: string; signal: number; lastReading: string;
  status: "live" | "simulated" | "manual" | "disconnected"; alertLevel: "none" | "low" | "high";
  linkedItem?: string;
}

const SENSORS: SensorCard[] = [
  { id: "s1", name: "Humidor Sensor",    area: "Cigar Vault",   signal: 94, lastReading: "68.2% RH · 70°F", status: "simulated", alertLevel: "none", linkedItem: "Padron 1964" },
  { id: "s2", name: "Occupancy Sensor",  area: "Main Floor",    signal: 87, lastReading: "12 guests detected", status: "simulated", alertLevel: "none" },
  { id: "s3", name: "Motion Sensor",     area: "Bar Counter",   signal: 72, lastReading: "High activity", status: "simulated", alertLevel: "low" },
  { id: "s4", name: "Smart Shelf",       area: "Back Bar",      signal: 0,  lastReading: "No signal", status: "disconnected", alertLevel: "high" },
  { id: "s5", name: "Temperature",       area: "Lounge Floor",  signal: 89, lastReading: "72.1°F", status: "simulated", alertLevel: "none" },
  { id: "s6", name: "Kiosk Camera",      area: "Entry Kiosk",   signal: 98, lastReading: "Permission granted", status: "live", alertLevel: "none" },
  { id: "s7", name: "NFC Reader",        area: "Host Station",  signal: 45, lastReading: "Standby", status: "manual", alertLevel: "low" },
  { id: "s8", name: "Bottle Stock Sensor", area: "Spirits Wall", signal: 0, lastReading: "Not installed", status: "disconnected", alertLevel: "high", linkedItem: "Macallan 18" },
];

interface TableZone {
  id: string; label: string; col: number; row: number;
  status: "active" | "vip" | "attention" | "slow" | "empty" | "paused";
  guest?: string; pressure: number;
}

const HEATMAP_TABLES: TableZone[] = [
  { id: "T1", label: "1",  col: 0, row: 0, status: "active",    guest: "Marcus R.",  pressure: 72 },
  { id: "T2", label: "2",  col: 1, row: 0, status: "vip",       guest: "Elena V.",   pressure: 95 },
  { id: "T3", label: "3",  col: 2, row: 0, status: "empty",     pressure: 0 },
  { id: "T4", label: "4",  col: 3, row: 0, status: "attention", guest: "Sophia L.",  pressure: 88 },
  { id: "T5", label: "5",  col: 0, row: 1, status: "slow",      guest: "Group A",    pressure: 20 },
  { id: "T6", label: "6",  col: 1, row: 1, status: "empty",     pressure: 0 },
  { id: "T7", label: "7",  col: 2, row: 1, status: "paused",    guest: "James O.",   pressure: 55 },
  { id: "T8", label: "8",  col: 3, row: 1, status: "active",    guest: "VIP Party",  pressure: 80 },
  { id: "T9", label: "Bar",col: 0, row: 2, status: "active",    pressure: 91 },
  { id: "T10",label: "Priv",col:2, row: 2, status: "vip",       guest: "VIP Room",   pressure: 100 },
];

function tableColor(status: TableZone["status"]) {
  return {
    active:    "#3B82F6",
    vip:       "#A78BFA",
    attention: "#F59E0B",
    slow:      "#38BDF8",
    empty:     "transparent",
    paused:    "#60A5FA",
  }[status];
}

function sensorStatusColor(s: SensorCard["status"], T: Theme) {
  return { live: T.green, simulated: T.accent, manual: T.yellow, disconnected: T.red }[s];
}

function alertColor(a: SensorCard["alertLevel"], T: Theme) {
  return { none: T.green, low: T.yellow, high: T.red }[a];
}

interface Props { T: Theme; }

export function MoodSensorTab({ T }: Props) {
  const [mood, setMood] = useState<string>("premium");
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const activeMood = MOOD_STATES.find(m => m.id === mood)!;

  function setMoodState(id: string) {
    setMood(id);
    triggerHaptic("softTap");
  }

  const selectedTable = HEATMAP_TABLES.find(t => t.id === selectedZone);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Active mood state banner */}
      <motion.div
        key={mood}
        initial={{ opacity: 0.6 }} animate={{ opacity: 1 }}
        className="eeie-active-breathe"
        style={{
          padding: "16px 22px", borderRadius: 16,
          background: `${activeMood.color}12`,
          border: `1px solid ${activeMood.color}35`,
          boxShadow: `0 0 32px ${activeMood.color}12`,
          display: "flex", alignItems: "center", gap: 16,
          position: "relative", overflow: "hidden",
        }}
      >
        <div className="eeie-mood-wash" style={{ background: `${activeMood.color}08` }} />
        <div style={{ fontSize: 32, lineHeight: 1, color: activeMood.color }}>{activeMood.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{activeMood.label}</div>
            <Badge label="ACTIVE MOOD" color={activeMood.color} bg={`${activeMood.color}14`} />
          </div>
          <div style={{ fontSize: 12, color: T.textMid }}>{activeMood.desc}</div>
        </div>
        <div style={{ display: "flex", gap: 24, flexShrink: 0 }}>
          {[
            { l: "UPSELL MODE", v: activeMood.upsell.toUpperCase() },
            { l: "SERVICE PACE", v: activeMood.pace },
          ].map(m => (
            <div key={m.l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 8, color: T.textFaint, fontFamily: T.mono, letterSpacing: "0.16em", marginBottom: 4 }}>{m.l}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: activeMood.color }}>{m.v}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Mood state grid */}
      <Panel title="Venue Mood States" subtitle="Tap to activate a mood state" icon={<Activity size={14} />} T={T}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {MOOD_STATES.map(m => {
            const isActive = mood === m.id;
            return (
              <motion.button key={m.id} whileTap={{ scale: 0.95 }} onClick={() => setMoodState(m.id)}
                style={{
                  padding: "12px 8px", borderRadius: 12, border: `1px solid ${isActive ? m.color : `${m.color}28`}`,
                  background: isActive ? `${m.color}18` : "transparent",
                  cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                  boxShadow: isActive ? `0 0 14px ${m.color}28` : "none",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: 20, color: m.color }}>{m.icon}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: isActive ? m.color : T.textSub, textAlign: "center", lineHeight: 1.3 }}>{m.label}</div>
                {isActive && <LiveDot color={m.color} size={5} />}
              </motion.button>
            );
          })}
        </div>
      </Panel>

      {/* Venue Heatmap */}
      <Panel title="Live Venue Heatmap" subtitle="Real-time floor intelligence" icon={<MapPin size={14} />} badge="LIVE" T={T}>
        <div style={{ display: "flex", gap: 20 }}>
          {/* Floor grid */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
              {HEATMAP_TABLES.map(table => {
                const c = tableColor(table.status);
                const isSelected = selectedZone === table.id;
                return (
                  <motion.div key={table.id} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedZone(isSelected ? null : table.id)}
                    style={{
                      height: table.id === "T9" || table.id === "T10" ? 72 : 64,
                      gridColumn: table.id === "T10" ? "3 / 5" : undefined,
                      borderRadius: 12,
                      background: table.status === "empty" ? `${T.border}` : `${c}18`,
                      border: `2px solid ${isSelected ? c : table.status === "empty" ? T.border : `${c}35`}`,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      cursor: table.status === "empty" ? "default" : "pointer",
                      boxShadow: isSelected ? `0 0 18px ${c}40` : "none",
                      position: "relative", overflow: "hidden",
                    }}
                  >
                    {table.status !== "empty" && (
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${table.pressure}%`, background: `${c}12` }} />
                    )}
                    <div style={{ fontSize: 13, fontWeight: 800, color: table.status === "empty" ? T.textFaint : c, position: "relative" }}>{table.label}</div>
                    {table.guest && <div style={{ fontSize: 8, color: T.textSub, marginTop: 2, position: "relative" }}>{table.guest.split(" ")[0]}</div>}
                    {table.status !== "empty" && (
                      <div style={{ position: "absolute", top: 5, right: 6 }}>
                        <LiveDot color={c} size={5} />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {[
                { label: "Active",    color: "#3B82F6" },
                { label: "VIP",       color: "#A78BFA" },
                { label: "Attention", color: "#F59E0B" },
                { label: "Slow",      color: "#38BDF8" },
                { label: "Paused",    color: "#60A5FA" },
              ].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: `${l.color}30`, border: `1px solid ${l.color}60` }} />
                  <span style={{ fontSize: 9, color: T.textSub, fontFamily: T.mono }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected table detail */}
          <AnimatePresence>
            {selectedTable && selectedTable.status !== "empty" && (
              <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                style={{ width: 160, flexShrink: 0, padding: "14px", borderRadius: 14, background: `${tableColor(selectedTable.status)}10`, border: `1px solid ${tableColor(selectedTable.status)}35` }}
              >
                <div style={{ fontSize: 9, fontWeight: 700, color: T.textFaint, fontFamily: T.mono, marginBottom: 8 }}>TABLE {selectedTable.label} DETAIL</div>
                <Badge label={selectedTable.status.toUpperCase()} color={tableColor(selectedTable.status)} bg={`${tableColor(selectedTable.status)}14`} />
                {selectedTable.guest && <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginTop: 10, marginBottom: 4 }}>{selectedTable.guest}</div>}
                <div style={{ fontSize: 9, color: T.textSub, marginBottom: 10 }}>Service pressure</div>
                <Meter pct={selectedTable.pressure} color={tableColor(selectedTable.status)} height={6} />
                <div style={{ fontSize: 11, fontWeight: 700, color: tableColor(selectedTable.status), marginTop: 5 }}>{selectedTable.pressure}%</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Panel>

      {/* Sensor Layer */}
      <Panel title="Sensor Layer Status" subtitle="Hardware readiness · Never fake live data" icon={<Thermometer size={14} />} T={T}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {SENSORS.map(s => {
            const sc = sensorStatusColor(s.status, T);
            const ac = alertColor(s.alertLevel, T);
            return (
              <motion.div key={s.id} whileHover={{ y: -1 }}
                className={s.status === "live" ? "eeie-active-breathe" : s.status === "disconnected" ? "eeie-warning-pulse" : "eeie-machine-pulse"}
                style={{ padding: "13px 14px", borderRadius: 12, background: T.cardAlt, border: `1px solid ${s.alertLevel === "high" ? `${T.red}30` : T.border}`, boxShadow: T.shadow }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {s.status === "disconnected" ? <WifiOff size={12} color={T.red} /> : <Wifi size={12} color={sc} />}
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: T.text }}>{s.name}</span>
                  </div>
                  <Badge label={s.status.toUpperCase()} color={sc} bg={`${sc}12`} />
                </div>
                <div style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono, marginBottom: 5 }}>{s.area}</div>
                <div style={{ fontSize: 10, color: T.textMid, marginBottom: 8 }}>{s.lastReading}</div>
                {s.status !== "disconnected" && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: T.textSub, marginBottom: 4 }}>
                      <span>Signal</span><span style={{ color: sc, fontWeight: 700 }}>{s.signal}%</span>
                    </div>
                    <Meter pct={s.signal} color={sc} height={4} />
                  </>
                )}
                {s.alertLevel !== "none" && (
                  <div style={{ marginTop: 7, padding: "5px 9px", borderRadius: 7, background: `${ac}0E`, border: `1px solid ${ac}25`, fontSize: 9, color: ac, fontFamily: T.mono }}>
                    ⚠ {s.alertLevel === "high" ? "HARDWARE OFFLINE" : "CHECK SIGNAL"}
                  </div>
                )}
                {s.linkedItem && (
                  <div style={{ marginTop: 5, fontSize: 8.5, color: T.textFaint }}>Linked: {s.linkedItem}</div>
                )}
              </motion.div>
            );
          })}
        </div>
        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: `${T.accent}06`, border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono, lineHeight: 1.6 }}>
            SOURCE LABELS: <span style={{ color: T.green }}>LIVE</span> = real hardware connected &nbsp;·&nbsp;
            <span style={{ color: T.accent }}>SIMULATED</span> = demo data &nbsp;·&nbsp;
            <span style={{ color: T.yellow }}>MANUAL</span> = staff entered &nbsp;·&nbsp;
            <span style={{ color: T.red }}>DISCONNECTED</span> = hardware offline
          </div>
        </div>
      </Panel>
    </div>
  );
}
