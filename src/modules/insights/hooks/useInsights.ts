import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTodayIso } from "@/core/utils/date";
import { routineDb } from "@/modules/routine/db/routineRepository";
import { tasksDb } from "@/modules/tasks/db/tasksRepository";
import { useHabitsQuery, useTasksQuery } from "@/modules/tasks/hooks/useTasksAndHabits";
import {
  computeRealLifestyleAnalytics,
  InsightsTimeframe,
} from "../services/insights.service";

export function useInsights() {
  const [range, setRange] = useState<InsightsTimeframe>("week");
  const today = getTodayIso();

  const tasksQuery = useTasksQuery(today);
  const habitsQuery = useHabitsQuery();

  const taskLogsQuery = useQuery({
    queryKey: ["analytics", "taskLogs", 30],
    queryFn: () => tasksDb.listTaskLogsRange(30),
  });

  const habitLogsQuery = useQuery({
    queryKey: ["analytics", "habitLogs", 30],
    queryFn: () => tasksDb.listAllHabitLogs(30),
  });

  const routineLogsQuery = useQuery({
    queryKey: ["analytics", "routineLogs", 30],
    queryFn: () => routineDb.listRoutineLogsRange(30),
  });

  const summary = useMemo(
    () =>
      computeRealLifestyleAnalytics({
        timeframe: range,
        todayTasks: tasksQuery.data ?? [],
        taskLogs: taskLogsQuery.data ?? [],
        habits: habitsQuery.data ?? [],
        habitLogs: habitLogsQuery.data ?? [],
        routineLogs: routineLogsQuery.data ?? [],
      }),
    [
      range,
      tasksQuery.data,
      taskLogsQuery.data,
      habitsQuery.data,
      habitLogsQuery.data,
      routineLogsQuery.data,
    ],
  );

  return {
    range,
    setRange,
    summary,
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
    },
  };
}
