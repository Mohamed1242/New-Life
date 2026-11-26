import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ScreenWrapper } from "@/components/common/ScreenWrapper";
import { SimpleHeader } from "@/components/common/SimpleHeader";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedText } from "@/components/themed/ThemedText";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { WeeklyDateStrip } from "@/components/ui/WeeklyDateStrip";
import { buildWeekStrip, getTodayIso } from "@/core/utils/date";
import { toast } from "@/shared/toast/ToastContext";
import { useTheme } from "@/theme/tokens";
import {
  useDailyPrayerSchedule,
  useLogPrayerStatus,
  usePrayerConsistency,
  usePrayerLogsForDate,
  usePrayerSettings,
} from "../hooks/usePrayer";
import { formatMinutesCountdown } from "../services/prayerCalculator";
import {
  CALCULATION_METHOD_META,
  type PrayerLogStatus,
  type PrayerName,
} from "../types/prayer.types";

const STATUS_META: Record<
  PrayerLogStatus,
  { label: string; colorKey: "success" | "warning" | "info" | "danger" | "muted" }
> = {
  on_time: { label: "On Time", colorKey: "success" },
  delayed: { label: "Delayed", colorKey: "warning" },
  qada: { label: "Qada", colorKey: "info" },
  missed: { label: "Missed", colorKey: "danger" },
  not_recorded: { label: "Not Recorded", colorKey: "muted" },
};

const ACTIONABLE_STATUSES: PrayerLogStatus[] = [
  "on_time",
  "delayed",
  "qada",
  "missed",
  "not_recorded",
];

export const PrayerTimesScreen: React.FC = () => {
  const theme = useTheme();
  const [selectedDate, setSelectedDate] = useState(getTodayIso());
  const [expandedPrayer, setExpandedPrayer] = useState<PrayerName | null>(null);

  const { data: settings } = usePrayerSettings();
  const schedule = useDailyPrayerSchedule(selectedDate);
  const { data: logs = [] } = usePrayerLogsForDate(selectedDate);
  const { data: stats7d } = usePrayerConsistency(getTodayIso(), 7);
  const logMutation = useLogPrayerStatus();

  const weekDays = useMemo(() => {
    const active = new Set<string>(logs.length > 0 ? [selectedDate] : []);
    return buildWeekStrip(selectedDate, active);
  }, [selectedDate, logs.length]);

  const logByPrayer = useMemo(() => {
    const map = new Map<PrayerName, PrayerLogStatus>();
    for (const l of logs) {
      map.set(l.prayerName, l.status);
    }
    return map;
  }, [logs]);

  const getStatusColor = (status: PrayerLogStatus) => {
    const key = STATUS_META[status].colorKey;
    if (key === "success") return theme.success;
    if (key === "warning") return theme.warning;
    if (key === "info") return theme.info;
    if (key === "danger") return theme.error;
    return theme.textMuted;
  };

  const handleSelectStatus = async (
    prayerName: PrayerName,
    status: PrayerLogStatus,
  ) => {
    await logMutation.mutateAsync({
      prayerDate: selectedDate,
      prayerName,
      status,
    });
    setExpandedPrayer(null);
    if (status === "on_time") {
      toast.success("Logged on time");
    } else if (status === "not_recorded") {
      toast.info("Cleared to not recorded");
    } else {
      toast.info(`Marked as ${STATUS_META[status].label}`);
    }
  };

  const completedTodayCount = logs.filter(
    (l) => l.status === "on_time" || l.status === "delayed" || l.status === "qada",
  ).length;

  return (
    <ScreenWrapper includeTabBarClearance={false}>
      <SimpleHeader
        title="Prayer Times & Tracker"
        rightSlot={
          <Pressable
            onPress={() => router.push("/(modals)/settings/prayer")}
            hitSlop={10}
            style={[styles.iconButton, { backgroundColor: theme.surface }]}
          >
            <AppIcon name="sliders" size={18} color={theme.text} />
          </Pressable>
        }
      />

      <GlassCard elevated padding={18} style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={{ flex: 1, gap: 4 }}>
            <ThemedText variant="caption" color="secondary">
              {schedule.cityName} · {CALCULATION_METHOD_META[schedule.method].shortLabel}
            </ThemedText>
            <ThemedText variant="h1">
              {schedule.nextPrayer.label} · {schedule.nextPrayer.formattedTime}
            </ThemedText>
            <ThemedText variant="caption" color="primary" weight="semiBold">
              {schedule.nextPrayer.isTomorrow ? "Tomorrow · " : ""}
              {formatMinutesCountdown(schedule.nextPrayer.minutesUntil)} · Qibla{" "}
              {schedule.qiblaDegrees}°
            </ThemedText>
          </View>
          <Button
            title="Focus Mode"
            variant="gradient"
            size="sm"
            onPress={() =>
              router.push(
                `/(modals)/prayer-focus?prayer=${schedule.nextPrayer.prayer}`,
              )
            }
          />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <ThemedText variant="h2" color="primary">
              {completedTodayCount}/5
            </ThemedText>
            <ThemedText variant="micro" color="secondary">
              Logged Today
            </ThemedText>
          </View>
          <View style={styles.statBox}>
            <ThemedText variant="h2">
              {stats7d ? `${stats7d.recordedConsistencyPct}%` : "0%"}
            </ThemedText>
            <ThemedText variant="micro" color="secondary">
              7d Consistency
            </ThemedText>
          </View>
          <View style={styles.statBox}>
            <ThemedText variant="h2">
              {stats7d ? `${stats7d.onTimePct}%` : "0%"}
            </ThemedText>
            <ThemedText variant="micro" color="secondary">
              On Time (7d)
            </ThemedText>
          </View>
          <View style={styles.statBox}>
            <ThemedText variant="h2" color="muted">
              {stats7d?.notRecordedCount ?? 35}
            </ThemedText>
            <ThemedText variant="micro" color="secondary">
              Unrecorded
            </ThemedText>
          </View>
        </View>
        <ThemedText variant="micro" color="muted">
          Unrecorded slots stay neutral and are never assumed missed. Tz: {schedule.timezone}
        </ThemedText>
      </GlassCard>

      <WeeklyDateStrip
        days={weekDays}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
      />

      <GlassCard padding={8} style={styles.listCard}>
        {schedule.entries.map((entry, idx) => {
          const isNext =
            selectedDate === getTodayIso() &&
            !schedule.nextPrayer.isTomorrow &&
            schedule.nextPrayer.prayer === entry.key;

          if (!entry.isObligatory) {
            return (
              <View
                key={entry.key}
                style={[
                  styles.prayerRow,
                  {
                    borderBottomWidth:
                      idx < schedule.entries.length - 1
                        ? StyleSheet.hairlineWidth
                        : 0,
                    borderBottomColor: theme.border,
                  },
                ]}
              >
                <AppIcon name="sunrise" size={18} color={theme.warning} />
                <View style={{ flex: 1 }}>
                  <ThemedText variant="cardTitle">{entry.label}</ThemedText>
                  <ThemedText variant="caption" color="secondary">
                    {entry.arabicLabel} · Fajr window closes
                  </ThemedText>
                </View>
                <ThemedText variant="body" weight="semiBold" color="secondary">
                  {entry.formattedTime}
                </ThemedText>
              </View>
            );
          }

          const prayerKey = entry.key as PrayerName;
          const status = logByPrayer.get(prayerKey) ?? "not_recorded";
          const statusColor = getStatusColor(status);
          const isExpanded = expandedPrayer === prayerKey;

          return (
            <View
              key={entry.key}
              style={{
                borderBottomWidth:
                  idx < schedule.entries.length - 1
                    ? StyleSheet.hairlineWidth
                    : 0,
                borderBottomColor: theme.border,
              }}
            >
              <Pressable
                onPress={() =>
                  setExpandedPrayer(isExpanded ? null : prayerKey)
                }
                style={[
                  styles.prayerRow,
                  isNext && {
                    backgroundColor: theme.pillarSpiritualityMuted,
                    borderRadius: 14,
                  },
                ]}
              >
                <Pressable
                  onPress={() =>
                    handleSelectStatus(
                      prayerKey,
                      status === "on_time" ? "not_recorded" : "on_time",
                    )
                  }
                  hitSlop={8}
                  style={[
                    styles.checkBox,
                    {
                      borderColor:
                        status === "not_recorded" ? theme.border : statusColor,
                      backgroundColor:
                        status === "not_recorded"
                          ? "transparent"
                          : `${statusColor}24`,
                    },
                  ]}
                >
                  {status !== "not_recorded" ? (
                    <AppIcon name="check" size={14} color={statusColor} />
                  ) : null}
                </Pressable>

                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <ThemedText variant="cardTitle">{entry.label}</ThemedText>
                    <ThemedText variant="caption" color="secondary">
                      {entry.arabicLabel}
                    </ThemedText>
                    {isNext ? (
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: theme.primary },
                        ]}
                      >
                        <ThemedText
                          variant="micro"
                          weight="semiBold"
                          style={{ color: "#FFFFFF" }}
                        >
                          NEXT
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>
                  <ThemedText variant="caption" style={{ color: statusColor }}>
                    {STATUS_META[status].label}
                    {settings?.notificationsEnabled &&
                    settings.perPrayerEnabled[prayerKey]
                      ? ` · Alert${settings.advanceMinutes > 0 ? ` (-${settings.advanceMinutes}m)` : ""}`
                      : " · Alert off"}
                  </ThemedText>
                </View>

                <ThemedText variant="h2">{entry.formattedTime}</ThemedText>
              </Pressable>

              {isExpanded ? (
                <View style={styles.statusChoices}>
                  {ACTIONABLE_STATUSES.map((opt) => {
                    const active = status === opt;
                    const c = getStatusColor(opt);
                    return (
                      <Pressable
                        key={opt}
                        onPress={() => handleSelectStatus(prayerKey, opt)}
                        style={[
                          styles.statusChip,
                          {
                            borderColor: active ? c : theme.border,
                            backgroundColor: active ? `${c}20` : theme.surface,
                          },
                        ]}
                      >
                        <ThemedText
                          variant="caption"
                          weight={active ? "semiBold" : "regular"}
                          style={{ color: active ? c : theme.textSecondary }}
                        >
                          {STATUS_META[opt].label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}
      </GlassCard>

      <View style={styles.footerRow}>
        <Button
          title="Wake-Up Alarms"
          variant="outline"
          style={{ flex: 1 }}
          onPress={() => router.push("/(modals)/alarms")}
        />
        <Button
          title="Prayer Settings"
          variant="outline"
          style={{ flex: 1 }}
          onPress={() => router.push("/(modals)/settings/prayer")}
        />
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    gap: 12,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statBox: {
    alignItems: "center",
    flex: 1,
    gap: 2,
  },
  listCard: {
    gap: 2,
  },
  prayerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  checkBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusChoices: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  footerRow: {
    flexDirection: "row",
    gap: 12,
  },
});
