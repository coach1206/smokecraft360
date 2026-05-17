import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  r: 1 + Math.random() * 2,
  dur: 6000 + Math.random() * 10000,
  delay: Math.random() * 8000,
  opacity: 0.06 + Math.random() * 0.14,
}));

function Particle({ x, y, r, dur, delay, opacity }: typeof PARTICLES[0]) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: dur, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: dur * 0.6, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });
  const scale = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.6, 0.4] });
  const op = anim.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [opacity, opacity * 2.5, opacity * 1.2, 0] });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: `${x}%` as unknown as number,
          top: `${y}%` as unknown as number,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          opacity: op,
          transform: [{ translateY }, { scale }],
        },
      ]}
    />
  );
}

export default function AmberParticles() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {PARTICLES.map(p => <Particle key={p.id} {...p} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
    backgroundColor: "#D48B00",
  },
});
