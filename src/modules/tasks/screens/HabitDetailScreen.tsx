import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenWrapper } from "@/components/common/ScreenWrapper";
import { SimpleHeader } from "@/components/common/SimpleHeader";
import { StatePlaceholder } from "@/components/common/StatePlaceholder";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedText } from "@/components/themed/ThemedText";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { addDaysIso, getRecentDateRange, getTodayIso } from "@/core/utils/date";
import { dialog } from "@/shared/dialog/DialogContext";
import { toast } from "@/shared/toast/ToastContext";
import { useTheme } from "@/theme/tokens";
import {
  useHabitDetailQuery,
  useHabitLogsQuery,
  useLogOccurrenceMutation,
  useLogUrgeMutation,
  useRecoverStreakMutation,
  useSetHabitStatusMutation,
} from "../hooks/useTasksAndHabits";
import type { HabitLogStatus } from "../types/tasks.types";

const TRIGGERS = ["Stress", "Boredom", "Fatigue", "Social", "Late Night"];
const DAY_STATUS_CYCLE: HabitLogStatus[] = [
  "completed",
  "skipped",
  "postponed",
  "missed",
  "not_recorded",
];

export const HabitDetailScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const today = getTodayIso();
  const yesterday = addDaysIso(today, -1);

  const habitQuery = useHabitDetailQuery(id ?? "");
  const logsQuery = useHabitLogsQuery(id ?? "", 14);
  const setStatusMutation = useSetHabitStatusMutation();
  const recoverMutation = useRecoverStreakMutation();
  const logUrgeMutation = useLogUrgeMutation();
  const logOccurrenceMutation = useLogOccurrenceMutation();

  const [selectedTrigger, setSelectedTrigger] = useState("Stress");

  if (habitQuery.isLoading) {
    return (
      <ScreenWrapper includeTabBarClearance={false}>
        <SimpleHeader title="Habit History" />
        <StatePlaceholder variant="loading" />
      </ScreenWrapper>
    );
  }

  const habit = habitQuery.data;
  if (!habit) {
    return (
      <ScreenWrapper includeTabBarClearance={false}>
        <SimpleHeader title="Habit History" />
        <StatePlaceholder
          variant="error"
          title="Habit not found"
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </ScreenWrapper>
    );
  }

  const logs = logsQuery.data ?? [];
  const last14 = getRecentDateRange(today, 14);
  const statusByDate = new Map<string, HabitLogStatus>();
  for (const log of logs) {
    if (!statusByDate.has(log.logDate)) {
      statusByDate.set(log.logDate, log.status);
    }
  }

  const yesterdayStatus = statusByDate.get(yesterday) ?? "not_recorded";
  const canUseRecovery =
    !habit.graceUsedThisWeek &&
    (yesterdayStatus === "missed" || yesterdayStatus === "not_recorded");

  const colorForStatus = (status: HabitLogStatus) => {
    switch (status) {
      case "completed":
      case "urge_resisted":
        return theme.success;
      case "skipped":
      case "postponed":
        return theme.warning;
      case "missed":
      case "occurrence":
        return theme.error;
      default:
        return theme.element;
    }
  };

  const handleCycleDay = (dateIso: string) => {
    const curr = statusByDate.get(dateIso) ?? "not_recorded";
    const idx = DAY_STATUS_CYCLE.indexOf(curr);
    const next = DAY_STATUS_CYCLE[(idx + 1) % DAY_STATUS_CYCLE.length];
    setStatusMutation.mutate(
      { habitId: habit.id, logDate: dateIso, status: next },
      {
        onSuccess: () => toast.info(`${dateIso}: marked ${next.replace("_", " ")}`),
      },
    );
  };

  const handleRecovery = async () => {
    const ok = await dialog.confirm({
      title: "Use Weekly Recovery Pass?",
      message: `Protect your streak by covering ${yesterday} gently without losing momentum.`,
      confirmText: "Use Recovery",
    });
    if (!ok) return;
    recoverMutation.mutate(
      { habitId: habit.id, recoveryDateIso: yesterday },
      { onSuccess: () => toast.success("Streak recovered! Keep moving calmly.") },
    );
  };

  const isNegative = habit.polarity === "negative";

  return (
    <ScreenWrapper includeTabBarClearance={false}>
      <SimpleHeader
        title={habit.title}
        rightSlot={
          <Pressable
            onPress={() => router.push(`/(modals)/habit-editor?id=${habit.id}`)}
            hitSlop={8}
          >
            <AppIcon name="edit" size={18} color={theme.primary} />
          </Pressable>
        }
      />

      {/* Stats Strip */}
      <GlassCard elevated padding={16}>
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <ThemedText variant="h1" color="primary">
              {habit.streakDays}d
            </ThemedText>
            <ThemedText variant="caption" color="secondary">
              Current Streak
            </ThemedText>
          </View>
          <View style={styles.statCell}>
            <ThemedText variant="h1">{habit.bestStreak}d</ThemedText>
            <ThemedText variant="caption" color="secondary">
              Best Streak
            </ThemedText>
          </View>
          <View style={styles.statCell}>
            <ThemedText variant="h1" color="success">
              {habit.weeklyConsistencyPct}%
            </ThemedText>
            <ThemedText variant="caption" color="secondary">
              Recorded Rate
            </ThemedText>
          </View>
        </View>
      </GlassCard>

      {/* Flexible Streak Recovery */}
      {canUseRecovery ? (
        <GlassCard padding={14}>
          <View style={styles.recoveryRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText variant="cardTitle">Flexible Streak Recovery</ThemedText>
              <ThemedText variant="caption" color="secondary">
                One busy day should not erase your progress. Use your weekly recovery pass for yesterday.
              </ThemedText>
            </View>
            <Button
              title="Recover"
              size="sm"
              variant="outline"
              onPress={handleRecovery}
            />
          </View>
        </GlassCard>
      ) : null}

      {/* Negative Habit Trigger & Awareness Logger */}
      {isNegative ? (
        <GlassCard padding={16} style={styles.cardGap}>
          <ThemedText variant="h2">Mindful Check-In</ThemedText>
          <ThemedText variant="caption" color="secondary">
            Awareness is progress—never shame. Select a trigger and log how you responded:
          </ThemedText>
          <View style={styles.chipsWrap}>
            {TRIGGERS.map((tr) => {
              const active = selectedTrigger === tr;
              return (
                <Pressable
                  key={tr}
                  onPress={() => setSelectedTrigger(tr)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? theme.primaryMuted : theme.element,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    variant="caption"
                    color={active ? "primary" : "secondary"}
                    weight="medium"
                  >
                    {tr}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.actionRow}>
            <Button
              title="Resisted Urge"
              size="sm"
              variant="primary"
              style={{ flex: 1 }}
              onPress={() =>
                logUrgeMutation.mutate(
                  { id: habit.id, triggerTag: selectedTrigger.toLowerCase() },
                  { onSuccess: () => toast.success("Urge paused — well handled.") },
                )
              }
            />
            <Button
              title="Log Occurrence"
              size="sm"
              variant="outline"
              style={{ flex: 1 }}
              onPress={() =>
                logOccurrenceMutation.mutate(
                  { id: habit.id, triggerTag: selectedTrigger.toLowerCase() },
                  {
                    onSuccess: () =>
                      toast.info("Logged without judgment. Tomorrow is a fresh step."),
                  },
                )
              }
            />
          </View>
        </GlassCard>
      ) : null}

      {/* 14-Day Completion History */}
      <GlassCard padding={16} style={styles.cardGap}>
        <ThemedText variant="h2">14-Day Completion History</ThemedText>
        <ThemedText variant="caption" color="secondary">
          Tap any day to cycle status (Completed · Skipped · Postponed · Missed · Not Recorded). Unrecorded days are never penalized as failed.
        </ThemedText>
        <View style={styles.grid}>
          {last14.map((dateIso) => {
            const st = statusByDate.get(dateIso) ?? "not_recorded";
            const dayNum = dateIso.slice(-2);
            const isNeutral = st === "not_recorded";
            return (
              <Pressable
                key={dateIso}
                onPress={() => handleCycleDay(dateIso)}
                style={[
                  styles.dayCell,
                  {
                    backgroundColor: colorForStatus(st),
                    borderColor: theme.border,
                  },
                ]}
              >
                <ThemedText
                  variant="caption"
                  weight="semiBold"
                  style={{ color: isNeutral ? theme.textSecondary : "#FFFFFF" }}
                >
                  {dayNum}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: theme.success }]} />
            <ThemedText variant="micro" color="secondary">Completed</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: theme.warning }]} />
            <ThemedText variant="micro" color="secondary">Skipped/Postponed</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: theme.error }]} />
            <ThemedText variant="micro" color="secondary">Missed/Occurred</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: theme.element }]} />
            <ThemedText variant="micro" color="secondary">Not Recorded</ThemedText>
          </View>
        </View>
      </GlassCard>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statCell: {
    alignItems: "center",
    gap: 2,
  },
  recoveryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardGap: {
    gap: 12,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
