import React from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed/ThemedText";
import { useTranslation } from "@/i18n";
import { useTheme } from "@/theme/tokens";

export interface LifeBalanceBarProps {
  label: string;
  percentage: number;
  color: string;
}

export const LifeBalanceBar: React.FC<LifeBalanceBarProps> = ({
  label,
  percentage,
  color,
}) => {
  const theme = useTheme();
  const { isRTL } = useTranslation();
  const clamped = Math.min(Math.max(percentage, 0), 100);

  return (
    <View
      style={[
        styles.row,
        { flexDirection: isRTL ? "row-reverse" : "row" },
      ]}
    >
      <ThemedText variant="bodyMedium" style={styles.label} numberOfLines={1}>
        {label}
      </ThemedText>
      <View style={[styles.track, { backgroundColor: theme.element }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${clamped}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      <ThemedText variant="bodyMedium" weight="semiBold" style={styles.pct}>
        {clamped}%
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    gap: 10,
  },
  label: {
    width: 96,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
  pct: {
    width: 40,
    textAlign: "right",
  },
});
