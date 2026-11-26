import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createQueryKeyFactory } from "@/lib/queryClient";
import { tasksDb } from "../db/tasksRepository";
import type {
  ActivityStatus,
  CreateHabitInput,
  CreateTaskInput,
  HabitLogStatus,
  UpdateHabitInput,
  UpdateTaskInput,
} from "../types/tasks.types";

export const tasksKeys = createQueryKeyFactory("tasks");
export const habitsKeys = createQueryKeyFactory("habits");

export function useTasksQuery(dateIso?: string) {
  return useQuery({
    queryKey: tasksKeys.list(dateIso ? { dateIso } : undefined),
    queryFn: () => tasksDb.listTasks(dateIso),
  });
}

export function useTaskDetailQuery(id?: string) {
  return useQuery({
    queryKey: tasksKeys.detail(id ?? "new"),
    queryFn: () => (id ? tasksDb.getTaskById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  });
}

export function useHabitsQuery() {
  return useQuery({
    queryKey: habitsKeys.list(),
    queryFn: () => tasksDb.listHabits(),
  });
}

export function useHabitDetailQuery(id: string) {
  return useQuery({
    queryKey: habitsKeys.detail(id),
    queryFn: () => tasksDb.getHabitById(id),
    enabled: Boolean(id),
  });
}

export function useHabitLogsQuery(habitId: string, days = 30) {
  return useQuery({
    queryKey: [...habitsKeys.detail(habitId), "logs", days] as const,
    queryFn: () => tasksDb.listHabitLogs(habitId, days),
    enabled: Boolean(habitId),
  });
}

export function useCreateTaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => tasksDb.createTask(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: tasksKeys.all() }),
  });
}

export function useUpdateTaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTaskInput) => tasksDb.updateTask(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: tasksKeys.all() }),
  });
}

export function useDeleteTaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksDb.deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: tasksKeys.all() }),
  });
}

export function useSetTaskStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; dateIso: string; status: ActivityStatus }) =>
      tasksDb.setTaskStatus(p.id, p.dateIso, p.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tasksKeys.all() });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useToggleTaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; dateIso?: string } | string) =>
      typeof p === "string"
        ? tasksDb.toggleTask(p)
        : tasksDb.toggleTask(p.id, p.dateIso),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tasksKeys.all() });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useCreateHabitMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHabitInput) => tasksDb.createHabit(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: habitsKeys.all() }),
  });
}

export function useUpdateHabitMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateHabitInput) => tasksDb.updateHabit(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: habitsKeys.all() }),
  });
}

export function useDeleteHabitMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksDb.deleteHabit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: habitsKeys.all() }),
  });
}

export function useSetHabitStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: {
      habitId: string;
      logDate: string;
      status: HabitLogStatus;
      triggerTag?: string;
      note?: string;
    }) =>
      tasksDb.setHabitStatus(
        p.habitId,
        p.logDate,
        p.status,
        p.triggerTag,
        p.note,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: habitsKeys.all() });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useToggleHabitMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksDb.toggleHabitToday(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: habitsKeys.all() });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useLogUrgeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; triggerTag?: string } | string) =>
      typeof p === "string"
        ? tasksDb.logNegativeUrge(p)
        : tasksDb.logNegativeUrge(p.id, p.triggerTag),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: habitsKeys.all() });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useLogOccurrenceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; triggerTag?: string }) =>
      tasksDb.logNegativeOccurrence(p.id, p.triggerTag),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: habitsKeys.all() });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useRecoverStreakMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { habitId: string; recoveryDateIso: string }) =>
      tasksDb.recoverHabitStreak(p.habitId, p.recoveryDateIso),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: habitsKeys.all() });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}
