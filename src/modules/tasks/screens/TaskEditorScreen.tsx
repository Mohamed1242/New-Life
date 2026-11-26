import React, { useEffect } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
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
import { notificationService } from "@/modules/notifications/services/notificationService";
import { dialog } from "@/shared/dialog/DialogContext";
import { toast } from "@/shared/toast/ToastContext";
import { useCompanionStore } from "@/store/useCompanionStore";
import { useTheme } from "@/theme/tokens";
import {
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useSetTaskStatusMutation,
  useTaskDetailQuery,
  useUpdateTaskMutation,
} from "../hooks/useTasksAndHabits";
import { TaskFormValues, taskFormSchema } from "../schemas/task.schema";
import type { ActivityStatus, RepeatRule, TaskPriority } from "../types/tasks.types";

const REPEATS: RepeatRule[] = ["once", "daily", "weekdays", "weekly", "custom"];
const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
const DAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const STATUS_OPTIONS: { status: ActivityStatus; label: string }[] = [
  { status: "completed", label: "Completed" },
  { status: "postponed", label: "Postpone" },
  { status: "skipped", label: "Skip" },
  { status: "missed", label: "Missed" },
  { status: "not_recorded", label: "Clear" },
];

export const TaskEditorScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const theme = useTheme();
  const { t, isRTL } = useTranslation();
  const selectedDate = useCompanionStore((s) => s.selectedDate);

  const detailQuery = useTaskDetailQuery(id);
  const createTaskMutation = useCreateTaskMutation();
  const updateTaskMutation = useUpdateTaskMutation();
  const deleteTaskMutation = useDeleteTaskMutation();
  const setStatusMutation = useSetTaskStatusMutation();

  const {
    control,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      notes: "",
      category: "prayer",
      dateIso: selectedDate,
      timeLabel: "07:00 PM",
      reminderEnabled: true,
      repeat: "daily",
      customDays: [0, 1, 2, 3, 4, 5, 6],
      priority: "medium",
    },
  });

  useEffect(() => {
    if (detailQuery.data) {
      reset({
        title: detailQuery.data.title,
        notes: detailQuery.data.notes,
        category: detailQuery.data.category,
        dateIso: detailQuery.data.dateIso,
        timeLabel: detailQuery.data.timeLabel,
        reminderEnabled: detailQuery.data.reminderEnabled,
        repeat: detailQuery.data.repeat,
        customDays: detailQuery.data.customDays,
        priority: detailQuery.data.priority,
      });
    }
  }, [detailQuery.data, reset]);

  const category = useWatch({ control, name: "category" });
  const repeat = useWatch({ control, name: "repeat" });
  const customDays = useWatch({ control, name: "customDays" });
  const priority = useWatch({ control, name: "priority" });

  const cycleRepeat = () => {
    const idx = REPEATS.indexOf(repeat);
    setValue("repeat", REPEATS[(idx + 1) % REPEATS.length]);
  };

  const cyclePriority = () => {
    const idx = PRIORITIES.indexOf(priority);
    setValue("priority", PRIORITIES[(idx + 1) % PRIORITIES.length]);
  };

  const toggleDay = (dayIdx: number) => {
    const next = customDays.includes(dayIdx)
      ? customDays.filter((d) => d !== dayIdx)
      : [...customDays, dayIdx].sort((a, b) => a - b);
    setValue("customDays", next);
  };

  const onSubmit = (values: TaskFormValues) => {
    if (isEditing && id) {
      updateTaskMutation.mutate(
        { id, ...values },
        {
          onSuccess: () => {
            notificationService
              .rescheduleTaskReminder({
                id,
                title: values.title,
                timeLabel: values.timeLabel,
                repeat: values.repeat,
                reminderEnabled: values.reminderEnabled,
                completed: false,
              })
              .catch(() => {});
            toast.success("Task updated");
            router.back();
          },
          onError: () => toast.error("Failed to update task"),
        },
      );
      return;
    }

    createTaskMutation.mutate(values, {
      onSuccess: (created) => {
        notificationService.rescheduleTaskReminder(created).catch(() => {});
        toast.success(`Added "${values.title}"`);
        router.back();
      },
      onError: () => toast.error("Failed to save task"),
    });
  };

  const handleDelete = async () => {
    if (!id) return;
    const confirmed = await dialog.confirm({
      title: "Delete Task?",
      message: "This removes the task from your schedule.",
      confirmText: "Delete",
      destructive: true,
    });
    if (!confirmed) return;
    deleteTaskMutation.mutate(id, {
      onSuccess: () => {
        notificationService.cancelLocalReminder(`task_${id}`).catch(() => {});
        toast.info("Task deleted");
        router.back();
      },
    });
  };

  return (
    <ScreenWrapper includeTabBarClearance={false}>
      <View
        style={[
          styles.modalHeader,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        {isEditing ? (
          <Pressable
            onPress={handleDelete}
            style={[
              styles.closeBtn,
              { backgroundColor: theme.errorMuted, borderColor: theme.error },
            ]}
          >
            <AppIcon name="trash" size={16} color={theme.error} />
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}
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
        {isEditing ? "Edit Task" : t("tasks.addNewTask", "Add New Task")}
      </ThemedText>

      <GlassCard elevated padding={16} style={styles.cardGap}>
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
        <View style={styles.rowFields}>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="dateIso"
              render={({ field: { onChange, value } }) => (
                <ThemedInput
                  label="Date (YYYY-MM-DD)"
                  value={value}
                  onChangeText={onChange}
                  error={errors.dateIso?.message}
                />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="timeLabel"
              render={({ field: { onChange, value } }) => (
                <ThemedInput
                  label="Time"
                  value={value}
                  onChangeText={onChange}
                  error={errors.timeLabel?.message}
                />
              )}
            />
          </View>
        </View>
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, value } }) => (
            <ThemedInput
              label="Notes (optional)"
              value={value ?? ""}
              onChangeText={onChange}
              placeholder="Helpful context..."
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

        {repeat === "custom" ? (
          <View style={styles.daysRow}>
            {DAY_SHORT.map((lbl, idx) => {
              const active = customDays.includes(idx);
              return (
                <Pressable
                  key={idx}
                  onPress={() => toggleDay(idx)}
                  style={[
                    styles.dayDot,
                    {
                      backgroundColor: active ? theme.primary : theme.element,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    variant="caption"
                    weight="semiBold"
                    style={{ color: active ? "#FFFFFF" : theme.textSecondary }}
                  >
                    {lbl}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        ) : null}

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

      {isEditing && id ? (
        <GlassCard padding={14} style={styles.cardGap}>
          <ThemedText variant="caption" color="secondary" weight="semiBold">
            Update Status for {selectedDate}
          </ThemedText>
          <View style={styles.statusChips}>
            {STATUS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.status}
                onPress={() => {
                  setStatusMutation.mutate(
                    { id, dateIso: selectedDate, status: opt.status },
                    {
                      onSuccess: () => {
                        toast.info(`Marked "${opt.label}"`);
                        router.back();
                      },
                    },
                  );
                }}
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: theme.element,
                    borderColor: theme.border,
                  },
                ]}
              >
                <ThemedText variant="caption" weight="medium">
                  {opt.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </GlassCard>
      ) : null}

      <Button
        title={isEditing ? t("common.save", "Save Changes") : t("tasks.addTaskCta", "Add Task")}
        variant="gradient"
        size="lg"
        fullWidth
        loading={createTaskMutation.isPending || updateTaskMutation.isPending}
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
  cardGap: { gap: 12 },
  rowFields: {
    flexDirection: "row",
    gap: 10,
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
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  dayDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statusChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
  },
});
