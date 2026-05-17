import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GlassHeader from "@/components/GlassHeader";
import { useColors } from "@/hooks/useColors";

const SAMPLE_ORDERS = [
  { id: "1", name: "Padron 1964 Anniversary", brand: "PADRON", price: "$28", status: "active", craft: "smoke", color: "#D48B00" },
  { id: "2", name: "Macallan 18 Sherry Oak", brand: "THE MACALLAN", price: "$180", status: "fulfilled", craft: "pour", color: "#C4610A" },
];

const LOYALTY = { points: 2450, tier: "GOLD", nextTier: "PLATINUM", nextAt: 5000 };

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const progress = LOYALTY.points / LOYALTY.nextAt;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <GlassHeader title="MY ORDER" subtitle="ACTIVE SELECTIONS & LOYALTY" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Loyalty card */}
        <View style={[styles.loyaltyCard, { borderColor: `${colors.primary}30`, backgroundColor: colors.card }]}>
          <View style={styles.loyaltyTop}>
            <View>
              <Text style={[styles.loyaltyLabel, { color: colors.mutedForeground }]}>LOYALTY TIER</Text>
              <Text style={[styles.loyaltyTier, { color: colors.primary }]}>{LOYALTY.tier}</Text>
            </View>
            <View style={styles.loyaltyRight}>
              <Text style={[styles.loyaltyPoints, { color: colors.primary }]}>
                {LOYALTY.points.toLocaleString()}
              </Text>
              <Text style={[styles.loyaltyPtLabel, { color: colors.mutedForeground }]}>PTS</Text>
            </View>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: `${colors.primary}18` }]}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` as unknown as number, backgroundColor: colors.primary }]} />
          </View>

          <Text style={[styles.loyaltyNext, { color: colors.mutedForeground }]}>
            {(LOYALTY.nextAt - LOYALTY.points).toLocaleString()} pts until {LOYALTY.nextTier}
          </Text>
        </View>

        {/* Orders section */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>RECENT SELECTIONS</Text>

        {SAMPLE_ORDERS.map(order => (
          <View key={order.id} style={[styles.orderCard, { borderColor: `${order.color}28`, backgroundColor: colors.card }]}>
            <View style={[styles.craftDot, { backgroundColor: order.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.orderBrand, { color: colors.mutedForeground }]}>{order.brand}</Text>
              <Text style={[styles.orderName, { color: order.color }]}>{order.name}</Text>
            </View>
            <View style={styles.orderRight}>
              <Text style={[styles.orderPrice, { color: colors.foreground }]}>{order.price}</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: order.status === "active" ? "#4ade8018" : "#D48B0018" }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: order.status === "active" ? "#4ade80" : colors.primary }
                ]}>
                  {order.status.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        ))}

        {/* Empty state hint */}
        <View style={[styles.emptyHint, { borderColor: colors.border }]}>
          <Ionicons name="flame-outline" size={28} color={colors.mutedForeground} />
          <Text style={[styles.emptyHintText, { color: colors.mutedForeground }]}>
            Swipe crafts to build your order
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16 },
  loyaltyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  loyaltyTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 },
  loyaltyLabel: { fontSize: 9, letterSpacing: 2, fontWeight: "700", marginBottom: 2 },
  loyaltyTier: { fontSize: 24, fontWeight: "900", letterSpacing: 3 },
  loyaltyRight: { alignItems: "flex-end" },
  loyaltyPoints: { fontSize: 32, fontWeight: "800" },
  loyaltyPtLabel: { fontSize: 9, letterSpacing: 1.5, fontWeight: "700" },
  progressTrack: { height: 6, borderRadius: 3, marginBottom: 8 },
  progressFill: { height: 6, borderRadius: 3 },
  loyaltyNext: { fontSize: 10, letterSpacing: 0.5 },
  sectionTitle: {
    fontSize: 9,
    letterSpacing: 2.5,
    fontWeight: "700",
    marginBottom: 10,
  },
  orderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  craftDot: { width: 8, height: 8, borderRadius: 4 },
  orderBrand: { fontSize: 9, letterSpacing: 1.5, fontWeight: "700", marginBottom: 2 },
  orderName: { fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
  orderRight: { alignItems: "flex-end", gap: 4 },
  orderPrice: { fontSize: 16, fontWeight: "800" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 8, fontWeight: "800", letterSpacing: 1.5 },
  emptyHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  emptyHintText: { fontSize: 12, letterSpacing: 0.5 },
});
