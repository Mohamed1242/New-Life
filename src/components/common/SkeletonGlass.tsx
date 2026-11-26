import React, { useEffect } from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Radii } from "@/constants/theme";
import { useTheme } from "@/theme/tokens";

export interface SkeletonGlassProps {
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonGlass: React.FC<SkeletonGlassProps> = ({
  height = 76,
  borderRadius = Radii.lg,
  style,
}) => {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0.65);

  useEffect(() => {
    if (reducedMotion) return;
    opacity.set(
      withRepeat(
        withSequence(
          withTiming(0.35, { duration: 750 }),
          withTiming(0.75, { duration: 750 }),
        ),
        -1,
        false,
      ),
    );
  }, [reducedMotion, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.box,
        {
          height,
          borderRadius,
          backgroundColor: theme.glassSurface,
          borderColor: theme.glassBorder,
        },
        animStyle,
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  box: {
    width: "100%",
    borderWidth: 1,
  },
});
