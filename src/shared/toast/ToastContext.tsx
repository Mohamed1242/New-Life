import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppIcon } from "@/components/icons/AppIcon";
import { getFontFamily } from "@/constants/theme";
import { ENTER_TOAST, EXIT_TOAST } from "@/core/animations/presets";
import { useTranslation } from "@/i18n";
import { useTheme } from "@/theme/tokens";

export type ToastType = "success" | "error" | "warn" | "info";

export interface ToastOptions {
  type?: ToastType;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface ToastItem extends Required<Pick<ToastOptions, "type" | "message" | "duration">> {
  id: string;
  actionLabel?: string;
  onAction?: () => void;
}

let globalShowToast: ((options: ToastOptions) => void) | null = null;

export const toast = {
  show: (options: ToastOptions) => globalShowToast?.(options),
  success: (message: string, actionLabel?: string, onAction?: () => void) =>
    globalShowToast?.({ type: "success", message, actionLabel, onAction }),
  error: (message: string) => globalShowToast?.({ type: "error", message }),
  warn: (message: string) => globalShowToast?.({ type: "warn", message }),
  info: (message: string) => globalShowToast?.({ type: "info", message }),
};

const ToastContext = createContext<{ showToast: (options: ToastOptions) => void } | undefined>(
  undefined,
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { isRTL } = useTranslation();

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (options: ToastOptions) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const duration = options.duration ?? 3200;
      const next: ToastItem = {
        id,
        type: options.type ?? "info",
        message: options.message,
        actionLabel: options.actionLabel,
        onAction: options.onAction,
        duration,
      };
      setToasts((prev) => [next, ...prev.slice(0, 1)]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  useEffect(() => {
    globalShowToast = showToast;
    return () => {
      globalShowToast = null;
    };
  }, [showToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  const iconForType = (type: ToastType): string => {
    switch (type) {
      case "success":
        return "check-circle";
      case "error":
        return "alert-circle";
      case "warn":
        return "alert-triangle";
      default:
        return "info";
    }
  };

  const colorForType = (type: ToastType) => {
    switch (type) {
      case "success":
        return theme.success;
      case "error":
        return theme.error;
      case "warn":
        return theme.warning;
      default:
        return theme.primary;
    }
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        pointerEvents="box-none"
        style={[styles.host, { top: insets.top + 10 }]}
      >
        {toasts.map((item) => {
          const accent = colorForType(item.type);
          return (
            <Animated.View
              key={item.id}
              entering={ENTER_TOAST}
              exiting={EXIT_TOAST}
              style={[
                styles.toastCard,
                {
                  backgroundColor: theme.glassSurfaceElevated,
                  borderColor: theme.glassBorder,
                  flexDirection: isRTL ? "row-reverse" : "row",
                },
              ]}
            >
              <AppIcon name={iconForType(item.type)} size={18} color={accent} />
              <Text
                style={[
                  styles.toastText,
                  {
                    color: theme.text,
                    fontFamily: getFontFamily("medium", isRTL),
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
                numberOfLines={2}
              >
                {item.message}
              </Text>
              {item.actionLabel && item.onAction ? (
                <Pressable
                  onPress={() => {
                    item.onAction?.();
                    dismiss(item.id);
                  }}
                  hitSlop={8}
                >
                  <Text
                    style={[
                      styles.actionText,
                      {
                        color: theme.primary,
                        fontFamily: getFontFamily("semiBold", isRTL),
                      },
                    ]}
                  >
                    {item.actionLabel}
                  </Text>
                </Pressable>
              ) : null}
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toastCard: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#121324",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  toastText: {
    flex: 1,
    fontSize: 13,
  },
  actionText: {
    fontSize: 13,
  },
});
