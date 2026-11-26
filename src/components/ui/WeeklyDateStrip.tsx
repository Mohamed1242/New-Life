import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed/ThemedText";
import { useTranslation } from "@/i18n";
import { useTheme } from "@/theme/tokens";

export interface DayPillItem {
  isoDate: string;
  dayShort: string;
  dayNumber: string;
  hasActivity?: boolean;
}

export interface WeeklyDateStripProps {
  days: DayPillItem[];
  selectedDate: string;
  onSelect: (isoDate: string) => void;
}

export const WeeklyDateStrip: React.FC<WeeklyDateStripProps> = ({
  days,
  selectedDate,
  onSelect,
}) => {
  const theme = useTheme();
  const { isRTL } = useTranslation();

  return (
    <View
      style={[
        styles.row,
        { flexDirection: isRTL ? "row-reverse" : "row" },
      ]}
    >
      {days.map((day) => {
        const active = day.isoDate === selectedDate;
        return (
          <Pressable
            key={day.isoDate}
            onPress={() => onSelect(day.isoDate)}
            style={[
              styles.pill,
              {
                backgroundColor: active
                  ? theme.glassSurfaceElevated
                  : theme.glassSurface,
                borderColor: active
                  ? theme.glassBorderStrong
                  : theme.glassBorder,
              },
            ]}
          >
            <ThemedText
              variant="micro"
              color={active ? "primary" : "muted"}
              center
            >
              {day.dayShort}
            </ThemedText>
            <ThemedText
              variant="cardTitle"
              color={active ? "primary" : "default"}
              weight="bold"
              center
            >
              {day.dayNumber}
            </ThemedText>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: day.hasActivity
                    ? active
                      ? theme.primary
                      : theme.pillarSpirituality
                    : "transparent",
                },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    justifyContent: "space-between",
    gap: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
