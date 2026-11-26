import { CategorySlug } from "@/constants/categories";
import { getDatabase } from "@/core/db";
import { syncQueueDb } from "@/core/sync/syncQueue";
import { addDaysIso, generateUuid, getRecentDateRange, getTodayIso } from "@/core/utils/date";
import type {
  ActivityStatus,
  CreateHabitInput,
  CreateTaskInput,
  HabitFrequencyType,
  HabitItem,
  HabitLogEntry,
  HabitLogStatus,
  RepeatRule,
  TaskItem,
  TaskPriority,
  UpdateHabitInput,
  UpdateTaskInput,
} from "../types/tasks.types";
import { computeHabitMetrics, doesTaskMatchDate, safeParseDays } from "../utils/schedule";

interface TaskRow {
  id: string;
  title: string;
  notes: string | null;
  category: string;
  time_label: string;
  date_iso: string;
  priority: string;
  repeat_rule: string;
  custom_days_json: string | null;
  reminder_enabled: number;
  status: string;
  completed: number;
  postponed_to: string | null;
}

interface TaskLogRow {
  id: string;
  task_id: string;
  log_date: string;
  status: string;
  logged_at: string;
}

interface HabitRow {
  id: string;
  title: string;
  polarity: string;
  category: string;
  target_label: string;
  frequency_type: string | null;
  target_per_week: number | null;
  custom_days_json: string | null;
  streak_days: number;
  best_streak: number | null;
  grace_used_this_week: number;
  last_recovery_date: string | null;
  completed_today: number;
  urge_count_today: number;
  weekly_consistency_pct: number;
}

interface HabitLogRow {
  id: string;
  habit_id: string;
  log_date: string;
  status: string;
  value: number | null;
  trigger_tag: string | null;
  note: string | null;
  logged_at: string;
}

function mapTask(row: TaskRow, overrideStatus?: ActivityStatus): TaskItem {
  const status = overrideStatus ?? (row.status as ActivityStatus) ?? "not_recorded";
  return {
    id: row.id,
    title: row.title,
    notes: row.notes ?? "",
    category: row.category as CategorySlug,
    timeLabel: row.time_label,
    dateIso: row.date_iso,
    priority: row.priority as TaskPriority,
    repeat: row.repeat_rule as RepeatRule,
    customDays: safeParseDays(row.custom_days_json ?? undefined, []),
    reminderEnabled: row.reminder_enabled === 1,
    status,
    completed: status === "completed",
    postponedTo: row.postponed_to,
  };
}

function mapHabitLog(row: HabitLogRow): HabitLogEntry {
  return {
    id: row.id,
    habitId: row.habit_id,
    logDate: row.log_date,
    status: row.status as HabitLogStatus,
    value: row.value ?? 1,
    triggerTag: row.trigger_tag,
    note: row.note,
    loggedAt: row.logged_at,
  };
}

export const tasksDb = {
  async listTasks(dateIso = getTodayIso()): Promise<TaskItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<TaskRow>(
      "SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY created_at DESC",
    );
    const logs = await db.getAllAsync<TaskLogRow>(
      "SELECT * FROM task_logs WHERE log_date = ? AND deleted_at IS NULL",
      [dateIso],
    );
    const statusMap = new Map<string, ActivityStatus>();
    for (const l of logs) {
      statusMap.set(l.task_id, l.status as ActivityStatus);
    }

    return rows
      .map((r) => {
        const mapped = mapTask(r, statusMap.get(r.id));
        if (r.repeat_rule !== "once" && !statusMap.has(r.id)) {
          mapped.status = "not_recorded";
          mapped.completed = false;
        }
        return mapped;
      })
      .filter((t) => doesTaskMatchDate(t, dateIso));
  },

  async getTaskById(id: string): Promise<TaskItem | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<TaskRow>(
      "SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL",
      [id],
    );
    return row ? mapTask(row) : null;
  },

  async createTask(input: CreateTaskInput): Promise<TaskItem> {
    const db = await getDatabase();
    const id = generateUuid();
    const now = new Date().toISOString();
    const customDays = input.customDays ?? [];
    await db.runAsync(
      `INSERT INTO tasks (id, title, notes, category, time_label, date_iso, priority, repeat_rule, custom_days_json, reminder_enabled, status, completed, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_recorded', 0, ?, ?, 'pending')`,
      [
        id,
        input.title,
        input.notes ?? "",
        input.category,
        input.timeLabel,
        input.dateIso,
        input.priority,
        input.repeat,
        JSON.stringify(customDays),
        input.reminderEnabled ? 1 : 0,
        now,
        now,
      ],
    );
    await syncQueueDb.enqueue({
      tableName: "tasks",
      recordId: id,
      operation: "upsert",
      clientUpdatedAt: now,
      payload: {
        title: input.title,
        notes: input.notes ?? "",
        category: input.category,
        time_label: input.timeLabel,
        date_iso: input.dateIso,
        priority: input.priority,
        repeat_rule: input.repeat,
        custom_days: customDays,
        reminder_enabled: input.reminderEnabled,
        status: "not_recorded",
        completed: false,
      },
    });
    return {
      ...input,
      id,
      notes: input.notes ?? "",
      customDays,
      status: "not_recorded",
      completed: false,
    };
  },

  async updateTask(input: UpdateTaskInput): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE tasks
       SET title = ?, notes = ?, category = ?, time_label = ?, date_iso = ?, priority = ?, repeat_rule = ?, custom_days_json = ?, reminder_enabled = ?, updated_at = ?, sync_status = 'pending'
       WHERE id = ?`,
      [
        input.title,
        input.notes ?? "",
        input.category,
        input.timeLabel,
        input.dateIso,
        input.priority,
        input.repeat,
        JSON.stringify(input.customDays ?? []),
        input.reminderEnabled ? 1 : 0,
        now,
        input.id,
      ],
    );
  },

  async deleteTask(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      "UPDATE tasks SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?",
      [now, now, id],
    );
    await syncQueueDb.enqueue({
      tableName: "tasks",
      recordId: id,
      operation: "delete",
      clientUpdatedAt: now,
      payload: { deleted_at: now },
    });
  },

  async setTaskStatus(
    id: string,
    dateIso: string,
    status: ActivityStatus,
  ): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const postponedTo = status === "postponed" ? addDaysIso(dateIso, 1) : null;

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO task_logs (id, task_id, log_date, status, logged_at, sync_status)
         VALUES (?, ?, ?, ?, ?, 'pending')
         ON CONFLICT(task_id, log_date) DO UPDATE SET status = excluded.status, logged_at = excluded.logged_at, sync_status = 'pending'`,
        [generateUuid(), id, dateIso, status, now],
      );

      await db.runAsync(
        `UPDATE tasks
         SET status = ?, completed = ?, postponed_to = COALESCE(?, postponed_to), updated_at = ?, sync_status = 'pending'
         WHERE id = ?`,
        [status, status === "completed" ? 1 : 0, postponedTo, now, id],
      );
    });
    await syncQueueDb.enqueue({
      tableName: "tasks",
      recordId: id,
      operation: "upsert",
      clientUpdatedAt: now,
      payload: {
        status,
        completed: status === "completed",
        postponed_to: postponedTo,
      },
    });
  },

  async toggleTask(id: string, dateIso = getTodayIso()): Promise<void> {
    const db = await getDatabase();
    const log = await db.getFirstAsync<TaskLogRow>(
      "SELECT * FROM task_logs WHERE task_id = ? AND log_date = ? AND deleted_at IS NULL",
      [id, dateIso],
    );
    const task = await db.getFirstAsync<TaskRow>(
      "SELECT * FROM tasks WHERE id = ?",
      [id],
    );
    const currentStatus =
      (log?.status as ActivityStatus | undefined) ??
      (task?.repeat_rule === "once" ? (task.status as ActivityStatus) : "not_recorded");
    const nextStatus: ActivityStatus =
      currentStatus === "completed" ? "not_recorded" : "completed";
    await tasksDb.setTaskStatus(id, dateIso, nextStatus);
  },

  async listTaskLogsRange(days = 14): Promise<{ logDate: string; status: ActivityStatus; category: CategorySlug }[]> {
    const db = await getDatabase();
    const dates = getRecentDateRange(getTodayIso(), days);
    const start = dates[0];
    const rows = await db.getAllAsync<{ log_date: string; status: string; category: string }>(
      `SELECT tl.log_date, tl.status, t.category
       FROM task_logs tl
       INNER JOIN tasks t ON t.id = tl.task_id
       WHERE tl.log_date >= ? AND tl.deleted_at IS NULL AND t.deleted_at IS NULL`,
      [start],
    );
    return rows.map((r) => ({
      logDate: r.log_date,
      status: r.status as ActivityStatus,
      category: r.category as CategorySlug,
    }));
  },

  async listHabits(): Promise<HabitItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<HabitRow>(
      "SELECT * FROM habits WHERE deleted_at IS NULL ORDER BY polarity ASC, created_at ASC",
    );
    const logs = await tasksDb.listAllHabitLogs(90);
    const today = getTodayIso();

    return rows.map((row) => {
      const base = {
        id: row.id,
        polarity: row.polarity as "positive" | "negative",
        frequencyType: (row.frequency_type as HabitFrequencyType) ?? "daily",
        targetPerWeek: row.target_per_week ?? 7,
        lastRecoveryDate: row.last_recovery_date,
      };
      const metrics = computeHabitMetrics(base, logs, today);
      const bestStreak = Math.max(row.best_streak ?? 0, metrics.streakDays);

      return {
        id: row.id,
        title: row.title,
        polarity: base.polarity,
        category: row.category as CategorySlug,
        targetLabel: row.target_label,
        frequencyType: base.frequencyType,
        targetPerWeek: base.targetPerWeek,
        customDays: safeParseDays(row.custom_days_json ?? undefined),
        streakDays: metrics.streakDays,
        bestStreak,
        graceUsedThisWeek: row.grace_used_this_week === 1,
        lastRecoveryDate: row.last_recovery_date,
        completedToday: metrics.completedToday,
        todayStatus: metrics.todayStatus,
        urgeCountToday: metrics.urgeCountToday,
        occurrencesToday: metrics.occurrencesToday,
        weeklyConsistencyPct: metrics.weeklyConsistencyPct,
      };
    });
  },

  async getHabitById(id: string): Promise<HabitItem | null> {
    const all = await tasksDb.listHabits();
    return all.find((h) => h.id === id) ?? null;
  },

  async createHabit(input: CreateHabitInput): Promise<HabitItem> {
    const db = await getDatabase();
    const id = generateUuid();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO habits (id, title, polarity, category, target_label, frequency_type, target_per_week, custom_days_json, streak_days, best_streak, grace_used_this_week, completed_today, urge_count_today, weekly_consistency_pct, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, ?, ?, 'pending')`,
      [
        id,
        input.title,
        input.polarity,
        input.category,
        input.targetLabel,
        input.frequencyType,
        input.targetPerWeek,
        JSON.stringify(input.customDays),
        now,
        now,
      ],
    );
    await syncQueueDb.enqueue({
      tableName: "habits",
      recordId: id,
      operation: "upsert",
      clientUpdatedAt: now,
      payload: {
        title: input.title,
        polarity: input.polarity,
        category: input.category,
        target_label: input.targetLabel,
        frequency_type: input.frequencyType,
        target_per_week: input.targetPerWeek,
        custom_days: input.customDays,
      },
    });
    return {
      ...input,
      id,
      streakDays: 0,
      bestStreak: 0,
      graceUsedThisWeek: false,
      completedToday: false,
      todayStatus: "not_recorded",
      urgeCountToday: 0,
      occurrencesToday: 0,
      weeklyConsistencyPct: 0,
    };
  },

  async updateHabit(input: UpdateHabitInput): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE habits
       SET title = ?, polarity = ?, category = ?, target_label = ?, frequency_type = ?, target_per_week = ?, custom_days_json = ?, updated_at = ?, sync_status = 'pending'
       WHERE id = ?`,
      [
        input.title,
        input.polarity,
        input.category,
        input.targetLabel,
        input.frequencyType,
        input.targetPerWeek,
        JSON.stringify(input.customDays),
        now,
        input.id,
      ],
    );
  },

  async deleteHabit(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      "UPDATE habits SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?",
      [now, now, id],
    );
    await syncQueueDb.enqueue({
      tableName: "habits",
      recordId: id,
      operation: "delete",
      clientUpdatedAt: now,
      payload: { deleted_at: now },
    });
  },

  async setHabitStatus(
    habitId: string,
    logDate: string,
    status: HabitLogStatus,
    triggerTag?: string,
    note?: string,
  ): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      // For discrete events (occurrence, urge_resisted), append row; for daily status, replace date status
      if (status !== "occurrence" && status !== "urge_resisted") {
        await db.runAsync(
          "DELETE FROM habit_logs WHERE habit_id = ? AND log_date = ? AND status NOT IN ('occurrence', 'urge_resisted')",
          [habitId, logDate],
        );
      }
      if (status !== "not_recorded") {
        await db.runAsync(
          `INSERT INTO habit_logs (id, habit_id, log_date, status, value, trigger_tag, note, logged_at, sync_status)
           VALUES (?, ?, ?, ?, 1, ?, ?, ?, 'pending')`,
          [generateUuid(), habitId, logDate, status, triggerTag ?? null, note ?? null, now],
        );
      }
      await db.runAsync(
        "UPDATE habits SET updated_at = ?, sync_status = 'pending' WHERE id = ?",
        [now, habitId],
      );
    });
  },

  async toggleHabitToday(id: string): Promise<void> {
    const habit = await tasksDb.getHabitById(id);
    if (!habit) return;
    const nextStatus: HabitLogStatus = habit.completedToday
      ? "not_recorded"
      : "completed";
    await tasksDb.setHabitStatus(id, getTodayIso(), nextStatus);
  },

  async logNegativeUrge(id: string, triggerTag = "stress"): Promise<void> {
    await tasksDb.setHabitStatus(id, getTodayIso(), "urge_resisted", triggerTag);
  },

  async logNegativeOccurrence(id: string, triggerTag = "stress"): Promise<void> {
    await tasksDb.setHabitStatus(id, getTodayIso(), "occurrence", triggerTag);
  },

  async recoverHabitStreak(habitId: string, recoveryDateIso: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "UPDATE habits SET grace_used_this_week = 1, last_recovery_date = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?",
        [recoveryDateIso, now, habitId],
      );
      await db.runAsync(
        `INSERT INTO habit_logs (id, habit_id, log_date, status, value, note, logged_at, sync_status)
         VALUES (?, ?, ?, 'completed', 1, 'Flexible streak recovery', ?, 'pending')`,
        [generateUuid(), habitId, recoveryDateIso, now],
      );
    });
  },

  async listHabitLogs(habitId: string, days = 30): Promise<HabitLogEntry[]> {
    const db = await getDatabase();
    const start = getRecentDateRange(getTodayIso(), days)[0];
    const rows = await db.getAllAsync<HabitLogRow>(
      "SELECT * FROM habit_logs WHERE habit_id = ? AND log_date >= ? AND deleted_at IS NULL ORDER BY log_date DESC, logged_at DESC",
      [habitId, start],
    );
    return rows.map(mapHabitLog);
  },

  async listAllHabitLogs(days = 90): Promise<HabitLogEntry[]> {
    const db = await getDatabase();
    const start = getRecentDateRange(getTodayIso(), days)[0];
    const rows = await db.getAllAsync<HabitLogRow>(
      "SELECT * FROM habit_logs WHERE log_date >= ? AND deleted_at IS NULL ORDER BY log_date ASC, logged_at ASC",
      [start],
    );
    return rows.map(mapHabitLog);
  },
};
