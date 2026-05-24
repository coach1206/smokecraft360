/**
 * FAST-BAR TERMINAL
 * Split-view POS for high-velocity bartenders.
 *
 * LEFT (42%):  2-column velocity grid from EAT asset vault
 *              + extended compact list of remaining items
 * RIGHT (58%): Live active check runner with line-item management
 * OVERLAY:     MemberLockerDrawer — slides from right on member tap
 *
 * Integrates TOUCH_LOCK / TOUCH_UNLOCK optimistic TTL overlays.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useEATEngineStore } from "@/src/store/eatEngineStore";
import { useTouchLockStore } from "@/src/store/touchLockStore";
import { useStaffCheckStore } from "@/src/store/staffCheckStore";
import VelocityItemButton, { type POSItem } from "@/components/staff/VelocityItemButton";
import ActiveCheckRunner from "@/components/staff/ActiveCheckRunner";
import MemberLockerDrawer, { type MemberProfile } from "@/components/staff/MemberLockerDrawer";

// ── Seeded demo member for the active table ──────────────────────────────────

const DEMO_MEMBER: MemberProfile = {
  lockerId: "L-42",
  name: "John Manuel",
  memberSince: "2023",
  tier: "Sovereign",
  preferredCut: "V-Cut",
  preferredLight: "Cedar Spill",
  stickInventory: [
    { name: "Arturo Fuente Opus X", qty: 3 },
    { name: "Padrón 1926 Serie", qty: 5 },
    { name: "Davidoff Late Hour Churchill", qty: 2 },
  ],
  notes: "Prefers seated by the window. Always starts with a Macallan pour.",
};

// ── Fallback items if EAT store has no assets yet ───────────────────────────

const FALLBACK_ASSETS: POSItem[] = [
  { id: "f1", name: "Macallan 25 Year Pour",     priceCents: 25000, category: "bar",     qty: 4 },
  { id: "f2", name: "House Old Fashioned",        priceCents: 1800,  category: "bar",     qty: 99 },
  { id: "f3", name: "Reposado Tequila Neat",      priceCents: 1600,  category: "bar",     qty: 12 },
  { id: "f4", name: "Premium Craft Draught",      priceCents: 900,   category: "bar",     qty: 8  },
  { id: "f5", name: "Arturo Fuente Opus X",       priceCents: 4500,  category: "humidor", qty: 3  },
  { id: "f6", name: "Davidoff Late Hour",         priceCents: 3800,  category: "humidor", qty: 2  },
  { id: "f7", name: "Padrón 1926 Serie",          priceCents: 3200,  category: "humidor", qty: 5  },
  { id: "f8", name: "Wagyu Strip A5",             priceCents: 12000, category: "kitchen", qty: 0  },
];

// ── Table selector ────────────────────────────────────────────────────────────

const TABLES = ["T-01","T-02","T-03","T-04","T-05","T-06"];

export default function FastBarTerminal() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const eatStore = useEATEngineStore();
  const { acquireLock, releaseLock, isLocked, connected, connect } = useTouchLockStore();
  const check    = useStaffCheckStore();

  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [member, setMember]           = useState<MemberProfile | null>(DEMO_MEMBER);

  useEffect(() => { connect(); }, []);

  // ── Derive POS items — overlay live qty/locked from EAT store ───────────
  // AssetItem does not carry priceCents; use FALLBACK_ASSETS as the price
  // catalogue and patch in live qty from the store where IDs match.

  const liveQtyMap = Object.fromEntries(
    eatStore.assets.map((a) => [a.id, a.locked ? 0 : a.qty])
  );

  const rawAssets: POSItem[] = FALLBACK_ASSETS.map((item) => ({
    ...item,
    qty: item.id in liveQtyMap ? liveQtyMap[item.id]! : item.qty,
  }));

  const velocity  = rawAssets.slice(0, 4);
  const extended  = rawAssets.slice(4);

  // ── 1-tap item fire (with optimistic lock) ───────────────────────────────

  const handleItemPress = useCallback((item: POSItem) => {
    const tableId = check.activeTableId;
    if (isLocked(tableId, item.id)) return;

    // 1. Instant optimistic lock — visual freeze
    acquireLock(tableId, item.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // 2. Add to ledger — in production this would be a POST /api/eat/order
    const added = check.addItem({
      assetId:    item.id,
      name:       item.name,
      priceCents: item.priceCents,
      category:   item.category,
      isRitual:   false,
    });

    // 3. Simulate server ACK then release lock (750ms → 850ms TTL)
    setTimeout(() => releaseLock(tableId, item.id), 750);

    return added;
  }, [check, acquireLock, releaseLock, isLocked]);

  // ── Settle check ─────────────────────────────────────────────────────────

  function handleSettle() {
    const total = (check.items.reduce((s, i) => s + i.priceCents, 0) / 100).toFixed(2);
    Alert.alert(
      "Settle Transaction",
      `Settle $${total} for ${check.activeTableId}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: () => { check.clearCheck(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
      ]
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Top header ────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.6)" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.brand}>NOVEE OS · FAST-BAR</Text>
          <Text style={styles.staffLabel}>FOH TERMINAL // STAFF_JC_01</Text>
        </View>
        <View style={[styles.netBadge, { borderColor: connected ? "#D4AF37" : "#FF3B30" }]}>
          <Text style={[styles.netText, { color: connected ? "#D4AF37" : "#FF3B30" }]}>
            {connected ? "SYNC" : "LOCAL"}
          </Text>
        </View>
      </View>

      {/* ── Table selector strip ──────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tableBar}
        contentContainerStyle={styles.tableBarContent}
      >
        {TABLES.map((t) => {
          const active = check.activeTableId === t;
          return (
            <Pressable
              key={t}
              onPress={() => { check.setTable(t); Haptics.selectionAsync(); }}
              style={[styles.tableChip, active && styles.tableChipActive]}
            >
              <Text style={[styles.tableChipText, active && styles.tableChipTextActive]}>{t}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Main split workspace ──────────────────────────────────────────── */}
      <View style={styles.workspace}>

        {/* LEFT: Velocity grid + extended list */}
        <View style={styles.leftPanel}>
          <Text style={styles.panelLabel}>HIGH-VELOCITY WELL</Text>

          <View style={styles.grid}>
            {velocity.map((item) => (
              <VelocityItemButton
                key={item.id}
                item={item}
                onPress={handleItemPress}
                isLocked={isLocked(check.activeTableId, item.id)}
              />
            ))}
          </View>

          {extended.length > 0 && (
            <>
              <Text style={[styles.panelLabel, { marginTop: 12 }]}>EXTENDED ASSETS</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {extended.map((item) => (
                  <VelocityItemButton
                    key={item.id}
                    item={item}
                    onPress={handleItemPress}
                    isLocked={isLocked(check.activeTableId, item.id)}
                    compact
                  />
                ))}
              </ScrollView>
            </>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* RIGHT: Active check runner */}
        <View style={styles.rightPanel}>
          <ActiveCheckRunner
            tableLabel={`TABLE ${check.activeTableId}`}
            items={check.items}
            onRemove={check.removeItem}
            onSettle={handleSettle}
            onOpenMember={() => setDrawerOpen(true)}
          />
        </View>
      </View>

      {/* ── Member locker overlay drawer ──────────────────────────────────── */}
      <MemberLockerDrawer
        open={drawerOpen}
        member={member}
        onClose={() => setDrawerOpen(false)}
      />
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
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "300",
    letterSpacing: 3,
  },
  staffLabel: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 2,
  },
  netBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  netText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  tableBar: {
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    maxHeight: 52,
  },
  tableBarContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: "center",
  },
  tableChip: {
    minWidth: 58,
    height: 32,
    paddingHorizontal: 12,
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
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    fontWeight: "600",
  },
  tableChipTextActive: {
    color: "#FFB300",
  },
  workspace: {
    flex: 1,
    flexDirection: "row",
  },
  leftPanel: {
    width: "42%",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  divider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  rightPanel: {
    flex: 1,
    padding: 16,
  },
  panelLabel: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});
