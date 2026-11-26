import { useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTodayIso } from "@/core/utils/date";
import { prayerDb } from "../db/prayerRepository";
import { DEFAULT_PRAYER_SETTINGS } from "../db/prayerStats";
import {
  computeDailyPrayerSchedule,
  detectDeviceTimezone,
} from "../services/prayerCalculator";
import { prayerScheduler } from "../services/prayerScheduler";
import type {
  PrayerLogStatus,
  PrayerName,
  PrayerSettings,
} from "../types/prayer.types";

export const PRAYER_KEYS = {
  settings: ["prayer", "settings"] as const,
  logs: (dateIso: string) => ["prayer", "logs", dateIso] as const,
  stats: (dateIso: string, days: number) =>
    ["prayer", "stats", dateIso, days] as const,
};

export function usePrayerSettings() {
  return useQuery({
    queryKey: PRAYER_KEYS.settings,
    queryFn: () => prayerDb.getSettings(),
    staleTime: 60_000,
  });
}

export function useUpdatePrayerSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<PrayerSettings>) => {
      const next = await prayerDb.updateSettings(patch);
      await prayerScheduler.rescheduleRollingPrayerNotifications(next);
      return next;
    },
    onSuccess: (next) => {
      qc.setQueryData(PRAYER_KEYS.settings, next);
    },
  });
}

export function useDailyPrayerSchedule(dateIso?: string) {
  const targetIso = dateIso ?? getTodayIso();
  const { data: settings } = usePrayerSettings();
  const activeSettings = settings ?? DEFAULT_PRAYER_SETTINGS;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 30_000);

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setTick((t) => t + 1);
      }
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);

  return useMemo(() => {
    void tick;
    const liveTz = detectDeviceTimezone();
    const effectiveSettings =
      activeSettings.locationMode === "gps" &&
      liveTz !== activeSettings.timezone
        ? { ...activeSettings, timezone: liveTz }
        : activeSettings;
    return computeDailyPrayerSchedule(effectiveSettings, targetIso, new Date());
  }, [activeSettings, targetIso, tick]);
}

export function usePrayerLogsForDate(dateIso?: string) {
  const targetIso = dateIso ?? getTodayIso();
  return useQuery({
    queryKey: PRAYER_KEYS.logs(targetIso),
    queryFn: () => prayerDb.getLogsForDate(targetIso),
  });
}

export function usePrayerConsistency(endDateIso?: string, days = 7) {
  const targetIso = endDateIso ?? getTodayIso();
  return useQuery({
    queryKey: PRAYER_KEYS.stats(targetIso, days),
    queryFn: () => prayerDb.getConsistencyStats(targetIso, days),
  });
}

export function useLogPrayerStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      prayerDate: string;
      prayerName: PrayerName;
      status: PrayerLogStatus;
      autoMutedTriggered?: boolean;
    }) => prayerDb.setPrayerStatus(input),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: PRAYER_KEYS.logs(vars.prayerDate) });
      qc.invalidateQueries({ queryKey: ["prayer", "stats"] });
    },
  });
}
