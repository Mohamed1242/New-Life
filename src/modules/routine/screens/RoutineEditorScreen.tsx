import React, { useEffect } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { LifePillar } from "@/constants/categories";
import { ScreenWrapper } from "@/components/common/ScreenWrapper";
import { SimpleHeader } from "@/components/common/SimpleHeader";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedInput } from "@/components/themed/ThemedInput";
import { ThemedText } from "@/components/themed/ThemedText";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { getTodayIso } from "@/core/utils/date";
import type { ActivityStatus } from "@/modules/tasks/types/tasks.types";
import { dialog } from "@/shared/dialog/DialogContext";
import { toast } from "@/shared/toast/ToastContext";
import { useTheme } from "@/theme/tokens";
import {
  useDeleteRoutineMutation,
  useRoutineQuery,
  useSaveRoutineMutation,
  useSetRoutineStatusMutation,
} from "../hooks/useRoutine";
import {
  RoutineBlockFormValues,
  routineBlockSchema,
} from "../schemas/routine.schema";
import type { RoutineBlockType } from "../types/routine.types";

const BLOCK_TYPES: { type: RoutineBlockType; label: string; pillar: LifePillar }[] = [
  { type: "wake_up", label: "Wake Up", pillar: "health" },
  { type: "morning_routine", label: "Morning", pillar: "productivity" },
  { type: "prayer", label: "Prayer", pillar: "spirituality" },
  { type: "work_study", label: "Work / Study", pillar: "productivity" },
  { type: "meals", label: "Meals", pillar: "health" },
  { type: "gym", label: "Gym", pillar: "health" },
  { type: "personal", label: "Personal", pillar: "spirituality" },
  { type: "evening_routine", label: "Evening", pillar: "productivity" },
  { type: "sleep", label: "Sleep", pillar: "health" },
];

const DAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const STATUS_LIST: { value: ActivityStatus; label: string }[] = [
  { value: "completed", label: "Completed" },
  { value: "skipped", label: "Skipped" },
  { value: "postponed", label: "Postponed" },
  { value: "missed", label: "Missed" },
  { value: "not_recorded", label: "Clear" },
];

export const RoutineEditorScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const theme = useTheme();
  const today = getTodayIso();

  const routineQuery = useRoutineQuery(today);
  const saveMutation = useSaveRoutineMutation();
  const deleteMutation = useDeleteRoutineMutation();
  const statusMutation = useSetRoutineStatusMutation();

  const existing = (routineQuery.data ?? []).find((b) => b.id === id);

  const {
    control,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<RoutineBlockFormValues>({
    resolver: zodResolver(routineBlockSchema),
    defaultValues: {
      title: "",
      blockType: "morning_routine",
      pillar: "productivity",
      startTime: "07:00",
      endTime: "07:30",
      days: [0, 1, 2, 3, 4, 5, 6],
      isEnabled: true,
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        title: existing.title,
        blockType: existing.blockType,
        pillar: existing.pillar,
        startTime: existing.startTime,
        endTime: existing.endTime,
        days: existing.days,
        isEnabled: existing.isEnabled,
      });
    }
  }, [existing, reset]);

  const blockType = useWatch({ control, name: "blockType" });
  const pillar = useWatch({ control, name: "pillar" });
  const days = useWatch({ control, name: "days" });

  const toggleDay = (idx: number) => {
    const next = days.includes(idx)
      ? days.filter((d) => d !== idx)
      : [...days, idx].sort((a, b) => a - b);
    setValue("days", next, { shouldValidate: true });
  };

  const onSubmit = (values: RoutineBlockFormValues) => {
    saveMutation.mutate(
      { id, ...values },
      {
        onSuccess: () => {
          toast.success(isEditing ? "Routine block updated" : "Routine block added");
          router.back();
        },
        onError: () => toast.error("Failed to save routine block"),
      },
    );
  };

  const handleDelete = async () => {
    if (!id) return;
    const ok = await dialog.confirm({
      title: "Delete Routine Block?",
      message: "You can add a replacement block anytime.",
      confirmText: "Delete",
      destructive: true,
    });
    if (!ok) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.info("Routine block removed");
        router.back();
      },
    });
  };

  return (
    <ScreenWrapper includeTabBarClearance={false}>
      <SimpleHeader
        title={isEditing ? "Edit Routine Block" : "Add Routine Block"}
        rightSlot={
          isEditing ? (
            <Pressable onPress={handleDelete} hitSlop={8}>
              <AppIcon name="trash" size={18} color={theme.error} />
            </Pressable>
          ) : null
        }
      />

      <GlassCard elevated padding={16} style={styles.cardGap}>
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, value } }) => (
            <ThemedInput
              label="Block Title"
              value={value}
              onChangeText={onChange}
              placeholder="e.g. Morning Walk & Reflection"
              error={errors.title?.message}
            />
          )}
        />
        <View style={styles.timeRow}>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="startTime"
              render={({ field: { onChange, value } }) => (
                <ThemedInput
                  label="Start Time"
                  value={value}
                  onChangeText={onChange}
                  error={errors.startTime?.message}
                />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="endTime"
              render={({ field: { onChange, value } }) => (
                <ThemedInput
                  label="End Time"
                  value={value}
                  onChangeText={onChange}
                  error={errors.endTime?.message}
                />
              )}
            />
          </View>
        </View>
      </GlassCard>

      <GlassCard padding={14} style={styles.cardGap}>
        <ThemedText variant="caption" color="secondary" weight="semiBold">
          Routine Type
        </ThemedText>
        <View style={styles.typeWrap}>
          {BLOCK_TYPES.map((item) => {
            const active = blockType === item.type;
            return (
              <Pressable
                key={item.type}
                onPress={() => {
                  setValue("blockType", item.type);
                  setValue("pillar", item.pillar);
                }}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: active ? theme.primaryMuted : theme.element,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
              >
                <ThemedText
                  variant="caption"
                  color={active ? "primary" : "secondary"}
                  weight="medium"
                >
                  {item.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <ThemedText variant="caption" color="secondary" weight="semiBold">
          Life Pillar
        </ThemedText>
        <SegmentedControl<LifePillar>
          value={pillar}
          onChange={(p) => setValue("pillar", p)}
          options={[
            { value: "spirituality", label: "Spirituality" },
            { value: "health", label: "Health" },
            { value: "productivity", label: "Productivity" },
          ]}
        />

        <ThemedText variant="caption" color="secondary" weight="semiBold">
          Active Days
        </ThemedText>
        <View style={styles.daysRow}>
          {DAY_SHORT.map((lbl, idx) => {
            const active = days.includes(idx);
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

        <View style={styles.switchRow}>
          <ThemedText variant="cardTitle">Enabled in Daily Schedule</ThemedText>
          <Controller
            control={control}
            name="isEnabled"
            render={({ field: { value, onChange } }) => (
              <Switch
                value={value}
                onValueChange={onChange}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            )}
          />
        </View>
      </GlassCard>

      {isEditing && id ? (
        <GlassCard padding={14} style={styles.cardGap}>
          <ThemedText variant="caption" color="secondary" weight="semiBold">
            Today&apos;s Status
          </ThemedText>
          <View style={styles.typeWrap}>
            {STATUS_LIST.map((st) => (
              <Pressable
                key={st.value}
                onPress={() => {
                  statusMutation.mutate(
                    { id, dateIso: today, status: st.value },
                    {
                      onSuccess: () => {
                        toast.info(`Marked ${st.label}`);
                        router.back();
                      },
                    },
                  );
                }}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: theme.element,
                    borderColor: theme.border,
                  },
                ]}
              >
                <ThemedText variant="caption" weight="medium">
                  {st.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </GlassCard>
      ) : null}

      <Button
        title="Save Routine Block"
        variant="gradient"
        size="lg"
        fullWidth
        loading={saveMutation.isPending}
        onPress={handleSubmit(onSubmit)}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  cardGap: { gap: 12 },
  timeRow: { flexDirection: "row", gap: 10 },
  typeWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
  },
  daysRow: { flexDirection: "row", justifyContent: "space-between" },
  dayDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
});
