import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/theme/tokens";

export interface AtmosphericBackgroundProps {
  variant?: "default" | "prayer";
  children: React.ReactNode;
}

export const AtmosphericBackground: React.FC<AtmosphericBackgroundProps> = ({
  variant = "default",
  children,
}) => {
  const theme = useTheme();
  const colors =
    variant === "prayer" ? theme.prayerGradient : theme.backdropGradient;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Subtle atmospheric glow orbs — single background layer */}
      <View
        pointerEvents="none"
        style={[
          styles.orbTop,
          {
            backgroundColor:
              variant === "prayer"
                ? "rgba(42, 184, 141, 0.10)"
                : theme.mode === "dark"
                  ? "rgba(124, 114, 255, 0.10)"
                  : "rgba(112, 100, 247, 0.08)",
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.orbBottom,
          {
            backgroundColor:
              variant === "prayer"
                ? "rgba(91, 79, 233, 0.09)"
                : theme.mode === "dark"
                  ? "rgba(52, 211, 153, 0.06)"
                  : "rgba(42, 184, 141, 0.06)",
          },
        ]}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  orbTop: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  orbBottom: {
    position: "absolute",
    bottom: 80,
    left: -90,
    width: 240,
    height: 240,
    borderRadius: 120,
  },
});
