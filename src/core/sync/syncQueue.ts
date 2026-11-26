import { getDatabase } from "@/core/db";
import { generateUuid } from "@/core/utils/date";

export type SyncTableName =
  | "user_preferences"
  | "goals"
  | "tasks"
  | "task_logs"
  | "habits"
  | "habit_logs"
  | "negative_habit_logs"
  | "routines"
  | "routine_logs"
  | "workouts"
  | "exercises"
  | "prayer_logs"
  | "reminders";

export interface SyncQueueItem {
  id: string;
  tableName: SyncTableName;
  recordId: string;
  operation: "upsert" | "delete";
  payload: Record<string, unknown>;
  clientUpdatedAt: string;
  retryCount: number;
  lastError: string | null;
}

export interface SyncMetadata {
  lastPulledAt: string | null;
  lastPushedAt: string | null;
  lastSyncStatus: "idle" | "syncing" | "success" | "error";
  lastSyncError: string | null;
}

interface QueueRow {
  id: string;
  table_name: string;
  record_id: string;
  operation: string;
  payload_json: string;
  client_updated_at: string;
  retry_count: number;
  last_error: string | null;
}

interface MetadataRow {
  last_pulled_at: string | null;
  last_pushed_at: string | null;
  last_sync_status: string;
  last_sync_error: string | null;
}

export const syncQueueDb = {
  async enqueue(params: {
    tableName: SyncTableName;
    recordId: string;
    operation: "upsert" | "delete";
    payload: Record<string, unknown>;
    clientUpdatedAt?: string;
  }): Promise<void> {
    const db = await getDatabase();
    const now = params.clientUpdatedAt ?? new Date().toISOString();
    // Deduplicate pending item for same table+record so only latest state is pushed
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "DELETE FROM sync_queue WHERE table_name = ? AND record_id = ?",
        [params.tableName, params.recordId],
      );
      await db.runAsync(
        `INSERT INTO sync_queue (id, table_name, record_id, operation, payload_json, client_updated_at, retry_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          generateUuid(),
          params.tableName,
          params.recordId,
          params.operation,
          JSON.stringify(params.payload),
          now,
          now,
        ],
      );
    });
  },

  async listPending(limit = 100): Promise<SyncQueueItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<QueueRow>(
      "SELECT * FROM sync_queue ORDER BY created_at ASC LIMIT ?",
      [limit],
    );
    return rows.map((r) => ({
      id: r.id,
      tableName: r.table_name as SyncTableName,
      recordId: r.record_id,
      operation: r.operation as "upsert" | "delete",
      payload: JSON.parse(r.payload_json) as Record<string, unknown>,
      clientUpdatedAt: r.client_updated_at,
      retryCount: r.retry_count,
      lastError: r.last_error,
    }));
  },

  async countPending(): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM sync_queue",
    );
    return row?.count ?? 0;
  },

  async removeByRecordIds(recordIds: string[]): Promise<void> {
    if (recordIds.length === 0) return;
    const db = await getDatabase();
    const placeholders = recordIds.map(() => "?").join(",");
    await db.runAsync(
      `DELETE FROM sync_queue WHERE record_id IN (${placeholders})`,
      recordIds,
    );
  },

  async markFailed(recordId: string, errorMessage: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE sync_queue SET retry_count = retry_count + 1, last_error = ? WHERE record_id = ?",
      [errorMessage, recordId],
    );
  },

  async getMetadata(): Promise<SyncMetadata> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<MetadataRow>(
      "SELECT last_pulled_at, last_pushed_at, last_sync_status, last_sync_error FROM sync_metadata WHERE id = 1",
    );
    if (!row) {
      return {
        lastPulledAt: null,
        lastPushedAt: null,
        lastSyncStatus: "idle",
        lastSyncError: null,
      };
    }
    return {
      lastPulledAt: row.last_pulled_at,
      lastPushedAt: row.last_pushed_at,
      lastSyncStatus: (row.last_sync_status as SyncMetadata["lastSyncStatus"]) ?? "idle",
      lastSyncError: row.last_sync_error,
    };
  },

  async updateMetadata(patch: Partial<SyncMetadata>): Promise<void> {
    const db = await getDatabase();
    const curr = await syncQueueDb.getMetadata();
    await db.runAsync(
      `UPDATE sync_metadata
       SET last_pulled_at = ?, last_pushed_at = ?, last_sync_status = ?, last_sync_error = ?, updated_at = ?
       WHERE id = 1`,
      [
        patch.lastPulledAt !== undefined ? patch.lastPulledAt : curr.lastPulledAt,
        patch.lastPushedAt !== undefined ? patch.lastPushedAt : curr.lastPushedAt,
        patch.lastSyncStatus ?? curr.lastSyncStatus,
        patch.lastSyncError !== undefined ? patch.lastSyncError : curr.lastSyncError,
        new Date().toISOString(),
      ],
    );
  },

  async mergePulledChanges(changes: Record<string, Record<string, unknown>[]>): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      const tasks = changes.tasks ?? [];
      for (const t of tasks) {
        await db.runAsync(
          `INSERT INTO tasks (id, title, notes, category, time_label, date_iso, priority, repeat_rule, custom_days_json, reminder_enabled, status, completed, postponed_to, created_at, updated_at, deleted_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title,
             notes = excluded.notes,
             category = excluded.category,
             time_label = excluded.time_label,
             date_iso = excluded.date_iso,
             priority = excluded.priority,
             repeat_rule = excluded.repeat_rule,
             custom_days_json = excluded.custom_days_json,
             reminder_enabled = excluded.reminder_enabled,
             status = excluded.status,
             completed = excluded.completed,
             postponed_to = excluded.postponed_to,
             updated_at = excluded.updated_at,
             deleted_at = excluded.deleted_at,
             sync_status = 'synced'
           WHERE tasks.updated_at < excluded.updated_at`,
          [
            String(t.id),
            String(t.title ?? ""),
            String(t.notes ?? ""),
            String(t.category ?? "custom"),
            String(t.time_label ?? "09:00 AM"),
            String(t.date_iso),
            String(t.priority ?? "medium"),
            String(t.repeat_rule ?? "once"),
            JSON.stringify(t.custom_days ?? []),
            t.reminder_enabled ? 1 : 0,
            String(t.status ?? "not_recorded"),
            t.completed ? 1 : 0,
            t.postponed_to ? String(t.postponed_to) : null,
            String(t.created_at ?? now),
            String(t.updated_at ?? now),
            t.deleted_at ? String(t.deleted_at) : null,
          ],
        );
      }

      const habits = changes.habits ?? [];
      for (const h of habits) {
        await db.runAsync(
          `INSERT INTO habits (id, title, polarity, category, target_label, frequency_type, target_per_week, custom_days_json, streak_days, best_streak, grace_used_this_week, last_recovery_date, weekly_consistency_pct, created_at, updated_at, deleted_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title,
             polarity = excluded.polarity,
             category = excluded.category,
             target_label = excluded.target_label,
             frequency_type = excluded.frequency_type,
             target_per_week = excluded.target_per_week,
             custom_days_json = excluded.custom_days_json,
             streak_days = excluded.streak_days,
             best_streak = excluded.best_streak,
             grace_used_this_week = excluded.grace_used_this_week,
             last_recovery_date = excluded.last_recovery_date,
             weekly_consistency_pct = excluded.weekly_consistency_pct,
             updated_at = excluded.updated_at,
             deleted_at = excluded.deleted_at,
             sync_status = 'synced'
           WHERE habits.updated_at < excluded.updated_at`,
          [
            String(h.id),
            String(h.title ?? ""),
            String(h.polarity ?? "positive"),
            String(h.category ?? "health"),
            String(h.target_label ?? "Daily"),
            String(h.frequency_type ?? "daily"),
            Number(h.target_per_week ?? 7),
            JSON.stringify(h.custom_days ?? [0, 1, 2, 3, 4, 5, 6]),
            Number(h.streak_days ?? 0),
            Number(h.best_streak ?? 0),
            h.grace_used_this_week ? 1 : 0,
            h.last_recovery_date ? String(h.last_recovery_date) : null,
            Number(h.weekly_consistency_pct ?? 0),
            String(h.created_at ?? now),
            String(h.updated_at ?? now),
            h.deleted_at ? String(h.deleted_at) : null,
          ],
        );
      }

      const routines = changes.routines ?? [];
      for (const r of routines) {
        await db.runAsync(
          `INSERT INTO routine_blocks (id, title, block_type, pillar, start_time, end_time, days_json, is_enabled, sort_order, created_at, updated_at, deleted_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title,
             block_type = excluded.block_type,
             pillar = excluded.pillar,
             start_time = excluded.start_time,
             end_time = excluded.end_time,
             days_json = excluded.days_json,
             is_enabled = excluded.is_enabled,
             sort_order = excluded.sort_order,
             updated_at = excluded.updated_at,
             deleted_at = excluded.deleted_at,
             sync_status = 'synced'
           WHERE routine_blocks.updated_at < excluded.updated_at`,
          [
            String(r.id),
            String(r.title ?? ""),
            String(r.block_type ?? "personal"),
            String(r.pillar ?? "productivity"),
            String(r.start_time ?? "08:00"),
            String(r.end_time ?? "09:00"),
            JSON.stringify(r.days ?? [0, 1, 2, 3, 4, 5, 6]),
            r.is_enabled ? 1 : 0,
            Number(r.sort_order ?? 0),
            String(r.created_at ?? now),
            String(r.updated_at ?? now),
            r.deleted_at ? String(r.deleted_at) : null,
          ],
        );
      }

      const prayerLogs = changes.prayer_logs ?? [];
      for (const p of prayerLogs) {
        await db.runAsync(
          `INSERT INTO prayer_logs (id, prayer_date, prayer_name, status, auto_muted_triggered, logged_at, created_at, updated_at, deleted_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
           ON CONFLICT(prayer_date, prayer_name) DO UPDATE SET
             status = excluded.status,
             auto_muted_triggered = excluded.auto_muted_triggered,
             logged_at = excluded.logged_at,
             updated_at = excluded.updated_at,
             deleted_at = excluded.deleted_at,
             sync_status = 'synced'
           WHERE prayer_logs.updated_at < excluded.updated_at`,
          [
            String(p.id),
            String(p.prayer_date),
            String(p.prayer_name),
            String(p.status ?? "not_recorded"),
            p.auto_muted_triggered ? 1 : 0,
            String(p.logged_at ?? now),
            String(p.created_at ?? now),
            String(p.updated_at ?? now),
            p.deleted_at ? String(p.deleted_at) : null,
          ],
        );
      }

      const reminders = changes.reminders ?? [];
      for (const rem of reminders) {
        if (rem.entity_type !== "custom_alarm") continue;
        const triggerStr = String(rem.trigger_time ?? "06:00");
        const [hStr, mStr] = triggerStr.split(":");
        const hour = Math.min(23, Math.max(0, Number(hStr ?? 6)));
        const minute = Math.min(59, Math.max(0, Number(mStr ?? 0)));
        const repeatStr = String(rem.repeat_rule ?? "[0,1,2,3,4,5,6]");
        const daysJson = repeatStr.startsWith("[") ? repeatStr : "[0,1,2,3,4,5,6]";

        await db.runAsync(
          `INSERT INTO alarms (id, label, hour, minute, days_json, sound_key, snooze_minutes, is_enabled, vibrate, created_at, updated_at, deleted_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, 5, ?, 1, ?, ?, ?, 'synced')
           ON CONFLICT(id) DO UPDATE SET
             label = excluded.label,
             hour = excluded.hour,
             minute = excluded.minute,
             days_json = excluded.days_json,
             sound_key = excluded.sound_key,
             is_enabled = excluded.is_enabled,
             updated_at = excluded.updated_at,
             deleted_at = excluded.deleted_at,
             sync_status = 'synced'
           WHERE alarms.updated_at < excluded.updated_at`,
          [
            String(rem.id),
            String(rem.title ?? "Wake-Up Alarm"),
            hour,
            minute,
            daysJson,
            String(rem.sound_key ?? "gentle_dawn"),
            rem.is_enabled ? 1 : 0,
            String(rem.created_at ?? now),
            String(rem.updated_at ?? now),
            rem.deleted_at ? String(rem.deleted_at) : null,
          ],
        );
      }

      const workouts = changes.workouts ?? [];
      for (const w of workouts) {
        await db.runAsync(
          `INSERT INTO workouts (id, title, workout_type, started_at, duration_min, perceived_effort, calories_est, notes, created_at, updated_at, deleted_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title,
             workout_type = excluded.workout_type,
             started_at = excluded.started_at,
             duration_min = excluded.duration_min,
             perceived_effort = excluded.perceived_effort,
             calories_est = excluded.calories_est,
             notes = excluded.notes,
             updated_at = excluded.updated_at,
             deleted_at = excluded.deleted_at,
             sync_status = 'synced'
           WHERE workouts.updated_at < excluded.updated_at`,
          [
            String(w.id),
            String(w.title ?? "Workout"),
            String(w.workout_type ?? "strength"),
            String(w.started_at ?? now),
            Number(w.duration_min ?? 30),
            w.perceived_effort != null ? Number(w.perceived_effort) : null,
            w.calories_est != null ? Number(w.calories_est) : null,
            String(w.notes ?? ""),
            String(w.created_at ?? now),
            String(w.updated_at ?? now),
            w.deleted_at ? String(w.deleted_at) : null,
          ],
        );
      }
    });
  },
};
