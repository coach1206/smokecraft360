import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Platform, StyleSheet, Text, View } from "react-native";

const { width } = Dimensions.get("window");
const ND = false; // useNativeDriver — must be false when mixing width + opacity in same sequence

interface Props {
  onBootComplete: () => void;
}

export default function NoveeBootScreen({ onBootComplete }: Props) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;
  const line2Width = useRef(new Animated.Value(0)).current;
  const systemOpacity = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Safety net: always complete after 5s regardless of animation state
    const safetyTimer = setTimeout(onBootComplete, 5200);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 1600, useNativeDriver: ND }),
        Animated.timing(logoScale, { toValue: 1, duration: 2000, useNativeDriver: ND }),
      ]),
      Animated.timing(lineWidth, { toValue: width * 0.28, duration: 600, useNativeDriver: ND }),
      Animated.parallel([
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 500, useNativeDriver: ND }),
        Animated.timing(systemOpacity, { toValue: 0.55, duration: 700, useNativeDriver: ND }),
      ]),
      Animated.delay(700),
      Animated.timing(line2Width, { toValue: width * 0.28, duration: 350, useNativeDriver: ND }),
      Animated.delay(350),
      Animated.timing(flashOpacity, { toValue: 0.8, duration: 220, useNativeDriver: ND }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 280, useNativeDriver: ND }),
    ]).start(({ finished }) => {
      clearTimeout(safetyTimer);
      onBootComplete();
    });

    return () => clearTimeout(safetyTimer);
  }, []);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0A0A08", "#14120A", "#0A0A08"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Ambient center glow */}
      <View style={styles.centerGlow} />

      <Animated.View
        style={[
          styles.logoBlock,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        {/* Monogram N with ring */}
        <View style={styles.monogramWrap}>
          <Text style={styles.monogram}>N</Text>
          <View style={styles.monogramRing} />
          <View style={styles.monogramRingOuter} />
        </View>

        {/* Brand name */}
        <Text style={styles.brandName}>NOVEE OS</Text>

        {/* Gold divider line — animated width */}
        <Animated.View style={[styles.goldLine, { width: lineWidth }]} />

        {/* Subtitle */}
        <Animated.Text style={[styles.tagline, { opacity: subtitleOpacity }]}>
          HOSPITALITY OPERATING SYSTEM
        </Animated.Text>

        {/* System info */}
        <Animated.Text style={[styles.systemText, { opacity: systemOpacity }]}>
          v1.0 · LUXURY EDITION · CRAFT INTELLIGENCE ACTIVE
        </Animated.Text>

        {/* Second thin line */}
        <Animated.View style={[styles.goldLineThin, { width: line2Width }]} />
      </Animated.View>

      {/* Flash transition overlay */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "#D4AF37", opacity: flashOpacity }]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0A08",
    alignItems: "center",
    justifyContent: "center",
  },
  centerGlow: {
    position: "absolute",
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: "rgba(212,175,55,0.07)",
    alignSelf: "center",
    top: "50%",
    marginTop: -190,
  },
  logoBlock: {
    alignItems: "center",
    gap: 14,
  },
  monogramWrap: {
    width: 92,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  monogram: {
    color: "#D4AF37",
    fontSize: 50,
    fontWeight: "200",
    letterSpacing: 4,
    lineHeight: 58,
  },
  monogramRing: {
    position: "absolute",
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.45)",
  },
  monogramRingOuter: {
    position: "absolute",
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 0.5,
    borderColor: "rgba(212,175,55,0.18)",
  },
  brandName: {
    color: "#D4AF37",
    fontSize: 26,
    fontWeight: "300",
    letterSpacing: 14,
    marginBottom: 2,
  },
  goldLine: {
    height: 1,
    backgroundColor: "#D4AF37",
    opacity: 0.75,
  },
  tagline: {
    color: "#E5D5B3",
    fontSize: 10,
    letterSpacing: 5,
    fontWeight: "400",
    marginTop: 2,
  },
  systemText: {
    color: "#8E8A82",
    fontSize: 8,
    letterSpacing: 2,
    fontWeight: "400",
    textAlign: "center",
  },
  goldLineThin: {
    height: 0.5,
    backgroundColor: "rgba(212,175,55,0.4)",
    marginTop: 4,
  },
});
