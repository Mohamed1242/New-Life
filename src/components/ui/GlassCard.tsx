import React from "react";
import {
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { GlassShadowLight, Radii } from "@/constants/theme";
import { useTheme } from "@/theme/tokens";

export interface GlassCardProps {
  children: React.ReactNode;
  elevated?: boolean;
  /** Selective glassmorphism: default solid crisp surface for readability; "glass" for hero/highlight cards */
  variant?: "surface" | "glass";
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  borderRadius?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  elevated = false,
  variant,
  onPress,
  style,
  padding = 16,
  borderRadius = Radii.lg,
}) => {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const resolvedVariant = variant ?? (elevated ? "glass" : "surface");
  const isGlass = resolvedVariant === "glass";

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const surfaceColor = isGlass
    ? elevated
      ? theme.glassSurfaceElevated
      : theme.glassSurface
    : theme.card;

  const borderColor = isGlass ? theme.glassBorder : theme.cardBorder;

  const containerStyles: StyleProp<ViewStyle> = [
    styles.card,
    {
      borderRadius,
      borderColor,
      backgroundColor:
        isGlass && Platform.OS === "ios" ? "transparent" : surfaceColor,
    },
    theme.mode === "light" && (elevated || !isGlass)
      ? GlassShadowLight
      : undefined,
    style,
  ];

  const innerContent = isGlass ? (
    <>
      {Platform.OS === "ios" ? (
        <BlurView
          intensity={elevated ? 36 : 24}
          tint={theme.blurTint}
          style={[StyleSheet.absoluteFill, { borderRadius }]}
        />
      ) : null}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: surfaceColor,
            borderRadius,
          },
        ]}
      />
      <View style={{ padding }}>{children}</View>
    </>
  ) : (
    <View style={{ padding }}>{children}</View>
  );

  if (!onPress) {
    return <View style={containerStyles}>{innerContent}</View>;
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        if (!reducedMotion) {
          scale.set(withSpring(0.98, { damping: 20, stiffness: 280 }));
        }
      }}
      onPressOut={() => {
        if (!reducedMotion) {
          scale.set(withSpring(1, { damping: 20, stiffness: 280 }));
        }
      }}
      style={[containerStyles, animatedStyle]}
    >
      {innerContent}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderWidth: 1,
  },
});
