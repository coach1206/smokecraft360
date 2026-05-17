import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";
import { useNoveeStore } from "@/src/store/noveeStore";

const { width, height } = Dimensions.get("window");

const PROFILE_CONFIGS = {
  SILK_SMOKE: {
    bg: ["#0F0E0A", "#1C150B", "#050505"] as const,
    orb1: "#3A3225",
    orb2: "#26221C",
    ember: "#FF9F1C",
  },
  AMBER_GLOW: {
    bg: ["#0A0804", "#1A1004", "#050302"] as const,
    orb1: "#3D2800",
    orb2: "#2A1C00",
    ember: "#D48B00",
  },
  MIDNIGHT_LOUNGE: {
    bg: ["#080810", "#0D0D1A", "#040408"] as const,
    orb1: "#1A1A3A",
    orb2: "#12122A",
    ember: "#6666FF",
  },
  VIP_GOLD: {
    bg: ["#0C0A04", "#1E1800", "#060400"] as const,
    orb1: "#2A2000",
    orb2: "#1C1600",
    ember: "#D4AF37",
  },
};

function FloatingOrb({
  color,
  cx,
  cy,
  radius,
  duration,
  delay,
}: {
  color: string;
  cx: number;
  cy: number;
  radius: number;
  duration: number;
  delay: number;
}) {
  const opacity = useRef(new Animated.Value(0.18)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.38,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.12,
            duration,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.18,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.orb,
        {
          width: radius * 2,
          height: radius * 2,
          borderRadius: radius,
          backgroundColor: color,
          left: cx - radius,
          top: cy - radius,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

function EmberParticle({
  startX,
  color,
  delay,
}: {
  startX: number;
  color: string;
  delay: number;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -height * 0.6,
            duration: 8000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.9,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 6800,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(scale, {
            toValue: 0.1,
            duration: 8000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.5, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.ember,
        {
          left: startX,
          bottom: height * 0.1,
          backgroundColor: color,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    />
  );
}

export default function AmbientEngine() {
  const { ambiProfile } = useNoveeStore();
  const cfg = PROFILE_CONFIGS[ambiProfile];

  const embers = [
    { x: width * 0.2, delay: 0 },
    { x: width * 0.45, delay: 2800 },
    { x: width * 0.7, delay: 5500 },
    { x: width * 0.33, delay: 1200 },
    { x: width * 0.6, delay: 4000 },
  ];

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      <LinearGradient
        colors={cfg.bg}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <FloatingOrb
        color={cfg.orb1}
        cx={width * 0.3}
        cy={height * 0.4}
        radius={260}
        duration={7000}
        delay={0}
      />
      <FloatingOrb
        color={cfg.orb2}
        cx={width * 0.65}
        cy={height * 0.65}
        radius={300}
        duration={9000}
        delay={3000}
      />
      {embers.map((e, i) => (
        <EmberParticle key={i} startX={e.x} color={cfg.ember} delay={e.delay} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  orb: { position: "absolute" },
  ember: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
