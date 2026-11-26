import React from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import { router } from "expo-router";
import { ScreenWrapper } from "@/components/common/ScreenWrapper";
import { SimpleHeader } from "@/components/common/SimpleHeader";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedText } from "@/components/themed/ThemedText";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { dialog } from "@/shared/dialog/DialogContext";
import { toast } from "@/shared/toast/ToastContext";
import { useTheme } from "@/theme/tokens";
import { useAlarms, useDeleteAlarm, useToggleAlarm } from "../hooks/useAlarms";
import { alarmScheduler } from "../services/alarmScheduler";
import {
  formatAlarmClock,
  formatAlarmDays,
  getSoundMeta,
} from "../types/alarm.types";

export const AlarmsScreen: React.FC = () => {
  const theme = useTheme();
  const { data: alarms = [] } = useAlarms();
  const toggleMutation = useToggleAlarm();
  const deleteMutation = useDeleteAlarm();
  const capabilities = alarmScheduler.getCapabilities();

  const handleDelete = async (id: string, label: string) => {
    const ok = await dialog.confirm({
      title: "Delete Alarm?",
      message: `Remove "${label}" and cancel any pending ring?`,
    });
    if (!ok) return;
    await deleteMutation.mutateAsync(id);
    toast.info("Alarm removed");
  };

  return (
    <ScreenWrapper includeTabBarClearance={false}>
      <SimpleHeader
        title="Wake-Up Alarms"
        rightSlot={
          <Pressable
            onPress={() => router.push("/(modals)/alarm-editor")}
            hitSlop={10}
            style={[styles.addBtn, { backgroundColor: theme.primary }]}
          >
            <AppIcon name="plus" size={18} color="#FFFFFF" />
          </Pressable>
        }
      />

      <GlassCard elevated padding={14} style={styles.capBanner}>
        <View style={styles.capRow}>
          <AppIcon
            name={
              capabilities.mode === "system_alarm" ? "check-circle" : "info"
            }
            size={18}
            color={
              capabilities.mode === "system_alarm"
                ? theme.success
                : theme.warning
            }
          />
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText variant="cardTitle">
              {capabilities.mode === "system_alarm"
                ? "True Android System Alarm Active"
                : "Scheduled Notification Mode"}
            </ThemedText>
            <ThemedText variant="caption" color="secondary">
              {capabilities.note}
            </ThemedText>
          </View>
        </View>

        {capabilities.supportsTrueSystemAlarm &&
        !capabilities.canScheduleExactAlarms ? (
          <Button
            title="Allow Exact System Alarms"
            variant="outline"
            size="sm"
            onPress={() => alarmScheduler.openExactAlarmSettings()}
          />
        ) : null}
      </GlassCard>

      {alarms.length === 0 ? (
        <GlassCard padding={20} style={styles.emptyCard}>
          <ThemedText variant="cardTitle" center>
            No wake-up alarms yet
          </ThemedText>
          <ThemedText variant="caption" color="secondary" center>
            Create a recurring morning or Fajr wake-up alarm with custom chimes and snooze.
          </ThemedText>
          <Button
            title="Create Alarm"
            variant="gradient"
            onPress={() => router.push("/(modals)/alarm-editor")}
          />
        </GlassCard>
      ) : (
        <View style={styles.list}>
          {alarms.map((alarm) => {
            const { time, meridiem } = formatAlarmClock(alarm.hour, alarm.minute);
            const sound = getSoundMeta(alarm.soundKey);

            return (
              <GlassCard
                key={alarm.id}
                elevated={alarm.isEnabled}
                padding={16}
                onPress={() =>
                  router.push(`/(modals)/alarm-editor?id=${alarm.id}`)
                }
              >
                <View style={styles.alarmRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.clockRow}>
                      <ThemedText
                        variant="display"
                        color={alarm.isEnabled ? "primary" : "muted"}
                      >
                        {time}
                      </ThemedText>
                      <ThemedText
                        variant="cardTitle"
                        color={alarm.isEnabled ? "secondary" : "muted"}
                      >
                        {meridiem}
                      </ThemedText>
                    </View>
                    <ThemedText variant="cardTitle">{alarm.label}</ThemedText>
                    <ThemedText variant="caption" color="secondary">
                      {formatAlarmDays(alarm.days)} · {sound.label} · Snooze{" "}
                      {alarm.snoozeMinutes}m
                    </ThemedText>
                    <View style={styles.metaRow}>
                      <ThemedText variant="micro" color="muted">
                        {alarm.platformMode === "system_alarm"
                          ? "System AlarmManager"
                          : "Scheduled Notification"}
                      </ThemedText>
                      {alarm.snoozedUntil ? (
                        <ThemedText variant="micro" color="warning">
                          · Snoozed
                        </ThemedText>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.rightControls}>
                    <Switch
                      value={alarm.isEnabled}
                      onValueChange={(val) =>
                        toggleMutation.mutate({
                          id: alarm.id,
                          isEnabled: val,
                        })
                      }
                      trackColor={{ false: theme.border, true: theme.primary }}
                    />
                    <View style={styles.smallActions}>
                      <Pressable
                        onPress={() =>
                          router.push(`/(modals)/alarm-ring?alarmId=${alarm.id}`)
                        }
                        hitSlop={8}
                      >
                        <ThemedText variant="micro" color="primary">
                          Test Ring
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDelete(alarm.id, alarm.label)}
                        hitSlop={8}
                      >
                        <AppIcon name="trash" size={16} color={theme.error} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </GlassCard>
            );
          })}
        </View>
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  capBanner: {
    gap: 10,
  },
  capRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  emptyCard: {
    alignItems: "center",
    gap: 12,
  },
  list: {
    gap: 12,
  },
  alarmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  clockRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rightControls: {
    alignItems: "flex-end",
    gap: 12,
  },
  smallActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
