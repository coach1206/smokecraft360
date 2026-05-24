import { Stack } from "expo-router";
import React from "react";

export default function StaffLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#010101" },
        animation: "slide_from_right",
      }}
    />
  );
}
