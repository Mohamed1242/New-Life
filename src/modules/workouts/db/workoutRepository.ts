import { getDatabase } from "@/core/db";
import { syncQueueDb } from "@/core/sync/syncQueue";
import { generateUuid } from "@/core/utils/date";
import {
  WORKOUT_TYPE_META,
  type CreateWorkoutInput,
  type ExerciseEntry,
  type WorkoutSession,
  type WorkoutType,
} from "../types/workout.types";

interface WorkoutRow {
  id: string;
  title: string;
  workout_type: WorkoutType;
  started_at: string;
  duration_min: number;
  perceived_effort: number | null;
  calories_est: number | null;
  notes: string;
}

interface ExerciseRow {
  id: string;
  workout_id: string;
  exercise_name: string;
  set_order: number;
  reps: number | null;
  weight_kg: number | null;
  duration_sec: number | null;
}

export const workoutDb = {
  async listWorkouts(limit = 30): Promise<WorkoutSession[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<WorkoutRow>(
      `SELECT id, title, workout_type, started_at, duration_min, perceived_effort, calories_est, notes
       FROM workouts
       WHERE deleted_at IS NULL
       ORDER BY started_at DESC
       LIMIT ?`,
      [limit],
    );
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const placeholders = ids.map(() => "?").join(", ");
    const exRows = await db.getAllAsync<ExerciseRow>(
      `SELECT id, workout_id, exercise_name, set_order, reps, weight_kg, duration_sec
       FROM exercises
       WHERE workout_id IN (${placeholders}) AND deleted_at IS NULL
       ORDER BY set_order ASC`,
      ids,
    );

    const exMap = new Map<string, ExerciseEntry[]>();
    for (const ex of exRows) {
      const arr = exMap.get(ex.workout_id) ?? [];
      arr.push({
        id: ex.id,
        workoutId: ex.workout_id,
        exerciseName: ex.exercise_name,
        setOrder: ex.set_order,
        reps: ex.reps,
        weightKg: ex.weight_kg,
        durationSec: ex.duration_sec,
      });
      exMap.set(ex.workout_id, arr);
    }

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      workoutType: r.workout_type,
      startedAt: r.started_at,
      durationMin: r.duration_min,
      perceivedEffort: r.perceived_effort,
      caloriesEst: r.calories_est,
      notes: r.notes,
      exercises: exMap.get(r.id) ?? [],
    }));
  },

  async createWorkout(input: CreateWorkoutInput): Promise<WorkoutSession> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const id = generateUuid();
    const meta = WORKOUT_TYPE_META[input.workoutType];
    const caloriesEst = Math.round(input.durationMin * meta.defaultCaloriesPerMin);
    const title = input.title.trim() || `${meta.label} Session`;
    const notes = input.notes?.trim() ?? "";

    await db.runAsync(
      `INSERT INTO workouts (id, title, workout_type, started_at, duration_min, perceived_effort, calories_est, notes, created_at, updated_at, deleted_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending')`,
      [
        id,
        title,
        input.workoutType,
        now,
        input.durationMin,
        input.perceivedEffort ?? null,
        caloriesEst,
        notes,
        now,
        now,
      ],
    );

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

    const exercises: ExerciseEntry[] = [];
    const list = input.exercises ?? [];
    for (let i = 0; i < list.length; i += 1) {
      const ex = list[i];
      const exId = generateUuid();
      const setOrder = i + 1;
      await db.runAsync(
        `INSERT INTO exercises (id, workout_id, exercise_name, set_order, reps, weight_kg, duration_sec, distance_m, created_at, updated_at, deleted_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, 'pending')`,
        [
          exId,
          id,
          ex.exerciseName.trim(),
          setOrder,
          ex.reps ?? null,
          ex.weightKg ?? null,
          ex.durationSec ?? null,
          now,
          now,
        ],
      );
      await syncQueueDb.enqueue({
        tableName: "exercises",
        recordId: exId,
        operation: "upsert",
        clientUpdatedAt: now,
        payload: {
          id: exId,
          workout_id: id,
          exercise_name: ex.exerciseName.trim(),
          set_order: setOrder,
          reps: ex.reps ?? null,
          weight_kg: ex.weightKg ?? null,
          duration_sec: ex.durationSec ?? null,
          updated_at: now,
        },
      });
      exercises.push({
        id: exId,
        workoutId: id,
        exerciseName: ex.exerciseName.trim(),
        setOrder,
        reps: ex.reps ?? null,
        weightKg: ex.weightKg ?? null,
        durationSec: ex.durationSec ?? null,
      });
    }

    return {
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
  },

  async deleteWorkout(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE workouts SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?`,
      [now, now, id],
    );
    await syncQueueDb.enqueue({
      tableName: "workouts",
      recordId: id,
      operation: "delete",
      clientUpdatedAt: now,
      payload: { id, deleted_at: now, updated_at: now },
    });
  },
};
