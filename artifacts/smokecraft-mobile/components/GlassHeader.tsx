import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export default function GlassHeader({ title, subtitle, right }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.header, { paddingTop: topPad + 10, borderBottomColor: colors.border }]}>
      <View style={styles.left}>
        <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>}
      </View>
      {right && <View style={styles.right}>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    backgroundColor: "rgba(8,6,4,0.92)",
  },
  left: { flex: 1 },
  right: { marginLeft: 12 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 2,
    fontWeight: "600",
  },
});
