import { getRecentDateRange } from "@/core/utils/date";
import {
  PRAYER_ORDER,
  type PrayerConsistencyStats,
  type PrayerLogEntry,
  type PrayerSettings,
} from "../types/prayer.types";

export const DEFAULT_PRAYER_SETTINGS: PrayerSettings = {
  locationMode: "manual",
  cityName: "Cairo, Egypt",
  latitude: 30.0444,
  longitude: 31.2357,
  timezone:
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Cairo"
      : "Africa/Cairo",
  calculationMethod: "Egyptian",
  asrSchool: "shafi",
  notificationsEnabled: true,
  advanceMinutes: 10,
  focusDurationMinutes: 10,
  audioFocusEnabled: true,
  perPrayerEnabled: {
    fajr: true,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true,
  },
  updatedAt: new Date().toISOString(),
};

/**
 * Computes daily/weekly prayer consistency from recorded logs without ever
 * assuming unrecorded prayers were missed.
 */
export function computePrayerConsistency(
  logs: PrayerLogEntry[],
  endDateIso: string,
  days: number,
): PrayerConsistencyStats {
  const dateRange = getRecentDateRange(endDateIso, days);
  const logMap = new Map<string, PrayerLogEntry>();
  for (const log of logs) {
    logMap.set(`${log.prayerDate}_${log.prayerName}`, log);
  }

  let onTimeCount = 0;
  let delayedCount = 0;
  let qadaCount = 0;
  let missedCount = 0;
  let notRecordedCount = 0;

  for (const day of dateRange) {
    for (const prayer of PRAYER_ORDER) {
      const entry = logMap.get(`${day}_${prayer}`);
      const status = entry?.status ?? "not_recorded";
      if (status === "on_time") onTimeCount += 1;
      else if (status === "delayed") delayedCount += 1;
      else if (status === "qada") qadaCount += 1;
      else if (status === "missed") missedCount += 1;
      else notRecordedCount += 1;
    }
  }

  const totalObligatorySlots = dateRange.length * PRAYER_ORDER.length;
  const recordedCount = onTimeCount + delayedCount + qadaCount + missedCount;
  const completedCount = onTimeCount + delayedCount + qadaCount;

  const recordedConsistencyPct =
    recordedCount > 0 ? Math.round((completedCount / recordedCount) * 100) : 0;
  const onTimePct =
    recordedCount > 0 ? Math.round((onTimeCount / recordedCount) * 100) : 0;

  return {
    days,
    totalObligatorySlots,
    recordedCount,
    onTimeCount,
    delayedCount,
    qadaCount,
    missedCount,
    notRecordedCount,
    recordedConsistencyPct,
    onTimePct,
  };
}
