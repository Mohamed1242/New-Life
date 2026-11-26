import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createQueryKeyFactory } from "@/lib/queryClient";
import { tasksDb } from "../db/tasks.db";
import type { CreateHabitInput, CreateTaskInput } from "../types/tasks.types";

export const tasksKeys = createQueryKeyFactory("tasks");
export const habitsKeys = createQueryKeyFactory("habits");

export function useTasksQuery(dateIso?: string) {
  return useQuery({
    queryKey: tasksKeys.list(dateIso ? { dateIso } : undefined),
    queryFn: () => tasksDb.listTasks(dateIso),
  });
}

export function useHabitsQuery() {
  return useQuery({
    queryKey: habitsKeys.list(),
    queryFn: () => tasksDb.listHabits(),
  });
}

export function useCreateTaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => tasksDb.createTask(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tasksKeys.all() });
    },
  });
}

export function useToggleTaskMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksDb.toggleTask(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tasksKeys.all() });
    },
  });
}

export function useCreateHabitMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHabitInput) => tasksDb.createHabit(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: habitsKeys.all() });
    },
  });
}

export function useToggleHabitMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksDb.toggleHabitToday(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: habitsKeys.all() });
    },
  });
}

export function useLogUrgeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksDb.logNegativeUrge(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: habitsKeys.all() });
    },
  });
}
