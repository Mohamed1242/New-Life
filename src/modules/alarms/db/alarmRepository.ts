import { getDatabase } from "@/core/db";
import { syncQueueDb } from "@/core/sync/syncQueue";
import { generateUuid } from "@/core/utils/date";
import type {
  AlarmItem,
  AlarmPlatformMode,
  AlarmSoundKey,
  UpsertAlarmInput,
} from "../types/alarm.types";

interface AlarmRow {
  id: string;
  label: string;
  hour: number;
  minute: number;
  days_json: string;
  sound_key: string;
  snooze_minutes: number;
  is_enabled: number;
  vibrate: number;
  next_fire_at: string | null;
  snoozed_until: string | null;
  platform_mode: string;
}

function mapAlarm(row: AlarmRow): AlarmItem {
  let days: number[] = [0, 1, 2, 3, 4, 5, 6];
  try {
    const parsed = JSON.parse(row.days_json);
    if (Array.isArray(parsed)) days = parsed.map(Number);
  } catch {
    // keep default
  }

  return {
    id: row.id,
    label: row.label,
    hour: row.hour,
    minute: row.minute,
    days,
    soundKey: (row.sound_key as AlarmSoundKey) || "gentle_dawn",
    snoozeMinutes: row.snooze_minutes || 5,
    isEnabled: row.is_enabled === 1,
    vibrate: row.vibrate === 1,
    nextFireAt: row.next_fire_at,
    snoozedUntil: row.snoozed_until,
    platformMode:
      (row.platform_mode as AlarmPlatformMode) || "scheduled_notification",
  };
}

function formatTriggerTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export const alarmDb = {
  async listAlarms(): Promise<AlarmItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<AlarmRow>(
      `SELECT id, label, hour, minute, days_json, sound_key, snooze_minutes,
              is_enabled, vibrate, next_fire_at, snoozed_until, platform_mode
       FROM alarms
       WHERE deleted_at IS NULL
       ORDER BY hour ASC, minute ASC`,
    );
    return rows.map(mapAlarm);
  },

  async getAlarmById(id: string): Promise<AlarmItem | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<AlarmRow>(
      `SELECT id, label, hour, minute, days_json, sound_key, snooze_minutes,
              is_enabled, vibrate, next_fire_at, snoozed_until, platform_mode
       FROM alarms
       WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    return row ? mapAlarm(row) : null;
  },

  async upsertAlarm(input: UpsertAlarmInput): Promise<AlarmItem> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const id = input.id ?? generateUuid();
    const existing = input.id ? await alarmDb.getAlarmById(input.id) : null;
    const daysJson = JSON.stringify(input.days);

    await db.runAsync(
      `INSERT INTO alarms (id, label, hour, minute, days_json, sound_key, snooze_minutes, is_enabled, vibrate, next_fire_at, snoozed_until, platform_mode, created_at, updated_at, deleted_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, NULL, 'pending')
       ON CONFLICT(id) DO UPDATE SET
         label = excluded.label,
         hour = excluded.hour,
         minute = excluded.minute,
         days_json = excluded.days_json,
         sound_key = excluded.sound_key,
         snooze_minutes = excluded.snooze_minutes,
         is_enabled = excluded.is_enabled,
         vibrate = excluded.vibrate,
         snoozed_until = NULL,
         updated_at = excluded.updated_at,
         deleted_at = NULL,
         sync_status = 'pending'`,
      [
        id,
        input.label.trim() || "Wake-Up Alarm",
        input.hour,
        input.minute,
        daysJson,
        input.soundKey,
        input.snoozeMinutes,
        input.isEnabled ? 1 : 0,
        input.vibrate ? 1 : 0,
        existing?.platformMode ?? "scheduled_notification",
        now,
        now,
      ],
    );

    await syncQueueDb.enqueue({
      tableName: "reminders",
      recordId: id,
      operation: "upsert",
      clientUpdatedAt: now,
      payload: {
        id,
        entity_type: "custom_alarm",
        entity_id: null,
        title: input.label.trim() || "Wake-Up Alarm",
        trigger_time: formatTriggerTime(input.hour, input.minute),
        repeat_rule: daysJson,
        is_alarm: true,
        sound_key: input.soundKey,
        is_enabled: input.isEnabled,
        updated_at: now,
      },
    });

    const saved = await alarmDb.getAlarmById(id);
    if (!saved) {
      throw new Error("Failed to read back saved alarm");
    }
    return saved;
  },

  async setAlarmEnabled(id: string, isEnabled: boolean): Promise<AlarmItem | null> {
    const existing = await alarmDb.getAlarmById(id);
    if (!existing) return null;
    return alarmDb.upsertAlarm({ ...existing, isEnabled });
  },

  async updateScheduleMeta(
    id: string,
    meta: {
      nextFireAt: string | null;
      snoozedUntil?: string | null;
      platformMode: AlarmPlatformMode;
    },
  ): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE alarms
       SET next_fire_at = ?, snoozed_until = ?, platform_mode = ?
       WHERE id = ?`,
      [
        meta.nextFireAt,
        meta.snoozedUntil !== undefined ? meta.snoozedUntil : null,
        meta.platformMode,
        id,
      ],
    );
  },

  async deleteAlarm(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE alarms SET deleted_at = ?, is_enabled = 0, updated_at = ?, sync_status = 'pending' WHERE id = ?`,
      [now, now, id],
    );
    await syncQueueDb.enqueue({
      tableName: "reminders",
      recordId: id,
      operation: "delete",
      clientUpdatedAt: now,
      payload: { id, deleted_at: now, updated_at: now },
    });
  },
};
