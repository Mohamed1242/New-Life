import React from "react";
import { Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
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
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  borderRadius?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  elevated = false,
  onPress,
  style,
  padding = 16,
  borderRadius = Radii.lg,
}) => {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const surfaceColor = elevated
    ? theme.glassSurfaceElevated
    : theme.glassSurface;

  const containerStyles: StyleProp<ViewStyle> = [
    styles.card,
    {
      borderRadius,
      borderColor: theme.glassBorder,
      backgroundColor: Platform.OS === "ios" ? "transparent" : surfaceColor,
    },
    theme.mode === "light" ? GlassShadowLight : undefined,
    style,
  ];

  const innerContent = (
    <>
      {Platform.OS === "ios" ? (
        <BlurView
          intensity={elevated ? 42 : 28}
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
  );

  if (!onPress) {
    return <View style={containerStyles}>{innerContent}</View>;
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        if (!reducedMotion) {
          scale.set(withSpring(0.975, { damping: 18, stiffness: 260 }));
        }
      }}
      onPressOut={() => {
        if (!reducedMotion) {
          scale.set(withSpring(1, { damping: 18, stiffness: 260 }));
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
