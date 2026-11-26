import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedText } from "@/components/themed/ThemedText";
import { GlassCard } from "@/components/ui/GlassCard";
import { SYSTEM_CATEGORIES } from "@/constants/categories";
import { useTranslation } from "@/i18n";
import type { TaskItem } from "@/modules/tasks/types/tasks.types";
import { useTheme } from "@/theme/tokens";

export interface TaskRowCardProps {
  task: TaskItem;
  onToggle: (id: string) => void;
  onPress?: (task: TaskItem) => void;
}

export const TaskRowCard: React.FC<TaskRowCardProps> = ({
  task,
  onToggle,
  onPress,
}) => {
  const theme = useTheme();
  const { isRTL, t } = useTranslation();

  const category =
    SYSTEM_CATEGORIES.find((c) => c.id === task.category) ?? SYSTEM_CATEGORIES[5];

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onToggle(task.id);
  };

  return (
    <GlassCard padding={14} onPress={onPress ? () => onPress(task) : handleToggle}>
      <View
        style={[
          styles.row,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <View
          style={[
            styles.catBadge,
            { backgroundColor: `${category.accentHex}20` },
          ]}
        >
          <AppIcon name={category.iconName} size={18} color={category.accentHex} />
        </View>

        <View style={styles.textBlock}>
          <ThemedText
            variant="cardTitle"
            style={[
              task.completed && {
                textDecorationLine: "line-through",
                opacity: 0.6,
              },
            ]}
            numberOfLines={1}
          >
            {task.title}
          </ThemedText>
          <ThemedText variant="caption" color="secondary" numberOfLines={1}>
            {task.completed
              ? `${t("common.done", "Done")} · ${task.timeLabel}`
              : task.timeLabel}
          </ThemedText>
        </View>

        <Pressable
          onPress={handleToggle}
          hitSlop={10}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.completed }}
          style={[
            styles.checkCircle,
            {
              borderColor: task.completed ? theme.success : theme.border,
              backgroundColor: task.completed ? theme.success : "transparent",
            },
          ]}
        >
          {task.completed ? (
            <AppIcon name="check" size={14} color="#FFFFFF" strokeWidth={2.5} />
          ) : null}
        </Pressable>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    gap: 12,
  },
  catBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.75,
    alignItems: "center",
    justifyContent: "center",
  },
});
