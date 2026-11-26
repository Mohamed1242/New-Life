import { getDatabase } from "@/core/db";
import { syncQueueDb } from "@/core/sync/syncQueue";
import { generateUuid, getRecentDateRange } from "@/core/utils/date";
import type {
  AsrSchool,
  PerPrayerEnabledMap,
  PrayerCalculationMethodKey,
  PrayerConsistencyStats,
  PrayerLocationMode,
  PrayerLogEntry,
  PrayerLogStatus,
  PrayerName,
  PrayerSettings,
} from "../types/prayer.types";
import { computePrayerConsistency, DEFAULT_PRAYER_SETTINGS } from "./prayerStats";

interface PrayerSettingsRow {
  location_mode: string;
  city_name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  calculation_method: string;
  asr_school: string;
  notifications_enabled: number;
  advance_minutes: number;
  focus_duration_minutes: number;
  audio_focus_enabled: number;
  per_prayer_enabled_json: string;
  updated_at: string;
}

interface PrayerLogRow {
  id: string;
  prayer_date: string;
  prayer_name: PrayerName;
  status: PrayerLogStatus;
  auto_muted_triggered: number;
  logged_at: string;
}

function mapSettings(row: PrayerSettingsRow | null): PrayerSettings {
  if (!row) return { ...DEFAULT_PRAYER_SETTINGS };
  let perPrayer: PerPrayerEnabledMap = { ...DEFAULT_PRAYER_SETTINGS.perPrayerEnabled };
  try {
    perPrayer = {
      ...perPrayer,
      ...(JSON.parse(row.per_prayer_enabled_json) as Partial<PerPrayerEnabledMap>),
    };
  } catch {
    // keep defaults
  }

  return {
    locationMode: (row.location_mode as PrayerLocationMode) || "manual",
    cityName: row.city_name || "Cairo, Egypt",
    latitude: Number(row.latitude ?? 30.0444),
    longitude: Number(row.longitude ?? 31.2357),
    timezone: row.timezone || DEFAULT_PRAYER_SETTINGS.timezone,
    calculationMethod:
      (row.calculation_method as PrayerCalculationMethodKey) || "Egyptian",
    asrSchool: (row.asr_school as AsrSchool) || "shafi",
    notificationsEnabled: row.notifications_enabled === 1,
    advanceMinutes: Number(row.advance_minutes ?? 10),
    focusDurationMinutes: Number(row.focus_duration_minutes ?? 10),
    audioFocusEnabled: row.audio_focus_enabled === 1,
    perPrayerEnabled: perPrayer,
    updatedAt: row.updated_at,
  };
}

function mapLog(row: PrayerLogRow): PrayerLogEntry {
  return {
    id: row.id,
    prayerDate: row.prayer_date,
    prayerName: row.prayer_name,
    status: row.status,
    autoMutedTriggered: row.auto_muted_triggered === 1,
    loggedAt: row.logged_at,
  };
}

export const prayerDb = {
  async getSettings(): Promise<PrayerSettings> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<PrayerSettingsRow>(
      "SELECT * FROM prayer_settings WHERE id = 1",
    );
    return mapSettings(row);
  },

  async updateSettings(patch: Partial<PrayerSettings>): Promise<PrayerSettings> {
    const current = await prayerDb.getSettings();
    const next: PrayerSettings = {
      ...current,
      ...patch,
      perPrayerEnabled: {
        ...current.perPrayerEnabled,
        ...(patch.perPrayerEnabled ?? {}),
      },
      updatedAt: new Date().toISOString(),
    };

    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO prayer_settings (
         id, location_mode, city_name, latitude, longitude, timezone,
         calculation_method, asr_school, notifications_enabled, advance_minutes,
         focus_duration_minutes, audio_focus_enabled, per_prayer_enabled_json, updated_at
       ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         location_mode = excluded.location_mode,
         city_name = excluded.city_name,
         latitude = excluded.latitude,
         longitude = excluded.longitude,
         timezone = excluded.timezone,
         calculation_method = excluded.calculation_method,
         asr_school = excluded.asr_school,
         notifications_enabled = excluded.notifications_enabled,
         advance_minutes = excluded.advance_minutes,
         focus_duration_minutes = excluded.focus_duration_minutes,
         audio_focus_enabled = excluded.audio_focus_enabled,
         per_prayer_enabled_json = excluded.per_prayer_enabled_json,
         updated_at = excluded.updated_at`,
      [
        next.locationMode,
        next.cityName,
        next.latitude,
        next.longitude,
        next.timezone,
        next.calculationMethod,
        next.asrSchool,
        next.notificationsEnabled ? 1 : 0,
        next.advanceMinutes,
        next.focusDurationMinutes,
        next.audioFocusEnabled ? 1 : 0,
        JSON.stringify(next.perPrayerEnabled),
        next.updatedAt,
      ],
    );

    return next;
  },

  async getLogsForDate(dateIso: string): Promise<PrayerLogEntry[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<PrayerLogRow>(
      `SELECT id, prayer_date, prayer_name, status, auto_muted_triggered, logged_at
       FROM prayer_logs
       WHERE prayer_date = ? AND deleted_at IS NULL`,
      [dateIso],
    );
    return rows.map(mapLog);
  },

  async getLogsForRange(dates: string[]): Promise<PrayerLogEntry[]> {
    if (dates.length === 0) return [];
    const db = await getDatabase();
    const placeholders = dates.map(() => "?").join(", ");
    const rows = await db.getAllAsync<PrayerLogRow>(
      `SELECT id, prayer_date, prayer_name, status, auto_muted_triggered, logged_at
       FROM prayer_logs
       WHERE prayer_date IN (${placeholders}) AND deleted_at IS NULL`,
      dates,
    );
    return rows.map(mapLog);
  },

  async setPrayerStatus(input: {
    prayerDate: string;
    prayerName: PrayerName;
    status: PrayerLogStatus;
    autoMutedTriggered?: boolean;
  }): Promise<PrayerLogEntry> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const existing = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM prayer_logs WHERE prayer_date = ? AND prayer_name = ?",
      [input.prayerDate, input.prayerName],
    );
    const id = existing?.id ?? generateUuid();
    const muted = Boolean(input.autoMutedTriggered);

    await db.runAsync(
      `INSERT INTO prayer_logs (id, prayer_date, prayer_name, status, auto_muted_triggered, logged_at, created_at, updated_at, deleted_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending')
       ON CONFLICT(prayer_date, prayer_name) DO UPDATE SET
         status = excluded.status,
         auto_muted_triggered = excluded.auto_muted_triggered,
         logged_at = excluded.logged_at,
         updated_at = excluded.updated_at,
         deleted_at = NULL,
         sync_status = 'pending'`,
      [
        id,
        input.prayerDate,
        input.prayerName,
        input.status,
        muted ? 1 : 0,
        now,
        now,
        now,
      ],
    );

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
        auto_muted_triggered: muted,
        logged_at: now,
        updated_at: now,
      },
    });

    return {
      id,
      prayerDate: input.prayerDate,
      prayerName: input.prayerName,
      status: input.status,
      autoMutedTriggered: muted,
      loggedAt: now,
    };
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
