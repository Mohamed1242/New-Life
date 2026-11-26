import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workoutDb } from "../db/workoutRepository";
import type { CreateWorkoutInput } from "../types/workout.types";

export const WORKOUT_KEYS = {
  all: ["workouts"] as const,
};

export function useWorkoutsQuery(limit = 30) {
  return useQuery({
    queryKey: WORKOUT_KEYS.all,
    queryFn: () => workoutDb.listWorkouts(limit),
  });
}

export function useCreateWorkoutMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkoutInput) => workoutDb.createWorkout(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WORKOUT_KEYS.all });
    },
  });
}

export function useDeleteWorkoutMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workoutDb.deleteWorkout(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WORKOUT_KEYS.all });
    },
  });
}
