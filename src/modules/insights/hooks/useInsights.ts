import { useMemo, useState } from "react";
import { useHabitsQuery, useTasksQuery } from "@/modules/tasks/hooks/useTasksAndHabits";
import {
  computeInsightsSummary,
  InsightsTimeframe,
} from "../services/insights.service";

export function useInsights() {
  const [range, setRange] = useState<InsightsTimeframe>("week");
  const tasksQuery = useTasksQuery();
  const habitsQuery = useHabitsQuery();

  const summary = useMemo(
    () =>
      computeInsightsSummary(
        range,
        tasksQuery.data ?? [],
        habitsQuery.data ?? [],
      ),
    [range, tasksQuery.data, habitsQuery.data],
  );

  return {
    range,
    setRange,
    summary,
    isLoading: tasksQuery.isLoading || habitsQuery.isLoading,
    isError: tasksQuery.isError || habitsQuery.isError,
    refetch: () => {
      tasksQuery.refetch();
      habitsQuery.refetch();
    },
  };
}
