import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedText } from "@/components/themed/ThemedText";
import { GlassCard } from "@/components/ui/GlassCard";
import { SYSTEM_CATEGORIES } from "@/constants/categories";
import { useTranslation } from "@/i18n";
import type { HabitItem } from "@/modules/tasks/types/tasks.types";
import { useTheme } from "@/theme/tokens";

export interface HabitCardProps {
  habit: HabitItem;
  onToggle: (id: string) => void;
  onPress?: (habit: HabitItem) => void;
  onLogUrge?: (id: string) => void;
}

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  onToggle,
  onPress,
  onLogUrge,
}) => {
  const theme = useTheme();
  const { isRTL, t } = useTranslation();

  const category =
    SYSTEM_CATEGORIES.find((c) => c.id === habit.category) ?? SYSTEM_CATEGORIES[5];
  const isNegative = habit.polarity === "negative";

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onToggle(habit.id);
  };

  return (
    <GlassCard padding={14} onPress={onPress ? () => onPress(habit) : undefined}>
      <View
        style={[
          styles.row,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: isNegative
                ? theme.errorMuted
                : `${category.accentHex}20`,
            },
          ]}
        >
          <AppIcon
            name={isNegative ? "shield" : category.iconName}
            size={18}
            color={isNegative ? theme.error : category.accentHex}
          />
        </View>

        <View style={styles.content}>
          <ThemedText variant="cardTitle" numberOfLines={1}>
            {habit.title}
          </ThemedText>
          <ThemedText variant="caption" color="secondary" numberOfLines={1}>
            {habit.targetLabel} · {t("habits.streakDays", { count: habit.streakDays })}
            {isNegative && habit.urgeCountToday > 0
              ? ` · ${habit.urgeCountToday} urge${habit.urgeCountToday > 1 ? "s" : ""} paused`
              : ""}
          </ThemedText>
        </View>

        {isNegative && onLogUrge ? (
          <Pressable
            onPress={() => onLogUrge(habit.id)}
            style={[
              styles.urgeChip,
              {
                backgroundColor: theme.primaryMuted,
                borderColor: theme.primary,
              },
            ]}
          >
            <ThemedText variant="caption" color="primary" weight="semiBold">
              {t("habits.logUrge", "Log Urge")}
            </ThemedText>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleToggle}
            style={[
              styles.checkPill,
              {
                backgroundColor: habit.completedToday
                  ? theme.successMuted
                  : theme.element,
                borderColor: habit.completedToday ? theme.success : theme.border,
              },
            ]}
          >
            <AppIcon
              name={habit.completedToday ? "check" : "plus"}
              size={16}
              color={habit.completedToday ? theme.success : theme.textSecondary}
            />
          </Pressable>
        )}
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  checkPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  urgeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },
});
