import React from "react";
import { StyleSheet, Text, TextProps, TextStyle } from "react-native";
import { AppFontWeight, EnglishFonts, fontWeightToFamily, getFontFamily } from "@/constants/theme";
import { useTranslation } from "@/i18n";
import { useResponsive } from "@/theme/responsive";
import { useTheme } from "@/theme/tokens";

export type ThemedTextVariant =
  | "display"
  | "h1"
  | "h2"
  | "cardTitle"
  | "body"
  | "bodyMedium"
  | "caption"
  | "micro"
  | "error";

export type ThemedTextColor =
  | "default"
  | "secondary"
  | "muted"
  | "primary"
  | "inverse"
  | "success"
  | "warning"
  | "error";

export interface ThemedTextProps extends TextProps {
  variant?: ThemedTextVariant;
  color?: ThemedTextColor;
  weight?: AppFontWeight;
  center?: boolean;
}

function defaultWeightForVariant(variant?: ThemedTextVariant): AppFontWeight {
  switch (variant) {
    case "display":
    case "h1":
      return "bold";
    case "h2":
    case "cardTitle":
    case "micro":
      return "semiBold";
    case "bodyMedium":
    case "caption":
    case "error":
      return "medium";
    default:
      return "regular";
  }
}

export const ThemedText: React.FC<ThemedTextProps> = ({
  variant = "body",
  color = "default",
  weight,
  center = false,
  style,
  children,
  ...rest
}) => {
  const theme = useTheme();
  const { rFS } = useResponsive();
  const { isRTL } = useTranslation();

  const flat = (StyleSheet.flatten(style) || {}) as TextStyle;
  const resolvedWeight =
    weight ?? defaultWeightForVariant(variant) ?? fontWeightToFamily(flat.fontWeight);

  const fontFamily = getFontFamily(resolvedWeight, isRTL);

  const resolvedColor = (() => {
    switch (color) {
      case "secondary":
        return theme.textSecondary;
      case "muted":
        return theme.textMuted;
      case "primary":
        return theme.primary;
      case "inverse":
        return theme.textInverse;
      case "success":
        return theme.success;
      case "warning":
        return theme.warning;
      case "error":
        return theme.error;
      default:
        return theme.text;
    }
  })();

  const variantMetrics: TextStyle = (() => {
    switch (variant) {
      case "display":
        return { fontSize: rFS(28), lineHeight: rFS(36) };
      case "h1":
        return { fontSize: rFS(24), lineHeight: rFS(32) };
      case "h2":
        return { fontSize: rFS(18), lineHeight: rFS(26) };
      case "cardTitle":
        return { fontSize: rFS(16), lineHeight: rFS(22) };
      case "caption":
        return { fontSize: rFS(12), lineHeight: rFS(16) };
      case "micro":
        return { fontSize: rFS(10), lineHeight: rFS(14) };
      case "error":
        return { fontSize: rFS(12), lineHeight: rFS(16) };
      default:
        return { fontSize: rFS(14), lineHeight: rFS(20) };
    }
  })();

  return (
    <Text
      style={[
        variantMetrics,
        {
          color: resolvedColor,
          fontFamily: fontFamily || EnglishFonts.regular,
          textAlign: center ? "center" : isRTL ? "right" : "left",
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
};
