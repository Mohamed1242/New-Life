import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTodayIso } from "@/core/utils/date";
import { usePrayerConsistency } from "@/modules/prayer/hooks/usePrayer";
import { useChallengesQuery } from "@/modules/routine/hooks/useRoutine";
import { routineDb } from "@/modules/routine/db/routineRepository";
import { tasksDb } from "@/modules/tasks/db/tasksRepository";
import {
  useHabitsQuery,
  useTasksQuery,
} from "@/modules/tasks/hooks/useTasksAndHabits";
import { useCompanionStore } from "@/store/useCompanionStore";
import {
  getCurrentWeekStartIso,
  reflectionDb,
  type ReflectionMood,
} from "../db/reflectionRepository";
import {
  computeRealLifestyleAnalytics,
  type InsightsTimeframe,
} from "../services/insights.service";

export function useInsights() {
  const [range, setRange] = useState<InsightsTimeframe>("week");
  const today = getTodayIso();
  const selectedGoals = useCompanionStore((s) => s.selectedGoals);
  const qc = useQueryClient();

  const lookbackDays = range === "year" ? 90 : 30;

  const tasksQuery = useTasksQuery(today);
  const habitsQuery = useHabitsQuery();
  const challengesQuery = useChallengesQuery();
  const prayerStatsQuery = usePrayerConsistency(today, 7);

  const taskLogsQuery = useQuery({
    queryKey: ["analytics", "taskLogs", lookbackDays],
    queryFn: () => tasksDb.listTaskLogsRange(lookbackDays),
  });

  const habitLogsQuery = useQuery({
    queryKey: ["analytics", "habitLogs", lookbackDays],
    queryFn: () => tasksDb.listAllHabitLogs(lookbackDays),
  });

  const routineLogsQuery = useQuery({
    queryKey: ["analytics", "routineLogs", lookbackDays],
    queryFn: () => routineDb.listRoutineLogsRange(lookbackDays),
  });

  const reflectionsQuery = useQuery({
    queryKey: ["analytics", "reflections"],
    queryFn: () => reflectionDb.getLatest(4),
  });

  const saveReflectionMutation = useMutation({
    mutationFn: (input: {
      energyMood: ReflectionMood;
      highlight: string;
      adjustment: string;
    }) =>
      reflectionDb.saveReflection({
        weekStartIso: getCurrentWeekStartIso(today),
        ...input,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analytics", "reflections"] });
    },
  });

  const summary = useMemo(
    () =>
      computeRealLifestyleAnalytics({
        timeframe: range,
        todayIso: today,
        todayTasks: tasksQuery.data ?? [],
        taskLogs: taskLogsQuery.data ?? [],
        habits: habitsQuery.data ?? [],
        habitLogs: habitLogsQuery.data ?? [],
        routineLogs: routineLogsQuery.data ?? [],
        prayerStats: prayerStatsQuery.data,
        challenges: challengesQuery.data ?? [],
        selectedGoalsCount: selectedGoals.length,
      }),
    [
      range,
      today,
      tasksQuery.data,
      taskLogsQuery.data,
      habitsQuery.data,
      habitLogsQuery.data,
      routineLogsQuery.data,
      prayerStatsQuery.data,
      challengesQuery.data,
      selectedGoals.length,
    ],
  );

  return {
    range,
    setRange,
    summary,
    reflections: reflectionsQuery.data ?? [],
    currentWeekStartIso: getCurrentWeekStartIso(today),
    saveReflectionMutation,
    isLoading:
      tasksQuery.isLoading ||
      habitsQuery.isLoading ||
      taskLogsQuery.isLoading ||
      habitLogsQuery.isLoading,
    isError: tasksQuery.isError || habitsQuery.isError,
    refetch: () => {
      tasksQuery.refetch();
      habitsQuery.refetch();
      taskLogsQuery.refetch();
      habitLogsQuery.refetch();
      routineLogsQuery.refetch();
      prayerStatsQuery.refetch();
    },
  };
}
