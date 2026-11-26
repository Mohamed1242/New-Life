import React, { Component, useEffect, useRef, type ReactNode } from "react";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { alarmScheduler } from "@/modules/alarms/services/alarmScheduler";
import { useAuthStore } from "@/modules/auth/store/useAuthStore";
import { prayerDb } from "@/modules/prayer/db/prayerRepository";
import { detectDeviceTimezone } from "@/modules/prayer/services/prayerCalculator";
import { prayerScheduler } from "@/modules/prayer/services/prayerScheduler";
import { notificationService } from "../services/notificationService";

if (Platform.OS === "ios" || Platform.OS === "android") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

class NotificationErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    return this.props.children;
  }
}

const NotificationLifecycleInner: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const user = useAuthStore((s) => s.user);
  const lastSyncedTzRef = useRef<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      notificationService.registerPushToken(user.id).catch(() => {});
    }
  }, [user?.id]);

  useEffect(() => {
    const refreshLocalSchedules = async () => {
      try {
        const currentTz = detectDeviceTimezone();
        let settings = await prayerDb.getSettings();
        if (settings.timezone !== currentTz) {
          settings = await prayerDb.updateSettings({ timezone: currentTz });
        }
        lastSyncedTzRef.current = currentTz;
        await prayerScheduler.rescheduleRollingPrayerNotifications(settings);
        await alarmScheduler.syncAllEnabledAlarms();
      } catch {
        // ignore startup background sync errors
      }
    };

    refreshLocalSchedules();

    const appSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        const nowTz = detectDeviceTimezone();
        if (lastSyncedTzRef.current && lastSyncedTzRef.current !== nowTz) {
          refreshLocalSchedules();
        } else {
          alarmScheduler.syncAllEnabledAlarms().catch(() => {});
        }
      }
    });

    return () => {
      appSub.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "ios" && Platform.OS !== "android") return;

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const route = response.notification.request.content.data?.route;
        if (typeof route === "string" && route.startsWith("/")) {
          router.push(route as any);
        }
      },
    );

    return () => {
      responseSub.remove();
    };
  }, []);

  return <>{children}</>;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  return (
    <NotificationErrorBoundary>
      <NotificationLifecycleInner>{children}</NotificationLifecycleInner>
    </NotificationErrorBoundary>
  );
};
