import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AmberParticles from "@/components/AmberParticles";
import SwipeCard, { type SwipeItem } from "@/components/SwipeCard";
import { CRAFT_PORTALS } from "@/components/CraftPortalCard";
import { useColors } from "@/hooks/useColors";

const SAMPLE_ITEMS: Record<string, SwipeItem[]> = {
  smoke: [
    { id: "1", name: "Padron 1964 Anniversary", brand: "PADRON", origin: "Nicaragua", strength: 78, flavorNotes: ["Cocoa", "Cedar", "Coffee"], price: "$28", inStock: true, craftType: "smoke" },
    { id: "2", name: "Arturo Fuente OpusX", brand: "ARTURO FUENTE", origin: "Dominican Republic", strength: 85, flavorNotes: ["Spice", "Leather", "Earth"], price: "$45", inStock: true, craftType: "smoke" },
    { id: "3", name: "Cohiba Behike BHK 52", brand: "COHIBA", origin: "Cuba", strength: 70, flavorNotes: ["Honey", "Milk Chocolate", "Nuts"], price: "$55", inStock: false, craftType: "smoke" },
    { id: "4", name: "Montecristo No. 2", brand: "MONTECRISTO", origin: "Cuba", strength: 65, flavorNotes: ["Cream", "Sweetness", "Oak"], price: "$32", inStock: true, craftType: "smoke" },
  ],
  pour: [
    { id: "1", name: "Macallan 18 Sherry Oak", brand: "THE MACALLAN", origin: "Scotland", strength: 43, flavorNotes: ["Dried Fruit", "Spice", "Oak"], price: "$180", inStock: true, craftType: "pour" },
    { id: "2", name: "Buffalo Trace Bourbon", brand: "BUFFALO TRACE", origin: "Kentucky", strength: 45, flavorNotes: ["Vanilla", "Caramel", "Toffee"], price: "$38", inStock: true, craftType: "pour" },
    { id: "3", name: "Hibiki Harmony", brand: "SUNTORY", origin: "Japan", strength: 43, flavorNotes: ["Honey", "Floral", "Light Oak"], price: "$85", inStock: true, craftType: "pour" },
  ],
  brew: [
    { id: "1", name: "Guinness Draught", brand: "GUINNESS", origin: "Ireland", strength: 42, flavorNotes: ["Roasted Malt", "Coffee", "Cream"], price: "$9", inStock: true, craftType: "brew" },
    { id: "2", name: "Pliny the Elder", brand: "RUSSIAN RIVER", origin: "California", strength: 80, flavorNotes: ["Pine", "Citrus", "Resin"], price: "$12", inStock: false, craftType: "brew" },
  ],
  vape: [
    { id: "1", name: "Reserve Collection Mango", brand: "JUUL", origin: "USA", strength: 35, flavorNotes: ["Tropical", "Sweet", "Smooth"], price: "$25", inStock: true, craftType: "vape" },
  ],
};

export default function ExperienceScreen() {
  const { craft } = useLocalSearchParams<{ craft: string }>();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const portal = CRAFT_PORTALS.find(p => p.id === craft);
  const accentColor = portal?.color ?? colors.primary;
  const allItems = SAMPLE_ITEMS[craft ?? "smoke"] ?? SAMPLE_ITEMS.smoke;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [added, setAdded] = useState<SwipeItem[]>([]);
  const [showAdded, setShowAdded] = useState(false);

  const remaining = allItems.slice(currentIndex);
  const isDone = currentIndex >= allItems.length;

  function handleSwipeRight(item: SwipeItem) {
    setAdded(prev => [...prev, item]);
    setCurrentIndex(i => i + 1);
  }

  function handleSwipeLeft(_item: SwipeItem) {
    setCurrentIndex(i => i + 1);
  }

  function handleReset() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentIndex(0);
    setAdded([]);
  }

  if (showAdded) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <View style={[styles.orderHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowAdded(false)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: accentColor }]}>YOUR SELECTION</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: bottomPad + 20 }}>
          {added.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="layers-outline" size={44} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No selections yet</Text>
            </View>
          ) : added.map(item => (
            <View key={item.id} style={[styles.orderItem, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.orderBrand, { color: colors.mutedForeground }]}>{item.brand}</Text>
                <Text style={[styles.orderName, { color: accentColor }]}>{item.name}</Text>
                <Text style={[styles.orderOrigin, { color: colors.mutedForeground }]}>{item.origin}</Text>
              </View>
              <Text style={[styles.orderPrice, { color: colors.foreground }]}>{item.price}</Text>
            </View>
          ))}
          {added.length > 0 && (
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: accentColor }]}>
              <Text style={[styles.confirmBtnText, { color: colors.background }]}>CONFIRM ORDER ({added.length})</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AmberParticles />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 6, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: accentColor }]}>{portal?.title ?? craft?.toUpperCase()}</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {currentIndex} / {allItems.length} · {added.length} ADDED
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowAdded(true)} style={styles.basketBtn}>
          <Ionicons name="basket-outline" size={22} color={colors.primary} />
          {added.length > 0 && (
            <View style={[styles.badge, { backgroundColor: accentColor }]}>
              <Text style={styles.badgeText}>{added.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Card stack */}
      <View style={styles.cardArea}>
        {isDone ? (
          <View style={styles.doneState}>
            <Ionicons name="checkmark-circle-outline" size={56} color={accentColor} />
            <Text style={[styles.doneTitle, { color: accentColor }]}>RITUAL COMPLETE</Text>
            <Text style={[styles.doneSub, { color: colors.mutedForeground }]}>
              {added.length} item{added.length !== 1 ? "s" : ""} selected
            </Text>
            <TouchableOpacity onPress={handleReset} style={[styles.resetBtn, { borderColor: accentColor }]}>
              <Text style={[styles.resetBtnText, { color: accentColor }]}>RESTART RITUAL</Text>
            </TouchableOpacity>
            {added.length > 0 && (
              <TouchableOpacity
                onPress={() => setShowAdded(true)}
                style={[styles.viewOrderBtn, { backgroundColor: accentColor }]}
              >
                <Text style={[styles.viewOrderBtnText, { color: colors.background }]}>
                  VIEW SELECTION ({added.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {remaining.slice(0, 3).reverse().map((item, i) => {
              const reverseIndex = Math.min(remaining.length, 3) - 1 - i;
              const isTop = reverseIndex === 0;
              const scale = 1 - (reverseIndex * 0.04);
              const translateY = reverseIndex * 10;
              return (
                <View
                  key={item.id}
                  style={[
                    styles.cardWrapper,
                    { transform: [{ scale }, { translateY }] },
                  ]}
                >
                  <SwipeCard
                    item={item}
                    accentColor={accentColor}
                    onSwipeRight={handleSwipeRight}
                    onSwipeLeft={handleSwipeLeft}
                    isTop={isTop}
                  />
                </View>
              );
            })}
          </>
        )}
      </View>

      {/* Action buttons */}
      {!isDone && (
        <View style={[styles.actionRow, { paddingBottom: bottomPad + 8 }]}>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleSwipeLeft(remaining[0]!); }}
            style={[styles.actionBtn, styles.skipBtn, { borderColor: "#f8717160" }]}
          >
            <Ionicons name="close" size={26} color="#f87171" />
          </TouchableOpacity>
          <Text style={[styles.swipeGuide, { color: colors.mutedForeground }]}>DRAG TO DECIDE</Text>
          <TouchableOpacity
            onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); handleSwipeRight(remaining[0]!); }}
            style={[styles.actionBtn, styles.addBtn, { borderColor: "#4ade8060", backgroundColor: "#4ade8012" }]}
          >
            <Ionicons name="add" size={26} color="#4ade80" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, alignItems: "flex-start" },
  basketBtn: { width: 40, alignItems: "flex-end" },
  badge: {
    position: "absolute",
    top: -4, right: -4,
    width: 16, height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 9, fontWeight: "800", color: "#080604" },
  headerCenter: { alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", letterSpacing: 2.5 },
  headerSub: { fontSize: 9, letterSpacing: 1.5, marginTop: 2 },
  cardArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 20,
  },
  cardWrapper: { position: "absolute", width: "100%", alignItems: "center" },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    paddingHorizontal: 32,
    paddingTop: 12,
  },
  actionBtn: {
    width: 60, height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  skipBtn: {},
  addBtn: {},
  swipeGuide: { fontSize: 8, letterSpacing: 2, fontWeight: "700" },
  doneState: { alignItems: "center", gap: 12, padding: 32 },
  doneTitle: { fontSize: 22, fontWeight: "800", letterSpacing: 3 },
  doneSub: { fontSize: 13, letterSpacing: 0.5 },
  resetBtn: {
    marginTop: 8,
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 10, borderWidth: 1.5,
  },
  resetBtnText: { fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  viewOrderBtn: {
    marginTop: 8,
    paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 10,
  },
  viewOrderBtnText: { fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  emptyState: { alignItems: "center", padding: 40, gap: 12 },
  emptyText: { fontSize: 14, letterSpacing: 0.5 },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  orderBrand: { fontSize: 9, letterSpacing: 2, fontWeight: "700", marginBottom: 2 },
  orderName: { fontSize: 16, fontWeight: "700", letterSpacing: 1 },
  orderOrigin: { fontSize: 11, marginTop: 2 },
  orderPrice: { fontSize: 18, fontWeight: "800" },
  confirmBtn: {
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },
  confirmBtnText: { fontSize: 13, fontWeight: "800", letterSpacing: 2 },
});
