import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/themed/ThemedText";
import { useTheme } from "@/theme/tokens";
import { useTranslation } from "@/i18n";

export type ButtonVariant = "gradient" | "primary" | "glass" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = "gradient",
  size = "md",
  leftIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  onPress,
  style,
}) => {
  const theme = useTheme();
  const { isRTL } = useTranslation();

  const height = size === "sm" ? 38 : size === "lg" ? 54 : 46;
  const px = size === "sm" ? 16 : size === "lg" ? 24 : 20;

  const textColor =
    variant === "gradient" || variant === "primary" || variant === "danger"
      ? "#FFFFFF"
      : variant === "ghost"
        ? theme.primary
        : theme.text;

  const content = (
    <View
      style={[
        styles.inner,
        {
          height,
          paddingHorizontal: px,
          flexDirection: isRTL ? "row-reverse" : "row",
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {leftIcon}
          <ThemedText
            variant={size === "sm" ? "caption" : "bodyMedium"}
            weight="semiBold"
            style={{ color: textColor }}
          >
            {title}
          </ThemedText>
        </>
      )}
    </View>
  );

  const containerStyle: StyleProp<ViewStyle> = [
    styles.base,
    fullWidth && styles.fullWidth,
    variant === "primary" && { backgroundColor: theme.primary },
    variant === "danger" && { backgroundColor: theme.error },
    variant === "glass" && {
      backgroundColor: theme.glassSurfaceElevated,
      borderWidth: 1,
      borderColor: theme.glassBorder,
    },
    variant === "outline" && {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: theme.border,
    },
    (disabled || loading) && { opacity: 0.55 },
    style,
  ];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [containerStyle, pressed && { opacity: 0.86 }]}
    >
      {variant === "gradient" ? (
        <LinearGradient
          colors={theme.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.9 }}
          style={styles.gradientFill}
        >
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 9999,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  gradientFill: {
    width: "100%",
  },
  inner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
