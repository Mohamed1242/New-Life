import { useMemo } from "react";
import { buildWeekStrip, getTodayIso } from "@/core/utils/date";
import { useTranslation } from "@/i18n";
import { useRoutineQuery } from "@/modules/routine/hooks/useRoutine";
import {
  useHabitsQuery,
  useSetTaskStatusMutation,
  useTasksQuery,
  useToggleTaskMutation,
} from "@/modules/tasks/hooks/useTasksAndHabits";
import type { ActivityStatus } from "@/modules/tasks/types/tasks.types";
import { toast } from "@/shared/toast/ToastContext";
import { useCompanionStore } from "@/store/useCompanionStore";

export function useHomeDashboard() {
  const { t } = useTranslation();
  const userName = useCompanionStore((s) => s.userName);
  const selectedDate = useCompanionStore((s) => s.selectedDate);
  const setSelectedDate = useCompanionStore((s) => s.setSelectedDate);

  const tasksQuery = useTasksQuery(selectedDate);
  const habitsQuery = useHabitsQuery();
  const routineQuery = useRoutineQuery(selectedDate);
  const toggleMutation = useToggleTaskMutation();
  const statusMutation = useSetTaskStatusMutation();

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const habits = useMemo(() => habitsQuery.data ?? [], [habitsQuery.data]);
  const routines = useMemo(
    () => (routineQuery.data ?? []).filter((r) => r.isEnabled),
    [routineQuery.data],
  );

  const completedCount = tasks.filter((item) => item.status === "completed").length;
  const skippedOrPostponedCount = tasks.filter(
    (item) => item.status === "skipped" || item.status === "postponed",
  ).length;
  const totalCount = tasks.length;
  const progressRatio = totalCount > 0 ? completedCount / totalCount : 0;
  const progressPct = Math.round(progressRatio * 100);

  const isCelebrationReached = totalCount > 0 && progressPct >= 80;

  const weekDays = useMemo(() => {
    const activeSet = new Set<string>([getTodayIso()]);
    if (tasks.length > 0) activeSet.add(selectedDate);
    return buildWeekStrip(selectedDate, activeSet);
  }, [selectedDate, tasks.length]);

  const handleToggleTask = (id: string) => {
    const target = tasks.find((item) => item.id === id);
    toggleMutation.mutate(
      { id, dateIso: selectedDate },
      {
        onSuccess: () => {
          if (target && target.status !== "completed") {
            toast.success(
              `Completed "${target.title}"`,
              t("common.undo", "Undo"),
              () => toggleMutation.mutate({ id, dateIso: selectedDate }),
            );
          }
        },
        onError: () => {
          toast.error("Could not update task");
        },
      },
    );
  };

  const handleSetTaskStatus = (id: string, status: ActivityStatus) => {
    statusMutation.mutate(
      { id, dateIso: selectedDate, status },
      {
        onSuccess: () => {
          if (status === "postponed") {
            toast.info("Moved to tomorrow — pacing yourself is healthy.");
          } else if (status === "skipped") {
            toast.info("Marked skipped without penalty.");
          }
        },
      },
    );
  };

  return {
    userName,
    selectedDate,
    setSelectedDate,
    weekDays,
    tasks,
    habits,
    routines,
    completedCount,
    skippedOrPostponedCount,
    totalCount,
    progressRatio,
    progressPct,
    isCelebrationReached,
    isLoading: tasksQuery.isLoading,
    isError: tasksQuery.isError,
    refetch: tasksQuery.refetch,
    handleToggleTask,
    handleSetTaskStatus,
  };
}
