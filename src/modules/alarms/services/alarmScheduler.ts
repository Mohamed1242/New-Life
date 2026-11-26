import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { notificationService } from "@/modules/notifications/services/notificationService";
import { createLogger } from "@/shared/logger";
import {
  wakeAlarmNative,
  type NativeWakeAlarmCapabilities,
} from "../../../../modules/wake-alarm";
import { alarmDb } from "../db/alarmRepository";
import { formatAlarmClock, type AlarmItem, type AlarmPlatformMode } from "../types/alarm.types";
import { computeNextAlarmFireDate } from "../utils/alarmMath";

export { computeNextAlarmFireDate };

const alarmLogger = createLogger("AlarmScheduler");

const ALARM_NOTIF_PREFIX = "alarm_";
const SNOOZE_NOTIF_PREFIX = "alarm_snooze_";

export const alarmScheduler = {
  getCapabilities(): NativeWakeAlarmCapabilities {
    return wakeAlarmNative.getCapabilities();
  },

  openExactAlarmSettings(): boolean {
    return wakeAlarmNative.openExactAlarmSettings();
  },

  async ensureAlarmChannel(): Promise<void> {
    if (Platform.OS !== "android") return;
    await Notifications.setNotificationChannelAsync("wake-alarms", {
      name: "Wake-Up Alarms",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      enableVibrate: true,
      bypassDnd: true,
    });
  },

  async cancelAlarmSchedule(alarmId: string): Promise<void> {
    wakeAlarmNative.cancelExactAlarm(alarmId);
    wakeAlarmNative.cancelExactAlarm(`snooze_${alarmId}`);
    if (notificationService.isSupportedNative()) {
      await Notifications.cancelScheduledNotificationAsync(
        `${ALARM_NOTIF_PREFIX}${alarmId}`,
      ).catch(() => {});
      await Notifications.cancelScheduledNotificationAsync(
        `${SNOOZE_NOTIF_PREFIX}${alarmId}`,
      ).catch(() => {});
    }
  },

  async scheduleAlarm(alarm: AlarmItem): Promise<{
    nextFireAt: string | null;
    platformMode: AlarmPlatformMode;
  }> {
    await alarmScheduler.cancelAlarmSchedule(alarm.id);

    if (!alarm.isEnabled) {
      await alarmDb.updateScheduleMeta(alarm.id, {
        nextFireAt: null,
        snoozedUntil: null,
        platformMode: wakeAlarmNative.getCapabilities().mode,
      });
      return {
        nextFireAt: null,
        platformMode: wakeAlarmNative.getCapabilities().mode,
      };
    }

    const fireDate = computeNextAlarmFireDate(alarm);
    const nextFireAt = fireDate.toISOString();
    const { time, meridiem } = formatAlarmClock(alarm.hour, alarm.minute);

    // 1. Try true Android AlarmManager exact alarm when native module + permission exist
    const nativeRes = wakeAlarmNative.scheduleExactAlarm(
      alarm.id,
      `${alarm.label} (${time} ${meridiem})`,
      fireDate.getTime(),
    );

    if (nativeRes.scheduled) {
      await alarmDb.updateScheduleMeta(alarm.id, {
        nextFireAt,
        platformMode: "system_alarm",
      });
      alarmLogger.info("Armed Android system alarm", {
        alarmId: alarm.id,
        nextFireAt,
      });
      return { nextFireAt, platformMode: "system_alarm" };
    }

    // 2. Fallback to scheduled local notification (iOS, Expo Go, Android without exact-alarm permission)
    if (notificationService.isSupportedNative()) {
      const granted = await notificationService.requestPermission();
      if (granted) {
        await alarmScheduler.ensureAlarmChannel();
        await Notifications.scheduleNotificationAsync({
          identifier: `${ALARM_NOTIF_PREFIX}${alarm.id}`,
          content: {
            title: alarm.label,
            body: `${time} ${meridiem} · Tap to Snooze or Dismiss`,
            sound: "default",
            data: {
              route: `/(modals)/alarm-ring?alarmId=${alarm.id}`,
              alarmId: alarm.id,
            },
            ...(Platform.OS === "android"
              ? { channelId: "wake-alarms" }
              : { interruptionLevel: "timeSensitive" as const }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fireDate,
          },
        });
      }
    }

    await alarmDb.updateScheduleMeta(alarm.id, {
      nextFireAt,
      platformMode: "scheduled_notification",
    });

    return { nextFireAt, platformMode: "scheduled_notification" };
  },

  async snoozeAlarm(alarm: AlarmItem): Promise<string> {
    const snoozeMs = Math.max(1, alarm.snoozeMinutes) * 60_000;
    const snoozeDate = new Date(Date.now() + snoozeMs);
    const snoozeIso = snoozeDate.toISOString();

    await alarmScheduler.cancelAlarmSchedule(alarm.id);

    const nativeRes = wakeAlarmNative.scheduleExactAlarm(
      `snooze_${alarm.id}`,
      `Snoozed: ${alarm.label}`,
      snoozeDate.getTime(),
    );

    if (!nativeRes.scheduled && notificationService.isSupportedNative()) {
      const granted = await notificationService.requestPermission();
      if (granted) {
        await alarmScheduler.ensureAlarmChannel();
        await Notifications.scheduleNotificationAsync({
          identifier: `${SNOOZE_NOTIF_PREFIX}${alarm.id}`,
          content: {
            title: `Snoozed: ${alarm.label}`,
            body: `Ringing after ${alarm.snoozeMinutes} min snooze`,
            sound: "default",
            data: {
              route: `/(modals)/alarm-ring?alarmId=${alarm.id}`,
              alarmId: alarm.id,
            },
            ...(Platform.OS === "android"
              ? { channelId: "wake-alarms" }
              : { interruptionLevel: "timeSensitive" as const }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: snoozeDate,
          },
        });
      }
    }

    await alarmDb.updateScheduleMeta(alarm.id, {
      nextFireAt: snoozeIso,
      snoozedUntil: snoozeIso,
      platformMode: nativeRes.scheduled ? "system_alarm" : "scheduled_notification",
    });

    return snoozeIso;
  },

  async dismissAlarm(alarm: AlarmItem): Promise<void> {
    await alarmScheduler.cancelAlarmSchedule(alarm.id);

    if (alarm.days.length === 0) {
      // One-time alarm automatically disables after dismissal
      await alarmDb.setAlarmEnabled(alarm.id, false);
      return;
    }

    const cleared: AlarmItem = { ...alarm, snoozedUntil: null };
    await alarmScheduler.scheduleAlarm(cleared);
  },

  async syncAllEnabledAlarms(): Promise<void> {
    const alarms = await alarmDb.listAlarms();
    for (const alarm of alarms) {
      if (alarm.isEnabled) {
        await alarmScheduler.scheduleAlarm(alarm);
      }
    }
  },
};
