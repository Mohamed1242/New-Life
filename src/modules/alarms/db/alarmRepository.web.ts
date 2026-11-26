import { syncQueueDb } from "@/core/sync/syncQueue";
import { generateUuid } from "@/core/utils/date";
import type {
  AlarmItem,
  AlarmPlatformMode,
  UpsertAlarmInput,
} from "../types/alarm.types";

const ALARMS_KEY = "newlife_web_alarms_v1";

const DEFAULT_ALARMS: AlarmItem[] = [
  {
    id: "alarm_dawn_seed",
    label: "Fajr & Dawn Wake-Up",
    hour: 5,
    minute: 0,
    days: [0, 1, 2, 3, 4, 5, 6],
    soundKey: "gentle_dawn",
    snoozeMinutes: 5,
    isEnabled: false,
    vibrate: true,
    nextFireAt: null,
    snoozedUntil: null,
    platformMode: "scheduled_notification",
  },
];

function readStore(): AlarmItem[] {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(ALARMS_KEY);
      if (raw) return JSON.parse(raw) as AlarmItem[];
    }
  } catch {
    // ignore storage errors
  }
  return [...DEFAULT_ALARMS];
}

function writeStore(list: AlarmItem[]): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(ALARMS_KEY, JSON.stringify(list));
    }
  } catch {
    // ignore storage errors
  }
}

export const alarmDb = {
  async listAlarms(): Promise<AlarmItem[]> {
    return readStore().sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
  },

  async getAlarmById(id: string): Promise<AlarmItem | null> {
    return readStore().find((a) => a.id === id) ?? null;
  },

  async upsertAlarm(input: UpsertAlarmInput): Promise<AlarmItem> {
    const now = new Date().toISOString();
    const list = readStore();
    const id = input.id ?? generateUuid();
    const existing = list.find((a) => a.id === id);

    const saved: AlarmItem = {
      id,
      label: input.label.trim() || "Wake-Up Alarm",
      hour: input.hour,
      minute: input.minute,
      days: input.days,
      soundKey: input.soundKey,
      snoozeMinutes: input.snoozeMinutes,
      isEnabled: input.isEnabled,
      vibrate: input.vibrate,
      nextFireAt: existing?.nextFireAt ?? null,
      snoozedUntil: null,
      platformMode: existing?.platformMode ?? "scheduled_notification",
    };

    const next = list.filter((a) => a.id !== id);
    next.push(saved);
    writeStore(next);

    await syncQueueDb.enqueue({
      tableName: "reminders",
      recordId: id,
      operation: "upsert",
      clientUpdatedAt: now,
      payload: {
        id,
        entity_type: "custom_alarm",
        entity_id: null,
        title: saved.label,
        trigger_time: `${String(saved.hour).padStart(2, "0")}:${String(saved.minute).padStart(2, "0")}`,
        repeat_rule: JSON.stringify(saved.days),
        is_alarm: true,
        sound_key: saved.soundKey,
        is_enabled: saved.isEnabled,
        updated_at: now,
      },
    });

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
    const list = readStore().map((item) =>
      item.id === id
        ? {
            ...item,
            nextFireAt: meta.nextFireAt,
            snoozedUntil:
              meta.snoozedUntil !== undefined
                ? meta.snoozedUntil
                : item.snoozedUntil,
            platformMode: meta.platformMode,
          }
        : item,
    );
    writeStore(list);
  },

  async deleteAlarm(id: string): Promise<void> {
    const now = new Date().toISOString();
    writeStore(readStore().filter((a) => a.id !== id));
    await syncQueueDb.enqueue({
      tableName: "reminders",
      recordId: id,
      operation: "delete",
      clientUpdatedAt: now,
      payload: { id, deleted_at: now, updated_at: now },
    });
  },
};
