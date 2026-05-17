import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GlassHeader from "@/components/GlassHeader";
import { useColors } from "@/hooks/useColors";

const MENTOR = {
  name: "MAESTRO LEON",
  title: "Master Torcedor · Havana School",
  palate: "Bold & Complex",
  affinity: ["Maduro", "Full Body", "Aged Spirits"],
  quote: "The finest pleasures demand patience.",
};

const TASTE_PROFILE = [
  { label: "BOLDNESS", value: 82, color: "#D48B00" },
  { label: "COMPLEXITY", value: 71, color: "#C4610A" },
  { label: "SWEETNESS", value: 35, color: "#8B6914" },
  { label: "EARTHINESS", value: 65, color: "#5B8B4E" },
];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [enrolled, setEnrolled] = useState(false);

  if (!enrolled) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <GlassHeader title="IDENTITY" subtitle="YOUR PALATE PROFILE" />
        <View style={styles.enrollCenter}>
          <View style={[styles.mentorCrest, { borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}10` }]}>
            <Ionicons name="person-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.enrollTitle, { color: colors.primary }]}>BUILD YOUR PROFILE</Text>
          <Text style={[styles.enrollSub, { color: colors.mutedForeground }]}>
            Answer 3 questions to unlock your personal mentor and taste profile
          </Text>
          <TouchableOpacity
            onPress={() => setEnrolled(true)}
            style={[styles.enrollBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.enrollBtnText, { color: colors.background }]}>BEGIN ENROLLMENT</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <GlassHeader title="IDENTITY" subtitle="PATRON PROFILE · ACTIVE" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Mentor card */}
        <View style={[styles.mentorCard, { borderColor: `${colors.primary}30`, backgroundColor: colors.card }]}>
          <View style={styles.mentorTop}>
            <View style={[styles.mentorAvatar, { borderColor: `${colors.primary}50`, backgroundColor: `${colors.primary}14` }]}>
              <Ionicons name="person" size={32} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.mentorLabel, { color: colors.mutedForeground }]}>YOUR MENTOR</Text>
              <Text style={[styles.mentorName, { color: colors.primary }]}>{MENTOR.name}</Text>
              <Text style={[styles.mentorTitle, { color: colors.mutedForeground }]}>{MENTOR.title}</Text>
            </View>
          </View>
          <Text style={[styles.mentorQuote, { color: colors.foreground, borderLeftColor: colors.primary }]}>
            "{MENTOR.quote}"
          </Text>
          <View style={styles.affinityRow}>
            {MENTOR.affinity.map(a => (
              <View key={a} style={[styles.affinityChip, { borderColor: `${colors.primary}30`, backgroundColor: `${colors.primary}10` }]}>
                <Text style={[styles.affinityText, { color: colors.primary }]}>{a}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Taste profile */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>TASTE PROFILE</Text>

        <View style={[styles.tasteCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          {TASTE_PROFILE.map(t => (
            <View key={t.label} style={styles.tasteRow}>
              <Text style={[styles.tasteLabel, { color: colors.mutedForeground }]}>{t.label}</Text>
              <View style={[styles.tasteTrack, { backgroundColor: `${t.color}18` }]}>
                <View style={[styles.tasteFill, { width: `${t.value}%` as unknown as number, backgroundColor: t.color }]} />
              </View>
              <Text style={[styles.tasteValue, { color: t.color }]}>{t.value}</Text>
            </View>
          ))}
        </View>

        {/* Settings */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PREFERENCES</Text>

        {[
          { icon: "notifications-outline" as const, label: "Notifications", value: "On" },
          { icon: "language-outline" as const, label: "Language", value: "English" },
          { icon: "shield-checkmark-outline" as const, label: "Privacy", value: "Managed" },
        ].map(item => (
          <TouchableOpacity
            key={item.label}
            style={[styles.settingsRow, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <Ionicons name={item.icon} size={20} color={colors.primary} />
            <Text style={[styles.settingsLabel, { color: colors.foreground }]}>{item.label}</Text>
            <Text style={[styles.settingsValue, { color: colors.mutedForeground }]}>{item.value}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={() => setEnrolled(false)}
          style={[styles.resetBtn, { borderColor: `${colors.destructive}40` }]}
        >
          <Text style={[styles.resetBtnText, { color: colors.destructive }]}>RESET PROFILE</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  enrollCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  mentorCrest: {
    width: 100, height: 100,
    borderRadius: 50,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  enrollTitle: { fontSize: 22, fontWeight: "800", letterSpacing: 3 },
  enrollSub: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  enrollBtn: {
    marginTop: 8,
    paddingHorizontal: 32, paddingVertical: 16,
    borderRadius: 14,
  },
  enrollBtnText: { fontSize: 13, fontWeight: "800", letterSpacing: 2.5 },
  content: { padding: 16 },
  mentorCard: {
    borderRadius: 18, borderWidth: 1,
    padding: 18, marginBottom: 24,
  },
  mentorTop: { flexDirection: "row", gap: 14, alignItems: "center", marginBottom: 14 },
  mentorAvatar: {
    width: 60, height: 60, borderRadius: 30,
    borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  mentorLabel: { fontSize: 8, letterSpacing: 2, fontWeight: "700", marginBottom: 2 },
  mentorName: { fontSize: 17, fontWeight: "800", letterSpacing: 1.5 },
  mentorTitle: { fontSize: 10, marginTop: 2 },
  mentorQuote: {
    fontSize: 13, lineHeight: 20, fontStyle: "italic",
    paddingLeft: 12, borderLeftWidth: 2,
    marginBottom: 12,
  },
  affinityRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  affinityChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  affinityText: { fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  sectionTitle: { fontSize: 9, letterSpacing: 2.5, fontWeight: "700", marginBottom: 10 },
  tasteCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 24, gap: 14 },
  tasteRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  tasteLabel: { fontSize: 8, letterSpacing: 1.5, fontWeight: "700", width: 68 },
  tasteTrack: { flex: 1, height: 5, borderRadius: 2.5 },
  tasteFill: { height: 5, borderRadius: 2.5 },
  tasteValue: { fontSize: 11, fontWeight: "700", width: 26, textAlign: "right" },
  settingsRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderRadius: 12, padding: 14,
    marginBottom: 8,
  },
  settingsLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  settingsValue: { fontSize: 12 },
  resetBtn: {
    marginTop: 16, padding: 14,
    borderRadius: 12, borderWidth: 1,
    alignItems: "center",
  },
  resetBtnText: { fontSize: 11, fontWeight: "800", letterSpacing: 2 },
});
