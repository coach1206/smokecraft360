/**
 * SEAT SILHOUETTE
 * Drop-target zone for the Transaction Split Console.
 * Highlights with amber border when a card is being dragged over it.
 * Shows assigned items as stacked chips with per-seat running total.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface AssignedItem {
  lineId: string;
  name: string;
  priceCents: number;
}

interface Props {
  seatId: string;
  label: string;
  assignedItems: AssignedItem[];
  isHighlighted?: boolean;
  onRemoveItem?: (lineId: string) => void;
}

export default function SeatSilhouette({
  seatId: _seatId,
  label,
  assignedItems,
  isHighlighted,
  onRemoveItem,
}: Props) {
  const totalCents = assignedItems.reduce((s, i) => s + i.priceCents, 0);

  return (
    <View style={[styles.container, isHighlighted && styles.highlighted]}>
      {/* Person icon */}
      <View style={styles.iconWrap}>
        <Ionicons
          name="person"
          size={30}
          color={isHighlighted ? "#FFB300" : "rgba(255,255,255,0.20)"}
        />
      </View>

      <Text style={[styles.seatLabel, isHighlighted && styles.seatLabelActive]}>
        {label}
      </Text>

      {/* Assigned item chips */}
      <View style={styles.chipsArea}>
        {assignedItems.length === 0 ? (
          <Text style={styles.emptyHint}>Drop here</Text>
        ) : (
          assignedItems.map((item) => (
            <Pressable
              key={item.lineId}
              onPress={() => onRemoveItem?.(item.lineId)}
              style={styles.chip}
            >
              <Text style={styles.chipText} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.chipPrice}>${(item.priceCents / 100).toFixed(2)}</Text>
            </Pressable>
          ))
        )}
      </View>

      {/* Running total */}
      {totalCents > 0 && (
        <View style={styles.totalWrap}>
          <Text style={styles.totalLabel}>${(totalCents / 100).toFixed(2)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 100,
    backgroundColor: "rgba(22,22,26,0.70)",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 12,
    alignItems: "center",
    gap: 8,
    minHeight: 180,
  },
  highlighted: {
    borderColor: "#FFB300",
    backgroundColor: "rgba(255,179,0,0.07)",
    shadowColor: "#FFB300",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  seatLabel: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  seatLabelActive: {
    color: "#FFB300",
  },
  chipsArea: {
    width: "100%",
    gap: 4,
    flex: 1,
  },
  emptyHint: {
    color: "rgba(255,255,255,0.15)",
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
  },
  chip: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 4,
  },
  chipText: {
    color: "#E5E5EA",
    fontSize: 11,
    flex: 1,
  },
  chipPrice: {
    color: "#D4AF37",
    fontSize: 11,
    fontWeight: "600",
    flexShrink: 0,
  },
  totalWrap: {
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingTop: 6,
    width: "100%",
    alignItems: "center",
  },
  totalLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
