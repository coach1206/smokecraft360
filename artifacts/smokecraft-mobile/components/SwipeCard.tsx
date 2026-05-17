import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_W * 0.28;
const ROTATION_FACTOR = 12;

export interface SwipeItem {
  id: string;
  name: string;
  brand: string;
  origin: string;
  strength: number;
  flavorNotes: string[];
  price: string;
  inStock: boolean;
  craftType: "smoke" | "pour" | "brew" | "vape";
}

interface Props {
  item: SwipeItem;
  accentColor: string;
  onSwipeRight: (item: SwipeItem) => void;
  onSwipeLeft: (item: SwipeItem) => void;
  isTop: boolean;
}

export default function SwipeCard({ item, accentColor, onSwipeRight, onSwipeLeft, isTop }: Props) {
  const colors = useColors();
  const position = useRef(new Animated.ValueXY()).current;
  const [direction, setDirection] = useState<"left" | "right" | null>(null);

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2],
    outputRange: [`-${ROTATION_FACTOR}deg`, "0deg", `${ROTATION_FACTOR}deg`],
    extrapolate: "clamp",
  });

  const addOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const skipOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTop,
      onMoveShouldSetPanResponder: () => isTop,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
        if (gesture.dx > 30) setDirection("right");
        else if (gesture.dx < -30) setDirection("left");
        else setDirection(null);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Animated.timing(position, {
            toValue: { x: SCREEN_W * 1.4, y: gesture.dy },
            duration: 300,
            useNativeDriver: false,
          }).start(() => onSwipeRight(item));
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Animated.timing(position, {
            toValue: { x: -SCREEN_W * 1.4, y: gesture.dy },
            duration: 300,
            useNativeDriver: false,
          }).start(() => onSwipeLeft(item));
        } else {
          setDirection(null);
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            tension: 120,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      {...(isTop ? panResponder.panHandlers : {})}
      style={[
        styles.card,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { rotate },
          ],
          zIndex: isTop ? 10 : 5,
          borderColor: `${accentColor}28`,
        },
      ]}
    >
      {/* ADD overlay */}
      <Animated.View style={[styles.overlay, styles.addOverlay, { opacity: addOpacity, borderColor: "#4ade80" }]}>
        <Ionicons name="add-circle" size={56} color="#4ade80" />
        <Text style={[styles.overlayText, { color: "#4ade80" }]}>ADD</Text>
      </Animated.View>

      {/* SKIP overlay */}
      <Animated.View style={[styles.overlay, styles.skipOverlay, { opacity: skipOpacity, borderColor: "#f87171" }]}>
        <Ionicons name="close-circle" size={56} color="#f87171" />
        <Text style={[styles.overlayText, { color: "#f87171" }]}>SKIP</Text>
      </Animated.View>

      {/* Ambient glow */}
      <View style={[styles.topGlow, { backgroundColor: `${accentColor}10` }]} />

      {/* Craft type badge */}
      <View style={[styles.craftBadge, { borderColor: `${accentColor}40`, backgroundColor: `${accentColor}12` }]}>
        <Text style={[styles.craftBadgeText, { color: accentColor }]}>{item.craftType.toUpperCase()}</Text>
      </View>

      {/* Main info */}
      <View style={styles.content}>
        <Text style={[styles.brand, { color: colors.mutedForeground }]}>{item.brand}</Text>
        <Text style={[styles.name, { color: accentColor }]}>{item.name}</Text>
        <Text style={[styles.origin, { color: colors.mutedForeground }]}>{item.origin}</Text>

        {/* Flavor notes */}
        <View style={styles.flavorsRow}>
          {item.flavorNotes.slice(0, 3).map((note) => (
            <View key={note} style={[styles.flavorChip, { borderColor: `${accentColor}30`, backgroundColor: `${accentColor}0C` }]}>
              <Text style={[styles.flavorText, { color: accentColor }]}>{note}</Text>
            </View>
          ))}
        </View>

        {/* Strength bar */}
        <View style={styles.strengthRow}>
          <Text style={[styles.strengthLabel, { color: colors.mutedForeground }]}>STRENGTH</Text>
          <View style={[styles.strengthTrack, { backgroundColor: `${accentColor}18` }]}>
            <View style={[styles.strengthFill, { width: `${item.strength}%` as unknown as number, backgroundColor: accentColor }]} />
          </View>
          <Text style={[styles.strengthValue, { color: accentColor }]}>{item.strength}</Text>
        </View>

        {/* Price + stock */}
        <View style={styles.bottomRow}>
          <Text style={[styles.price, { color: colors.foreground }]}>{item.price}</Text>
          <View style={[styles.stockBadge, { backgroundColor: item.inStock ? "#4ade8022" : "#f8717122" }]}>
            <View style={[styles.stockDot, { backgroundColor: item.inStock ? "#4ade80" : "#f87171" }]} />
            <Text style={[styles.stockText, { color: item.inStock ? "#4ade80" : "#f87171" }]}>
              {item.inStock ? "IN STOCK" : "OUT"}
            </Text>
          </View>
        </View>
      </View>

      {/* Swipe hint */}
      {isTop && !direction && (
        <View style={styles.swipeHint}>
          <Ionicons name="arrow-back" size={14} color={colors.mutedForeground} />
          <Text style={[styles.swipeHintText, { color: colors.mutedForeground }]}>SWIPE</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.mutedForeground} />
        </View>
      )}
    </Animated.View>
  );
}

const CARD_H = SCREEN_H * 0.58;

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    width: SCREEN_W - 32,
    height: CARD_H,
    backgroundColor: "#0F0D0A",
    borderRadius: 24,
    borderWidth: 1,
    alignSelf: "center",
    overflow: "hidden",
    shadowColor: "#D48B00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  overlay: {
    position: "absolute",
    inset: 0,
    zIndex: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 24,
    borderWidth: 3,
  },
  addOverlay: { backgroundColor: "rgba(74,222,128,0.08)" },
  skipOverlay: { backgroundColor: "rgba(248,113,113,0.08)" },
  overlayText: { fontSize: 22, fontWeight: "900", letterSpacing: 4 },
  topGlow: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 120,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  craftBadge: {
    position: "absolute",
    top: 18, right: 18,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  craftBadgeText: { fontSize: 8, fontWeight: "700", letterSpacing: 2 },
  content: { flex: 1, padding: 22, justifyContent: "flex-end" },
  brand: { fontSize: 10, letterSpacing: 2.5, fontWeight: "700", marginBottom: 4 },
  name: { fontSize: 28, fontWeight: "800", letterSpacing: 2, marginBottom: 4 },
  origin: { fontSize: 12, letterSpacing: 0.5, marginBottom: 16 },
  flavorsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 },
  flavorChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  flavorText: { fontSize: 10, fontWeight: "600", letterSpacing: 0.8 },
  strengthRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  strengthLabel: { fontSize: 9, letterSpacing: 1.5, fontWeight: "700", width: 60 },
  strengthTrack: { flex: 1, height: 4, borderRadius: 2 },
  strengthFill: { height: 4, borderRadius: 2 },
  strengthValue: { fontSize: 11, fontWeight: "700", width: 28, textAlign: "right" },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  price: { fontSize: 20, fontWeight: "800", letterSpacing: 0.5 },
  stockBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  stockDot: { width: 6, height: 6, borderRadius: 3 },
  stockText: { fontSize: 9, fontWeight: "700", letterSpacing: 1.5 },
  swipeHint: {
    position: "absolute",
    bottom: 14,
    left: 0, right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  swipeHintText: { fontSize: 9, letterSpacing: 2, fontWeight: "700" },
});
