import { CategorySlug } from "@/constants/categories";
import { syncQueueDb } from "@/core/sync/syncQueue";
import { addDaysIso, generateUuid, getRecentDateRange, getTodayIso } from "@/core/utils/date";
import type {
  ActivityStatus,
  CreateHabitInput,
  CreateTaskInput,
  HabitItem,
  HabitLogEntry,
  HabitLogStatus,
  TaskItem,
  UpdateHabitInput,
  UpdateTaskInput,
} from "../types/tasks.types";
import { computeHabitMetrics, doesTaskMatchDate } from "../utils/schedule";

const TASKS_KEY = "newlife_web_tasks_v3";
const TASK_LOGS_KEY = "newlife_web_task_logs_v3";
const HABITS_KEY = "newlife_web_habits_v3";
const HABIT_LOGS_KEY = "newlife_web_habit_logs_v3";

const SEED_TASK_IDS = {
  t1: "00000000-0000-4000-8000-000000000101",
  t2: "00000000-0000-4000-8000-000000000102",
  t3: "00000000-0000-4000-8000-000000000103",
  t4: "00000000-0000-4000-8000-000000000104",
  t5: "00000000-0000-4000-8000-000000000105",
};

const SEED_HABIT_IDS = {
  h1: "00000000-0000-4000-8000-000000000201",
  h2: "00000000-0000-4000-8000-000000000202",
  h3: "00000000-0000-4000-8000-000000000203",
  h4: "00000000-0000-4000-8000-000000000204",
};

interface WebTaskLog {
  taskId: string;
  logDate: string;
  status: ActivityStatus;
}

function seedTasks(): TaskItem[] {
  const today = getTodayIso();
  return [
    {
      id: SEED_TASK_IDS.t1,
      title: "Fajr Prayer",
      notes: "",
      category: "prayer",
      timeLabel: "05:18 AM",
      dateIso: today,
      priority: "high",
      repeat: "daily",
      customDays: [0, 1, 2, 3, 4, 5, 6],
      reminderEnabled: true,
      status: "completed",
      completed: true,
    },
    {
      id: SEED_TASK_IDS.t2,
      title: "Deep Work Sprint",
      notes: "90 min focus block",
      category: "work",
      timeLabel: "10:00 AM",
      dateIso: today,
      priority: "high",
      repeat: "weekdays",
      customDays: [1, 2, 3, 4, 5],
      reminderEnabled: true,
      status: "completed",
      completed: true,
    },
    {
      id: SEED_TASK_IDS.t3,
      title: "Eat Healthy Meal",
      notes: "",
      category: "health",
      timeLabel: "01:30 PM",
      dateIso: today,
      priority: "low",
      repeat: "daily",
      customDays: [0, 1, 2, 3, 4, 5, 6],
      reminderEnabled: false,
      status: "completed",
      completed: true,
    },
    {
      id: SEED_TASK_IDS.t4,
      title: "Gym Workout",
      notes: "",
      category: "gym",
      timeLabel: "06:00 PM",
      dateIso: today,
      priority: "medium",
      repeat: "weekdays",
      customDays: [1, 2, 3, 4, 5],
      reminderEnabled: true,
      status: "not_recorded",
      completed: false,
    },
    {
      id: SEED_TASK_IDS.t5,
      title: "Read 10 Pages",
      notes: "",
      category: "study",
      timeLabel: "08:30 PM",
      dateIso: today,
      priority: "medium",
      repeat: "daily",
      customDays: [0, 1, 2, 3, 4, 5, 6],
      reminderEnabled: false,
      status: "not_recorded",
      completed: false,
    },
  ];
}

function seedHabits(): HabitItem[] {
  return [
    {
      id: SEED_HABIT_IDS.h1,
      title: "Morning Prayers On Time",
      polarity: "positive",
      category: "prayer",
      targetLabel: "Daily • Dawn",
      frequencyType: "daily",
      targetPerWeek: 7,
      customDays: [0, 1, 2, 3, 4, 5, 6],
      streakDays: 3,
      bestStreak: 14,
      graceUsedThisWeek: false,
      completedToday: true,
      todayStatus: "completed",
      urgeCountToday: 0,
      occurrencesToday: 0,
      weeklyConsistencyPct: 100,
    },
    {
      id: SEED_HABIT_IDS.h2,
      title: "Strength & Mobility",
      polarity: "positive",
      category: "gym",
      targetLabel: "4x / week",
      frequencyType: "weekly",
      targetPerWeek: 4,
      customDays: [0, 2, 4, 6],
      streakDays: 1,
      bestStreak: 6,
      graceUsedThisWeek: false,
      completedToday: false,
      todayStatus: "not_recorded",
      urgeCountToday: 0,
      occurrencesToday: 0,
      weeklyConsistencyPct: 100,
    },
    {
      id: SEED_HABIT_IDS.h3,
      title: "Reading 10 Pages",
      polarity: "positive",
      category: "study",
      targetLabel: "Daily • Evening",
      frequencyType: "daily",
      targetPerWeek: 7,
      customDays: [0, 1, 2, 3, 4, 5, 6],
      streakDays: 2,
      bestStreak: 4,
      graceUsedThisWeek: false,
      completedToday: false,
      todayStatus: "not_recorded",
      urgeCountToday: 0,
      occurrencesToday: 0,
      weeklyConsistencyPct: 100,
    },
    {
      id: SEED_HABIT_IDS.h4,
      title: "Late-Night Doomscrolling",
      polarity: "negative",
      category: "health",
      targetLabel: "After 10:30 PM",
      frequencyType: "daily",
      targetPerWeek: 7,
      customDays: [0, 1, 2, 3, 4, 5, 6],
      streakDays: 3,
      bestStreak: 9,
      graceUsedThisWeek: false,
      completedToday: true,
      todayStatus: "completed",
      urgeCountToday: 0,
      occurrencesToday: 0,
      weeklyConsistencyPct: 100,
    },
  ];
}

function seedHabitLogs(): HabitLogEntry[] {
  const today = getTodayIso();
  const yesterday = addDaysIso(today, -1);
  const twoDaysAgo = addDaysIso(today, -2);
  const now = new Date().toISOString();
  return [
    { id: generateUuid(), habitId: SEED_HABIT_IDS.h1, logDate: twoDaysAgo, status: "completed", value: 1, loggedAt: now },
    { id: generateUuid(), habitId: SEED_HABIT_IDS.h1, logDate: yesterday, status: "completed", value: 1, loggedAt: now },
    { id: generateUuid(), habitId: SEED_HABIT_IDS.h1, logDate: today, status: "completed", value: 1, loggedAt: now },
    { id: generateUuid(), habitId: SEED_HABIT_IDS.h2, logDate: twoDaysAgo, status: "completed", value: 1, loggedAt: now },
    { id: generateUuid(), habitId: SEED_HABIT_IDS.h2, logDate: yesterday, status: "skipped", value: 0, loggedAt: now },
    { id: generateUuid(), habitId: SEED_HABIT_IDS.h3, logDate: twoDaysAgo, status: "completed", value: 1, loggedAt: now },
    { id: generateUuid(), habitId: SEED_HABIT_IDS.h3, logDate: yesterday, status: "completed", value: 1, loggedAt: now },
    { id: generateUuid(), habitId: SEED_HABIT_IDS.h4, logDate: twoDaysAgo, status: "completed", value: 0, loggedAt: now },
    { id: generateUuid(), habitId: SEED_HABIT_IDS.h4, logDate: yesterday, status: "urge_resisted", value: 0, triggerTag: "boredom", loggedAt: now },
    { id: generateUuid(), habitId: SEED_HABIT_IDS.h4, logDate: today, status: "completed", value: 0, loggedAt: now },
  ];
}

function seedTaskLogs(): WebTaskLog[] {
  const today = getTodayIso();
  return [
    { taskId: SEED_TASK_IDS.t1, logDate: today, status: "completed" },
    { taskId: SEED_TASK_IDS.t2, logDate: today, status: "completed" },
    { taskId: SEED_TASK_IDS.t3, logDate: today, status: "completed" },
  ];
}

function readList<T>(key: string, fallback: () => T[]): T[] {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T[];
      const initial = fallback();
      window.localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
  } catch {
    // ignore
  }
  return fallback();
}

function writeList<T>(key: string, items: T[]): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(items));
    }
  } catch {
    // ignore
  }
}

export const tasksDb = {
  async listTasks(dateIso = getTodayIso()): Promise<TaskItem[]> {
    const tasks = readList<TaskItem>(TASKS_KEY, seedTasks);
    const logs = readList<WebTaskLog>(TASK_LOGS_KEY, seedTaskLogs);
    const statusMap = new Map<string, ActivityStatus>();
    logs.filter((l) => l.logDate === dateIso).forEach((l) => statusMap.set(l.taskId, l.status));

    return tasks
      .filter((t) => doesTaskMatchDate(t, dateIso))
      .map((t) => {
        const status = statusMap.get(t.id) ?? (t.repeat === "once" ? t.status : "not_recorded");
        return { ...t, status, completed: status === "completed" };
      });
  },

  async getTaskById(id: string): Promise<TaskItem | null> {
    const tasks = readList<TaskItem>(TASKS_KEY, seedTasks);
    return tasks.find((t) => t.id === id) ?? null;
  },

  async createTask(input: CreateTaskInput): Promise<TaskItem> {
    const tasks = readList<TaskItem>(TASKS_KEY, seedTasks);
    const id = generateUuid();
    const now = new Date().toISOString();
    const created: TaskItem = {
      ...input,
      id,
      notes: input.notes ?? "",
      customDays: input.customDays ?? [],
      status: "not_recorded",
      completed: false,
    };
    writeList(TASKS_KEY, [created, ...tasks]);
    await syncQueueDb.enqueue({
      tableName: "tasks",
      recordId: id,
      operation: "upsert",
      clientUpdatedAt: now,
      payload: {
        title: created.title,
        notes: created.notes,
        category: created.category,
        time_label: created.timeLabel,
        date_iso: created.dateIso,
        priority: created.priority,
        repeat_rule: created.repeat,
        custom_days: created.customDays,
        reminder_enabled: created.reminderEnabled,
        status: created.status,
        completed: created.completed,
      },
    });
    return created;
  },

  async updateTask(input: UpdateTaskInput): Promise<void> {
    const tasks = readList<TaskItem>(TASKS_KEY, seedTasks);
    const now = new Date().toISOString();
    let updatedItem: TaskItem | null = null;
    writeList(
      TASKS_KEY,
      tasks.map((t) => {
        if (t.id !== input.id) return t;
        updatedItem = {
          ...t,
          ...input,
          notes: input.notes ?? "",
          customDays: input.customDays ?? [],
        };
        return updatedItem;
      }),
    );
    if (updatedItem) {
      const u = updatedItem as TaskItem;
      await syncQueueDb.enqueue({
        tableName: "tasks",
        recordId: input.id,
        operation: "upsert",
        clientUpdatedAt: now,
        payload: {
          title: u.title,
          notes: u.notes,
          category: u.category,
          time_label: u.timeLabel,
          date_iso: u.dateIso,
          priority: u.priority,
          repeat_rule: u.repeat,
          custom_days: u.customDays,
          reminder_enabled: u.reminderEnabled,
          status: u.status,
          completed: u.completed,
        },
      });
    }
  },

  async deleteTask(id: string): Promise<void> {
    const tasks = readList<TaskItem>(TASKS_KEY, seedTasks);
    const now = new Date().toISOString();
    writeList(TASKS_KEY, tasks.filter((t) => t.id !== id));
    await syncQueueDb.enqueue({
      tableName: "tasks",
      recordId: id,
      operation: "delete",
      clientUpdatedAt: now,
      payload: { deleted_at: now },
    });
  },

  async setTaskStatus(id: string, dateIso: string, status: ActivityStatus): Promise<void> {
    const tasks = readList<TaskItem>(TASKS_KEY, seedTasks);
    const now = new Date().toISOString();
    const logs = readList<WebTaskLog>(TASK_LOGS_KEY, seedTaskLogs).filter(
      (l) => !(l.taskId === id && l.logDate === dateIso),
    );
    logs.push({ taskId: id, logDate: dateIso, status });
    writeList(TASK_LOGS_KEY, logs);

    const postponedTo = status === "postponed" ? addDaysIso(dateIso, 1) : undefined;
    let updatedItem: TaskItem | null = null;
    writeList(
      TASKS_KEY,
      tasks.map((t) => {
        if (t.id !== id) return t;
        updatedItem = {
          ...t,
          status,
          completed: status === "completed",
          postponedTo: postponedTo ?? t.postponedTo,
        };
        return updatedItem;
      }),
    );
    if (updatedItem) {
      const u = updatedItem as TaskItem;
      await syncQueueDb.enqueue({
        tableName: "tasks",
        recordId: id,
        operation: "upsert",
        clientUpdatedAt: now,
        payload: {
          title: u.title,
          date_iso: u.dateIso,
          status: u.status,
          completed: u.completed,
          postponed_to: u.postponedTo ?? null,
        },
      });
    }
  },

  async toggleTask(id: string, dateIso = getTodayIso()): Promise<void> {
    const tasks = await tasksDb.listTasks(dateIso);
    const current = tasks.find((t) => t.id === id);
    const nextStatus: ActivityStatus =
      current?.status === "completed" ? "not_recorded" : "completed";
    await tasksDb.setTaskStatus(id, dateIso, nextStatus);
  },

  async listTaskLogsRange(days = 14): Promise<{ logDate: string; status: ActivityStatus; category: CategorySlug }[]> {
    const start = getRecentDateRange(getTodayIso(), days)[0];
    const tasks = readList<TaskItem>(TASKS_KEY, seedTasks);
    const logs = readList<WebTaskLog>(TASK_LOGS_KEY, seedTaskLogs);
    const catById = new Map(tasks.map((t) => [t.id, t.category]));

    return logs
      .filter((l) => l.logDate >= start && catById.has(l.taskId))
      .map((l) => ({
        logDate: l.logDate,
        status: l.status,
        category: catById.get(l.taskId)!,
      }));
  },

  async listHabits(): Promise<HabitItem[]> {
    const habits = readList<HabitItem>(HABITS_KEY, seedHabits);
    const logs = readList<HabitLogEntry>(HABIT_LOGS_KEY, seedHabitLogs);
    const today = getTodayIso();

    return habits.map((h) => {
      const m = computeHabitMetrics(h, logs, today);
      return {
        ...h,
        streakDays: m.streakDays,
        bestStreak: Math.max(h.bestStreak, m.streakDays),
        completedToday: m.completedToday,
        todayStatus: m.todayStatus,
        urgeCountToday: m.urgeCountToday,
        occurrencesToday: m.occurrencesToday,
        weeklyConsistencyPct: m.weeklyConsistencyPct,
      };
    });
  },

  async getHabitById(id: string): Promise<HabitItem | null> {
    const all = await tasksDb.listHabits();
    return all.find((h) => h.id === id) ?? null;
  },

  async createHabit(input: CreateHabitInput): Promise<HabitItem> {
    const habits = readList<HabitItem>(HABITS_KEY, seedHabits);
    const id = generateUuid();
    const now = new Date().toISOString();
    const created: HabitItem = {
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
    writeList(HABITS_KEY, [...habits, created]);
    await syncQueueDb.enqueue({
      tableName: "habits",
      recordId: id,
      operation: "upsert",
      clientUpdatedAt: now,
      payload: {
        title: created.title,
        polarity: created.polarity,
        category: created.category,
        target_label: created.targetLabel,
        frequency_type: created.frequencyType,
        target_per_week: created.targetPerWeek,
        custom_days: created.customDays,
      },
    });
    return created;
  },

  async updateHabit(input: UpdateHabitInput): Promise<void> {
    const habits = readList<HabitItem>(HABITS_KEY, seedHabits);
    const now = new Date().toISOString();
    writeList(
      HABITS_KEY,
      habits.map((h) => (h.id === input.id ? { ...h, ...input } : h)),
    );
    await syncQueueDb.enqueue({
      tableName: "habits",
      recordId: input.id,
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
  },

  async deleteHabit(id: string): Promise<void> {
    const habits = readList<HabitItem>(HABITS_KEY, seedHabits);
    const now = new Date().toISOString();
    writeList(HABITS_KEY, habits.filter((h) => h.id !== id));
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
    let logs = readList<HabitLogEntry>(HABIT_LOGS_KEY, seedHabitLogs);
    if (status !== "occurrence" && status !== "urge_resisted") {
      logs = logs.filter(
        (l) =>
          !(
            l.habitId === habitId &&
            l.logDate === logDate &&
            l.status !== "occurrence" &&
            l.status !== "urge_resisted"
          ),
      );
    }
    if (status !== "not_recorded") {
      logs.push({
        id: generateUuid(),
        habitId,
        logDate,
        status,
        value: 1,
        triggerTag: triggerTag ?? null,
        note: note ?? null,
        loggedAt: new Date().toISOString(),
      });
    }
    writeList(HABIT_LOGS_KEY, logs);
  },

  async toggleHabitToday(id: string): Promise<void> {
    const habit = await tasksDb.getHabitById(id);
    if (!habit) return;
    await tasksDb.setHabitStatus(
      id,
      getTodayIso(),
      habit.completedToday ? "not_recorded" : "completed",
    );
  },

  async logNegativeUrge(id: string, triggerTag = "stress"): Promise<void> {
    await tasksDb.setHabitStatus(id, getTodayIso(), "urge_resisted", triggerTag);
  },

  async logNegativeOccurrence(id: string, triggerTag = "stress"): Promise<void> {
    await tasksDb.setHabitStatus(id, getTodayIso(), "occurrence", triggerTag);
  },

  async recoverHabitStreak(habitId: string, recoveryDateIso: string): Promise<void> {
    const habits = readList<HabitItem>(HABITS_KEY, seedHabits);
    writeList(
      HABITS_KEY,
      habits.map((h) =>
        h.id === habitId
          ? { ...h, graceUsedThisWeek: true, lastRecoveryDate: recoveryDateIso }
          : h,
      ),
    );
    await tasksDb.setHabitStatus(
      habitId,
      recoveryDateIso,
      "completed",
      undefined,
      "Flexible streak recovery",
    );
  },

  async listHabitLogs(habitId: string, days = 30): Promise<HabitLogEntry[]> {
    const start = getRecentDateRange(getTodayIso(), days)[0];
    const logs = readList<HabitLogEntry>(HABIT_LOGS_KEY, seedHabitLogs);
    return logs
      .filter((l) => l.habitId === habitId && l.logDate >= start)
      .sort((a, b) => b.logDate.localeCompare(a.logDate));
  },

  async listAllHabitLogs(days = 90): Promise<HabitLogEntry[]> {
    const start = getRecentDateRange(getTodayIso(), days)[0];
    const logs = readList<HabitLogEntry>(HABIT_LOGS_KEY, seedHabitLogs);
    return logs.filter((l) => l.logDate >= start);
  },
};
