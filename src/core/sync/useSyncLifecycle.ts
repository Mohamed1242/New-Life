import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useAuthStore } from "@/modules/auth/store/useAuthStore";
import { syncEngine } from "./syncEngine";

let authInitTriggered = false;

export function useSyncLifecycle() {
  const initializeAuth = useAuthStore((s) => s.initialize);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const wasOfflineRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (authInitTriggered) return;
    authInitTriggered = true;
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (!userId) return;

    // Single initial sync per signed-in userId
    syncEngine.runSync().catch(() => {});

    const unsubNet = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected);
      if (online && wasOfflineRef.current) {
        syncEngine.runSync().catch(() => {});
      }
      wasOfflineRef.current = !online;
    });

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (prev !== "active" && nextState === "active") {
        syncEngine.runSync().catch(() => {});
      }
    });

    return () => {
      unsubNet();
      appStateSub.remove();
    };
  }, [userId]);
}
