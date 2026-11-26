import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed/ThemedText";
import { useTranslation } from "@/i18n";
import { useTheme } from "@/theme/tokens";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  const { isRTL } = useTranslation();

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: theme.glassSurface,
          borderColor: theme.glassBorder,
          flexDirection: isRTL ? "row-reverse" : "row",
        },
      ]}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.pill,
              active && {
                backgroundColor: theme.glassSurfaceElevated,
                borderColor: theme.glassBorder,
                borderWidth: 1,
              },
            ]}
          >
            <ThemedText
              variant="caption"
              weight={active ? "semiBold" : "medium"}
              color={active ? "primary" : "secondary"}
              center
              numberOfLines={1}
            >
              {opt.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: 9999,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  pill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
});
