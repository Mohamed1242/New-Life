import { generateUuid } from "@/core/utils/date";
import type { HabitItem, TaskItem } from "@/modules/tasks/types/tasks.types";
import type { RoutineBlock } from "@/modules/routine/types/routine.types";
import type { SyncMetadata, SyncQueueItem, SyncTableName } from "./syncQueue";

const QUEUE_KEY = "newlife_web_sync_queue_v1";
const META_KEY = "newlife_web_sync_meta_v1";
const TASKS_KEY = "newlife_web_tasks_v3";
const HABITS_KEY = "newlife_web_habits_v3";
const ROUTINES_KEY = "newlife_web_routines_v2";

function readJson<T>(key: string, fallback: T): T {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T;
    }
  } catch {
    // ignore
  }
  return fallback;
}

function writeJson<T>(key: string, val: T): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(val));
    }
  } catch {
    // ignore
  }
}

export const syncQueueDb = {
  async enqueue(params: {
    tableName: SyncTableName;
    recordId: string;
    operation: "upsert" | "delete";
    payload: Record<string, unknown>;
    clientUpdatedAt?: string;
  }): Promise<void> {
    const queue = readJson<SyncQueueItem[]>(QUEUE_KEY, []).filter(
      (i) => !(i.tableName === params.tableName && i.recordId === params.recordId),
    );
    queue.push({
      id: generateUuid(),
      tableName: params.tableName,
      recordId: params.recordId,
      operation: params.operation,
      payload: params.payload,
      clientUpdatedAt: params.clientUpdatedAt ?? new Date().toISOString(),
      retryCount: 0,
      lastError: null,
    });
    writeJson(QUEUE_KEY, queue);
  },

  async listPending(limit = 100): Promise<SyncQueueItem[]> {
    return readJson<SyncQueueItem[]>(QUEUE_KEY, []).slice(0, limit);
  },

  async countPending(): Promise<number> {
    return readJson<SyncQueueItem[]>(QUEUE_KEY, []).length;
  },

  async removeByRecordIds(recordIds: string[]): Promise<void> {
    const set = new Set(recordIds);
    const next = readJson<SyncQueueItem[]>(QUEUE_KEY, []).filter(
      (i) => !set.has(i.recordId),
    );
    writeJson(QUEUE_KEY, next);
  },

  async markFailed(recordId: string, errorMessage: string): Promise<void> {
    const next = readJson<SyncQueueItem[]>(QUEUE_KEY, []).map((i) =>
      i.recordId === recordId
        ? { ...i, retryCount: i.retryCount + 1, lastError: errorMessage }
        : i,
    );
    writeJson(QUEUE_KEY, next);
  },

  async getMetadata(): Promise<SyncMetadata> {
    return readJson<SyncMetadata>(META_KEY, {
      lastPulledAt: null,
      lastPushedAt: null,
      lastSyncStatus: "idle",
      lastSyncError: null,
    });
  },

  async updateMetadata(patch: Partial<SyncMetadata>): Promise<void> {
    const curr = await syncQueueDb.getMetadata();
    writeJson(META_KEY, { ...curr, ...patch });
  },

  async mergePulledChanges(changes: Record<string, Record<string, unknown>[]>): Promise<void> {
    const cloudTasks = changes.tasks ?? [];
    if (cloudTasks.length > 0) {
      const local = readJson<TaskItem[]>(TASKS_KEY, []);
      const map = new Map(local.map((t) => [t.id, t]));
      for (const ct of cloudTasks) {
        const id = String(ct.id);
        if (ct.deleted_at) {
          map.delete(id);
          continue;
        }
        map.set(id, {
          id,
          title: String(ct.title ?? ""),
          notes: String(ct.notes ?? ""),
          category: (ct.category as TaskItem["category"]) ?? "custom",
          timeLabel: String(ct.time_label ?? "09:00 AM"),
          dateIso: String(ct.date_iso),
          priority: (ct.priority as TaskItem["priority"]) ?? "medium",
          repeat: (ct.repeat_rule as TaskItem["repeat"]) ?? "once",
          customDays: Array.isArray(ct.custom_days) ? (ct.custom_days as number[]) : [],
          reminderEnabled: Boolean(ct.reminder_enabled),
          status: (ct.status as TaskItem["status"]) ?? "not_recorded",
          completed: Boolean(ct.completed),
          postponedTo: ct.postponed_to ? String(ct.postponed_to) : null,
        });
      }
      writeJson(TASKS_KEY, Array.from(map.values()));
    }

    const cloudHabits = changes.habits ?? [];
    if (cloudHabits.length > 0) {
      const local = readJson<HabitItem[]>(HABITS_KEY, []);
      const map = new Map(local.map((h) => [h.id, h]));
      for (const ch of cloudHabits) {
        const id = String(ch.id);
        if (ch.deleted_at) {
          map.delete(id);
          continue;
        }
        const prev = map.get(id);
        map.set(id, {
          id,
          title: String(ch.title ?? ""),
          polarity: (ch.polarity as HabitItem["polarity"]) ?? "positive",
          category: (ch.category as HabitItem["category"]) ?? "health",
          targetLabel: String(ch.target_label ?? "Daily"),
          frequencyType: (ch.frequency_type as HabitItem["frequencyType"]) ?? "daily",
          targetPerWeek: Number(ch.target_per_week ?? 7),
          customDays: Array.isArray(ch.custom_days) ? (ch.custom_days as number[]) : [0, 1, 2, 3, 4, 5, 6],
          streakDays: Number(ch.streak_days ?? prev?.streakDays ?? 0),
          bestStreak: Number(ch.best_streak ?? prev?.bestStreak ?? 0),
          graceUsedThisWeek: Boolean(ch.grace_used_this_week),
          lastRecoveryDate: ch.last_recovery_date ? String(ch.last_recovery_date) : null,
          completedToday: prev?.completedToday ?? false,
          todayStatus: prev?.todayStatus ?? "not_recorded",
          urgeCountToday: prev?.urgeCountToday ?? 0,
          occurrencesToday: prev?.occurrencesToday ?? 0,
          weeklyConsistencyPct: Number(ch.weekly_consistency_pct ?? prev?.weeklyConsistencyPct ?? 0),
        });
      }
      writeJson(HABITS_KEY, Array.from(map.values()));
    }

    const cloudRoutines = changes.routines ?? [];
    if (cloudRoutines.length > 0) {
      const local = readJson<RoutineBlock[]>(ROUTINES_KEY, []);
      const map = new Map(local.map((r) => [r.id, r]));
      for (const cr of cloudRoutines) {
        const id = String(cr.id);
        if (cr.deleted_at) {
          map.delete(id);
          continue;
        }
        const prev = map.get(id);
        map.set(id, {
          id,
          title: String(cr.title ?? ""),
          blockType: (cr.block_type as RoutineBlock["blockType"]) ?? "personal",
          pillar: (cr.pillar as RoutineBlock["pillar"]) ?? "productivity",
          startTime: String(cr.start_time ?? "08:00"),
          endTime: String(cr.end_time ?? "09:00"),
          days: Array.isArray(cr.days) ? (cr.days as number[]) : [0, 1, 2, 3, 4, 5, 6],
          isEnabled: Boolean(cr.is_enabled ?? true),
          sortOrder: Number(cr.sort_order ?? 0),
          todayStatus: prev?.todayStatus ?? "not_recorded",
        });
      }
      writeJson(ROUTINES_KEY, Array.from(map.values()));
    }
  },
};
