import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type AmbiProfile, type DeviceMode, useNoveeStore } from "@/src/store/noveeStore";

const { height } = Dimensions.get("window");

const DEVICE_MODES: { id: DeviceMode; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: "GUEST_TABLET", label: "Guest Tablet", icon: "tablet-portrait-outline", color: "#4ade80" },
  { id: "STAFF_COCKPIT", label: "Staff Cockpit", icon: "briefcase-outline", color: "#D4AF37" },
  { id: "KIOSK", label: "Kiosk Mode", icon: "lock-closed-outline", color: "#C4610A" },
  { id: "ADMIN", label: "Admin Override", icon: "shield-outline", color: "#f87171" },
];

const AMBI_PROFILES: { id: AmbiProfile; label: string; color: string }[] = [
  { id: "SILK_SMOKE", label: "SILK SMOKE", color: "#8E8A82" },
  { id: "AMBER_GLOW", label: "AMBER GLOW", color: "#D48B00" },
  { id: "MIDNIGHT_LOUNGE", label: "MIDNIGHT", color: "#6666CC" },
  { id: "VIP_GOLD", label: "VIP GOLD", color: "#D4AF37" },
];

const LIVE_METRICS = [
  { label: "ACTIVE SESSIONS", value: "12", delta: "+3", up: true },
  { label: "REVENUE TODAY", value: "$4,820", delta: "+18%", up: true },
  { label: "AVG ORDER", value: "$86", delta: "-4%", up: false },
  { label: "ITEMS IN QUEUE", value: "7", delta: "0", up: true },
];

const CRAFT_STATUS = [
  { id: "smoke", label: "SMOKECRAFT", status: "ACTIVE", sessions: 6, color: "#D48B00" },
  { id: "pour", label: "POURCRAFT", status: "ACTIVE", sessions: 4, color: "#C4610A" },
  { id: "brew", label: "BREWCRAFT", status: "STANDBY", sessions: 2, color: "#8B6914" },
  { id: "vape", label: "VAPECRAFT", status: "OFFLINE", sessions: 0, color: "#5B8B8B" },
];

type OsTab = "dashboard" | "modules" | "device" | "sync";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function NoveeOSShell({ visible, onClose }: Props) {
  const slideY = useRef(new Animated.Value(height)).current;
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const {
    deviceMode,
    ambiProfile,
    syncQueue,
    isOnline,
    setDeviceMode,
    setAmbiProfile,
    triggerHeartbeat,
    processSyncQueue,
  } = useNoveeStore();

  const [activeTab, setActiveTab] = useState<OsTab>("dashboard");
  const [heartbeatCount, setHeartbeatCount] = useState(0);

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      Animated.timing(slideY, {
        toValue: height,
        duration: 360,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Heartbeat interval
  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => {
      triggerHeartbeat();
      setHeartbeatCount((c) => c + 1);
    }, 10000);
    return () => clearInterval(t);
  }, [visible]);

  function handleModeChange(mode: DeviceMode) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setDeviceMode(mode);
  }

  const modeCfg = DEVICE_MODES.find((m) => m.id === deviceMode)!;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.root, { transform: [{ translateY: slideY }] }]}>

        {/* Header bar */}
        <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: "rgba(212,175,55,0.18)" }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.modeBadge, { borderColor: `${modeCfg.color}60`, backgroundColor: `${modeCfg.color}14` }]}>
              <View style={[styles.modeActiveDot, { backgroundColor: modeCfg.color }]} />
              <Text style={[styles.modeBadgeText, { color: modeCfg.color }]}>{deviceMode}</Text>
            </View>
          </View>

          <Text style={styles.osTitle}>NOVEE OS</Text>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#D4AF37" />
          </TouchableOpacity>
        </View>

        {/* Tab nav */}
        <View style={[styles.tabRow, { borderBottomColor: "rgba(212,175,55,0.1)" }]}>
          {(["dashboard", "modules", "device", "sync"] as OsTab[]).map((t) => {
            const icons: Record<OsTab, keyof typeof Ionicons.glyphMap> = {
              dashboard: "pulse-outline",
              modules: "grid-outline",
              device: "hardware-chip-outline",
              sync: "sync-outline",
            };
            const labels: Record<OsTab, string> = {
              dashboard: "DASHBOARD",
              modules: "MODULES",
              device: "DEVICE",
              sync: "SYNC",
            };
            const active = t === activeTab;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => { Haptics.selectionAsync(); setActiveTab(t); }}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
              >
                <Ionicons name={icons[t]} size={16} color={active ? "#D4AF37" : "#8E8A82"} />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{labels[t]}</Text>
                {t === "sync" && syncQueue.length > 0 && (
                  <View style={styles.syncBadge}><Text style={styles.syncBadgeText}>{syncQueue.length}</Text></View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>

          {/* ─── DASHBOARD ─── */}
          {activeTab === "dashboard" && (
            <View style={styles.section}>
              {/* Metrics grid */}
              <View style={styles.metricsGrid}>
                {LIVE_METRICS.map((m) => (
                  <View key={m.label} style={[styles.metricCard, { borderColor: "rgba(212,175,55,0.15)" }]}>
                    <Text style={styles.metricLabel}>{m.label}</Text>
                    <Text style={styles.metricValue}>{m.value}</Text>
                    <Text style={[styles.metricDelta, { color: m.up ? "#4ade80" : "#f87171" }]}>
                      {m.up ? "▲" : "▼"} {m.delta}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Craft status */}
              <Text style={styles.sectionLabel}>CRAFT MODULE STATUS</Text>
              {CRAFT_STATUS.map((c) => (
                <View key={c.id} style={[styles.craftStatusRow, { borderColor: `${c.color}22` }]}>
                  <View style={[styles.craftStatusDot, { backgroundColor: c.color }]} />
                  <Text style={[styles.craftStatusLabel, { color: c.color }]}>{c.label}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={[styles.craftSessions, { color: "#8E8A82" }]}>{c.sessions} sessions</Text>
                  <View style={[
                    styles.statusPill,
                    { backgroundColor: c.status === "ACTIVE" ? "#4ade8018" : c.status === "STANDBY" ? "#D4AF3718" : "#f8717118" }
                  ]}>
                    <Text style={[
                      styles.statusPillText,
                      { color: c.status === "ACTIVE" ? "#4ade80" : c.status === "STANDBY" ? "#D4AF37" : "#f87171" }
                    ]}>{c.status}</Text>
                  </View>
                </View>
              ))}

              {/* Heartbeat */}
              <TouchableOpacity
                onPress={() => { triggerHeartbeat(); setHeartbeatCount(c => c + 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                style={styles.heartbeatBtn}
              >
                <Ionicons name="pulse" size={16} color="#D4AF37" />
                <Text style={styles.heartbeatText}>SEND HEARTBEAT</Text>
                <Text style={styles.heartbeatCount}>{heartbeatCount}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── MODULES ─── */}
          {activeTab === "modules" && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>CRAFT OPERATING MATRIX</Text>
              <Text style={styles.sectionSub}>Select an immersive physical environment experience layer</Text>
              <View style={styles.moduleGrid}>
                {CRAFT_STATUS.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.moduleTile, { borderColor: `${c.color}28` }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                  >
                    <View style={styles.tileGlassBg} />
                    <View style={[styles.tileIndicator, { backgroundColor: c.color }]} />
                    <Text style={[styles.tileTitle, { color: "#E5D5B3" }]}>{c.label}</Text>
                    <Text style={[styles.tileSub, { color: "#8E8A82" }]}>{c.sessions} active sessions</Text>
                    <View style={[styles.tileStatus, {
                      backgroundColor: c.status === "ACTIVE" ? "#4ade8015" : c.status === "STANDBY" ? "#D4AF3715" : "#f8717115",
                    }]}>
                      <Text style={{ color: c.status === "ACTIVE" ? "#4ade80" : c.status === "STANDBY" ? "#D4AF37" : "#f87171", fontSize: 9, letterSpacing: 1.5, fontWeight: "700" }}>
                        {c.status}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Ambi profile */}
              <Text style={[styles.sectionLabel, { marginTop: 28 }]}>AMBIENT PROFILE</Text>
              <View style={styles.ambiRow}>
                {AMBI_PROFILES.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => { Haptics.selectionAsync(); setAmbiProfile(p.id); }}
                    style={[
                      styles.ambiBtn,
                      {
                        borderColor: p.color + (ambiProfile === p.id ? "AA" : "30"),
                        backgroundColor: ambiProfile === p.id ? `${p.color}18` : "transparent",
                      },
                    ]}
                  >
                    <Text style={[styles.ambiBtnText, { color: ambiProfile === p.id ? p.color : "#8E8A82" }]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ─── DEVICE ─── */}
          {activeTab === "device" && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>DEVICE MODE</Text>
              <Text style={styles.sectionSub}>Controls hardware locking, UI access levels, and telemetry scope</Text>
              {DEVICE_MODES.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => handleModeChange(m.id)}
                  style={[
                    styles.modeRow,
                    {
                      borderColor: deviceMode === m.id ? `${m.color}60` : "rgba(255,255,255,0.05)",
                      backgroundColor: deviceMode === m.id ? `${m.color}0E` : "rgba(255,255,255,0.02)",
                    },
                  ]}
                >
                  <View style={[styles.modeIconWrap, { borderColor: `${m.color}30`, backgroundColor: `${m.color}12` }]}>
                    <Ionicons name={m.icon} size={20} color={m.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modeLabel, { color: deviceMode === m.id ? m.color : "#E5D5B3" }]}>{m.label}</Text>
                    <Text style={styles.modeId}>{m.id}</Text>
                  </View>
                  {deviceMode === m.id && (
                    <Ionicons name="checkmark-circle" size={20} color={m.color} />
                  )}
                </TouchableOpacity>
              ))}

              {/* Device info */}
              <View style={styles.deviceInfoCard}>
                <Text style={styles.sectionLabel}>DEVICE TELEMETRY</Text>
                {[
                  { k: "DEVICE ID", v: "NV-DEVICE-77X" },
                  { k: "OS VERSION", v: "1.0.0-luxury" },
                  { k: "NETWORK", v: isOnline ? "ONLINE" : "OFFLINE" },
                  { k: "HEARTBEATS", v: heartbeatCount.toString() },
                ].map((r) => (
                  <View key={r.k} style={styles.deviceInfoRow}>
                    <Text style={styles.deviceInfoKey}>{r.k}</Text>
                    <Text style={[styles.deviceInfoVal, { color: r.k === "NETWORK" ? (isOnline ? "#4ade80" : "#f87171") : "#E5D5B3" }]}>
                      {r.v}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ─── SYNC ─── */}
          {activeTab === "sync" && (
            <View style={styles.section}>
              <View style={styles.syncHeader}>
                <View>
                  <Text style={styles.sectionLabel}>OFFLINE SYNC QUEUE</Text>
                  <Text style={styles.sectionSub}>{syncQueue.length} action{syncQueue.length !== 1 ? "s" : ""} pending</Text>
                </View>
                <TouchableOpacity
                  onPress={() => { processSyncQueue(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
                  style={[styles.syncBtn, { backgroundColor: isOnline ? "#D4AF3718" : "#f8717118", borderColor: isOnline ? "#D4AF3740" : "#f8717140" }]}
                >
                  <Ionicons name="sync" size={14} color={isOnline ? "#D4AF37" : "#f87171"} />
                  <Text style={[styles.syncBtnText, { color: isOnline ? "#D4AF37" : "#f87171" }]}>
                    {isOnline ? "SYNC NOW" : "OFFLINE"}
                  </Text>
                </TouchableOpacity>
              </View>

              {syncQueue.length === 0 ? (
                <View style={styles.syncEmpty}>
                  <Ionicons name="checkmark-circle-outline" size={44} color="#4ade80" />
                  <Text style={[styles.syncEmptyText, { color: "#4ade80" }]}>ALL SYNCED</Text>
                  <Text style={styles.sectionSub}>No pending offline actions</Text>
                </View>
              ) : (
                syncQueue.map((a) => (
                  <View key={a.id} style={styles.syncQueueItem}>
                    <Ionicons name="time-outline" size={16} color="#D4AF37" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.syncActionType}>{a.type}</Text>
                      <Text style={styles.syncActionTime}>
                        {new Date(a.timestamp).toLocaleTimeString()}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0A08",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerLeft: { flex: 1 },
  osTitle: {
    color: "#D4AF37",
    fontSize: 18,
    fontWeight: "300",
    letterSpacing: 8,
  },
  closeBtn: { flex: 1, alignItems: "flex-end" },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  modeActiveDot: { width: 6, height: 6, borderRadius: 3 },
  modeBadgeText: { fontSize: 8, fontWeight: "800", letterSpacing: 1.5 },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 12,
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#D4AF37",
  },
  tabLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#8E8A82",
  },
  tabLabelActive: { color: "#D4AF37" },
  syncBadge: {
    backgroundColor: "#f87171",
    width: 14, height: 14,
    borderRadius: 7,
    alignItems: "center", justifyContent: "center",
  },
  syncBadgeText: { color: "#fff", fontSize: 8, fontWeight: "800" },
  content: { flex: 1 },
  contentInner: { padding: 20, paddingBottom: 40 },
  section: { gap: 12 },
  sectionLabel: {
    color: "#8E8A82",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2.5,
    marginBottom: 2,
  },
  sectionSub: {
    color: "#6B6560",
    fontSize: 11,
    marginBottom: 4,
    lineHeight: 16,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  metricCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "rgba(20,18,15,0.85)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  metricLabel: { color: "#8E8A82", fontSize: 8, letterSpacing: 1.5, fontWeight: "700" },
  metricValue: { color: "#E5D5B3", fontSize: 22, fontWeight: "700" },
  metricDelta: { fontSize: 10, fontWeight: "700" },
  craftStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  craftStatusDot: { width: 8, height: 8, borderRadius: 4 },
  craftStatusLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  craftSessions: { fontSize: 10, marginRight: 8 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPillText: { fontSize: 8, fontWeight: "800", letterSpacing: 1.5 },
  heartbeatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "rgba(212,175,55,0.05)",
    marginTop: 4,
  },
  heartbeatText: { color: "#D4AF37", fontSize: 11, fontWeight: "700", letterSpacing: 2, flex: 1 },
  heartbeatCount: { color: "#8E8A82", fontSize: 11, fontWeight: "700" },
  moduleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  moduleTile: {
    width: "47.5%",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    overflow: "hidden",
    gap: 4,
  },
  tileGlassBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 10, 8, 0.4)",
    borderRadius: 14,
  },
  tileIndicator: {
    width: 24, height: 3,
    borderRadius: 2,
    marginBottom: 8,
  },
  tileTitle: { fontSize: 13, fontWeight: "600", letterSpacing: 0.5, zIndex: 2 },
  tileSub: { fontSize: 10, zIndex: 2 },
  tileStatus: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6, zIndex: 2 },
  ambiRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ambiBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  ambiBtnText: { fontSize: 9, fontWeight: "700", letterSpacing: 2 },
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  modeIconWrap: {
    width: 44, height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modeLabel: { fontSize: 15, fontWeight: "600", letterSpacing: 0.5 },
  modeId: { color: "#6B6560", fontSize: 9, letterSpacing: 1.5, marginTop: 2 },
  deviceInfoCard: {
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.12)",
    borderRadius: 14,
    padding: 16,
    gap: 10,
    marginTop: 16,
    backgroundColor: "rgba(14,12,8,0.8)",
  },
  deviceInfoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  deviceInfoKey: { color: "#8E8A82", fontSize: 9, fontWeight: "700", letterSpacing: 1.5 },
  deviceInfoVal: { fontSize: 11, fontWeight: "700" },
  syncHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  syncBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  syncBtnText: { fontSize: 9, fontWeight: "700", letterSpacing: 1.5 },
  syncEmpty: { alignItems: "center", padding: 40, gap: 10 },
  syncEmptyText: { fontSize: 16, fontWeight: "800", letterSpacing: 3 },
  syncQueueItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.15)",
    borderRadius: 10,
    padding: 12,
  },
  syncActionType: { color: "#E5D5B3", fontSize: 12, fontWeight: "600" },
  syncActionTime: { color: "#8E8A82", fontSize: 10, marginTop: 2 },
});
