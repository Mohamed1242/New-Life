import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ScreenWrapper } from "@/components/common/ScreenWrapper";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedText } from "@/components/themed/ThemedText";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/i18n";
import { toast } from "@/shared/toast/ToastContext";

function formatClock(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `00:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export const PrayerFocusScreen: React.FC = () => {
  const { t } = useTranslation();
  const [secondsLeft, setSecondsLeft] = useState(135);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <ScreenWrapper
      scrollable={false}
      includeTabBarClearance={false}
      atmosphericVariant="prayer"
    >
      <View style={styles.center}>
        <View style={styles.muteCircle}>
          <AppIcon name="volume-x" size={34} color="#FFFFFF" />
        </View>

        <ThemedText variant="display" center style={styles.whiteText}>
          {t("prayerFocus.title", "Prayer Time")}
        </ThemedText>

        <ThemedText variant="body" center style={styles.subText}>
          {t("prayerFocus.subtitle", "Audio will be muted during prayer time")}
        </ThemedText>

        <View style={styles.timerPill}>
          <ThemedText variant="h1" center style={styles.timerText}>
            {formatClock(secondsLeft)}
          </ThemedText>
        </View>

        <ThemedText variant="caption" center style={styles.blessing}>
          {t("prayerFocus.blessing", "Have a blessed prayer")}
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <Button
          title={t("prayerFocus.markPrayed", "Mark Prayed")}
          variant="gradient"
          size="lg"
          fullWidth
          onPress={() => {
            toast.success("Prayer logged — Spiritually aligned!");
            router.back();
          }}
        />
        <Button
          title={t("prayerFocus.endEarly", "End Focus")}
          variant="ghost"
          size="md"
          fullWidth
          onPress={() => router.back()}
        />
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 20,
  },
  muteCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  whiteText: {
    color: "#FFFFFF",
  },
  subText: {
    color: "rgba(255, 255, 255, 0.78)",
    maxWidth: 260,
  },
  timerPill: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 9999,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
  },
  timerText: {
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  blessing: {
    color: "rgba(255, 255, 255, 0.70)",
    marginTop: 4,
  },
  actions: {
    gap: 8,
    paddingBottom: 12,
  },
});
