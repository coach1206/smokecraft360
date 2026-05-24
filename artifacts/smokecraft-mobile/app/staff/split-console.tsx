/**
 * TRANSACTION SPLIT CONSOLE
 * Direct-manipulation bill-split workspace.
 *
 * Items from the active check are shown as large, touch-draggable cards.
 * Drag a card over a seat silhouette to assign the item to that guest.
 * Each seat silhouette shows a running total and stacked item chips.
 * Tap a chip to unassign and return the item to the pool.
 *
 * Drag mechanics: PanResponder + Animated.ValueXY
 * Drop detection: absolute position check against seat bounds (onLayout)
 */

import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutRectangle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useStaffCheckStore, type CheckLineItem } from "@/src/store/staffCheckStore";
import SeatSilhouette from "@/components/staff/SeatSilhouette";

// ── Category icon map ─────────────────────────────────────────────────────────

const CATEGORY_ICON: Record<string, string> = {
  bar:     "🥃",
  humidor: "🚬",
  kitchen: "🍽️",
};

const CATEGORY_ACCENT: Record<string, string> = {
  bar:     "#FFB300",
  humidor: "#D4AF37",
  kitchen: "#9B59B6",
};

// ── Draggable item card ───────────────────────────────────────────────────────

interface DraggableCardProps {
  item: CheckLineItem;
  onDragStart: (lineId: string) => void;
  onDragEnd: (lineId: string, x: number, y: number) => void;
  isAssigned: boolean;
}

function DraggableCard({ item, onDragStart, onDragEnd, isAssigned }: DraggableCardProps) {
  const pan        = useRef(new Animated.ValueXY()).current;
  const isDragging = useRef(false);
  const scale      = useRef(new Animated.Value(1)).current;
  const accent     = CATEGORY_ACCENT[item.category] ?? "#D4AF37";

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, gs) => Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4,

      onPanResponderGrant: () => {
        isDragging.current = true;
        pan.extractOffset();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Animated.spring(scale, { toValue: 1.08, useNativeDriver: true, speed: 28 }).start();
        onDragStart(item.lineId);
      },

      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),

      onPanResponderRelease: (_, gestureState) => {
        isDragging.current = false;
        pan.flattenOffset();
        Animated.parallel([
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, bounciness: 6 }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 28 }),
        ]).start();
        onDragEnd(item.lineId, gestureState.moveX, gestureState.moveY);
      },

      onPanResponderTerminate: () => {
        isDragging.current = false;
        pan.flattenOffset();
        Animated.parallel([
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        ]).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.card,
        isAssigned && styles.cardAssigned,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }],
          borderColor: isAssigned ? "rgba(212,175,55,0.3)" : (accent + "44"),
          zIndex: 10,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Text style={styles.cardIcon}>{CATEGORY_ICON[item.category] ?? "◆"}</Text>
      <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
      <Text style={[styles.cardPrice, { color: accent }]}>
        ${(item.priceCents / 100).toFixed(2)}
      </Text>
      {isAssigned && (
        <View style={styles.assignedBadge}>
          <Ionicons name="checkmark" size={10} color="#D4AF37" />
        </View>
      )}
    </Animated.View>
  );
}

// ── Main split console ────────────────────────────────────────────────────────

export default function SplitConsole() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const check  = useStaffCheckStore();

  const [activeDragId, setActiveDragId]   = useState<string | null>(null);
  const [highlightedSeat, setHighlighted] = useState<string | null>(null);

  // Track seat layout positions
  const seatLayouts = useRef<Record<string, LayoutRectangle>>({});

  // Which items have been assigned to any seat
  const assignedIds = new Set(
    check.seats.flatMap((s) => s.assignedLineIds)
  );

  // ── Drag callbacks ────────────────────────────────────────────────────────

  const handleDragStart = useCallback((lineId: string) => {
    setActiveDragId(lineId);
  }, []);

  const handleDragEnd = useCallback((lineId: string, x: number, y: number) => {
    setActiveDragId(null);
    setHighlighted(null);

    // Find which seat the drop position overlaps
    for (const [seatId, layout] of Object.entries(seatLayouts.current)) {
      if (
        x >= layout.x &&
        x <= layout.x + layout.width &&
        y >= layout.y &&
        y <= layout.y + layout.height
      ) {
        check.assignToSeat(lineId, seatId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }
    }
    // If not dropped on a valid seat, unassign
    check.unassignFromSeat(lineId);
  }, [check]);

  // ── Summary totals ────────────────────────────────────────────────────────

  const totalCents      = check.items.reduce((s, i) => s + i.priceCents, 0);
  const assignedCents   = check.items
    .filter((i) => assignedIds.has(i.lineId))
    .reduce((s, i) => s + i.priceCents, 0);
  const unassignedCents = totalCents - assignedCents;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.6)" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.brand}>SPLIT CONSOLE</Text>
          <Text style={styles.staffLabel}>TABLE {check.activeTableId} · DIRECT MANIPULATION</Text>
        </View>
        <Pressable
          onPress={() => { check.resetSeats(4); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={styles.resetBtn}
        >
          <Ionicons name="refresh" size={16} color="rgba(255,255,255,0.4)" />
        </Pressable>
      </View>

      {/* ── Balance summary ───────────────────────────────────────────────── */}
      <View style={styles.summary}>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryVal}>${(totalCents / 100).toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>TOTAL</Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={[styles.summaryVal, { color: "#D4AF37" }]}>${(assignedCents / 100).toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>ASSIGNED</Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={[styles.summaryVal, { color: unassignedCents > 0 ? "#FF3B30" : "#2ECC71" }]}>
            ${(unassignedCents / 100).toFixed(2)}
          </Text>
          <Text style={styles.summaryLabel}>REMAINING</Text>
        </View>
      </View>

      {/* ── Instruction banner ────────────────────────────────────────────── */}
      <View style={styles.instructionBanner}>
        <Ionicons name="hand-left-outline" size={14} color="rgba(255,179,0,0.5)" />
        <Text style={styles.instructionText}>
          Drag items onto seat silhouettes to split the check
        </Text>
      </View>

      {/* ── Draggable item cards ──────────────────────────────────────────── */}
      <View style={styles.itemsSection}>
        <Text style={styles.sectionLabel}>ORDERED ITEMS</Text>
        {check.items.length === 0 ? (
          <View style={styles.emptyItems}>
            <Text style={styles.emptyText}>No items on check — add items from Fast-Bar Terminal</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsRow}
            scrollEnabled={activeDragId === null}
          >
            {check.items.map((item) => (
              <DraggableCard
                key={item.lineId}
                item={item}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                isAssigned={assignedIds.has(item.lineId)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* ── Seat silhouettes ──────────────────────────────────────────────── */}
      <View style={[styles.seatsSection, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.sectionLabel}>GUEST SEATS</Text>
        <View style={styles.seatsRow}>
          {check.seats.map((seat) => {
            const assignedItems = check.items
              .filter((i) => seat.assignedLineIds.includes(i.lineId))
              .map((i) => ({ lineId: i.lineId, name: i.name, priceCents: i.priceCents }));

            return (
              <View
                key={seat.seatId}
                style={styles.seatWrap}
                onLayout={(e) => {
                  const { x, y, width, height } = e.nativeEvent.layout;
                  seatLayouts.current[seat.seatId] = { x, y, width, height };
                }}
              >
                <SeatSilhouette
                  seatId={seat.seatId}
                  label={seat.label}
                  assignedItems={assignedItems}
                  isHighlighted={highlightedSeat === seat.seatId}
                  onRemoveItem={(lineId) => {
                    check.unassignFromSeat(lineId);
                    Haptics.selectionAsync();
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>
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
  resetBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  summary: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  summaryCell: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  summaryVal: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "300",
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  instructionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "rgba(255,179,0,0.04)",
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  instructionText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
  },
  sectionLabel: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 14,
  },
  itemsSection: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  emptyItems: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  cardsRow: {
    gap: 12,
    paddingBottom: 8,
  },
  card: {
    width: 130,
    minHeight: 130,
    backgroundColor: "rgba(28,28,32,0.90)",
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 14,
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  cardAssigned: {
    backgroundColor: "rgba(22,22,26,0.75)",
    opacity: 0.6,
  },
  cardIcon: {
    fontSize: 32,
  },
  cardName: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 17,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: "700",
  },
  assignedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(212,175,55,0.2)",
    borderWidth: 1,
    borderColor: "#D4AF37",
    alignItems: "center",
    justifyContent: "center",
  },
  seatsSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  seatsRow: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
  },
  seatWrap: {
    flex: 1,
  },
});
