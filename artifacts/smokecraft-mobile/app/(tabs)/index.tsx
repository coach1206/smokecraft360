import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AmbientEngine from "@/components/AmbientEngine";
import CraftPortalCard, {
  CRAFT_PORTALS,
  type CraftPortal,
} from "@/components/CraftPortalCard";
import GlassHeader from "@/components/GlassHeader";
import NoveeOSShell from "@/components/NoveeOSShell";
import { useNoveeStore } from "@/src/store/noveeStore";
import { useColors } from "@/hooks/useColors";

export default function CraftHubScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { osShellVisible, setOsShellVisible, deviceMode } = useNoveeStore();

  const unlockFlash = useRef(new Animated.Value(0)).current;
  const [unlockActive, setUnlockActive] = useState(false);

  function triggerOsUnlock() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Animated.sequence([
      Animated.timing(unlockFlash, { toValue: 0.22, duration: 130, useNativeDriver: false }),
      Animated.timing(unlockFlash, { toValue: 0, duration: 180, useNativeDriver: false }),
      Animated.timing(unlockFlash, { toValue: 0.32, duration: 130, useNativeDriver: false }),
      Animated.timing(unlockFlash, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start(() => setOsShellVisible(true));
  }

  // 5-finger long press (native) — 1-finger on web
  const unlockGesture = Gesture.LongPress()
    .minDuration(3000)
    .numberOfPointers(Platform.OS === "web" ? 1 : 5)
    .onStart(() => {
      "worklet";
      // runOnJS needed for state + haptics from worklet
    })
    .runOnJS(true)
    .onStart(triggerOsUnlock);

  function handlePortalPress(id: CraftPortal["id"]) {
    router.push(`/experience/${id}`);
  }

  return (
    <GestureDetector gesture={unlockGesture}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AmbientEngine />

        {/* Unlock flash */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: "#D4AF37", opacity: unlockFlash }]}
          pointerEvents="none"
        />

        {/* Mode indicator strip */}
        {deviceMode !== "GUEST_TABLET" && (
          <View
            style={[
              styles.modeStrip,
              {
                backgroundColor:
                  deviceMode === "ADMIN" ? "#f8717118" : "#D4AF3718",
                borderBottomColor:
                  deviceMode === "ADMIN" ? "#f8717140" : "#D4AF3740",
              },
            ]}
          >
            <View
              style={[
                styles.modeStripDot,
                {
                  backgroundColor:
                    deviceMode === "ADMIN" ? "#f87171" : "#D4AF37",
                },
              ]}
            />
            <Text
              style={[
                styles.modeStripText,
                {
                  color: deviceMode === "ADMIN" ? "#f87171" : "#D4AF37",
                },
              ]}
            >
              NOVEE OS · {deviceMode} MODE ACTIVE
            </Text>
            <Pressable onPress={() => setOsShellVisible(true)} style={styles.modeStripBtn}>
              <Ionicons name="settings-outline" size={12} color="#D4AF37" />
            </Pressable>
          </View>
        )}

        <GlassHeader
          title="CRAFT HUB"
          subtitle="NOVEE OS · SELECT YOUR RITUAL"
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: bottomPad + 20 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Intelligence bar */}
          <View
            style={[
              styles.intelBar,
              {
                borderColor: colors.border,
                backgroundColor: colors.muted,
              },
            ]}
          >
            <View style={styles.intelDot} />
            <Text style={[styles.intelText, { color: colors.mutedForeground }]}>
              NOVEE INTELLIGENCE · RECOMMENDATION ENGINE ACTIVE
            </Text>
            <Pressable
              onLongPress={triggerOsUnlock}
              delayLongPress={Platform.OS === "web" ? 1200 : 99999}
              style={styles.osHintBtn}
            >
              <Text style={[styles.unlockHint, { color: colors.mutedForeground }]}>
                {Platform.OS === "web" ? "HOLD → OS" : "5-HOLD → OS"}
              </Text>
            </Pressable>
          </View>

          {/* Craft portals */}
          {CRAFT_PORTALS.map((portal) => (
            <CraftPortalCard
              key={portal.id}
              portal={portal}
              onPress={handlePortalPress}
            />
          ))}

          {/* E.A.T. POS — staff portal (visible in STAFF_COCKPIT / ADMIN / KIOSK modes) */}
          {deviceMode !== "GUEST_TABLET" && (
            <Pressable
              onPress={() => router.push("/eat-pos")}
              style={[styles.eatPosPortal, { borderColor: "#C9922A44", backgroundColor: "#0D0D0D" }]}
            >
              <View style={styles.eatPosAccent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.eatPosTitle}>E.A.T. POS SYSTEM</Text>
                <Text style={[styles.eatPosSub, { color: colors.mutedForeground }]}>
                  Environment · Asset · Transaction
                </Text>
              </View>
              <Text style={[styles.eatPosArrow, { color: "#C9922A" }]}>›</Text>
            </Pressable>
          )}

          <Text style={[styles.footer, { color: colors.mutedForeground }]}>
            POWERED BY NOVEE OS · INTELLIGENCE THAT ELEVATES
          </Text>
        </ScrollView>

        {/* NOVEE OS Operator Shell */}
        <NoveeOSShell
          visible={osShellVisible}
          onClose={() => setOsShellVisible(false)}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  modeStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  modeStripDot: { width: 6, height: 6, borderRadius: 3 },
  modeStripText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 2,
    flex: 1,
  },
  modeStripBtn: { padding: 4 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  intelBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  intelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ade80",
  },
  intelText: {
    fontSize: 8,
    letterSpacing: 1.5,
    fontWeight: "700",
    flex: 1,
  },
  osHintBtn: { padding: 2 },
  unlockHint: {
    fontSize: 7,
    letterSpacing: 1,
    fontWeight: "600",
    opacity: 0.7,
  },
  footer: {
    fontSize: 8,
    letterSpacing: 2,
    textAlign: "center",
    marginTop: 12,
    fontWeight: "600",
  },
  eatPosPortal: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    marginTop: 12,
    gap: 12,
  },
  eatPosAccent: {
    width: 3,
    height: 36,
    borderRadius: 2,
    backgroundColor: "#C9922A",
  },
  eatPosTitle: {
    color: "#F0EDE8",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  eatPosSub: {
    fontSize: 11,
    letterSpacing: 0.5,
    marginTop: 3,
  },
  eatPosArrow: {
    fontSize: 28,
    fontWeight: "300",
  },
});
