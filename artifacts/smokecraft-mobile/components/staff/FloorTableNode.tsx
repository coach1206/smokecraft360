/**
 * FLOOR TABLE NODE
 * Circular ambient node representing a single table on the floor map.
 * Animates:
 *   - OCCUPIED: slow amber pulse glow (1.4s loop)
 *   - RITUAL:   faster gold shimmer + scale breathe (0.8s loop)
 *   - AVAILABLE: static dim ring
 *   - RESERVED: static muted ring
 */

import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import * as Haptics from "expo-haptics";

export type TableStatus = "available" | "occupied" | "ritual" | "reserved";

export interface FloorTable {
  id: string;
  label: string;
  guestCount: number;
  status: TableStatus;
  grossCents: number;
  hasMember?: boolean;
}

interface Props {
  table: FloorTable;
  onPress: (table: FloorTable) => void;
  size?: number;
}

const STATUS_RING: Record<TableStatus, string> = {
  available: "rgba(255,255,255,0.08)",
  occupied:  "#FFB300",
  ritual:    "#D4AF37",
  reserved:  "rgba(90,90,110,0.5)",
};

const STATUS_BG: Record<TableStatus, string> = {
  available: "rgba(20,20,24,0.90)",
  occupied:  "rgba(22,18,10,0.95)",
  ritual:    "rgba(20,18,10,0.95)",
  reserved:  "rgba(18,18,22,0.80)",
};

const GLOW_COLOR: Record<TableStatus, string> = {
  available: "transparent",
  occupied:  "rgba(255,179,0,0.16)",
  ritual:    "rgba(212,175,55,0.30)",
  reserved:  "transparent",
};

export default function FloorTableNode({ table, onPress, size = 92 }: Props) {
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const scale       = useRef(new Animated.Value(1)).current;
  const loopRef     = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    loopRef.current?.stop();
    glowOpacity.setValue(0);
    scale.setValue(1);

    if (table.status === "ritual") {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(glowOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1.07, duration: 700, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(glowOpacity, { toValue: 0.2, duration: 700, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1.0, duration: 700, useNativeDriver: true }),
          ]),
        ])
      );
    } else if (table.status === "occupied") {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 1, duration: 1300, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.2, duration: 1300, useNativeDriver: true }),
        ])
      );
    }

    loopRef.current?.start();
    return () => loopRef.current?.stop();
  }, [table.status]);

  const borderColor = STATUS_RING[table.status];
  const ringOpacity = table.status === "occupied" || table.status === "ritual"
    ? glowOpacity.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] })
    : 1;

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(table);
  }

  return (
    <Pressable onPress={handlePress} style={{ padding: 10 }}>
      <Animated.View
        style={[
          styles.node,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: STATUS_BG[table.status],
            borderColor,
            borderWidth: 1.5,
            shadowColor: borderColor,
            shadowOpacity: ringOpacity,
            transform: [{ scale }],
          },
        ]}
      >
        {/* Inner glow */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: size / 2,
              backgroundColor: GLOW_COLOR[table.status],
              opacity: glowOpacity,
            },
          ]}
        />

        {/* Table number */}
        <Text style={[
          styles.label,
          table.status === "ritual" && { color: "#D4AF37" },
          table.status === "available" && { color: "rgba(255,255,255,0.4)" },
        ]}>
          {table.label}
        </Text>

        {/* Guest count or ritual icon */}
        {table.status === "ritual" ? (
          <Text style={styles.ritualIcon}>◈</Text>
        ) : table.guestCount > 0 ? (
          <Text style={styles.guestCount}>{table.guestCount}g</Text>
        ) : null}

        {/* Member indicator */}
        {table.hasMember && (
          <Text style={styles.memberDot}>◉</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  node: {
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    elevation: 8,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  guestCount: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    marginTop: 2,
  },
  ritualIcon: {
    color: "#D4AF37",
    fontSize: 12,
    marginTop: 2,
  },
  memberDot: {
    position: "absolute",
    top: 10,
    right: 10,
    color: "#FFB300",
    fontSize: 8,
  },
});
