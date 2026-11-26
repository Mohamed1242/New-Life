import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ThemedText } from "@/components/themed/ThemedText";
import { useTheme } from "@/theme/tokens";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ProgressRingProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0 to 1
  color?: string;
  trackColor?: string;
  centerLabel?: string;
  centerSublabel?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  size = 76,
  strokeWidth = 7,
  progress,
  color,
  trackColor,
  centerLabel,
  centerSublabel,
}) => {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const clamped = Math.min(Math.max(progress, 0), 1);
  const animatedProgress = useSharedValue(clamped);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    animatedProgress.value = reducedMotion
      ? clamped
      : withTiming(clamped, {
          duration: 600,
          easing: Easing.out(Easing.cubic),
        });
  }, [clamped, reducedMotion, animatedProgress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  const resolvedColor = color ?? theme.pillarSpirituality;
  const resolvedTrack = trackColor ?? theme.element;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={resolvedTrack}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={resolvedColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          fill="none"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {(centerLabel || centerSublabel) ? (
        <View style={styles.centerOverlay}>
          {centerLabel ? (
            <ThemedText variant="caption" weight="bold" center>
              {centerLabel}
            </ThemedText>
          ) : null}
          {centerSublabel ? (
            <ThemedText variant="micro" color="muted" center>
              {centerSublabel}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
});
