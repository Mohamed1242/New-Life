import { requireOptionalNativeModule } from "expo-modules-core";

export interface NativeWakeAlarmCapabilities {
  supportsTrueSystemAlarm: boolean;
  canScheduleExactAlarms: boolean;
  platform: string;
  mode: "system_alarm" | "scheduled_notification";
  note: string;
}

interface NativeWakeAlarmModule {
  getCapabilities: () => NativeWakeAlarmCapabilities;
  openExactAlarmSettings?: () => boolean;
  scheduleExactAlarm?: (
    id: string,
    title: string,
    triggerAtMs: number,
  ) => { scheduled: boolean; mode: "system_alarm" | "scheduled_notification" };
  cancelExactAlarm?: (id: string) => boolean;
}

const nativeMod = requireOptionalNativeModule<NativeWakeAlarmModule>("WakeAlarm");

export const wakeAlarmNative = {
  isAvailable(): boolean {
    return Boolean(nativeMod);
  },

  getCapabilities(): NativeWakeAlarmCapabilities {
    if (nativeMod) {
      try {
        return nativeMod.getCapabilities();
      } catch {
        // fallback below
      }
    }
    return {
      supportsTrueSystemAlarm: false,
      canScheduleExactAlarms: false,
      platform: "expo_go_or_web",
      mode: "scheduled_notification",
      note: "Running in Expo Go or Web: alarms use scheduled local notifications rather than a true Android AlarmManager system alarm.",
    };
  },

  openExactAlarmSettings(): boolean {
    if (nativeMod?.openExactAlarmSettings) {
      try {
        return nativeMod.openExactAlarmSettings();
      } catch {
        return false;
      }
    }
    return false;
  },

  scheduleExactAlarm(
    id: string,
    title: string,
    triggerAtMs: number,
  ): { scheduled: boolean; mode: "system_alarm" | "scheduled_notification" } {
    if (nativeMod?.scheduleExactAlarm) {
      try {
        return nativeMod.scheduleExactAlarm(id, title, triggerAtMs);
      } catch {
        // fallback below
      }
    }
    return { scheduled: false, mode: "scheduled_notification" };
  },

  cancelExactAlarm(id: string): boolean {
    if (nativeMod?.cancelExactAlarm) {
      try {
        return nativeMod.cancelExactAlarm(id);
      } catch {
        return false;
      }
    }
    return false;
  },
};
