import { syncQueueDb } from "@/core/sync/syncQueue";
import { generateUuid } from "@/core/utils/date";
import {
  WORKOUT_TYPE_META,
  type CreateWorkoutInput,
  type ExerciseEntry,
  type WorkoutSession,
} from "../types/workout.types";

const WORKOUTS_KEY = "newlife_web_workouts_v1";

function readAll(): WorkoutSession[] {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(WORKOUTS_KEY);
      if (raw) return JSON.parse(raw) as WorkoutSession[];
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

function writeAll(list: WorkoutSession[]): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(WORKOUTS_KEY, JSON.stringify(list));
    }
  } catch {
    // ignore storage errors
  }
}

export const workoutDb = {
  async listWorkouts(limit = 30): Promise<WorkoutSession[]> {
    return readAll()
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
  },

  async createWorkout(input: CreateWorkoutInput): Promise<WorkoutSession> {
    const now = new Date().toISOString();
    const id = generateUuid();
    const meta = WORKOUT_TYPE_META[input.workoutType];
    const caloriesEst = Math.round(input.durationMin * meta.defaultCaloriesPerMin);
    const title = input.title.trim() || `${meta.label} Session`;
    const notes = input.notes?.trim() ?? "";

    const exercises: ExerciseEntry[] = (input.exercises ?? []).map((ex, i) => ({
      id: generateUuid(),
      workoutId: id,
      exerciseName: ex.exerciseName.trim(),
      setOrder: i + 1,
      reps: ex.reps ?? null,
      weightKg: ex.weightKg ?? null,
      durationSec: ex.durationSec ?? null,
    }));

    const session: WorkoutSession = {
      id,
      title,
      workoutType: input.workoutType,
      startedAt: now,
      durationMin: input.durationMin,
      perceivedEffort: input.perceivedEffort ?? null,
      caloriesEst,
      notes,
      exercises,
    };

    const next = [session, ...readAll()];
    writeAll(next);

    await syncQueueDb.enqueue({
      tableName: "workouts",
      recordId: id,
      operation: "upsert",
      clientUpdatedAt: now,
      payload: {
        id,
        title,
        workout_type: input.workoutType,
        started_at: now,
        duration_min: input.durationMin,
        perceived_effort: input.perceivedEffort ?? null,
        calories_est: caloriesEst,
        notes,
        updated_at: now,
      },
    });

    return session;
  },

  async deleteWorkout(id: string): Promise<void> {
    const now = new Date().toISOString();
    writeAll(readAll().filter((w) => w.id !== id));
    await syncQueueDb.enqueue({
      tableName: "workouts",
      recordId: id,
      operation: "delete",
      clientUpdatedAt: now,
      payload: { id, deleted_at: now, updated_at: now },
    });
  },
};
