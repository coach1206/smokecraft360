/**
 * STAFF POS HUB
 * Entry tab for staff-facing POS modes. Shows three large mode cards:
 *   Fast Bar Terminal · Waiter Ritual Matrix · Transaction Split Console
 * Network status badge reflects the Socket.IO touch-lock connection.
 */

import React, { useEffect } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTouchLockStore } from "@/src/store/touchLockStore";
import { useStaffCheckStore } from "@/src/store/staffCheckStore";

const MODES = [
  {
    key: "fast-bar",
    route: "/staff/fast-bar",
    icon: "flash" as const,
    title: "Fast-Bar Terminal",
    subtitle: "Split-view 1-tap ordering with live active check runner",
    accent: "#FFB300",
    dim: "rgba(255,179,0,0.09)",
  },
  {
    key: "floor-matrix",
    route: "/staff/floor-matrix",
    icon: "grid" as const,
    title: "Waiter Ritual Matrix",
    subtitle: "Ambient floor map with member locker profiles and table pacing",
    accent: "#D4AF37",
    dim: "rgba(212,175,55,0.09)",
  },
  {
    key: "split-console",
    route: "/staff/split-console",
    icon: "people" as const,
    title: "Split Console",
    subtitle: "Drag-and-drop bill items onto guest seat silhouettes",
    accent: "#9B8DC4",
    dim: "rgba(155,141,196,0.09)",
  },
] as const;

export default function StaffHubScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { connected, connect } = useTouchLockStore();
  const { items, activeTableId } = useStaffCheckStore();

  useEffect(() => {
    connect();
  }, []);

  function navigate(route: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(route as never);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>NOVEE OS</Text>
          <Text style={styles.subtitle}>FOH STAFF CONSOLE</Text>
        </View>
        <View style={[styles.netBadge, { borderColor: connected ? "#D4AF37" : "#FF3B30" }]}>
          <View style={[styles.netDot, { backgroundColor: connected ? "#D4AF37" : "#FF3B30" }]} />
          <Text style={[styles.netText, { color: connected ? "#D4AF37" : "#FF3B30" }]}>
            {connected ? "E.A.T. SYNC" : "OFFLINE"}
          </Text>
        </View>
      </View>

      {/* ── Active check summary ─────────────────────────────────────────── */}
      <View style={styles.checkBanner}>
        <Ionicons name="receipt-outline" size={16} color="rgba(255,255,255,0.35)" />
        <Text style={styles.checkBannerText}>
          Table {activeTableId} · {items.length} item{items.length !== 1 ? "s" : ""} on check
        </Text>
        {items.length > 0 && (
          <Text style={styles.checkBannerTotal}>
            ${(items.reduce((s, i) => s + i.priceCents, 0) / 100).toFixed(2)}
          </Text>
        )}
      </View>

      {/* ── Mode cards ──────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {MODES.map((mode) => (
          <Pressable
            key={mode.key}
            onPress={() => navigate(mode.route)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <LinearGradient
              colors={["rgba(28,28,32,0.90)", "rgba(18,18,22,0.95)"]}
              style={styles.cardGradient}
            >
              <View style={[styles.cardIconWrap, { backgroundColor: mode.dim, borderColor: mode.accent + "33" }]}>
                <Ionicons name={mode.icon} size={26} color={mode.accent} />
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{mode.title}</Text>
                <Text style={styles.cardSubtitle}>{mode.subtitle}</Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.2)" />
            </LinearGradient>

            {/* Accent bar */}
            <View style={[styles.cardAccentBar, { backgroundColor: mode.accent }]} />
          </Pressable>
        ))}

        {/* ── Quick table selector ───────────────────────────────────────── */}
        <View style={styles.tableSection}>
          <Text style={styles.tableSectionLabel}>ACTIVE TABLE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableRow}>
            {["T-01","T-02","T-03","T-04","T-05","T-06","T-07","T-08"].map((t) => {
              const active = activeTableId === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => {
                    useStaffCheckStore.getState().setTable(t);
                    Haptics.selectionAsync();
                  }}
                  style={[styles.tableChip, active && styles.tableChipActive]}
                >
                  <Text style={[styles.tableChipText, active && styles.tableChipTextActive]}>{t}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#010101",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "300",
    letterSpacing: 4,
  },
  subtitle: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 2,
  },
  netBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    minHeight: 32,
  },
  netDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  netText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  checkBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  checkBannerText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 13,
    flex: 1,
  },
  checkBannerTotal: {
    color: "#D4AF37",
    fontSize: 14,
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 14,
  },
  card: {
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  cardPressed: {
    opacity: 0.8,
  },
  cardGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 16,
    minHeight: 90,
  },
  cardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 13,
    lineHeight: 19,
  },
  cardAccentBar: {
    height: 2,
  },
  tableSection: {
    marginTop: 8,
    gap: 12,
  },
  tableSectionLabel: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  tableRow: {
    gap: 8,
    paddingBottom: 4,
  },
  tableChip: {
    minWidth: 64,
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(28,28,30,0.70)",
    alignItems: "center",
    justifyContent: "center",
  },
  tableChipActive: {
    borderColor: "#FFB300",
    backgroundColor: "rgba(255,179,0,0.10)",
  },
  tableChipText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  tableChipTextActive: {
    color: "#FFB300",
  },
});
