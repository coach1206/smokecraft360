import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export interface CraftPortal {
  id: "smoke" | "pour" | "brew" | "vape";
  title: string;
  tagline: string;
  badge: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  available: boolean;
}

export const CRAFT_PORTALS: CraftPortal[] = [
  {
    id: "smoke",
    title: "SMOKECRAFT",
    tagline: "Luxury cigar ritual — handcrafted selection",
    badge: "PREMIER · CRAFT",
    color: "#D48B00",
    icon: "flame-outline",
    available: true,
  },
  {
    id: "pour",
    title: "POURCRAFT",
    tagline: "Spirits & whiskey — single malt mastery",
    badge: "SPIRITS · CRAFT",
    color: "#C4610A",
    icon: "wine-outline",
    available: true,
  },
  {
    id: "brew",
    title: "BREWCRAFT",
    tagline: "Artisanal craft beer — perfect pour",
    badge: "BREW · CRAFT",
    color: "#8B6914",
    icon: "beer-outline",
    available: true,
  },
  {
    id: "vape",
    title: "VAPECRAFT",
    tagline: "Premium vapor — curated flavors",
    badge: "VAPOR · CRAFT",
    color: "#5B8B8B",
    icon: "cloud-outline",
    available: false,
  },
];

interface Props {
  portal: CraftPortal;
  onPress: (id: CraftPortal["id"]) => void;
}

export default function CraftPortalCard({ portal, onPress }: Props) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  function handlePressIn() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.timing(glowAnim, { toValue: 1, duration: 120, useNativeDriver: false }),
    ]).start();
  }

  function handlePressOut() {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.timing(glowAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start();
  }

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [`${portal.color}28`, `${portal.color}90`],
  });

  const shadowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] });

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => portal.available && onPress(portal.id)}
        style={styles.pressable}
        disabled={!portal.available}
      >
        <Animated.View
          style={[
            styles.card,
            {
              borderColor,
              shadowColor: portal.color,
              shadowOpacity,
            },
          ]}
        >
          {/* Ambient glow corner */}
          <View style={[styles.cornerGlow, { backgroundColor: `${portal.color}18` }]} />

          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: `${portal.color}14`, borderColor: `${portal.color}30` }]}>
            <Ionicons name={portal.icon} size={26} color={portal.color} />
          </View>

          {/* Badge */}
          <Text style={[styles.badge, { color: `${portal.color}99` }]}>{portal.badge}</Text>

          {/* Title */}
          <Text style={[styles.title, { color: portal.color }]}>{portal.title}</Text>

          {/* Tagline */}
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>{portal.tagline}</Text>

          {/* CTA */}
          <View style={[styles.cta, { borderColor: `${portal.color}40`, backgroundColor: `${portal.color}0E` }]}>
            <Text style={[styles.ctaText, { color: portal.color }]}>
              {portal.available ? "◈ INITIALIZE RITUAL" : "COMING SOON"}
            </Text>
          </View>

          {!portal.available && <View style={styles.overlay} />}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  pressable: {},
  card: {
    backgroundColor: "#0F0D0A",
    borderWidth: 1,
    borderRadius: 20,
    padding: 22,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 4,
    overflow: "hidden",
  },
  cornerGlow: {
    position: "absolute",
    top: 0, right: 0,
    width: 120, height: 120,
    borderBottomLeftRadius: 120,
  },
  iconWrap: {
    width: 52, height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  badge: {
    fontSize: 9,
    letterSpacing: 2.5,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 3,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: 0.3,
    marginBottom: 18,
  },
  cta: {
    alignSelf: "stretch",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 64,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2.5,
    textAlign: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,6,4,0.55)",
    borderRadius: 20,
  },
});
