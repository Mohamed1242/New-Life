import { CategorySlug } from "@/constants/categories";
import { getDatabase } from "@/core/db";
import { getTodayIso } from "@/core/utils/date";
import type {
  CreateHabitInput,
  CreateTaskInput,
  HabitItem,
  RepeatRule,
  TaskItem,
  TaskPriority,
} from "../types/tasks.types";

interface TaskRow {
  id: string;
  title: string;
  category: string;
  time_label: string;
  date_iso: string;
  priority: string;
  repeat_rule: string;
  reminder_enabled: number;
  completed: number;
}

interface HabitRow {
  id: string;
  title: string;
  polarity: string;
  category: string;
  target_label: string;
  streak_days: number;
  grace_used_this_week: number;
  completed_today: number;
  urge_count_today: number;
  weekly_consistency_pct: number;
}

function mapTask(row: TaskRow): TaskItem {
  return {
    id: row.id,
    title: row.title,
    category: row.category as CategorySlug,
    timeLabel: row.time_label,
    dateIso: row.date_iso,
    priority: row.priority as TaskPriority,
    repeat: row.repeat_rule as RepeatRule,
    reminderEnabled: row.reminder_enabled === 1,
    completed: row.completed === 1,
  };
}

function mapHabit(row: HabitRow): HabitItem {
  return {
    id: row.id,
    title: row.title,
    polarity: row.polarity as "positive" | "negative",
    category: row.category as CategorySlug,
    targetLabel: row.target_label,
    streakDays: row.streak_days,
    graceUsedThisWeek: row.grace_used_this_week === 1,
    completedToday: row.completed_today === 1,
    urgeCountToday: row.urge_count_today,
    weeklyConsistencyPct: row.weekly_consistency_pct,
  };
}

export const tasksDb = {
  async listTasks(dateIso?: string): Promise<TaskItem[]> {
    const db = await getDatabase();
    const rows = dateIso
      ? await db.getAllAsync<TaskRow>(
          "SELECT * FROM tasks WHERE date_iso = ? ORDER BY completed ASC, created_at DESC",
          [dateIso],
        )
      : await db.getAllAsync<TaskRow>(
          "SELECT * FROM tasks ORDER BY completed ASC, created_at DESC",
        );
    return rows.map(mapTask);
  },

  async createTask(input: CreateTaskInput): Promise<TaskItem> {
    const db = await getDatabase();
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO tasks (id, title, category, time_label, date_iso, priority, repeat_rule, reminder_enabled, completed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        id,
        input.title,
        input.category,
        input.timeLabel,
        input.dateIso,
        input.priority,
        input.repeat,
        input.reminderEnabled ? 1 : 0,
        now,
        now,
      ],
    );
    return { ...input, id, completed: false };
  },

  async toggleTask(id: string): Promise<TaskItem | null> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<TaskRow>(
      "SELECT * FROM tasks WHERE id = ?",
      [id],
    );
    if (!existing) return null;
    const nextCompleted = existing.completed === 1 ? 0 : 1;
    await db.runAsync(
      "UPDATE tasks SET completed = ?, updated_at = ? WHERE id = ?",
      [nextCompleted, new Date().toISOString(), id],
    );
    return mapTask({ ...existing, completed: nextCompleted });
  },

  async listHabits(): Promise<HabitItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<HabitRow>(
      "SELECT * FROM habits ORDER BY polarity ASC, created_at ASC",
    );
    return rows.map(mapHabit);
  },

  async createHabit(input: CreateHabitInput): Promise<HabitItem> {
    const db = await getDatabase();
    const id = `h_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO habits (id, title, polarity, category, target_label, streak_days, grace_used_this_week, completed_today, urge_count_today, weekly_consistency_pct, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?, ?)`,
      [id, input.title, input.polarity, input.category, input.targetLabel, now, now],
    );
    return {
      ...input,
      id,
      streakDays: 0,
      graceUsedThisWeek: false,
      completedToday: false,
      urgeCountToday: 0,
      weeklyConsistencyPct: 0,
    };
  },

  async toggleHabitToday(id: string): Promise<void> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<HabitRow>(
      "SELECT * FROM habits WHERE id = ?",
      [id],
    );
    if (!existing) return;
    const nextDone = existing.completed_today === 1 ? 0 : 1;
    const nextStreak =
      nextDone === 1
        ? existing.streak_days + 1
        : Math.max(0, existing.streak_days - 1);
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "UPDATE habits SET completed_today = ?, streak_days = ?, updated_at = ? WHERE id = ?",
        [nextDone, nextStreak, now, id],
      );
      await db.runAsync(
        "INSERT INTO habit_logs (id, habit_id, log_date, status, logged_at) VALUES (?, ?, ?, ?, ?)",
        [
          `hl_${Date.now()}`,
          id,
          getTodayIso(),
          nextDone === 1 ? "completed" : "reverted",
          now,
        ],
      );
    });
  },

  async logNegativeUrge(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "UPDATE habits SET urge_count_today = urge_count_today + 1, updated_at = ? WHERE id = ?",
        [now, id],
      );
      await db.runAsync(
        "INSERT INTO habit_logs (id, habit_id, log_date, status, logged_at) VALUES (?, ?, ?, 'urge_resisted', ?)",
        [`hl_${Date.now()}`, id, getTodayIso(), now],
      );
    });
  },
};
