/**
 * ACTIVE CHECK RUNNER
 * Right-panel scrolling check list for FastBarTerminal.
 * Each line item has a remove button (✕) with a 48dp hit target.
 */

import React from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import type { CheckLineItem } from "@/src/store/staffCheckStore";

interface Props {
  tableLabel: string;
  items: CheckLineItem[];
  onRemove: (lineId: string) => void;
  onSettle: () => void;
  onOpenMember: () => void;
}

export default function ActiveCheckRunner({
  tableLabel,
  items,
  onRemove,
  onSettle,
  onOpenMember,
}: Props) {
  const router = useRouter();
  const totalCents = items.reduce((s, i) => s + i.priceCents, 0);

  return (
    <View style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>ACTIVE CHECK</Text>
          <Text style={styles.tableLabel}>{tableLabel}</Text>
        </View>
        <Pressable onPress={onOpenMember} style={styles.memberBtn}>
          <Text style={styles.memberBtnText}>MEMBER LOCKER</Text>
        </Pressable>
      </View>

      {/* ── Line items ──────────────────────────────────────────────────── */}
      <FlatList
        data={items}
        keyExtractor={(i) => i.lineId}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Terminal clear — tap items to fire order</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.row, item.isRitual && styles.rowRitual]}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.rowMeta}>
                <Text style={styles.rowCat}>{item.category.toUpperCase()}</Text>
                {item.isRitual && (
                  <View style={styles.ritualBadge}>
                    <Text style={styles.ritualBadgeText}>◈ RITUAL</Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={styles.rowPrice}>${(item.priceCents / 100).toFixed(2)}</Text>
            <Pressable
              onPress={() => onRemove(item.lineId)}
              style={styles.removeBtn}
              hitSlop={12}
            >
              <Text style={styles.removeBtnText}>✕</Text>
            </Pressable>
          </View>
        )}
      />

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>LEDGER TOTAL</Text>
          <Text style={styles.totalValue}>${(totalCents / 100).toFixed(2)}</Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push("/staff/split-console")}
            style={styles.splitBtn}
          >
            <Text style={styles.splitBtnText}>SPLIT CHECK</Text>
          </Pressable>
          <Pressable
            onPress={onSettle}
            style={[styles.settleBtn, items.length === 0 && styles.settleBtnOff]}
            disabled={items.length === 0}
          >
            <Text style={styles.settleBtnText}>SETTLE</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(12,12,14,0.60)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  headerLabel: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
  },
  tableLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  memberBtn: {
    borderWidth: 1,
    borderColor: "#FFB300",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,179,0,0.05)",
    minHeight: 40,
    justifyContent: "center",
  },
  memberBtnText: {
    color: "#FFB300",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    gap: 2,
  },
  emptyWrap: {
    paddingTop: 60,
    alignItems: "center",
  },
  emptyText: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    gap: 8,
  },
  rowRitual: {
    borderBottomColor: "rgba(212,175,55,0.12)",
    backgroundColor: "rgba(212,175,55,0.03)",
    borderRadius: 4,
    paddingHorizontal: 8,
  },
  rowLeft: {
    flex: 1,
    gap: 3,
  },
  rowName: {
    color: "#F0EDE8",
    fontSize: 14,
    fontWeight: "500",
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowCat: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  ritualBadge: {
    backgroundColor: "rgba(212,175,55,0.15)",
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  ritualBadgeText: {
    color: "#D4AF37",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  rowPrice: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    minWidth: 56,
    textAlign: "right",
  },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtnText: {
    color: "rgba(255,59,48,0.6)",
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 16,
    gap: 14,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  totalLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  totalValue: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "300",
    letterSpacing: -0.5,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  splitBtn: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  splitBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  settleBtn: {
    flex: 2,
    minHeight: 52,
    backgroundColor: "#D4AF37",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  settleBtnOff: {
    backgroundColor: "rgba(212,175,55,0.2)",
  },
  settleBtnText: {
    color: "#010101",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
});
