import React from "react";
import { StyleSheet, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ScreenWrapper } from "@/components/common/ScreenWrapper";
import { SimpleHeader } from "@/components/common/SimpleHeader";
import { ThemedInput } from "@/components/themed/ThemedInput";
import { Button } from "@/components/ui/Button";
import { CategoryTile } from "@/components/ui/CategoryTile";
import { GlassCard } from "@/components/ui/GlassCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SYSTEM_CATEGORIES } from "@/constants/categories";
import { useTranslation } from "@/i18n";
import { toast } from "@/shared/toast/ToastContext";
import { useCreateHabitMutation } from "../hooks/useTasksAndHabits";
import { HabitFormValues, habitFormSchema } from "../schemas/task.schema";

export const HabitEditorScreen: React.FC = () => {
  const { t } = useTranslation();
  const createHabitMutation = useCreateHabitMutation();

  const {
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<HabitFormValues>({
    resolver: zodResolver(habitFormSchema),
    defaultValues: {
      polarity: "positive",
      title: "",
      targetLabel: "Daily • Morning",
      category: "health",
    },
  });

  const polarity = useWatch({ control, name: "polarity" });
  const category = useWatch({ control, name: "category" });

  const onSubmit = (values: HabitFormValues) => {
    createHabitMutation.mutate(values, {
      onSuccess: () => {
        toast.success(`Created habit "${values.title}"`);
        router.back();
      },
      onError: () => {
        toast.error("Failed to save habit");
      },
    });
  };

  return (
    <ScreenWrapper includeTabBarClearance={false}>
      <SimpleHeader title={t("habits.addNewHabit", "New Habit")} />

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
                  : "e.g. Late-night phone scrolling"
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
        loading={createHabitMutation.isPending}
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
});
