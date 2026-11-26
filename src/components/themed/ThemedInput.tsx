import React, { useState } from "react";
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { Radii, getFontFamily } from "@/constants/theme";
import { useTranslation } from "@/i18n";
import { useResponsive } from "@/theme/responsive";
import { useTheme } from "@/theme/tokens";
import { ThemedText } from "./ThemedText";

export interface ThemedInputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export const ThemedInput = React.forwardRef<TextInput, ThemedInputProps>(
  ({ label, error, leftIcon, rightIcon, containerStyle, style, onFocus, onBlur, ...rest }, ref) => {
    const theme = useTheme();
    const { isRTL } = useTranslation();
    const { rFS, rSp } = useResponsive();
    const [focused, setFocused] = useState(false);

    return (
      <View style={[styles.wrapper, containerStyle]}>
        {label ? (
          <ThemedText variant="caption" color="secondary" weight="semiBold">
            {label}
          </ThemedText>
        ) : null}
        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: theme.element,
              borderColor: error
                ? theme.error
                : focused
                  ? theme.primary
                  : theme.border,
              borderRadius: Radii.md,
              paddingHorizontal: rSp(14),
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          {leftIcon ? <View style={styles.iconSlot}>{leftIcon}</View> : null}
          <TextInput
            ref={ref}
            placeholderTextColor={theme.textMuted}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            style={[
              styles.input,
              {
                color: theme.text,
                fontSize: rFS(14),
                fontFamily: getFontFamily("regular", isRTL),
                textAlign: isRTL ? "right" : "left",
              },
              style,
            ]}
            {...rest}
          />
          {rightIcon ? <View style={styles.iconSlot}>{rightIcon}</View> : null}
        </View>
        {error ? (
          <ThemedText variant="error" color="error">
            {error}
          </ThemedText>
        ) : null}
      </View>
    );
  },
);

ThemedInput.displayName = "ThemedInput";

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  inputRow: {
    minHeight: 48,
    borderWidth: 1,
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
  },
  iconSlot: {
    alignItems: "center",
    justifyContent: "center",
  },
});
