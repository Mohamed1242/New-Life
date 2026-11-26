import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/tokens";
import { getFontFamily } from "@/constants/theme";
import { useTranslation } from "@/i18n";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

interface ActiveDialog extends ConfirmOptions {
  resolve: (accepted: boolean) => void;
}

let globalConfirm: ((options: ConfirmOptions) => Promise<boolean>) | null = null;

export const dialog = {
  confirm: (options: ConfirmOptions): Promise<boolean> => {
    if (!globalConfirm) return Promise.resolve(false);
    return globalConfirm(options);
  },
};

const DialogContext = createContext<{ confirm: (o: ConfirmOptions) => Promise<boolean> } | undefined>(
  undefined,
);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveDialog | null>(null);
  const theme = useTheme();
  const { t, isRTL } = useTranslation();

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setActive({ ...options, resolve });
    });
  }, []);

  useEffect(() => {
    globalConfirm = confirm;
    return () => {
      globalConfirm = null;
    };
  }, [confirm]);

  const close = (result: boolean) => {
    if (active) {
      active.resolve(result);
      setActive(null);
    }
  };

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      <Modal
        visible={!!active}
        transparent
        animationType="fade"
        onRequestClose={() => close(false)}
      >
        <View style={[styles.backdrop, { backgroundColor: theme.overlayBackdrop }]}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.glassSurfaceElevated,
                borderColor: theme.glassBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.title,
                {
                  color: theme.text,
                  fontFamily: getFontFamily("semiBold", isRTL),
                  textAlign: isRTL ? "right" : "left",
                },
              ]}
            >
              {active?.title}
            </Text>
            <Text
              style={[
                styles.message,
                {
                  color: theme.textSecondary,
                  fontFamily: getFontFamily("regular", isRTL),
                  textAlign: isRTL ? "right" : "left",
                },
              ]}
            >
              {active?.message}
            </Text>
            <View
              style={[
                styles.actions,
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
            >
              <Pressable
                style={[styles.btn, { backgroundColor: theme.element }]}
                onPress={() => close(false)}
              >
                <Text
                  style={{
                    color: theme.text,
                    fontFamily: getFontFamily("medium", isRTL),
                    fontSize: 14,
                  }}
                >
                  {active?.cancelText ?? t("common.cancel", "Cancel")}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.btn,
                  {
                    backgroundColor: active?.destructive ? theme.error : theme.primary,
                  },
                ]}
                onPress={() => close(true)}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontFamily: getFontFamily("semiBold", isRTL),
                    fontSize: 14,
                  }}
                >
                  {active?.confirmText ?? t("common.confirm", "Confirm")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within DialogProvider");
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 18,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    marginTop: 8,
    gap: 10,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
});
