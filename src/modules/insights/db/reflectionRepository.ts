import { getDatabase } from "@/core/db";
import { generateUuid, parseIsoDate, toIsoDate } from "@/core/utils/date";

export type ReflectionMood = "calm" | "balanced" | "stretched";

export interface WeeklyReflection {
  id: string;
  weekStartIso: string;
  energyMood: ReflectionMood;
  highlight: string;
  adjustment: string;
  updatedAt: string;
}

interface ReflectionRow {
  id: string;
  week_start_iso: string;
  energy_mood: ReflectionMood;
  highlight: string;
  adjustment: string;
  updated_at: string;
}

export function getCurrentWeekStartIso(todayIso: string): string {
  const dt = parseIsoDate(todayIso);
  const diffToSunday = dt.getDay();
  dt.setDate(dt.getDate() - diffToSunday);
  return toIsoDate(dt);
}

export const reflectionDb = {
  async getLatest(limit = 4): Promise<WeeklyReflection[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ReflectionRow>(
      `SELECT id, week_start_iso, energy_mood, highlight, adjustment, updated_at
       FROM weekly_reflections
       ORDER BY week_start_iso DESC
       LIMIT ?`,
      [limit],
    );
    return rows.map((r) => ({
      id: r.id,
      weekStartIso: r.week_start_iso,
      energyMood: r.energy_mood,
      highlight: r.highlight,
      adjustment: r.adjustment,
      updatedAt: r.updated_at,
    }));
  },

  async saveReflection(input: {
    weekStartIso: string;
    energyMood: ReflectionMood;
    highlight: string;
    adjustment: string;
  }): Promise<WeeklyReflection> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const existing = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM weekly_reflections WHERE week_start_iso = ?",
      [input.weekStartIso],
    );
    const id = existing?.id ?? generateUuid();
    await db.runAsync(
      `INSERT INTO weekly_reflections (id, week_start_iso, energy_mood, highlight, adjustment, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(week_start_iso) DO UPDATE SET
         energy_mood = excluded.energy_mood,
         highlight = excluded.highlight,
         adjustment = excluded.adjustment,
         updated_at = excluded.updated_at`,
      [
        id,
        input.weekStartIso,
        input.energyMood,
        input.highlight.trim(),
        input.adjustment.trim(),
        now,
        now,
      ],
    );
    return {
      id,
      weekStartIso: input.weekStartIso,
      energyMood: input.energyMood,
      highlight: input.highlight.trim(),
      adjustment: input.adjustment.trim(),
      updatedAt: now,
    };
  },
};
