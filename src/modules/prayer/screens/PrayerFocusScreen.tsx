import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenWrapper } from "@/components/common/ScreenWrapper";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedText } from "@/components/themed/ThemedText";
import { Button } from "@/components/ui/Button";
import { getTodayIso } from "@/core/utils/date";
import { toast } from "@/shared/toast/ToastContext";
import {
  useDailyPrayerSchedule,
  useLogPrayerStatus,
  usePrayerSettings,
} from "../hooks/usePrayer";
import {
  audioFocusService,
  type AudioFocusRequestResult,
} from "../services/audioFocusService";
import { PRAYER_LABELS, type PrayerName } from "../types/prayer.types";

function formatClock(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export const PrayerFocusScreen: React.FC = () => {
  const { prayer } = useLocalSearchParams<{ prayer?: string }>();
  const { data: settings } = usePrayerSettings();
  const schedule = useDailyPrayerSchedule();
  const logPrayer = useLogPrayerStatus();

  const targetPrayer: PrayerName =
    prayer === "fajr" ||
    prayer === "dhuhr" ||
    prayer === "asr" ||
    prayer === "maghrib" ||
    prayer === "isha"
      ? prayer
      : schedule.nextPrayer.prayer;

  const totalSeconds = (settings?.focusDurationMinutes ?? 10) * 60;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [nativeFocusResult, setNativeFocusResult] =
    useState<AudioFocusRequestResult | null>(null);
  const capabilities = audioFocusService.getCapabilities();
  const audioFocusEnabled = settings?.audioFocusEnabled ?? true;

  useEffect(() => {
    if (!audioFocusEnabled) {
      audioFocusService.releasePrayerFocus();
      return;
    }

    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      const res = audioFocusService.requestPrayerFocus();
      setNativeFocusResult(res);
    });

    return () => {
      cancelled = true;
      audioFocusService.releasePrayerFocus();
    };
  }, [audioFocusEnabled]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const secondsLeft = Math.max(0, totalSeconds - elapsedSeconds);
  const effectiveFocus = audioFocusEnabled
    ? nativeFocusResult
    : {
        supported: capabilities.supported,
        granted: false,
        mode: "disabled_by_user",
      };

  const handleMarkPrayed = async () => {
    audioFocusService.releasePrayerFocus();
    await logPrayer.mutateAsync({
      prayerDate: getTodayIso(),
      prayerName: targetPrayer,
      status: "on_time",
      autoMutedTriggered: Boolean(effectiveFocus?.granted),
    });
    toast.success(`${PRAYER_LABELS[targetPrayer].en} logged on time`);
    router.back();
  };

  const handleEndEarly = () => {
    audioFocusService.releasePrayerFocus();
    router.back();
  };

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
          {PRAYER_LABELS[targetPrayer].en} Focus
        </ThemedText>

        <ThemedText variant="body" center style={styles.subText}>
          {effectiveFocus?.granted
            ? "Android Audio Focus active — compliant media players are ducked gently."
            : capabilities.description}
        </ThemedText>

        <View style={styles.timerPill}>
          <ThemedText variant="h1" center style={styles.timerText}>
            {formatClock(secondsLeft)}
          </ThemedText>
        </View>

        <View style={styles.platformBadge}>
          <ThemedText variant="micro" center style={styles.badgeText}>
            {effectiveFocus?.granted
              ? "Audio Focus: Granted (MAY_DUCK)"
              : capabilities.platform === "ios"
                ? "iOS Mode: Focus Guidance (External audio cannot be muted by apps)"
                : "Silent Focus Mode Active"}
          </ThemedText>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title={`Mark ${PRAYER_LABELS[targetPrayer].en} Prayed`}
          variant="gradient"
          size="lg"
          fullWidth
          loading={logPrayer.isPending}
          onPress={handleMarkPrayed}
        />
        <Button
          title="End Focus"
          variant="ghost"
          size="md"
          fullWidth
          onPress={handleEndEarly}
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
  },
  whiteText: {
    color: "#FFFFFF",
  },
  subText: {
    color: "rgba(255, 255, 255, 0.82)",
    maxWidth: 320,
  },
  timerPill: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  timerText: {
    color: "#FFFFFF",
    letterSpacing: 1.5,
  },
  platformBadge: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    maxWidth: 320,
  },
  badgeText: {
    color: "rgba(255, 255, 255, 0.85)",
  },
  actions: {
    gap: 10,
    paddingBottom: 16,
  },
});
