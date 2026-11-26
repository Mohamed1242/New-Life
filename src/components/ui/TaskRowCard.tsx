import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedText } from "@/components/themed/ThemedText";
import { GlassCard } from "@/components/ui/GlassCard";
import { SYSTEM_CATEGORIES } from "@/constants/categories";
import { useTranslation } from "@/i18n";
import type { TaskItem } from "@/modules/tasks/types/tasks.types";
import { ACTIVITY_STATUS_LABELS } from "@/modules/tasks/utils/schedule";
import { useTheme } from "@/theme/tokens";

export interface TaskRowCardProps {
  task: TaskItem;
  onToggle: (id: string) => void;
  onPress?: (task: TaskItem) => void;
}

export const TaskRowCard: React.FC<TaskRowCardProps> = React.memo(
  function TaskRowCard({ task, onToggle, onPress }) {
  const theme = useTheme();
  const { isRTL } = useTranslation();

  const category =
    SYSTEM_CATEGORIES.find((c) => c.id === task.category) ?? SYSTEM_CATEGORIES[5];

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onToggle(task.id);
  };

  const statusSuffix =
    task.status === "not_recorded"
      ? task.timeLabel
      : `${ACTIVITY_STATUS_LABELS[task.status]} · ${task.timeLabel}`;

  const priorityColor =
    task.priority === "high"
      ? theme.error
      : task.priority === "medium"
        ? theme.warning
        : theme.textMuted;

  return (
    <GlassCard
      padding={14}
      onPress={onPress ? () => onPress(task) : handleToggle}
    >
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
          <View
            style={[
              styles.titleRow,
              { flexDirection: isRTL ? "row-reverse" : "row" },
            ]}
          >
            <ThemedText
              variant="cardTitle"
              style={[
                styles.titleText,
                task.completed && {
                  textDecorationLine: "line-through",
                  opacity: 0.6,
                },
              ]}
              numberOfLines={1}
            >
              {task.title}
            </ThemedText>
            {task.reminderEnabled ? (
              <AppIcon name="bell" size={12} color={theme.primary} />
            ) : null}
          </View>

          <View
            style={[
              styles.metaRow,
              { flexDirection: isRTL ? "row-reverse" : "row" },
            ]}
          >
            <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
            <ThemedText variant="caption" color="secondary" numberOfLines={1}>
              {statusSuffix}
              {task.repeat !== "once" ? ` · ${task.repeat}` : ""}
            </ThemedText>
          </View>
        </View>

        <Pressable
          onPress={handleToggle}
          hitSlop={10}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.completed }}
          style={[
            styles.checkCircle,
            {
              borderColor: task.completed
                ? theme.success
                : task.status === "postponed" || task.status === "skipped"
                  ? theme.warning
                  : theme.border,
              backgroundColor: task.completed ? theme.success : "transparent",
            },
          ]}
        >
          {task.completed ? (
            <AppIcon name="check" size={14} color="#FFFFFF" strokeWidth={2.5} />
          ) : task.status === "postponed" ? (
            <AppIcon name="clock" size={13} color={theme.warning} />
          ) : task.status === "skipped" ? (
            <AppIcon name="skip-forward" size={13} color={theme.warning} />
          ) : null}
        </Pressable>
      </View>
    </GlassCard>
  );
});

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
  titleRow: {
    alignItems: "center",
    gap: 6,
  },
  titleText: {
    flexShrink: 1,
  },
  metaRow: {
    alignItems: "center",
    gap: 6,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.75,
    alignItems: "center",
    justifyContent: "center",
  },
});
