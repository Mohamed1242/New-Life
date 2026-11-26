import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { getSupabaseClient } from "@/core/supabase/client";
import type { TaskItem } from "@/modules/tasks/types/tasks.types";
import { createLogger } from "@/shared/logger";

const notifLogger = createLogger("Notifications");

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function parseTimeLabel(timeLabel: string): { hour: number; minute: number } {
  const match = timeLabel.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return { hour: 9, minute: 0 };
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return {
    hour: Math.min(23, Math.max(0, hour)),
    minute: Math.min(59, Math.max(0, minute)),
  };
}

export const notificationService = {
  isSupportedNative(): boolean {
    return Platform.OS === "ios" || Platform.OS === "android";
  },

  async ensureAndroidChannels(): Promise<void> {
    if (Platform.OS !== "android") return;
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Scheduled Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    });
    await Notifications.setNotificationChannelAsync("gentle-coach", {
      name: "Gentle Coach & Insights",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
    });
  },

  async requestPermission(): Promise<boolean> {
    if (!notificationService.isSupportedNative()) return false;
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing === "granted") return true;
      const { status } = await Notifications.requestPermissionsAsync();
      return status === "granted";
    } catch (error) {
      notifLogger.warn("Permission request failed", { error });
      return false;
    }
  },

  async registerPushToken(userId: string): Promise<string | null> {
    if (!notificationService.isSupportedNative() || isExpoGo || !Device.isDevice) {
      return null;
    }
    const granted = await notificationService.requestPermission();
    if (!granted) return null;

    try {
      await notificationService.ensureAndroidChannels();
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;
      const tokenRes = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      const token = tokenRes.data;

      const supabase = getSupabaseClient();
      if (supabase && token) {
        await supabase.from("device_tokens").upsert(
          {
            user_id: userId,
            expo_push_token: token,
            platform: Platform.OS === "ios" ? "ios" : "android",
            device_name: Device.deviceName ?? Device.modelName ?? "Mobile Device",
            is_active: true,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "user_id,expo_push_token" },
        );
      }
      return token;
    } catch (error) {
      notifLogger.warn("Push token registration skipped", { error });
      return null;
    }
  },

  async scheduleLocalReminder(params: {
    identifier: string;
    title: string;
    body: string;
    hour: number;
    minute: number;
    repeatsDaily: boolean;
    route?: string;
  }): Promise<string | null> {
    if (!notificationService.isSupportedNative()) return null;
    const granted = await notificationService.requestPermission();
    if (!granted) return null;

    try {
      await notificationService.ensureAndroidChannels();
      await Notifications.cancelScheduledNotificationAsync(params.identifier).catch(() => {});

      const id = await Notifications.scheduleNotificationAsync({
        identifier: params.identifier,
        content: {
          title: params.title,
          body: params.body,
          sound: "default",
          data: { route: params.route ?? "/(tabs)/home" },
        },
        trigger: params.repeatsDaily
          ? {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: params.hour,
              minute: params.minute,
            }
          : {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 60,
              repeats: false,
            },
      });
      return id;
    } catch (error) {
      notifLogger.warn("Failed to schedule local notification", { error });
      return null;
    }
  },

  async cancelLocalReminder(identifier: string): Promise<void> {
    if (!notificationService.isSupportedNative()) return;
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
  },

  async rescheduleTaskReminder(task: Pick<TaskItem, "id" | "title" | "timeLabel" | "repeat" | "reminderEnabled" | "completed">, hidePreview = false): Promise<void> {
    const identifier = `task_${task.id}`;
    if (!task.reminderEnabled || task.completed) {
      await notificationService.cancelLocalReminder(identifier);
      return;
    }
    const { hour, minute } = parseTimeLabel(task.timeLabel);
    await notificationService.scheduleLocalReminder({
      identifier,
      title: hidePreview ? "New Life Reminder" : task.title,
      body: hidePreview
        ? "Open New Life to view your scheduled item."
        : `Scheduled for ${task.timeLabel}`,
      hour,
      minute,
      repeatsDaily: task.repeat !== "once",
      route: "/(tabs)/tasks",
    });
  },

  async sendTestNotification(): Promise<boolean> {
    if (!notificationService.isSupportedNative()) return false;
    const granted = await notificationService.requestPermission();
    if (!granted) return false;
    await notificationService.ensureAndroidChannels();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "New Life Companion",
        body: "Gentle notifications are configured and working.",
        sound: "default",
        data: { route: "/(tabs)/assistant" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
      },
    });
    return true;
  },
};
