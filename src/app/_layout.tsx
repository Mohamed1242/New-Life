import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { I18nProvider } from "@/i18n";
import { useSyncLifecycle } from "@/core/sync/useSyncLifecycle";
import { queryClient } from "@/lib/queryClient";
import { NotificationProvider } from "@/modules/notifications/providers/NotificationProvider";
import { DialogProvider } from "@/shared/dialog/DialogContext";
import { ToastProvider } from "@/shared/toast/ToastContext";
import { useCompanionStore } from "@/store/useCompanionStore";
import { ThemeProvider, useThemeControls } from "@/theme/tokens";

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { isDark } = useThemeControls();
  useSyncLifecycle();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="(modals)/task-editor"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen
          name="(modals)/habit-editor"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen
          name="(modals)/habit-detail/[id]"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="(modals)/routine-editor"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen
          name="(modals)/prayer-focus"
          options={{ presentation: "fullScreenModal", animation: "fade" }}
        />
        <Stack.Screen
          name="(modals)/settings/[section]"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="(modals)/cloud-account"
          options={{ animation: "slide_from_right" }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const isHydrated = useCompanionStore((s) => s.isHydrated);
  const hydrateFromDb = useCompanionStore((s) => s.hydrateFromDb);

  const [fontsLoaded, fontError] = useFonts({
    "Poppins-Regular": require("../../assets/fonts/Poppins/Poppins-Regular.ttf"),
    "Poppins-Medium": require("../../assets/fonts/Poppins/Poppins-Medium.ttf"),
    "Poppins-SemiBold": require("../../assets/fonts/Poppins/Poppins-SemiBold.ttf"),
    "Poppins-Bold": require("../../assets/fonts/Poppins/Poppins-Bold.ttf"),
    "Tajawal-Regular": require("../../assets/fonts/Tajawal/Tajawal-Regular.ttf"),
    "Tajawal-Medium": require("../../assets/fonts/Tajawal/Tajawal-Medium.ttf"),
    "Tajawal-Bold": require("../../assets/fonts/Tajawal/Tajawal-Bold.ttf"),
  });

  useEffect(() => {
    hydrateFromDb();
  }, [hydrateFromDb]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && isHydrated) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError, isHydrated]);

  if ((!fontsLoaded && !fontError) || !isHydrated) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <I18nProvider>
              <ToastProvider>
                <DialogProvider>
                  <NotificationProvider>
                    <RootNavigator />
                  </NotificationProvider>
                </DialogProvider>
              </ToastProvider>
            </I18nProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
