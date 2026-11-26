export type WorkoutType = "strength" | "cardio" | "mobility" | "sports";

export interface ExerciseSetInput {
  exerciseName: string;
  reps?: number | null;
  weightKg?: number | null;
  durationSec?: number | null;
}

export interface ExerciseEntry extends ExerciseSetInput {
  id: string;
  workoutId: string;
  setOrder: number;
}

export interface WorkoutSession {
  id: string;
  title: string;
  workoutType: WorkoutType;
  startedAt: string;
  durationMin: number;
  perceivedEffort: number | null;
  caloriesEst: number | null;
  notes: string;
  exercises: ExerciseEntry[];
}

export interface CreateWorkoutInput {
  title: string;
  workoutType: WorkoutType;
  durationMin: number;
  perceivedEffort?: number | null;
  notes?: string;
  exercises?: ExerciseSetInput[];
}

export const WORKOUT_TYPE_META: Record<
  WorkoutType,
  { label: string; icon: string; defaultCaloriesPerMin: number }
> = {
  strength: { label: "Strength", icon: "dumbbell", defaultCaloriesPerMin: 6 },
  cardio: { label: "Cardio", icon: "activity", defaultCaloriesPerMin: 9 },
  mobility: { label: "Mobility", icon: "heart", defaultCaloriesPerMin: 4 },
  sports: { label: "Sports", icon: "flame", defaultCaloriesPerMin: 8 },
};
