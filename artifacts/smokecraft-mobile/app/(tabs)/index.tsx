import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AmberParticles from "@/components/AmberParticles";
import CraftPortalCard, { CRAFT_PORTALS, type CraftPortal } from "@/components/CraftPortalCard";
import GlassHeader from "@/components/GlassHeader";
import { useColors } from "@/hooks/useColors";

export default function CraftHubScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  function handlePortalPress(id: CraftPortal["id"]) {
    router.push(`/experience/${id}`);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AmberParticles />

      {/* Ambient top glow */}
      <View style={styles.topGlow} />

      <GlassHeader
        title="CRAFT HUB"
        subtitle="NOVEE OS · SELECT YOUR RITUAL"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Intelligence bar */}
        <View style={[styles.intelBar, { borderColor: colors.border, backgroundColor: colors.muted }]}>
          <View style={styles.intelDot} />
          <Text style={[styles.intelText, { color: colors.mutedForeground }]}>
            NOVEE INTELLIGENCE · RECOMMENDATION ENGINE ACTIVE
          </Text>
        </View>

        {/* Portals */}
        {CRAFT_PORTALS.map(portal => (
          <CraftPortalCard
            key={portal.id}
            portal={portal}
            onPress={handlePortalPress}
          />
        ))}

        {/* Footer */}
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          POWERED BY NOVEE OS · INTELLIGENCE THAT ELEVATES
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topGlow: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 200,
    backgroundColor: "rgba(196,97,10,0.06)",
    pointerEvents: "none",
  },
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
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: "#4ade80",
  },
  intelText: {
    fontSize: 8,
    letterSpacing: 1.5,
    fontWeight: "700",
    flex: 1,
  },
  footer: {
    fontSize: 8,
    letterSpacing: 2,
    textAlign: "center",
    marginTop: 12,
    fontWeight: "600",
  },
});
