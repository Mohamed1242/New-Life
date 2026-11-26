import React, { Component, useEffect, type ReactNode } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useAuthStore } from "@/modules/auth/store/useAuthStore";
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

  useEffect(() => {
    if (user?.id) {
      notificationService.registerPushToken(user.id).catch(() => {});
    }
  }, [user?.id]);

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
