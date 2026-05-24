/**
 * VELOCITY ITEM BUTTON
 * Primary 1-tap order tile for the Fast Bar Terminal.
 * Enforces minimum 90dp hit target (well above 48dp minimum for wet environments).
 * Renders an amber TTL overlay when the touch-lock is active.
 */

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";

export interface POSItem {
  id: string;
  name: string;
  priceCents: number;
  category: "bar" | "humidor" | "kitchen";
  qty: number;
}

interface Props {
  item: POSItem;
  onPress: (item: POSItem) => void;
  isLocked?: boolean;
  /** Compact row mode for the extended list (single-column, less height) */
  compact?: boolean;
}

const CATEGORY_ACCENT: Record<string, string> = {
  bar:     "#FFB300",
  humidor: "#D4AF37",
  kitchen: "#9B59B6",
};

const CATEGORY_LABEL: Record<string, string> = {
  bar:     "BAR",
  humidor: "HUMIDOR",
  kitchen: "KITCHEN",
};

export default function VelocityItemButton({
  item,
  onPress,
  isLocked,
  compact,
}: Props) {
  const is86d       = item.qty <= 0;
  const accent      = CATEGORY_ACCENT[item.category] ?? "#D4AF37";
  const pulseAnim   = useRef(new Animated.Value(0)).current;
  const loopRef     = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isLocked) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 280, useNativeDriver: false }),
          Animated.timing(pulseAnim, { toValue: 0.2, duration: 280, useNativeDriver: false }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      pulseAnim.setValue(0);
    }
    return () => loopRef.current?.stop();
  }, [isLocked]);

  const borderColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,179,0,0.15)", "#FFB300"],
  });

  function handlePress() {
    if (is86d || isLocked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress(item);
  }

  if (compact) {
    return (
      <Pressable
        onPress={handlePress}
        disabled={is86d}
        style={[styles.compact, is86d && styles.compact86d]}
      >
        {isLocked && <View style={styles.ttlOverlay} />}
        <View style={[styles.compactDot, { backgroundColor: is86d ? "#2A2A2A" : accent }]} />
        <View style={styles.compactMiddle}>
          <Text style={[styles.compactName, is86d && styles.text86d]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.compactCat, { color: is86d ? "#333" : accent + "88" }]}>
            {CATEGORY_LABEL[item.category]}
          </Text>
        </View>
        {is86d ? (
          <Text style={styles.badge86}>86</Text>
        ) : (
          <Text style={styles.compactPrice}>${(item.priceCents / 100).toFixed(2)}</Text>
        )}
      </Pressable>
    );
  }

  return (
    <Animated.View style={[styles.gridBtn, { borderColor }, is86d && styles.gridBtn86d]}>
      <Pressable
        onPress={handlePress}
        disabled={is86d}
        style={styles.gridPressable}
        android_ripple={{ color: "rgba(255,179,0,0.12)" }}
      >
        {isLocked && <View style={styles.ttlOverlay} />}

        <View style={styles.gridTop}>
          <View style={[styles.dot, { backgroundColor: is86d ? "#222" : accent }]} />
          {is86d && <Text style={styles.badge86}>86</Text>}
          {isLocked && !is86d && (
            <Text style={styles.lockDot}>◉</Text>
          )}
        </View>

        <Text style={[styles.gridName, is86d && styles.text86d]} numberOfLines={2}>
          {item.name}
        </Text>

        <View style={styles.gridBottom}>
          <Text style={[styles.gridCat, { color: is86d ? "#2A2A2A" : accent + "88" }]}>
            {CATEGORY_LABEL[item.category]}
          </Text>
          <Text style={[styles.gridPrice, is86d && { color: "#2A2A2A" }]}>
            {is86d ? "—" : `$${(item.priceCents / 100).toFixed(2)}`}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // ── Grid mode ──────────────────────────────────────────────────────────────
  gridBtn: {
    width: "48%",
    minHeight: 90,
    backgroundColor: "rgba(28,28,30,0.80)",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  gridBtn86d: {
    backgroundColor: "rgba(16,16,18,0.50)",
    borderColor: "rgba(255,255,255,0.02)",
  },
  gridPressable: {
    flex: 1,
    padding: 14,
    justifyContent: "space-between",
    minHeight: 90,
  },
  gridTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  lockDot: {
    color: "#FFB300",
    fontSize: 9,
    marginLeft: "auto",
  },
  gridName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 19,
    flex: 1,
  },
  gridBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  gridCat: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  gridPrice: {
    color: "#D4AF37",
    fontSize: 13,
    fontWeight: "600",
  },

  // ── Compact row mode ───────────────────────────────────────────────────────
  compact: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(28,28,30,0.70)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
    marginBottom: 8,
    gap: 12,
    overflow: "hidden",
  },
  compact86d: {
    backgroundColor: "rgba(16,16,18,0.40)",
  },
  compactDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  compactMiddle: {
    flex: 1,
  },
  compactName: {
    color: "#F0EDE8",
    fontSize: 14,
    fontWeight: "500",
  },
  compactCat: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 2,
  },
  compactPrice: {
    color: "#D4AF37",
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 0,
  },

  // ── Shared ─────────────────────────────────────────────────────────────────
  ttlOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,179,0,0.09)",
  },
  badge86: {
    color: "#FF3B30",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  text86d: {
    color: "rgba(255,255,255,0.15)",
    textDecorationLine: "line-through",
  },
});
