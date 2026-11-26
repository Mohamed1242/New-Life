import { useMemo } from "react";
import { buildWeekStrip, getTodayIso } from "@/core/utils/date";
import { useTranslation } from "@/i18n";
import { useTasksQuery, useToggleTaskMutation } from "@/modules/tasks/hooks/useTasksAndHabits";
import { toast } from "@/shared/toast/ToastContext";
import { useCompanionStore } from "@/store/useCompanionStore";

export function useHomeDashboard() {
  const { t } = useTranslation();
  const userName = useCompanionStore((s) => s.userName);
  const selectedDate = useCompanionStore((s) => s.selectedDate);
  const setSelectedDate = useCompanionStore((s) => s.setSelectedDate);

  const tasksQuery = useTasksQuery(selectedDate);
  const toggleMutation = useToggleTaskMutation();

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const completedCount = tasks.filter((item) => item.completed).length;
  const totalCount = tasks.length;
  const progressRatio = totalCount > 0 ? completedCount / totalCount : 0;
  const progressPct = Math.round(progressRatio * 100);

  const weekDays = useMemo(() => {
    const activeSet = new Set<string>([getTodayIso()]);
    if (tasks.length > 0) activeSet.add(selectedDate);
    return buildWeekStrip(selectedDate, activeSet);
  }, [selectedDate, tasks.length]);

  const handleToggleTask = (id: string) => {
    const target = tasks.find((item) => item.id === id);
    toggleMutation.mutate(id, {
      onSuccess: () => {
        if (target && !target.completed) {
          toast.success(
            `Completed "${target.title}"`,
            t("common.undo", "Undo"),
            () => toggleMutation.mutate(id),
          );
        }
      },
      onError: () => {
        toast.error("Could not update task");
      },
    });
  };

  return {
    userName,
    selectedDate,
    setSelectedDate,
    weekDays,
    tasks,
    completedCount,
    totalCount,
    progressRatio,
    progressPct,
    isLoading: tasksQuery.isLoading,
    isError: tasksQuery.isError,
    refetch: tasksQuery.refetch,
    handleToggleTask,
  };
}
