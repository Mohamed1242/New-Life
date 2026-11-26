import React, { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ScreenWrapper } from "@/components/common/ScreenWrapper";
import { SimpleHeader } from "@/components/common/SimpleHeader";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedInput } from "@/components/themed/ThemedInput";
import { ThemedText } from "@/components/themed/ThemedText";
import { Button } from "@/components/ui/Button";
import { CategoryTile } from "@/components/ui/CategoryTile";
import { GlassCard } from "@/components/ui/GlassCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SYSTEM_CATEGORIES } from "@/constants/categories";
import { useTranslation } from "@/i18n";
import { dialog } from "@/shared/dialog/DialogContext";
import { toast } from "@/shared/toast/ToastContext";
import { useTheme } from "@/theme/tokens";
import {
  useCreateHabitMutation,
  useDeleteHabitMutation,
  useHabitDetailQuery,
  useUpdateHabitMutation,
} from "../hooks/useTasksAndHabits";
import { HabitFormValues, habitFormSchema } from "../schemas/task.schema";
import type { HabitFrequencyType } from "../types/tasks.types";

const DAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

export const HabitEditorScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const theme = useTheme();
  const { t } = useTranslation();

  const detailQuery = useHabitDetailQuery(id ?? "");
  const createHabitMutation = useCreateHabitMutation();
  const updateHabitMutation = useUpdateHabitMutation();
  const deleteHabitMutation = useDeleteHabitMutation();

  const {
    control,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<HabitFormValues>({
    resolver: zodResolver(habitFormSchema),
    defaultValues: {
      polarity: "positive",
      title: "",
      targetLabel: "Daily • Morning",
      category: "health",
      frequencyType: "daily",
      targetPerWeek: 7,
      customDays: [0, 1, 2, 3, 4, 5, 6],
    },
  });

  useEffect(() => {
    if (detailQuery.data) {
      reset({
        polarity: detailQuery.data.polarity,
        title: detailQuery.data.title,
        targetLabel: detailQuery.data.targetLabel,
        category: detailQuery.data.category,
        frequencyType: detailQuery.data.frequencyType,
        targetPerWeek: detailQuery.data.targetPerWeek,
        customDays: detailQuery.data.customDays,
      });
    }
  }, [detailQuery.data, reset]);

  const polarity = useWatch({ control, name: "polarity" });
  const category = useWatch({ control, name: "category" });
  const frequencyType = useWatch({ control, name: "frequencyType" });
  const customDays = useWatch({ control, name: "customDays" });

  const toggleDay = (dayIdx: number) => {
    const next = customDays.includes(dayIdx)
      ? customDays.filter((d) => d !== dayIdx)
      : [...customDays, dayIdx].sort((a, b) => a - b);
    setValue("customDays", next);
    setValue("targetPerWeek", Math.max(1, next.length));
  };

  const onSubmit = (values: HabitFormValues) => {
    if (isEditing && id) {
      updateHabitMutation.mutate(
        { id, ...values },
        {
          onSuccess: () => {
            toast.success("Habit updated");
            router.back();
          },
          onError: () => toast.error("Failed to update habit"),
        },
      );
      return;
    }

    createHabitMutation.mutate(values, {
      onSuccess: () => {
        toast.success(`Created habit "${values.title}"`);
        router.back();
      },
      onError: () => toast.error("Failed to save habit"),
    });
  };

  const handleDelete = async () => {
    if (!id) return;
    const ok = await dialog.confirm({
      title: "Remove Habit?",
      message: "Your habit will be archived from active tracking.",
      confirmText: "Remove",
      destructive: true,
    });
    if (!ok) return;
    deleteHabitMutation.mutate(id, {
      onSuccess: () => {
        toast.info("Habit removed");
        router.replace("/(tabs)/tasks");
      },
    });
  };

  return (
    <ScreenWrapper includeTabBarClearance={false}>
      <SimpleHeader
        title={isEditing ? "Edit Habit" : t("habits.addNewHabit", "New Habit")}
        rightSlot={
          isEditing ? (
            <Pressable onPress={handleDelete} hitSlop={8}>
              <AppIcon name="trash" size={18} color={theme.error} />
            </Pressable>
          ) : null
        }
      />

      <SegmentedControl
        value={polarity}
        onChange={(v) => setValue("polarity", v)}
        options={[
          { value: "positive", label: "Build Positive" },
          { value: "negative", label: "Reduce Negative" },
        ]}
      />

      <GlassCard elevated padding={16} style={styles.cardGap}>
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <ThemedInput
              label="Habit Name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={
                polarity === "positive"
                  ? "e.g. Drink 2L Water"
                  : "e.g. Excessive social media"
              }
              error={errors.title?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="targetLabel"
          render={({ field: { onChange, onBlur, value } }) => (
            <ThemedInput
              label="Schedule / Context"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="e.g. Daily • After Fajr"
              error={errors.targetLabel?.message}
            />
          )}
        />
      </GlassCard>

      <GlassCard padding={14} style={styles.cardGap}>
        <ThemedText variant="caption" color="secondary" weight="semiBold">
          Frequency Schedule
        </ThemedText>
        <SegmentedControl<HabitFrequencyType>
          value={frequencyType}
          onChange={(v) => {
            setValue("frequencyType", v);
            if (v === "daily") setValue("targetPerWeek", 7);
            else if (v === "weekly") setValue("targetPerWeek", 3);
          }}
          options={[
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
            { value: "custom", label: "Custom" },
          ]}
        />
        {frequencyType === "custom" ? (
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

      <Button
        title={t("common.save", "Save")}
        variant="gradient"
        size="lg"
        fullWidth
        loading={createHabitMutation.isPending || updateHabitMutation.isPending}
        onPress={handleSubmit(onSubmit)}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  cardGap: { gap: 14 },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
