import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ScreenWrapper } from "@/components/common/ScreenWrapper";
import { StatePlaceholder } from "@/components/common/StatePlaceholder";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedText } from "@/components/themed/ThemedText";
import { Button } from "@/components/ui/Button";
import { HabitCard } from "@/components/ui/HabitCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TaskRowCard } from "@/components/ui/TaskRowCard";
import { CategorySlug, SYSTEM_CATEGORIES } from "@/constants/categories";
import { useTranslation } from "@/i18n";
import { toast } from "@/shared/toast/ToastContext";
import { useTheme } from "@/theme/tokens";
import {
  useHabitsQuery,
  useLogUrgeMutation,
  useTasksQuery,
  useToggleHabitMutation,
  useToggleTaskMutation,
} from "../hooks/useTasksAndHabits";

export const TasksAndHabitsScreen: React.FC = () => {
  const theme = useTheme();
  const { t, isRTL } = useTranslation();

  const [mode, setMode] = useState<"tasks" | "habits">("tasks");
  const [selectedCat, setSelectedCat] = useState<"all" | CategorySlug>("all");

  const tasksQuery = useTasksQuery();
  const habitsQuery = useHabitsQuery();
  const toggleTaskMutation = useToggleTaskMutation();
  const toggleHabitMutation = useToggleHabitMutation();
  const logUrgeMutation = useLogUrgeMutation();

  const tasks = tasksQuery.data ?? [];
  const habits = habitsQuery.data ?? [];

  const filteredTasks =
    selectedCat === "all"
      ? tasks
      : tasks.filter((item) => item.category === selectedCat);

  const positiveHabits = habits.filter((h) => h.polarity === "positive");
  const negativeHabits = habits.filter((h) => h.polarity === "negative");

  const handleLogUrge = (id: string) => {
    logUrgeMutation.mutate(id, {
      onSuccess: () => {
        toast.info("Urge logged. Try a 2-minute walk or glass of water to reset.");
      },
    });
  };

  return (
    <ScreenWrapper>
      <View
        style={[
          styles.topRow,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <ThemedText variant="h1">{t("tasks.title", "Tasks & Habits")}</ThemedText>
        <Button
          title={
            mode === "tasks"
              ? t("tasks.addNewTask", "Add Task")
              : t("habits.addNewHabit", "New Habit")
          }
          size="sm"
          leftIcon={<AppIcon name="plus" size={15} color="#FFFFFF" />}
          onPress={() =>
            router.push(
              mode === "tasks"
                ? "/(modals)/task-editor"
                : "/(modals)/habit-editor",
            )
          }
        />
      </View>

      <SegmentedControl
        value={mode}
        onChange={setMode}
        options={[
          { value: "tasks", label: t("tasks.segmentTasks", "Tasks") },
          { value: "habits", label: t("tasks.segmentHabits", "Habits") },
        ]}
      />

      {mode === "tasks" ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <Pressable
              onPress={() => setSelectedCat("all")}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    selectedCat === "all" ? theme.primary : theme.glassSurface,
                  borderColor:
                    selectedCat === "all" ? theme.primary : theme.glassBorder,
                },
              ]}
            >
              <ThemedText
                variant="caption"
                weight="semiBold"
                style={{
                  color: selectedCat === "all" ? "#FFFFFF" : theme.textSecondary,
                }}
              >
                All
              </ThemedText>
            </Pressable>
            {SYSTEM_CATEGORIES.filter((c) => c.id !== "custom").map((cat) => {
              const active = selectedCat === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCat(cat.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? theme.primary : theme.glassSurface,
                      borderColor: active ? theme.primary : theme.glassBorder,
                    },
                  ]}
                >
                  <ThemedText
                    variant="caption"
                    weight="semiBold"
                    style={{
                      color: active ? "#FFFFFF" : theme.textSecondary,
                    }}
                  >
                    {t(cat.labelKey, cat.defaultLabel)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          {tasksQuery.isLoading ? (
            <StatePlaceholder variant="loading" />
          ) : tasksQuery.isError ? (
            <StatePlaceholder
              variant="error"
              actionLabel={t("common.retry", "Retry")}
              onAction={() => tasksQuery.refetch()}
            />
          ) : filteredTasks.length === 0 ? (
            <StatePlaceholder
              variant="empty"
              icon="inbox"
              title={t("tasks.emptyTitle", "Your day is open")}
              subtitle={t(
                "tasks.emptySubtitle",
                "Add one meaningful priority or let your assistant help plan.",
              )}
              actionLabel={t("tasks.addNewTask", "Add New Task")}
              onAction={() => router.push("/(modals)/task-editor")}
            />
          ) : (
            <View style={styles.listGap}>
              {filteredTasks.map((task) => (
                <TaskRowCard
                  key={task.id}
                  task={task}
                  onToggle={(id) => toggleTaskMutation.mutate(id)}
                />
              ))}
            </View>
          )}
        </>
      ) : habitsQuery.isLoading ? (
        <StatePlaceholder variant="loading" />
      ) : habitsQuery.isError ? (
        <StatePlaceholder
          variant="error"
          actionLabel={t("common.retry", "Retry")}
          onAction={() => habitsQuery.refetch()}
        />
      ) : habits.length === 0 ? (
        <StatePlaceholder
          variant="empty"
          icon="sparkles"
          title="No habits tracked yet"
          subtitle="Start with one small positive habit or one habit you want to reduce."
          actionLabel={t("habits.addNewHabit", "New Habit")}
          onAction={() => router.push("/(modals)/habit-editor")}
        />
      ) : (
        <View style={styles.listGap}>
          <ThemedText variant="h2">
            {t("habits.positiveTitle", "Positive Habits")}
          </ThemedText>
          {positiveHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onToggle={(id) => toggleHabitMutation.mutate(id)}
            />
          ))}

          <ThemedText variant="h2" style={{ marginTop: 8 }}>
            {t("habits.negativeTitle", "Habits to Reduce")}
          </ThemedText>
          {negativeHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onToggle={(id) => toggleHabitMutation.mutate(id)}
              onLogUrge={handleLogUrge}
            />
          ))}
        </View>
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  topRow: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterRow: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
  },
  listGap: {
    gap: 10,
  },
});
