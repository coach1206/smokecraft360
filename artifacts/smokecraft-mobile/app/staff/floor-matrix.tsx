/**
 * WAITER RITUAL MATRIX
 * Swipeable floor layout with ambient pulsing table nodes.
 * Tap any table to open the member locker drawer.
 * Long-press to cycle table status (available → occupied → ritual → reserved).
 */

import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import FloorTableNode, {
  type FloorTable,
  type TableStatus,
} from "@/components/staff/FloorTableNode";
import MemberLockerDrawer, {
  type MemberProfile,
} from "@/components/staff/MemberLockerDrawer";
import { useStaffCheckStore } from "@/src/store/staffCheckStore";

// ── Seeded floor layout ──────────────────────────────────────────────────────

const INITIAL_TABLES: FloorTable[] = [
  { id: "T-01", label: "T1",  guestCount: 4, status: "ritual",    grossCents: 52000, hasMember: true  },
  { id: "T-02", label: "T2",  guestCount: 2, status: "occupied",  grossCents: 18600, hasMember: false },
  { id: "T-03", label: "T3",  guestCount: 0, status: "available", grossCents: 0,     hasMember: false },
  { id: "T-04", label: "T4",  guestCount: 3, status: "occupied",  grossCents: 27400, hasMember: true  },
  { id: "T-05", label: "T5",  guestCount: 0, status: "reserved",  grossCents: 0,     hasMember: false },
  { id: "T-06", label: "T6",  guestCount: 2, status: "occupied",  grossCents: 9800,  hasMember: false },
  { id: "T-07", label: "T7",  guestCount: 0, status: "available", grossCents: 0,     hasMember: false },
  { id: "T-08", label: "T8",  guestCount: 4, status: "ritual",    grossCents: 78500, hasMember: true  },
  { id: "BAR-A",label: "B-A", guestCount: 5, status: "occupied",  grossCents: 34200, hasMember: false },
  { id: "BAR-B",label: "B-B", guestCount: 3, status: "occupied",  grossCents: 15400, hasMember: true  },
];

// ── Demo member profiles by table ─────────────────────────────────────────────

const MEMBERS: Record<string, MemberProfile> = {
  "T-01": {
    lockerId: "L-42", name: "John Manuel", memberSince: "2023", tier: "Sovereign",
    preferredCut: "V-Cut", preferredLight: "Cedar Spill",
    stickInventory: [
      { name: "Arturo Fuente Opus X", qty: 3 },
      { name: "Padrón 1926 Serie", qty: 5 },
    ],
    notes: "Prefers seated by the window. Opens with Macallan 25.",
  },
  "T-04": {
    lockerId: "L-17", name: "Elena Vasquez", memberSince: "2024", tier: "Gold",
    preferredCut: "Guillotine", preferredLight: "Torch Lighter",
    stickInventory: [{ name: "Davidoff Late Hour Churchill", qty: 4 }],
  },
  "T-08": {
    lockerId: "L-08", name: "Marcus Webb", memberSince: "2021", tier: "Obsidian",
    preferredCut: "Punch", preferredLight: "Matches",
    stickInventory: [
      { name: "My Father Le Bijou", qty: 6 },
      { name: "Cohiba Behike 52", qty: 2 },
    ],
    notes: "Ceremonial cigar pairing — always starts with a cortado.",
  },
  "BAR-B": {
    lockerId: "L-31", name: "Daniel Park", memberSince: "2024", tier: "Ember",
    preferredCut: "Guillotine", preferredLight: "Cedar Spill",
    stickInventory: [{ name: "Rocky Patel Vintage 1990", qty: 3 }],
  },
};

// ── Status cycle ─────────────────────────────────────────────────────────────

const STATUS_CYCLE: TableStatus[] = ["available", "occupied", "ritual", "reserved"];

// ── Layout rows (spatial arrangement) ────────────────────────────────────────

const FLOOR_ROWS = [
  ["T-01", "T-02", "T-03", "T-04"],
  ["T-05", "T-06", "T-07", "T-08"],
  ["BAR-A", "BAR-B"],
];

const ROW_LABELS = ["MAIN LOUNGE", "PRIVATE SECTION", "BAR RAIL"];

export default function FloorMatrixScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const check  = useStaffCheckStore();

  const [tables, setTables]           = useState<FloorTable[]>(INITIAL_TABLES);
  const [selectedTable, setSelected]  = useState<FloorTable | null>(null);
  const [drawerOpen, setDrawerOpen]   = useState(false);

  const tableMap = Object.fromEntries(tables.map((t) => [t.id, t]));

  function handleTablePress(table: FloorTable) {
    setSelected(table);
    setDrawerOpen(true);
    check.setTable(table.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleTableLongPress(table: FloorTable) {
    const idx     = STATUS_CYCLE.indexOf(table.status);
    const next    = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTables((prev) =>
      prev.map((t) => t.id === table.id ? { ...t, status: next, guestCount: next === "available" ? 0 : t.guestCount } : t)
    );
  }

  function setTableStatus(tableId: string, status: TableStatus) {
    setTables((prev) =>
      prev.map((t) => t.id === tableId ? { ...t, status } : t)
    );
    setDrawerOpen(false);
  }

  // ── Venue-level stats ──────────────────────────────────────────────────────

  const totalGross   = tables.reduce((s, t) => s + t.grossCents, 0);
  const occupiedCount = tables.filter((t) => t.status === "occupied" || t.status === "ritual").length;
  const ritualCount  = tables.filter((t) => t.status === "ritual").length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.6)" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.brand}>WAITER RITUAL MATRIX</Text>
          <Text style={styles.staffLabel}>FOH FLOOR MANAGEMENT</Text>
        </View>
      </View>

      {/* ── Venue stats strip ─────────────────────────────────────────────── */}
      <View style={styles.statsStrip}>
        <View style={styles.statCell}>
          <Text style={styles.statVal}>{occupiedCount}</Text>
          <Text style={styles.statLabel}>OCCUPIED</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={[styles.statVal, { color: "#D4AF37" }]}>{ritualCount}</Text>
          <Text style={styles.statLabel}>RITUAL</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={[styles.statVal, { color: "#D4AF37" }]}>
            ${(totalGross / 100).toFixed(0)}
          </Text>
          <Text style={styles.statLabel}>VENUE GROSS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={styles.statVal}>{tables.length}</Text>
          <Text style={styles.statLabel}>TOTAL COVERS</Text>
        </View>
      </View>

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      <View style={styles.legend}>
        {(["available","occupied","ritual","reserved"] as TableStatus[]).map((s) => {
          const color = s === "ritual" ? "#D4AF37" : s === "occupied" ? "#FFB300" : s === "reserved" ? "#555" : "#333";
          return (
            <View key={s} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{s.toUpperCase()}</Text>
            </View>
          );
        })}
        <Text style={styles.legendHint}>Long-press to cycle status</Text>
      </View>

      {/* ── Floor map ─────────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.floorScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.floorContent, { paddingBottom: insets.bottom + 24 }]}
      >
        {FLOOR_ROWS.map((rowIds, ri) => (
          <View key={ri} style={styles.section}>
            <Text style={styles.rowLabel}>{ROW_LABELS[ri]}</Text>
            <View style={styles.row}>
              {rowIds.map((id) => {
                const table = tableMap[id];
                if (!table) return null;
                return (
                  <Pressable
                    key={id}
                    onPress={() => handleTablePress(table)}
                    onLongPress={() => handleTableLongPress(table)}
                    delayLongPress={500}
                  >
                    <FloorTableNode table={table} onPress={handleTablePress} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── Member drawer ─────────────────────────────────────────────────── */}
      <MemberLockerDrawer
        open={drawerOpen}
        member={selectedTable?.hasMember ? (MEMBERS[selectedTable.id] ?? null) : null}
        onClose={() => setDrawerOpen(false)}
      />

      {/* ── Table action sheet (shown above drawer close) ─────────────────── */}
      {selectedTable && drawerOpen && (
        <View style={[styles.actionSheet, { bottom: insets.bottom + 16 }]}>
          <Text style={styles.actionTableId}>{selectedTable.label}</Text>
          {(["available","occupied","ritual"] as TableStatus[]).map((s) => (
            <Pressable
              key={s}
              onPress={() => setTableStatus(selectedTable.id, s)}
              style={[
                styles.actionBtn,
                selectedTable.status === s && styles.actionBtnActive,
              ]}
            >
              <Text style={[
                styles.actionBtnText,
                selectedTable.status === s && styles.actionBtnTextActive,
              ]}>
                {s.toUpperCase()}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => {
              check.setTable(selectedTable.id);
              router.push("/staff/fast-bar");
            }}
            style={styles.actionBtnFire}
          >
            <Text style={styles.actionBtnFireText}>OPEN FAST-BAR →</Text>
          </Pressable>
        </View>
      )}
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
    paddingVertical: 14,
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
  statsStrip: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    backgroundColor: "rgba(255,255,255,0.01)",
  },
  statCell: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    gap: 3,
  },
  statVal: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "300",
    letterSpacing: -0.3,
  },
  statLabel: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 14,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  legendHint: {
    color: "rgba(255,255,255,0.15)",
    fontSize: 9,
    marginLeft: "auto",
    fontStyle: "italic",
  },
  floorScroll: {
    flex: 1,
  },
  floorContent: {
    padding: 20,
    gap: 28,
  },
  section: {
    gap: 10,
  },
  rowLabel: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  actionSheet: {
    position: "absolute",
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(18,18,22,0.95)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 10,
    zIndex: 8,
  },
  actionTableId: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginRight: 4,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    minHeight: 36,
    justifyContent: "center",
  },
  actionBtnActive: {
    borderColor: "#FFB300",
    backgroundColor: "rgba(255,179,0,0.10)",
  },
  actionBtnText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  actionBtnTextActive: {
    color: "#FFB300",
  },
  actionBtnFire: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    backgroundColor: "rgba(212,175,55,0.15)",
    borderWidth: 1,
    borderColor: "#D4AF37",
    minHeight: 36,
    justifyContent: "center",
  },
  actionBtnFireText: {
    color: "#D4AF37",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
