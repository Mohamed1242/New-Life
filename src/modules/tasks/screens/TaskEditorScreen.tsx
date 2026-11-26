import React from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ScreenWrapper } from "@/components/common/ScreenWrapper";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedInput } from "@/components/themed/ThemedInput";
import { ThemedText } from "@/components/themed/ThemedText";
import { Button } from "@/components/ui/Button";
import { CategoryTile } from "@/components/ui/CategoryTile";
import { GlassCard } from "@/components/ui/GlassCard";
import { SYSTEM_CATEGORIES } from "@/constants/categories";
import { useTranslation } from "@/i18n";
import { toast } from "@/shared/toast/ToastContext";
import { useCompanionStore } from "@/store/useCompanionStore";
import { useTheme } from "@/theme/tokens";
import { useCreateTaskMutation } from "../hooks/useTasksAndHabits";
import { TaskFormValues, taskFormSchema } from "../schemas/task.schema";
import type { RepeatRule, TaskPriority } from "../types/tasks.types";

const REPEATS: RepeatRule[] = ["once", "daily", "weekdays", "weekly"];
const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];

export const TaskEditorScreen: React.FC = () => {
  const theme = useTheme();
  const { t, isRTL } = useTranslation();
  const selectedDate = useCompanionStore((s) => s.selectedDate);
  const createTaskMutation = useCreateTaskMutation();

  const {
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      category: "prayer",
      timeLabel: "07:00 PM",
      reminderEnabled: true,
      repeat: "daily",
      priority: "medium",
    },
  });

  const category = useWatch({ control, name: "category" });
  const repeat = useWatch({ control, name: "repeat" });
  const priority = useWatch({ control, name: "priority" });

  const cycleRepeat = () => {
    const idx = REPEATS.indexOf(repeat);
    setValue("repeat", REPEATS[(idx + 1) % REPEATS.length]);
  };

  const cyclePriority = () => {
    const idx = PRIORITIES.indexOf(priority);
    setValue("priority", PRIORITIES[(idx + 1) % PRIORITIES.length]);
  };

  const onSubmit = (values: TaskFormValues) => {
    createTaskMutation.mutate(
      { ...values, dateIso: selectedDate },
      {
        onSuccess: () => {
          toast.success(`Added "${values.title}"`);
          router.back();
        },
        onError: () => {
          toast.error("Failed to save task");
        },
      },
    );
  };

  return (
    <ScreenWrapper includeTabBarClearance={false}>
      <View
        style={[
          styles.modalHeader,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <View style={styles.placeholder} />
        <View style={[styles.badge, { backgroundColor: theme.primary }]}>
          <AppIcon name="check" size={20} color="#FFFFFF" strokeWidth={2.5} />
        </View>
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.closeBtn,
            {
              backgroundColor: theme.glassSurface,
              borderColor: theme.glassBorder,
            },
          ]}
        >
          <AppIcon name="x" size={18} color={theme.text} />
        </Pressable>
      </View>

      <ThemedText variant="h1" center>
        {t("tasks.addNewTask", "Add New Task")}
      </ThemedText>

      <GlassCard elevated padding={16}>
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <ThemedInput
              label={t("tasks.taskTitle", "Task Title")}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={t("tasks.taskPlaceholder", "e.g. Read 10 pages")}
              error={errors.title?.message}
            />
          )}
        />
      </GlassCard>

      <View style={styles.catGrid}>
        {SYSTEM_CATEGORIES.map((cat) => (
          <CategoryTile
            key={cat.id}
            category={cat}
            selected={category === cat.id}
            onPress={() => setValue("category", cat.id)}
          />
        ))}
      </View>

      <GlassCard padding={6}>
        <View
          style={[
            styles.optionRow,
            {
              flexDirection: isRTL ? "row-reverse" : "row",
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <View style={[styles.optIcon, { backgroundColor: theme.primaryMuted }]}>
            <AppIcon name="bell" size={16} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant="cardTitle">
              {t("tasks.reminder", "Reminder")}
            </ThemedText>
            <ThemedText variant="caption" color="secondary">
              {t("tasks.reminderSub", "Get gentle notification")}
            </ThemedText>
          </View>
          <Controller
            control={control}
            name="reminderEnabled"
            render={({ field: { value, onChange } }) => (
              <Switch
                value={value}
                onValueChange={onChange}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            )}
          />
        </View>

        <Pressable
          onPress={cycleRepeat}
          style={[
            styles.optionRow,
            {
              flexDirection: isRTL ? "row-reverse" : "row",
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <View style={[styles.optIcon, { backgroundColor: theme.element }]}>
            <AppIcon name="repeat" size={16} color={theme.textSecondary} />
          </View>
          <ThemedText variant="cardTitle" style={{ flex: 1 }}>
            {t("tasks.repeat", "Repeat")}
          </ThemedText>
          <ThemedText variant="bodyMedium" color="secondary">
            {repeat.charAt(0).toUpperCase() + repeat.slice(1)}
          </ThemedText>
          <AppIcon
            name={isRTL ? "chevron-left" : "chevron-right"}
            size={16}
            color={theme.textMuted}
          />
        </Pressable>

        <Pressable
          onPress={cyclePriority}
          style={[
            styles.optionRow,
            { flexDirection: isRTL ? "row-reverse" : "row" },
          ]}
        >
          <View style={[styles.optIcon, { backgroundColor: theme.element }]}>
            <AppIcon name="flag" size={16} color={theme.textSecondary} />
          </View>
          <ThemedText variant="cardTitle" style={{ flex: 1 }}>
            {t("tasks.priority", "Priority")}
          </ThemedText>
          <ThemedText variant="bodyMedium" color="secondary">
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </ThemedText>
          <AppIcon
            name={isRTL ? "chevron-left" : "chevron-right"}
            size={16}
            color={theme.textMuted}
          />
        </Pressable>
      </GlassCard>

      <Button
        title={t("tasks.addTaskCta", "Add Task")}
        variant="gradient"
        size="lg"
        fullWidth
        loading={createTaskMutation.isPending}
        onPress={handleSubmit(onSubmit)}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  modalHeader: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  placeholder: { width: 38 },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  optionRow: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  optIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
});
