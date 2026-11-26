import { syncQueueDb } from "@/core/sync/syncQueue";
import { generateUuid, getRecentDateRange } from "@/core/utils/date";
import type {
  PrayerConsistencyStats,
  PrayerLogEntry,
  PrayerLogStatus,
  PrayerName,
  PrayerSettings,
} from "../types/prayer.types";
import { computePrayerConsistency, DEFAULT_PRAYER_SETTINGS } from "./prayerStats";

const SETTINGS_KEY = "newlife_web_prayer_settings_v1";
const LOGS_KEY = "newlife_web_prayer_logs_v1";

function readJson<T>(key: string, fallback: T): T {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T;
    }
  } catch {
    // ignore storage errors
  }
  return fallback;
}

function writeJson<T>(key: string, val: T): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(val));
    }
  } catch {
    // ignore storage errors
  }
}

export const prayerDb = {
  async getSettings(): Promise<PrayerSettings> {
    const saved = readJson<Partial<PrayerSettings>>(SETTINGS_KEY, {});
    return {
      ...DEFAULT_PRAYER_SETTINGS,
      ...saved,
      perPrayerEnabled: {
        ...DEFAULT_PRAYER_SETTINGS.perPrayerEnabled,
        ...(saved.perPrayerEnabled ?? {}),
      },
    };
  },

  async updateSettings(patch: Partial<PrayerSettings>): Promise<PrayerSettings> {
    const curr = await prayerDb.getSettings();
    const next: PrayerSettings = {
      ...curr,
      ...patch,
      perPrayerEnabled: {
        ...curr.perPrayerEnabled,
        ...(patch.perPrayerEnabled ?? {}),
      },
      updatedAt: new Date().toISOString(),
    };
    writeJson(SETTINGS_KEY, next);
    return next;
  },

  async getLogsForDate(dateIso: string): Promise<PrayerLogEntry[]> {
    const all = readJson<PrayerLogEntry[]>(LOGS_KEY, []);
    return all.filter((l) => l.prayerDate === dateIso);
  },

  async getLogsForRange(dates: string[]): Promise<PrayerLogEntry[]> {
    const set = new Set(dates);
    const all = readJson<PrayerLogEntry[]>(LOGS_KEY, []);
    return all.filter((l) => set.has(l.prayerDate));
  },

  async setPrayerStatus(input: {
    prayerDate: string;
    prayerName: PrayerName;
    status: PrayerLogStatus;
    autoMutedTriggered?: boolean;
  }): Promise<PrayerLogEntry> {
    const now = new Date().toISOString();
    const all = readJson<PrayerLogEntry[]>(LOGS_KEY, []);
    const existing = all.find(
      (l) => l.prayerDate === input.prayerDate && l.prayerName === input.prayerName,
    );
    const id = existing?.id ?? generateUuid();
    const entry: PrayerLogEntry = {
      id,
      prayerDate: input.prayerDate,
      prayerName: input.prayerName,
      status: input.status,
      autoMutedTriggered: Boolean(input.autoMutedTriggered),
      loggedAt: now,
    };

    const next = all.filter(
      (l) => !(l.prayerDate === input.prayerDate && l.prayerName === input.prayerName),
    );
    next.push(entry);
    writeJson(LOGS_KEY, next);

    await syncQueueDb.enqueue({
      tableName: "prayer_logs",
      recordId: id,
      operation: "upsert",
      clientUpdatedAt: now,
      payload: {
        id,
        prayer_date: input.prayerDate,
        prayer_name: input.prayerName,
        status: input.status,
        auto_muted_triggered: entry.autoMutedTriggered,
        logged_at: now,
        updated_at: now,
      },
    });

    return entry;
  },

  async getConsistencyStats(
    endDateIso: string,
    days = 7,
  ): Promise<PrayerConsistencyStats> {
    const dates = getRecentDateRange(endDateIso, days);
    const logs = await prayerDb.getLogsForRange(dates);
    return computePrayerConsistency(logs, endDateIso, days);
  },
};
