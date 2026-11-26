import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { addDaysIso, getTodayIso } from "@/core/utils/date";
import { notificationService } from "@/modules/notifications/services/notificationService";
import { createLogger } from "@/shared/logger";
import { PRAYER_ORDER, type PrayerSettings } from "../types/prayer.types";
import { computeDailyPrayerSchedule } from "./prayerCalculator";

const schedulerLogger = createLogger("PrayerScheduler");

const PRAYER_ID_PREFIX = "prayer_";
// 3-day rolling horizon = at most 30 notifications (Adhan + advance),
// leaving headroom below iOS's strict 64 pending local notifications cap.
const ROLLING_HORIZON_DAYS = 3;

export interface PrayerScheduleSummary {
  scheduledCount: number;
  skippedDisabled: boolean;
  permissionGranted: boolean;
  horizonDays: number;
}

export const prayerScheduler = {
  async ensurePrayerChannel(): Promise<void> {
    if (Platform.OS !== "android") return;
    await Notifications.setNotificationChannelAsync("prayer-times", {
      name: "Prayer Times & Adhan Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      enableVibrate: true,
    });
  },

  async clearExistingPrayerNotifications(): Promise<void> {
    if (!notificationService.isSupportedNative()) return;
    try {
      const pending = await Notifications.getAllScheduledNotificationsAsync();
      const prayerIds = pending
        .filter((item) => item.identifier.startsWith(PRAYER_ID_PREFIX))
        .map((item) => item.identifier);
      await Promise.all(
        prayerIds.map((id) =>
          Notifications.cancelScheduledNotificationAsync(id).catch(() => {}),
        ),
      );
    } catch (error) {
      schedulerLogger.warn("Failed clearing prior prayer notifications", {
        error,
      });
    }
  },

  async rescheduleRollingPrayerNotifications(
    settings: PrayerSettings,
  ): Promise<PrayerScheduleSummary> {
    if (!notificationService.isSupportedNative()) {
      return {
        scheduledCount: 0,
        skippedDisabled: !settings.notificationsEnabled,
        permissionGranted: false,
        horizonDays: ROLLING_HORIZON_DAYS,
      };
    }

    await prayerScheduler.clearExistingPrayerNotifications();

    if (!settings.notificationsEnabled) {
      return {
        scheduledCount: 0,
        skippedDisabled: true,
        permissionGranted: true,
        horizonDays: ROLLING_HORIZON_DAYS,
      };
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      return {
        scheduledCount: 0,
        skippedDisabled: false,
        permissionGranted: false,
        horizonDays: ROLLING_HORIZON_DAYS,
      };
    }

    await prayerScheduler.ensurePrayerChannel();

    const now = Date.now();
    const todayIso = getTodayIso();
    let scheduledCount = 0;

    for (let offset = 0; offset < ROLLING_HORIZON_DAYS; offset += 1) {
      const dateIso = addDaysIso(todayIso, offset);
      const schedule = computeDailyPrayerSchedule(settings, dateIso, new Date(now));

      for (const prayerName of PRAYER_ORDER) {
        if (!settings.perPrayerEnabled[prayerName]) continue;
        const entry = schedule.entries.find((e) => e.key === prayerName);
        if (!entry) continue;

        const adhanMs = entry.date.getTime();
        if (adhanMs > now + 15_000) {
          await Notifications.scheduleNotificationAsync({
            identifier: `${PRAYER_ID_PREFIX}${dateIso}_${prayerName}_adhan`,
            content: {
              title: `${entry.label} Prayer Time`,
              body: `${entry.formattedTime} · Tap to enter Prayer Focus Mode`,
              sound: "default",
              data: {
                route: `/(modals)/prayer-focus?prayer=${prayerName}`,
                prayerName,
                prayerDate: dateIso,
              },
              ...(Platform.OS === "android"
                ? { channelId: "prayer-times" }
                : { interruptionLevel: "timeSensitive" as const }),
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: entry.date,
            },
          });
          scheduledCount += 1;
        }

        if (settings.advanceMinutes > 0) {
          const advanceMs = adhanMs - settings.advanceMinutes * 60_000;
          if (advanceMs > now + 15_000) {
            await Notifications.scheduleNotificationAsync({
              identifier: `${PRAYER_ID_PREFIX}${dateIso}_${prayerName}_pre`,
              content: {
                title: `${entry.label} in ${settings.advanceMinutes} min`,
                body: `Prepare for ${entry.label} at ${entry.formattedTime}`,
                sound: "default",
                data: {
                  route: "/(modals)/prayers",
                  prayerName,
                  prayerDate: dateIso,
                },
                ...(Platform.OS === "android" ? { channelId: "prayer-times" } : {}),
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: new Date(advanceMs),
              },
            });
            scheduledCount += 1;
          }
        }
      }
    }

    schedulerLogger.info("Rolling prayer notifications scheduled", {
      scheduledCount,
      city: settings.cityName,
      method: settings.calculationMethod,
      timezone: settings.timezone,
    });

    return {
      scheduledCount,
      skippedDisabled: false,
      permissionGranted: true,
      horizonDays: ROLLING_HORIZON_DAYS,
    };
  },
};
