/**
 * E.A.T. POS SCREEN — Integrated Mobile POS
 * Wires all three infrastructure layers into one operational surface:
 *  Layer 1 · E.A.T. Engine       (useEATEngineStore)
 *  Layer 2 · Command Center Telemetry (useCmdTelemetryStore)
 *  Layer 3 · Developer Event Bus  (useDevBusStore)
 *
 * Design: True Obsidian #010101 · Gold #C9922A · 24px+ body / 36px+ headers
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import { useEATEngineStore, type AssetItem, type LedgerLine } from "@/src/store/eatEngineStore";
import { useCmdTelemetryStore, type CmdEvent } from "@/src/store/cmdTelemetryStore";
import { useDevBusStore, type BusEvent, type WsStatus } from "@/src/store/devBusStore";

// ── Design tokens ─────────────────────────────────────────────────────────────

const D = {
  bg:      "#010101" as const,
  surface: "#0D0D0D" as const,
  card:    "#141414" as const,
  border:  "#1F1F1F" as const,
  gold:    "#C9922A" as const,
  goldDim: "rgba(201,146,42,0.28)" as const,
  goldGlow:"rgba(201,146,42,0.08)" as const,
  text:    "#F0EDE8" as const,
  muted:   "#6B6158" as const,
  green:   "#2ECC71" as const,
  red:     "#E74C3C" as const,
  blue:    "#3B9EE8" as const,
  amber:   "#F0A500" as const,
  purple:  "#9B59B6" as const,
};

// ── Category badge colors ─────────────────────────────────────────────────────

const CMD_COLORS: Record<string, string> = {
  TABLE_PACING_ALERT: D.amber,
  SESSION_UPDATE:     D.blue,
  VOLUME_SHIFT:       D.red,
  TIP_POOL_ALLOC:     D.green,
  RITUAL_BROADCAST:   D.gold,
  ASSET_LOCK:         "#E67E22",
  STAFF_ALERT:        D.purple,
};

const BUS_COLORS: Record<string, string> = {
  MUTATION:      D.purple,
  WS_HANDSHAKE:  D.blue,
  SHADOW_ENCRYPT:D.gold,
  OFFLINE_SYNC:  D.amber,
  EXEC_MARKER:   "#888",
  SENSOR:        D.green,
  AUTH:          D.red,
  SYSTEM:        "#555",
};

const WS_STATUS_COLOR: Record<WsStatus, string> = {
  DISCONNECTED:          D.red,
  CONNECTING:            D.amber,
  HANDSHAKE_IN_PROGRESS: D.amber,
  CONNECTED:             D.green,
  RECONNECTING:          D.amber,
  HANDSHAKE_FAILED:      D.red,
};

// ── Small reusable atoms ──────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[s.badge, { borderColor: color, backgroundColor: color + "22" }]}>
      <Text style={[s.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function Dot({ color }: { color: string }) {
  return <View style={[s.dot, { backgroundColor: color }]} />;
}

function SectionHeader({
  title, subtitle, open, onToggle, accentColor = D.gold,
}: {
  title: string; subtitle: string; open: boolean;
  onToggle: () => void; accentColor?: string;
}) {
  return (
    <Pressable onPress={onToggle} style={s.sectionHeader}>
      <View style={[s.sectionAccent, { backgroundColor: accentColor }]} />
      <View style={{ flex: 1 }}>
        <Text style={s.sectionTitle}>{title}</Text>
        <Text style={s.sectionSub}>{subtitle}</Text>
      </View>
      <Text style={[s.chevron, { color: accentColor }]}>{open ? "▲" : "▼"}</Text>
    </Pressable>
  );
}

// ── Collapsible panel wrapper ─────────────────────────────────────────────────

function Panel({
  title, subtitle, accentColor = D.gold, defaultOpen = true, children,
}: {
  title: string; subtitle: string; accentColor?: string;
  defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const anim   = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = useCallback(() => {
    const to = open ? 0 : 1;
    Animated.timing(anim, { toValue: to, duration: 220, useNativeDriver: false }).start();
    setOpen(!open);
  }, [open, anim]);

  return (
    <View style={[s.panel, { borderColor: accentColor + "44" }]}>
      <SectionHeader
        title={title} subtitle={subtitle}
        open={open} onToggle={toggle} accentColor={accentColor}
      />
      <Animated.View style={{ overflow: "hidden", maxHeight: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 2400] }) }}>
        {children}
      </Animated.View>
    </View>
  );
}

// ── Layer 1 Panel: E.A.T. Engine ──────────────────────────────────────────────

function EATEnginePanel() {
  const { environment, assets, ledger, tipPoolCents, sessionTotalCents, ritualActive, syncStatus, syncAssets } = useEATEngineStore();
  const { climate, audio, scent, zone, preset } = environment;

  function fmtCents(c: number) {
    return `$${(c / 100).toFixed(2)}`;
  }

  const lockedCount = assets.filter((a) => a.locked).length;
  const lowCount    = assets.filter((a) => !a.locked && a.qty > 0 && a.qty / a.par < 0.25).length;

  function climateBar(value: number, min: number, max: number, warnMin?: number, warnMax?: number) {
    const pct   = Math.min(1, Math.max(0, (value - min) / (max - min)));
    const alert = (warnMin !== undefined && value < warnMin) || (warnMax !== undefined && value > warnMax);
    return (
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${pct * 100}%`, backgroundColor: alert ? D.red : D.gold }]} />
      </View>
    );
  }

  const renderAsset = ({ item: a }: { item: AssetItem }) => (
    <View style={[s.assetRow, a.locked && s.assetLocked]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.assetName, a.locked && { color: D.muted }]}>{a.name}</Text>
        <Text style={s.assetCat}>{a.category} · {a.zone.toUpperCase()}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        {a.locked
          ? <Badge label="LOCKED" color={D.red} />
          : a.qty / a.par < 0.25
            ? <Badge label={`${a.qty} / ${a.par}`} color={D.amber} />
            : <Text style={s.assetQty}>{a.qty}<Text style={s.assetPar}> / {a.par}</Text></Text>
        }
      </View>
    </View>
  );

  const renderLedger = ({ item: l }: { item: LedgerLine }) => (
    <View style={s.ledgerRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.ledgerName}>{l.name}</Text>
        {l.isRitual && <Badge label="RITUAL" color={D.gold} />}
      </View>
      <Text style={s.ledgerPrice}>×{l.qty}  {fmtCents(l.priceCents * l.qty)}</Text>
    </View>
  );

  return (
    <>
      {/* Environment sub-section */}
      <View style={s.subSection}>
        <Text style={s.subLabel}>ENVIRONMENT</Text>
        <View style={s.envRow}>
          <View style={s.envChip}><Text style={s.envChipLabel}>ZONE</Text><Text style={s.envChipVal}>{zone}</Text></View>
          <View style={s.envChip}><Text style={s.envChipLabel}>MODE</Text><Text style={[s.envChipVal, { color: D.gold }]}>{preset}</Text></View>
          <View style={s.envChip}><Text style={s.envChipLabel}>CLIMATE</Text><Dot color={climate.status === "NOMINAL" ? D.green : D.red} /></View>
        </View>
        <View style={s.sensorGrid}>
          <View style={s.sensorCell}>
            <Text style={s.sensorLabel}>TEMP</Text>
            <Text style={s.sensorVal}>{climate.tempF.toFixed(1)}°F</Text>
            {climateBar(climate.tempF, 60, 80, 65, 75)}
          </View>
          <View style={s.sensorCell}>
            <Text style={s.sensorLabel}>HUMIDITY</Text>
            <Text style={s.sensorVal}>{climate.humidityPct.toFixed(1)}%</Text>
            {climateBar(climate.humidityPct, 50, 90, 60, 80)}
          </View>
          <View style={s.sensorCell}>
            <Text style={s.sensorLabel}>AIR CFM</Text>
            <Text style={s.sensorVal}>{climate.airExchangeCfm}</Text>
            {climateBar(climate.airExchangeCfm, 200, 600)}
          </View>
        </View>
        <View style={s.envRow}>
          <View style={s.envChip}><Text style={s.envChipLabel}>AUDIO</Text><Text style={s.envChipVal}>{audio.gainDb} dB</Text></View>
          <View style={s.envChip}><Text style={s.envChipLabel}>SCENT</Text><Text style={[s.envChipVal, { fontSize: 11 }]}>{scent.activeFluid}</Text></View>
        </View>
      </View>

      {/* Asset vault sub-section */}
      <View style={s.subSection}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={s.subLabel}>ASSET VAULT</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {lockedCount > 0 && <Badge label={`${lockedCount} LOCKED`} color={D.red} />}
            {lowCount > 0    && <Badge label={`${lowCount} LOW`}    color={D.amber} />}
            <Pressable onPress={syncAssets} style={[s.miniBtn, { borderColor: D.gold + "66" }]}>
              <Text style={[s.miniBtnText, { color: syncStatus === "SYNCING" ? D.amber : D.gold }]}>
                {syncStatus === "SYNCING" ? "SYNCING…" : "SYNC"}
              </Text>
            </Pressable>
          </View>
        </View>
        <FlatList
          data={assets}
          keyExtractor={(a) => a.id}
          renderItem={renderAsset}
          scrollEnabled={false}
          style={{ marginTop: 8 }}
        />
      </View>

      {/* Transaction ledger sub-section */}
      <View style={s.subSection}>
        <Text style={s.subLabel}>TRANSACTION LEDGER</Text>
        {ledger.length === 0
          ? <Text style={[s.muted, { padding: 12 }]}>No items — use actions below to add</Text>
          : <FlatList data={ledger} keyExtractor={(l) => l.id} renderItem={renderLedger} scrollEnabled={false} />
        }
        <View style={[s.totalRow, { borderTopColor: D.border }]}>
          <Text style={s.totalLabel}>SESSION TOTAL</Text>
          <Text style={[s.totalVal, { color: D.gold }]}>{fmtCents(sessionTotalCents)}</Text>
        </View>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>TIP POOL (18%)</Text>
          <Text style={[s.totalVal, { color: D.green }]}>{fmtCents(tipPoolCents)}</Text>
        </View>
      </View>

      {ritualActive && (
        <View style={s.ritualBanner}>
          <Text style={s.ritualBannerText}>◈  RITUAL EXECUTION IN PROGRESS…</Text>
        </View>
      )}
    </>
  );
}

// ── Layer 2 Panel: Command Center Telemetry ───────────────────────────────────

function CmdTelemetryPanel() {
  const {
    eventQueue, transmissionLog, streamActive, autoEventsActive,
    totalEventsPushed, totalBatchesSent, lastTransmitAt, cmdCenterOnline,
    startStream, stopStream, startAutoEvents, stopAutoEvents, clearLog,
  } = useCmdTelemetryStore();

  function fmtTime(ms: number) {
    const d = new Date(ms);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
  }

  const renderBatch = ({ item: b, index }: { item: typeof transmissionLog[0]; index: number }) => (
    <View style={[s.batchRow, index % 2 === 0 && { backgroundColor: D.card }]}>
      <Dot color={b.status === "ACK" ? D.green : b.status === "TIMEOUT" ? D.red : D.amber} />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={s.batchId}>{b.batchId.slice(-12)}</Text>
        <Text style={s.batchMeta}>{b.eventCount} evt · {b.ackLatencyMs}ms · {fmtTime(b.sentAt)}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
          {b.eventTypes.map((t) => (
            <Badge key={t} label={t.replace(/_/g, " ")} color={CMD_COLORS[t] ?? D.muted} />
          ))}
        </View>
      </View>
      <Badge label={b.status} color={b.status === "ACK" ? D.green : D.red} />
    </View>
  );

  const renderQueueEvent = ({ item: e }: { item: CmdEvent }) => (
    <View style={s.queueRow}>
      <Dot color={CMD_COLORS[e.type] ?? D.muted} />
      <Text style={[s.queueType, { color: CMD_COLORS[e.type] ?? D.muted }]}>
        {e.type.replace(/_/g, " ")}
      </Text>
      {"tableId" in e && <Text style={s.queueMeta}>  {(e as {tableId: string}).tableId}</Text>}
      <Text style={[s.queueMeta, { marginLeft: "auto" }]}>{fmtTime(e.timestamp)}</Text>
    </View>
  );

  return (
    <>
      {/* Status row */}
      <View style={s.subSection}>
        <View style={s.statusRow}>
          <View style={s.statusCell}>
            <Dot color={cmdCenterOnline ? D.green : D.red} />
            <Text style={s.statusLabel}>{cmdCenterOnline ? "CMD CENTER ONLINE" : "OFFLINE"}</Text>
          </View>
          <View style={s.statusCell}>
            <Dot color={streamActive ? D.green : D.muted} />
            <Text style={s.statusLabel}>STREAM {streamActive ? "ACTIVE" : "IDLE"}</Text>
          </View>
          <View style={s.statusCell}>
            <Text style={[s.statusLabel, { color: D.gold }]}>↑{totalBatchesSent} batches</Text>
          </View>
        </View>
        <View style={s.statusRow}>
          <Text style={[s.muted, { fontSize: 13 }]}>
            {totalEventsPushed} events pushed · Queue depth: {eventQueue.length}
            {lastTransmitAt ? `  · Last: ${fmtTime(lastTransmitAt)}` : ""}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={[s.subSection, { flexDirection: "row", gap: 8, flexWrap: "wrap" }]}>
        <Pressable onPress={streamActive ? stopStream : startStream} style={[s.ctrlBtn, { borderColor: streamActive ? D.red : D.green }]}>
          <Text style={[s.ctrlBtnText, { color: streamActive ? D.red : D.green }]}>
            {streamActive ? "STOP STREAM" : "START STREAM"}
          </Text>
        </Pressable>
        <Pressable onPress={autoEventsActive ? stopAutoEvents : startAutoEvents} style={[s.ctrlBtn, { borderColor: autoEventsActive ? D.amber : D.blue }]}>
          <Text style={[s.ctrlBtnText, { color: autoEventsActive ? D.amber : D.blue }]}>
            {autoEventsActive ? "STOP AUTO-EVT" : "START AUTO-EVT"}
          </Text>
        </Pressable>
        <Pressable onPress={clearLog} style={[s.ctrlBtn, { borderColor: D.muted }]}>
          <Text style={[s.ctrlBtnText, { color: D.muted }]}>CLEAR</Text>
        </Pressable>
      </View>

      {/* Pending queue */}
      {eventQueue.length > 0 && (
        <View style={s.subSection}>
          <Text style={s.subLabel}>PENDING QUEUE ({eventQueue.length})</Text>
          <FlatList data={eventQueue} keyExtractor={(e) => e.id} renderItem={renderQueueEvent} scrollEnabled={false} />
        </View>
      )}

      {/* Transmission log */}
      <View style={s.subSection}>
        <Text style={s.subLabel}>TRANSMISSION LOG</Text>
        {transmissionLog.length === 0
          ? <Text style={[s.muted, { padding: 12 }]}>No batches transmitted yet</Text>
          : <FlatList data={transmissionLog} keyExtractor={(b) => b.batchId} renderItem={renderBatch} scrollEnabled={false} />
        }
      </View>
    </>
  );
}

// ── Layer 3 Panel: Developer Event Bus ────────────────────────────────────────

function DevBusPanel() {
  const {
    events, wsStatus, wsHandshakeHistory, shadowLatencies,
    shadowModeActive, diagnosticLoopActive, totalEventsLogged, systemUpMs,
    setShadowMode, startDiagnosticLoop, stopDiagnosticLoop, clearEvents,
    simulateWsHandshake, measureShadowLatency,
  } = useDevBusStore();

  function fmtUptime(ms: number) {
    const s  = Math.floor(ms / 1000);
    const m  = Math.floor(s / 60);
    const h  = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  }

  function fmtTs(ms: number) {
    const d = new Date(ms);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}.${d.getMilliseconds().toString().padStart(3, "0")}`;
  }

  const renderEvent = ({ item: e }: { item: BusEvent }) => (
    <View style={s.busEventRow}>
      <Text style={[s.busTs, { color: D.muted }]}>{fmtTs(e.timestamp)}</Text>
      <View style={[s.busCatChip, { backgroundColor: (BUS_COLORS[e.category] ?? D.muted) + "22", borderColor: (BUS_COLORS[e.category] ?? D.muted) + "66" }]}>
        <Text style={[s.busCatText, { color: BUS_COLORS[e.category] ?? D.muted }]}>{e.category}</Text>
      </View>
      <Text style={s.busMarker} numberOfLines={1}>{e.marker}</Text>
      {e.latencyMs !== undefined && (
        <Text style={[s.busLatency, { color: e.latencyMs > 100 ? D.amber : D.green }]}>{e.latencyMs.toFixed(1)}ms</Text>
      )}
    </View>
  );

  const latAvg = shadowLatencies.length
    ? (shadowLatencies.reduce((a, r) => a + r.encryptMs + r.decryptMs, 0) / shadowLatencies.length).toFixed(2)
    : "—";

  return (
    <>
      {/* System status row */}
      <View style={s.subSection}>
        <View style={s.statusRow}>
          <View style={s.statusCell}>
            <Dot color={WS_STATUS_COLOR[wsStatus]} />
            <Text style={[s.statusLabel, { color: WS_STATUS_COLOR[wsStatus] }]}>{wsStatus.replace(/_/g, " ")}</Text>
          </View>
          <View style={s.statusCell}>
            <Dot color={diagnosticLoopActive ? D.green : D.muted} />
            <Text style={s.statusLabel}>DIAG {diagnosticLoopActive ? "RUNNING" : "STOPPED"}</Text>
          </View>
        </View>
        <View style={s.statusRow}>
          <Text style={[s.muted, { fontSize: 13 }]}>
            {totalEventsLogged} total logged · Uptime: {fmtUptime(systemUpMs)}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={[s.subSection, { flexDirection: "row", gap: 8, flexWrap: "wrap" }]}>
        <Pressable
          onPress={diagnosticLoopActive ? stopDiagnosticLoop : startDiagnosticLoop}
          style={[s.ctrlBtn, { borderColor: diagnosticLoopActive ? D.red : D.green }]}
        >
          <Text style={[s.ctrlBtnText, { color: diagnosticLoopActive ? D.red : D.green }]}>
            {diagnosticLoopActive ? "STOP DIAG" : "START DIAG"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setShadowMode(!shadowModeActive)}
          style={[s.ctrlBtn, { borderColor: shadowModeActive ? D.gold : D.muted }]}
        >
          <Text style={[s.ctrlBtnText, { color: shadowModeActive ? D.gold : D.muted }]}>
            SHADOW {shadowModeActive ? "ON" : "OFF"}
          </Text>
        </Pressable>
        <Pressable onPress={simulateWsHandshake} style={[s.ctrlBtn, { borderColor: D.blue }]}>
          <Text style={[s.ctrlBtnText, { color: D.blue }]}>WS HANDSHAKE</Text>
        </Pressable>
        <Pressable onPress={() => measureShadowLatency(2048)} style={[s.ctrlBtn, { borderColor: D.purple }]}>
          <Text style={[s.ctrlBtnText, { color: D.purple }]}>MEASURE ENCRYPT</Text>
        </Pressable>
        <Pressable onPress={clearEvents} style={[s.ctrlBtn, { borderColor: D.muted }]}>
          <Text style={[s.ctrlBtnText, { color: D.muted }]}>CLEAR LOG</Text>
        </Pressable>
      </View>

      {/* Shadow mode stats */}
      {shadowLatencies.length > 0 && (
        <View style={s.subSection}>
          <Text style={s.subLabel}>SHADOW ENCRYPT STATS (AES-256-GCM)</Text>
          <View style={s.statusRow}>
            <View style={s.statusCell}>
              <Text style={[s.statusLabel, { color: D.gold }]}>AVG TOTAL</Text>
              <Text style={[s.sensorVal, { color: D.gold }]}>{latAvg}ms</Text>
            </View>
            <View style={s.statusCell}>
              <Text style={s.statusLabel}>LAST ENC</Text>
              <Text style={s.sensorVal}>{shadowLatencies[0].encryptMs.toFixed(2)}ms</Text>
            </View>
            <View style={s.statusCell}>
              <Text style={s.statusLabel}>LAST DEC</Text>
              <Text style={s.sensorVal}>{shadowLatencies[0].decryptMs.toFixed(2)}ms</Text>
            </View>
            <View style={s.statusCell}>
              <Dot color={shadowLatencies[0].result === "OK" ? D.green : D.amber} />
              <Text style={[s.statusLabel, { color: shadowLatencies[0].result === "OK" ? D.green : D.amber }]}>
                {shadowLatencies[0].result}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* WS handshake history */}
      {wsHandshakeHistory.length > 0 && (
        <View style={s.subSection}>
          <Text style={s.subLabel}>WS HANDSHAKE HISTORY</Text>
          {wsHandshakeHistory.slice(0, 4).map((r) => (
            <View key={r.attemptId} style={s.wsRow}>
              <Dot color={r.status === "CONNECTED" ? D.green : D.red} />
              <Text style={[s.wsStatus, { color: r.status === "CONNECTED" ? D.green : D.red }]}>{r.status.replace(/_/g, " ")}</Text>
              {r.latencyMs !== null && <Text style={s.wsLatency}>{r.latencyMs}ms</Text>}
              {r.tlsVersion && <Badge label={`TLS ${r.tlsVersion}`} color={D.blue} />}
            </View>
          ))}
        </View>
      )}

      {/* Event log */}
      <View style={s.subSection}>
        <Text style={s.subLabel}>EVENT LOG ({events.length})</Text>
        {events.length === 0
          ? <Text style={[s.muted, { padding: 12 }]}>Start diagnostic loop to stream events</Text>
          : <FlatList data={events.slice(0, 30)} keyExtractor={(e) => e.id} renderItem={renderEvent} scrollEnabled={false} />
        }
      </View>
    </>
  );
}

// ── Action bus — cross-layer POS actions ─────────────────────────────────────

function ActionBar() {
  const eat   = useEATEngineStore();
  const cmd   = useCmdTelemetryStore();
  const bus   = useDevBusStore();

  const [busy, setBusy] = useState<string | null>(null);

  async function handleRitualDispatch() {
    if (busy) return;
    setBusy("RITUAL");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const t0 = Date.now();
    bus.log("EXEC_MARKER", "RITUAL_DISPATCH_INITIATED", { tableId: "A1", cueType: "FULL_CEREMONY" });
    bus.trackMutation("EATEngineStore", "ritualDispatch", {
      ritualActive: { before: false, after: true },
    });

    const ack = await eat.ritualDispatch("A1", "FULL_CEREMONY");

    cmd.push({
      type:      "RITUAL_BROADCAST",
      tableId:   "A1",
      cueType:   "FULL_CEREMONY",
      payloadId: ack.payloadId,
      latencyMs: ack.latencyMs,
    });

    bus.trackMutation("EATEngineStore", "ritualDispatch::complete", {
      ritualActive:  { before: true, after: false },
      lastRitualAck: { before: null, after: { payloadId: ack.payloadId, accepted: ack.accepted } },
    });
    bus.log("EXEC_MARKER", "RITUAL_DISPATCH_COMPLETE", { latencyMs: Date.now() - t0, accepted: ack.accepted }, Date.now() - t0);
    setBusy(null);
  }

  async function handleAddRitualItem() {
    if (busy) return;
    setBusy("ADD");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    eat.addLineItem({ name: "Cohiba Behike 52", priceCents: 42000, qty: 1, seat: null, isRitual: true });
    eat.deductAsset("a1");

    cmd.push({
      type:       "SESSION_UPDATE",
      sessionId:  `sess-mobile-${Date.now()}`,
      tableId:    "A1",
      totalCents: eat.sessionTotalCents + 42000,
      itemCount:  eat.ledger.length + 1,
      phase:      "ACTIVE",
    });

    bus.trackMutation("EATEngineStore", "addLineItem+deductAsset", {
      ledgerLength: { before: eat.ledger.length, after: eat.ledger.length + 1 },
      asset_a1_qty: { before: eat.assets.find(a => a.id === "a1")?.qty ?? 0, after: Math.max(0, (eat.assets.find(a => a.id === "a1")?.qty ?? 1) - 1) },
    });

    setBusy(null);
  }

  async function handleShadowPayment() {
    if (busy) return;
    setBusy("SHADOW");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    bus.setShadowMode(true);
    const latRec = await bus.measureShadowLatency(512);

    const token = `spk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    cmd.push({
      type:       "VOLUME_SHIFT",
      direction:  "UP",
      deltaCents: eat.sessionTotalCents,
      windowMin:  5,
      trigger:    "shadow_payment",
    });

    bus.snapshotOfflineQueue([
      { type: "SHADOW_PAY",   timestamp: Date.now() - 3000, sizeBytes: 512 },
      { type: "SESSION_SYNC", timestamp: Date.now() - 1500, sizeBytes: 256 },
    ]);

    bus.log("SHADOW_ENCRYPT", "SHADOW_PAYMENT_QUEUED", {
      token:       token.slice(0, 12) + "…",
      encryptMs:   latRec.encryptMs,
      payloadBytes: 512,
    }, latRec.encryptMs + latRec.decryptMs);

    bus.setShadowMode(false);
    setBusy(null);
  }

  async function handleTipAlloc() {
    if (busy) return;
    setBusy("TIP");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);

    const pool  = eat.tipPoolCents;
    const staff = 3;
    cmd.push({
      type:          "TIP_POOL_ALLOC",
      poolCents:     pool,
      staffCount:    staff,
      perStaffCents: Math.floor(pool / staff),
      allocatedAt:   Date.now(),
    });

    bus.log("EXEC_MARKER", "TIP_POOL_ALLOCATED", {
      poolCents:     pool,
      staffCount:    staff,
      perStaffCents: Math.floor(pool / staff),
    });

    setBusy(null);
  }

  const actions: Array<{ label: string; key: string; color: string; handler: () => void }> = [
    { label: "RITUAL DISPATCH",  key: "RITUAL", color: D.gold,   handler: handleRitualDispatch },
    { label: "ADD RITUAL ITEM",  key: "ADD",    color: D.blue,   handler: handleAddRitualItem  },
    { label: "SHADOW PAYMENT",   key: "SHADOW", color: D.purple, handler: handleShadowPayment  },
    { label: "ALLOC TIP POOL",   key: "TIP",    color: D.green,  handler: handleTipAlloc       },
  ];

  return (
    <View style={s.actionBar}>
      {actions.map(({ label, key, color, handler }) => (
        <Pressable
          key={key}
          onPress={handler}
          disabled={busy !== null}
          style={[s.actionBtn, { borderColor: color, opacity: busy && busy !== key ? 0.4 : 1 }]}
        >
          <LinearGradient colors={[color + "22", "transparent"]} style={StyleSheet.absoluteFill} />
          {busy === key
            ? <Text style={[s.actionBtnText, { color }]}>···</Text>
            : <Text style={[s.actionBtnText, { color }]}>{label}</Text>
          }
        </Pressable>
      ))}
    </View>
  );
}

// ── Root screen ───────────────────────────────────────────────────────────────

export default function EatPosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const cmd    = useCmdTelemetryStore();
  const bus    = useDevBusStore();
  const eat    = useEATEngineStore();

  // Boot all three layers on mount
  useEffect(() => {
    eat.startSensorPolling();
    cmd.startStream();
    cmd.startAutoEvents();
    bus.startDiagnosticLoop();
    bus.log("EXEC_MARKER", "EAT_POS_SCREEN_MOUNTED", { platform: Platform.OS });

    return () => {
      eat.stopSensorPolling();
      cmd.stopStream();
      cmd.stopAutoEvents();
      bus.stopDiagnosticLoop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wsColor = WS_STATUS_COLOR[bus.wsStatus];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient
        colors={["#0D0D0D", D.bg]}
        style={s.header}
      >
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>← BACK</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>E.A.T. POS SYSTEM</Text>
          <Text style={s.headerSub}>Environment · Asset · Transaction</Text>
        </View>
        <View style={s.wsIndicator}>
          <Dot color={wsColor} />
          <Text style={[s.wsIndicatorText, { color: wsColor }]}>
            {bus.wsStatus.split("_")[0]}
          </Text>
        </View>
      </LinearGradient>

      {/* Layer status strip */}
      <View style={s.layerStrip}>
        <View style={s.layerChip}>
          <Dot color={eat.sensorPollingActive ? D.green : D.muted} />
          <Text style={s.layerLabel}>EAT ENGINE</Text>
        </View>
        <View style={s.layerChip}>
          <Dot color={cmd.streamActive ? D.green : D.muted} />
          <Text style={s.layerLabel}>CMD TELEMETRY</Text>
        </View>
        <View style={s.layerChip}>
          <Dot color={bus.diagnosticLoopActive ? D.green : D.muted} />
          <Text style={s.layerLabel}>DEV BUS</Text>
        </View>
        <View style={[s.layerChip, { marginLeft: "auto" }]}>
          <Text style={[s.layerLabel, { color: D.gold }]}>
            Q:{cmd.eventQueue.length}  LOG:{bus.events.length}
          </Text>
        </View>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Panel title="LAYER 1 · E.A.T. ENGINE" subtitle="Environment · Asset · Transaction" accentColor={D.gold} defaultOpen>
          <EATEnginePanel />
        </Panel>

        <Panel title="LAYER 2 · CMD TELEMETRY" subtitle="Live Pipeline → Command Center" accentColor={D.blue} defaultOpen={false}>
          <CmdTelemetryPanel />
        </Panel>

        <Panel title="LAYER 3 · DEVELOPER BUS" subtitle="System Diagnostics & Event Stream" accentColor={D.purple} defaultOpen={false}>
          <DevBusPanel />
        </Panel>
      </ScrollView>

      {/* Sticky action bar */}
      <View style={[s.actionBarWrap, { paddingBottom: insets.bottom + 8 }]}>
        <LinearGradient colors={["transparent", D.bg]} style={s.actionBarFade} pointerEvents="none" />
        <ActionBar />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:              { flex: 1, backgroundColor: D.bg },
  header:            { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: D.border },
  backBtn:           { paddingVertical: 8, paddingRight: 12 },
  backBtnText:       { color: D.gold, fontSize: 15, fontWeight: "600", letterSpacing: 0.8 },
  headerTitle:       { color: D.text, fontSize: 22, fontWeight: "700", letterSpacing: 1.2 },
  headerSub:         { color: D.muted, fontSize: 13, letterSpacing: 0.6, marginTop: 2 },
  wsIndicator:       { flexDirection: "row", alignItems: "center", gap: 6, padding: 6, borderWidth: 1, borderColor: D.border, borderRadius: 6 },
  wsIndicatorText:   { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },

  layerStrip:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: D.border, gap: 12, flexWrap: "wrap" },
  layerChip:         { flexDirection: "row", alignItems: "center", gap: 5 },
  layerLabel:        { color: D.muted, fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },

  panel:             { backgroundColor: D.surface, borderWidth: 1, borderRadius: 8, marginBottom: 16, overflow: "hidden" },
  sectionHeader:     { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  sectionAccent:     { width: 3, height: 40, borderRadius: 2 },
  sectionTitle:      { color: D.text, fontSize: 16, fontWeight: "700", letterSpacing: 1 },
  sectionSub:        { color: D.muted, fontSize: 12, marginTop: 2, letterSpacing: 0.4 },
  chevron:           { fontSize: 12 },

  subSection:        { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: D.border },
  subLabel:          { color: D.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginBottom: 10 },

  dot:               { width: 7, height: 7, borderRadius: 4 },
  badge:             { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText:         { fontSize: 10, fontWeight: "700", letterSpacing: 0.6 },

  envRow:            { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 10 },
  envChip:           { backgroundColor: D.card, borderRadius: 6, padding: 8, gap: 3, flex: 1, minWidth: 80 },
  envChipLabel:      { color: D.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  envChipVal:        { color: D.text, fontSize: 13, fontWeight: "600" },

  sensorGrid:        { flexDirection: "row", gap: 8, marginBottom: 10 },
  sensorCell:        { flex: 1, backgroundColor: D.card, borderRadius: 6, padding: 10, gap: 4 },
  sensorLabel:       { color: D.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  sensorVal:         { color: D.text, fontSize: 18, fontWeight: "700" },
  barTrack:          { height: 3, backgroundColor: D.border, borderRadius: 2, marginTop: 2 },
  barFill:           { height: 3, borderRadius: 2 },

  assetRow:          { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: D.border },
  assetLocked:       { opacity: 0.45 },
  assetName:         { color: D.text, fontSize: 14, fontWeight: "600" },
  assetCat:          { color: D.muted, fontSize: 11, marginTop: 2 },
  assetQty:          { color: D.text, fontSize: 16, fontWeight: "700" },
  assetPar:          { color: D.muted, fontSize: 12 },

  ledgerRow:         { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: D.border, gap: 8 },
  ledgerName:        { color: D.text, fontSize: 14, fontWeight: "600" },
  ledgerPrice:       { color: D.gold, fontSize: 14, fontWeight: "700" },

  totalRow:          { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: D.border },
  totalLabel:        { color: D.muted, fontSize: 13, fontWeight: "700", letterSpacing: 0.8 },
  totalVal:          { fontSize: 18, fontWeight: "800" },

  miniBtn:           { borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  miniBtnText:       { fontSize: 11, fontWeight: "700", letterSpacing: 0.6 },

  ritualBanner:      { margin: 16, padding: 14, backgroundColor: D.gold + "22", borderWidth: 1, borderColor: D.gold + "88", borderRadius: 6 },
  ritualBannerText:  { color: D.gold, fontSize: 15, fontWeight: "700", letterSpacing: 1, textAlign: "center" },

  statusRow:         { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 6, flexWrap: "wrap" },
  statusCell:        { flexDirection: "row", alignItems: "center", gap: 6 },
  statusLabel:       { color: D.muted, fontSize: 12, fontWeight: "600", letterSpacing: 0.6 },

  ctrlBtn:           { borderWidth: 1, borderRadius: 5, paddingHorizontal: 12, paddingVertical: 8 },
  ctrlBtnText:       { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },

  batchRow:          { flexDirection: "row", alignItems: "flex-start", padding: 10, gap: 4, borderBottomWidth: 1, borderBottomColor: D.border },
  batchId:           { color: D.text, fontSize: 12, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  batchMeta:         { color: D.muted, fontSize: 11, marginTop: 2 },

  queueRow:          { flexDirection: "row", alignItems: "center", paddingVertical: 6, gap: 8, borderBottomWidth: 1, borderBottomColor: D.border },
  queueType:         { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  queueMeta:         { color: D.muted, fontSize: 11 },

  busEventRow:       { flexDirection: "row", alignItems: "center", paddingVertical: 5, gap: 6, borderBottomWidth: 1, borderBottomColor: "#111" },
  busTs:             { fontSize: 10, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", width: 80 },
  busCatChip:        { borderWidth: 1, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 },
  busCatText:        { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  busMarker:         { flex: 1, color: D.text, fontSize: 12, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  busLatency:        { fontSize: 11, fontWeight: "600", width: 52, textAlign: "right" },

  wsRow:             { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: D.border },
  wsStatus:          { fontSize: 12, fontWeight: "700", flex: 1 },
  wsLatency:         { color: D.muted, fontSize: 12 },

  actionBarWrap:     { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 8, backgroundColor: D.bg, borderTopWidth: 1, borderTopColor: D.border },
  actionBarFade:     { position: "absolute", top: -32, left: 0, right: 0, height: 32 },
  actionBar:         { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionBtn:         { flex: 1, minWidth: "45%", borderWidth: 1, borderRadius: 6, paddingVertical: 14, alignItems: "center", overflow: "hidden" },
  actionBtnText:     { fontSize: 13, fontWeight: "800", letterSpacing: 1 },

  muted:             { color: D.muted },
});
