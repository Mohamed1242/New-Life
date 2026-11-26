import React, { useEffect } from "react";
import { StyleSheet, Vibration, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenWrapper } from "@/components/common/ScreenWrapper";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedText } from "@/components/themed/ThemedText";
import { Button } from "@/components/ui/Button";
import { toast } from "@/shared/toast/ToastContext";
import { useAlarmActions, useAlarmById } from "../hooks/useAlarms";
import { alarmAudioService } from "../services/alarmAudioService";
import { formatAlarmClock, getSoundMeta } from "../types/alarm.types";

export const AlarmRingScreen: React.FC = () => {
  const { alarmId } = useLocalSearchParams<{ alarmId?: string }>();
  const { data: alarm } = useAlarmById(alarmId);
  const { snooze, dismiss } = useAlarmActions();

  const soundKey = alarm?.soundKey ?? "gentle_dawn";
  const vibrate = alarm?.vibrate ?? true;

  useEffect(() => {
    alarmAudioService.playSound(soundKey, true);
    if (vibrate) {
      try {
        Vibration.vibrate([400, 600, 400], true);
      } catch {
        // ignore vibration unsupported platforms
      }
    }
    return () => {
      alarmAudioService.stop();
      try {
        Vibration.cancel();
      } catch {
        // ignore
      }
    };
  }, [soundKey, vibrate]);

  const clock = alarm
    ? formatAlarmClock(alarm.hour, alarm.minute)
    : formatAlarmClock(new Date().getHours(), new Date().getMinutes());

  const handleSnooze = async () => {
    alarmAudioService.stop();
    try {
      Vibration.cancel();
    } catch {
      // ignore
    }
    if (alarm) {
      await snooze.mutateAsync(alarm);
      toast.info(`Snoozed for ${alarm.snoozeMinutes} minutes`);
    }
    router.back();
  };

  const handleDismiss = async () => {
    alarmAudioService.stop();
    try {
      Vibration.cancel();
    } catch {
      // ignore
    }
    if (alarm) {
      await dismiss.mutateAsync(alarm);
      toast.success("Good morning — Alarm dismissed");
    }
    router.back();
  };

  return (
    <ScreenWrapper
      scrollable={false}
      includeTabBarClearance={false}
      atmosphericVariant="prayer"
    >
      <View style={styles.center}>
        <View style={styles.pulseRing}>
          <AppIcon name="bell" size={38} color="#FFFFFF" />
        </View>

        <ThemedText variant="display" center style={styles.clockText}>
          {clock.time} {clock.meridiem}
        </ThemedText>

        <ThemedText variant="h2" center style={styles.whiteText}>
          {alarm?.label ?? "Wake-Up Alarm"}
        </ThemedText>

        <ThemedText variant="caption" center style={styles.subText}>
          {getSoundMeta(soundKey).label} ·{" "}
          {alarm?.platformMode === "system_alarm"
            ? "Android System Alarm"
            : "Scheduled Notification Alarm"}
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <Button
          title={`Snooze (${alarm?.snoozeMinutes ?? 5} min)`}
          variant="outline"
          size="lg"
          fullWidth
          loading={snooze.isPending}
          onPress={handleSnooze}
        />
        <Button
          title="Dismiss Alarm"
          variant="gradient"
          size="lg"
          fullWidth
          loading={dismiss.isPending}
          onPress={handleDismiss}
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
  pulseRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  clockText: {
    color: "#FFFFFF",
    fontSize: 42,
    lineHeight: 50,
  },
  whiteText: {
    color: "#FFFFFF",
  },
  subText: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  actions: {
    gap: 12,
    paddingBottom: 20,
  },
});
