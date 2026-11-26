import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ScreenWrapper } from "@/components/common/ScreenWrapper";
import { StatePlaceholder } from "@/components/common/StatePlaceholder";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedText } from "@/components/themed/ThemedText";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { HabitCard } from "@/components/ui/HabitCard";
import { RoutineBlockCard } from "@/components/ui/RoutineBlockCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TaskRowCard } from "@/components/ui/TaskRowCard";
import { CategorySlug, SYSTEM_CATEGORIES } from "@/constants/categories";
import { getTodayIso } from "@/core/utils/date";
import { useTranslation } from "@/i18n";
import {
  useRoutineQuery,
  useSetRoutineStatusMutation,
} from "@/modules/routine/hooks/useRoutine";
import {
  useDeleteWorkoutMutation,
  useWorkoutsQuery,
} from "@/modules/workouts/hooks/useWorkouts";
import { WORKOUT_TYPE_META } from "@/modules/workouts/types/workout.types";
import { dialog } from "@/shared/dialog/DialogContext";
import { toast } from "@/shared/toast/ToastContext";
import { useCompanionStore } from "@/store/useCompanionStore";
import { useTheme } from "@/theme/tokens";
import {
  useHabitsQuery,
  useLogUrgeMutation,
  useTasksQuery,
  useToggleHabitMutation,
  useToggleTaskMutation,
} from "../hooks/useTasksAndHabits";

type HubMode = "tasks" | "habits" | "routine" | "workouts";

export const TasksAndHabitsScreen: React.FC = () => {
  const theme = useTheme();
  const { t, isRTL } = useTranslation();
  const selectedDate = useCompanionStore((s) => s.selectedDate);

  const [mode, setMode] = useState<HubMode>("tasks");
  const [selectedCat, setSelectedCat] = useState<"all" | CategorySlug>("all");

  const tasksQuery = useTasksQuery(selectedDate);
  const habitsQuery = useHabitsQuery();
  const routineQuery = useRoutineQuery(getTodayIso());
  const workoutsQuery = useWorkoutsQuery();

  const toggleTaskMutation = useToggleTaskMutation();
  const toggleHabitMutation = useToggleHabitMutation();
  const logUrgeMutation = useLogUrgeMutation();
  const setRoutineStatusMutation = useSetRoutineStatusMutation();
  const deleteWorkoutMutation = useDeleteWorkoutMutation();

  const tasks = tasksQuery.data ?? [];
  const habits = habitsQuery.data ?? [];
  const routines = routineQuery.data ?? [];
  const workouts = workoutsQuery.data ?? [];

  const filteredTasks =
    selectedCat === "all"
      ? tasks
      : tasks.filter((item) => item.category === selectedCat);

  const positiveHabits = habits.filter((h) => h.polarity === "positive");
  const negativeHabits = habits.filter((h) => h.polarity === "negative");

  const handleLogUrge = (id: string) => {
    logUrgeMutation.mutate(
      { id, triggerTag: "stress" },
      {
        onSuccess: () => {
          toast.info(
            "Urge paused and logged. Take a breath or try a 2-minute walk.",
          );
        },
      },
    );
  };

  const handleDeleteWorkout = async (id: string, title: string) => {
    const ok = await dialog.confirm({
      title: "Delete Workout?",
      message: `Remove "${title}" from your activity history?`,
    });
    if (!ok) return;
    await deleteWorkoutMutation.mutateAsync(id);
    toast.info("Workout removed");
  };

  const ctaTitle =
    mode === "tasks"
      ? t("tasks.addNewTask", "Add Task")
      : mode === "habits"
        ? t("habits.addNewHabit", "New Habit")
        : mode === "routine"
          ? "Add Block"
          : "Log Workout";

  const handleCreate = () => {
    if (mode === "tasks") router.push("/(modals)/task-editor");
    else if (mode === "habits") router.push("/(modals)/habit-editor");
    else if (mode === "routine") router.push("/(modals)/routine-editor");
    else router.push("/(modals)/workout-editor");
  };

  return (
    <ScreenWrapper>
      <View
        style={[
          styles.topRow,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <ThemedText variant="h1">Lifestyle Hub</ThemedText>
        <Button
          title={ctaTitle}
          size="sm"
          leftIcon={<AppIcon name="plus" size={15} color="#FFFFFF" />}
          onPress={handleCreate}
        />
      </View>

      <SegmentedControl<HubMode>
        value={mode}
        onChange={setMode}
        options={[
          { value: "tasks", label: t("tasks.segmentTasks", "Tasks") },
          { value: "habits", label: t("tasks.segmentHabits", "Habits") },
          { value: "routine", label: "Routine" },
          { value: "workouts", label: "Workouts" },
        ]}
      />

      {mode === "tasks" ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterRow}
          >
            <Pressable
              onPress={() => setSelectedCat("all")}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    selectedCat === "all" ? theme.primary : theme.card,
                  borderColor:
                    selectedCat === "all" ? theme.primary : theme.cardBorder,
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
                      backgroundColor: active ? theme.primary : theme.card,
                      borderColor: active ? theme.primary : theme.cardBorder,
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
                  onToggle={(id) =>
                    toggleTaskMutation.mutate({ id, dateIso: selectedDate })
                  }
                  onPress={(item) =>
                    router.push(`/(modals)/task-editor?id=${item.id}`)
                  }
                />
              ))}
            </View>
          )}
        </>
      ) : mode === "habits" ? (
        habitsQuery.isLoading ? (
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
                onPress={(h) =>
                  router.push({
                    pathname: "/(modals)/habit-detail/[id]",
                    params: { id: h.id },
                  })
                }
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
                onPress={(h) =>
                  router.push({
                    pathname: "/(modals)/habit-detail/[id]",
                    params: { id: h.id },
                  })
                }
                onLogUrge={handleLogUrge}
              />
            ))}
          </View>
        )
      ) : mode === "routine" ? (
        routineQuery.isLoading ? (
          <StatePlaceholder variant="loading" />
        ) : routines.length === 0 ? (
          <StatePlaceholder
            variant="empty"
            icon="clock"
            title="No routine blocks yet"
            subtitle="Design your ideal day from wake-up to restful sleep."
            actionLabel="Add Block"
            onAction={() => router.push("/(modals)/routine-editor")}
          />
        ) : (
          <View style={styles.listGap}>
            <ThemedText variant="caption" color="secondary">
              Tap any block to customize time, days, or status.
            </ThemedText>
            {routines.map((block) => (
              <RoutineBlockCard
                key={block.id}
                block={block}
                onCompleteToggle={(b) =>
                  setRoutineStatusMutation.mutate({
                    id: b.id,
                    dateIso: getTodayIso(),
                    status:
                      b.todayStatus === "completed" ? "not_recorded" : "completed",
                  })
                }
                onPress={(b) => router.push(`/(modals)/routine-editor?id=${b.id}`)}
              />
            ))}
          </View>
        )
      ) : workoutsQuery.isLoading ? (
        <StatePlaceholder variant="loading" />
      ) : workouts.length === 0 ? (
        <StatePlaceholder
          variant="empty"
          icon="dumbbell"
          title="No workouts logged yet"
          subtitle="Track strength, cardio, mobility, or sports sessions with sets and effort."
          actionLabel="Log Workout"
          onAction={() => router.push("/(modals)/workout-editor")}
        />
      ) : (
        <View style={styles.listGap}>
          <GlassCard variant="glass" elevated padding={16}>
            <View style={styles.workoutSummaryRow}>
              <View style={styles.workoutStat}>
                <ThemedText variant="h1" color="primary">
                  {workouts.length}
                </ThemedText>
                <ThemedText variant="caption" color="secondary">
                  Sessions
                </ThemedText>
              </View>
              <View style={styles.workoutStat}>
                <ThemedText variant="h1">
                  {workouts.reduce((sum, w) => sum + w.durationMin, 0)}m
                </ThemedText>
                <ThemedText variant="caption" color="secondary">
                  Total Time
                </ThemedText>
              </View>
              <View style={styles.workoutStat}>
                <ThemedText variant="h1">
                  {workouts.reduce((sum, w) => sum + (w.caloriesEst ?? 0), 0)}
                </ThemedText>
                <ThemedText variant="caption" color="secondary">
                  Est. kcal
                </ThemedText>
              </View>
            </View>
          </GlassCard>

          {workouts.map((w) => {
            const meta = WORKOUT_TYPE_META[w.workoutType];
            const dateLabel = w.startedAt.slice(0, 10);
            return (
              <GlassCard key={w.id} padding={14}>
                <View style={styles.workoutCardRow}>
                  <View
                    style={[
                      styles.workoutIcon,
                      { backgroundColor: theme.pillarHealthMuted },
                    ]}
                  >
                    <AppIcon
                      name={meta.icon}
                      size={18}
                      color={theme.pillarHealth}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <ThemedText variant="cardTitle">{w.title}</ThemedText>
                    <ThemedText variant="caption" color="secondary">
                      {meta.label} · {w.durationMin} min
                      {w.perceivedEffort ? ` · RPE ${w.perceivedEffort}/10` : ""} ·{" "}
                      {dateLabel}
                    </ThemedText>
                    {w.exercises.length > 0 ? (
                      <ThemedText variant="micro" color="primary">
                        {w.exercises
                          .map(
                            (e) =>
                              `${e.exerciseName}${e.reps ? ` (${e.reps})` : ""}`,
                          )
                          .join(", ")}
                      </ThemedText>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => handleDeleteWorkout(w.id, w.title)}
                    hitSlop={10}
                  >
                    <AppIcon name="trash" size={16} color={theme.error} />
                  </Pressable>
                </View>
              </GlassCard>
            );
          })}
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
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filterRow: {
    gap: 8,
    paddingVertical: 2,
    alignItems: "center",
  },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listGap: {
    gap: 10,
  },
  workoutSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  workoutStat: {
    alignItems: "center",
    gap: 2,
  },
  workoutCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  workoutIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
