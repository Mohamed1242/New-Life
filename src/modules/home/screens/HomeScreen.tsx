import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenWrapper } from "@/components/common/ScreenWrapper";
import { StatePlaceholder } from "@/components/common/StatePlaceholder";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedText } from "@/components/themed/ThemedText";
import { GlassCard } from "@/components/ui/GlassCard";
import { HabitCard } from "@/components/ui/HabitCard";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { TaskRowCard } from "@/components/ui/TaskRowCard";
import { WeeklyDateStrip } from "@/components/ui/WeeklyDateStrip";
import { useTranslation } from "@/i18n";
import { useToggleHabitMutation } from "@/modules/tasks/hooks/useTasksAndHabits";
import { useResponsive } from "@/theme/responsive";
import { useTheme } from "@/theme/tokens";
import { useHomeDashboard } from "../hooks/useHomeDashboard";

export const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isRTL, t } = useTranslation();
  const { isTablet } = useResponsive();
  const toggleHabitMutation = useToggleHabitMutation();

  const {
    userName,
    selectedDate,
    setSelectedDate,
    weekDays,
    tasks,
    habits,
    routines,
    completedCount,
    skippedOrPostponedCount,
    totalCount,
    progressRatio,
    progressPct,
    isCelebrationReached,
    isLoading,
    isError,
    refetch,
    handleToggleTask,
  } = useHomeDashboard();

  const nextRoutine =
    routines.find((r) => r.todayStatus === "not_recorded") ?? routines[0];

  return (
    <View style={styles.root}>
      <ScreenWrapper>
        <View
          style={[
            styles.headerRow,
            { flexDirection: isRTL ? "row-reverse" : "row" },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: theme.primaryMuted }]}>
            <ThemedText variant="cardTitle" color="primary" weight="bold">
              {userName.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.headerSpacer} />
          <Pressable
            onPress={() => router.push("/(modals)/prayer-focus")}
            style={[
              styles.headerIconBtn,
              {
                backgroundColor: theme.glassSurface,
                borderColor: theme.glassBorder,
              },
            ]}
          >
            <AppIcon name="moon" size={18} color={theme.pillarSpirituality} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/(modals)/settings/notifications")}
            style={[
              styles.headerIconBtn,
              {
                backgroundColor: theme.glassSurface,
                borderColor: theme.glassBorder,
              },
            ]}
          >
            <AppIcon name="bell" size={18} color={theme.text} />
          </Pressable>
        </View>

        <View style={styles.greetingBlock}>
          <ThemedText variant="display">
            {t("home.greetingMorning", { name: userName })}
          </ThemedText>
          <ThemedText variant="body" color="secondary">
            {t("home.subtitle", "Small steps. Big changes.")}
          </ThemedText>
        </View>

        {isCelebrationReached ? (
          <GlassCard padding={14}>
            <View
              style={[
                styles.celebrationRow,
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
            >
              <View style={[styles.prayerIcon, { backgroundColor: theme.successMuted }]}>
                <AppIcon name="award" size={18} color={theme.success} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="cardTitle">Meaningful progress today</ThemedText>
                <ThemedText variant="caption" color="secondary">
                  You completed {progressPct}% of your scheduled tasks. Pace yourself calmly.
                </ThemedText>
              </View>
            </View>
          </GlassCard>
        ) : null}

        <View style={isTablet ? styles.tabletGrid : styles.stackCol}>
          <View style={isTablet ? styles.tabletCol : styles.stackCol}>
            <GlassCard elevated padding={18}>
              <View
                style={[
                  styles.progressRow,
                  { flexDirection: isRTL ? "row-reverse" : "row" },
                ]}
              >
                <View style={styles.progressText}>
                  <ThemedText variant="bodyMedium" color="secondary">
                    {t("home.todaysProgress", "Today's Progress")}
                  </ThemedText>
                  <ThemedText variant="display">{progressPct}%</ThemedText>
                  <ThemedText variant="caption" color="muted">
                    {t("home.tasksCount", { done: completedCount, total: totalCount })}
                    {skippedOrPostponedCount > 0
                      ? ` · ${skippedOrPostponedCount} paused/moved`
                      : ""}
                  </ThemedText>
                </View>
                <ProgressRing
                  size={84}
                  strokeWidth={8}
                  progress={progressRatio}
                  color={theme.pillarSpirituality}
                />
              </View>
            </GlassCard>

            <WeeklyDateStrip
              days={weekDays}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
            />

            <GlassCard
              padding={14}
              onPress={() => router.push("/(modals)/prayer-focus")}
            >
              <View
                style={[
                  styles.prayerRow,
                  { flexDirection: isRTL ? "row-reverse" : "row" },
                ]}
              >
                <View
                  style={[
                    styles.prayerIcon,
                    { backgroundColor: theme.pillarSpiritualityMuted },
                  ]}
                >
                  <AppIcon
                    name="compass"
                    size={18}
                    color={theme.pillarSpirituality}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="caption" color="secondary">
                    {t("home.nextPrayer", "Next Prayer")} · Asr at 03:42 PM
                  </ThemedText>
                  <ThemedText variant="cardTitle">Prayer Focus Ready</ThemedText>
                </View>
                <View
                  style={[
                    styles.focusPill,
                    { backgroundColor: theme.pillarSpiritualityMuted },
                  ]}
                >
                  <ThemedText
                    variant="caption"
                    weight="semiBold"
                    style={{ color: theme.pillarSpirituality }}
                  >
                    {t("home.prayerFocusAction", "Focus Mode")}
                  </ThemedText>
                </View>
              </View>
            </GlassCard>

            {nextRoutine ? (
              <GlassCard
                padding={14}
                onPress={() => router.push("/(tabs)/tasks")}
              >
                <View
                  style={[
                    styles.prayerRow,
                    { flexDirection: isRTL ? "row-reverse" : "row" },
                  ]}
                >
                  <View
                    style={[
                      styles.prayerIcon,
                      { backgroundColor: theme.primaryMuted },
                    ]}
                  >
                    <AppIcon name="clock" size={18} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="caption" color="secondary">
                      Daily Routine · {nextRoutine.startTime} – {nextRoutine.endTime}
                    </ThemedText>
                    <ThemedText variant="cardTitle">{nextRoutine.title}</ThemedText>
                  </View>
                  <AppIcon
                    name={isRTL ? "chevron-left" : "chevron-right"}
                    size={16}
                    color={theme.textMuted}
                  />
                </View>
              </GlassCard>
            ) : null}
          </View>

          <View style={isTablet ? styles.tabletCol : styles.stackCol}>
            <View
              style={[
                styles.sectionHeader,
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
            >
              <ThemedText variant="h2">
                {t("home.todaysSchedule", "Today's Tasks")}
              </ThemedText>
              <Pressable onPress={() => router.push("/(tabs)/tasks")}>
                <ThemedText variant="caption" color="primary" weight="semiBold">
                  {t("common.seeAll", "See all")} →
                </ThemedText>
              </Pressable>
            </View>

            {isLoading ? (
              <StatePlaceholder variant="loading" title="Loading today's tasks..." />
            ) : isError ? (
              <StatePlaceholder
                variant="error"
                title="Couldn't load tasks"
                subtitle="There was a local storage hiccup."
                actionLabel={t("common.retry", "Retry")}
                onAction={refetch}
              />
            ) : tasks.length === 0 ? (
              <StatePlaceholder
                variant="empty"
                icon="check-circle"
                title={t("tasks.emptyTitle", "Your day is open")}
                subtitle={t(
                  "tasks.emptySubtitle",
                  "Add one meaningful priority or let your assistant help plan.",
                )}
                actionLabel={t("tasks.addNewTask", "Add New Task")}
                onAction={() => router.push("/(modals)/task-editor")}
              />
            ) : (
              <View style={styles.taskList}>
                {tasks.slice(0, 4).map((task) => (
                  <TaskRowCard
                    key={task.id}
                    task={task}
                    onToggle={handleToggleTask}
                    onPress={(item) =>
                      router.push(`/(modals)/task-editor?id=${item.id}`)
                    }
                  />
                ))}
              </View>
            )}

            {habits.length > 0 ? (
              <>
                <View
                  style={[
                    styles.sectionHeader,
                    { flexDirection: isRTL ? "row-reverse" : "row" },
                  ]}
                >
                  <ThemedText variant="h2">
                    {t("home.dailyHabits", "Daily Habits")}
                  </ThemedText>
                  <Pressable onPress={() => router.push("/(tabs)/tasks")}>
                    <ThemedText variant="caption" color="primary" weight="semiBold">
                      {t("common.seeAll", "See all")} →
                    </ThemedText>
                  </Pressable>
                </View>
                <View style={styles.taskList}>
                  {habits.slice(0, 2).map((habit) => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      onToggle={(id) => toggleHabitMutation.mutate(id)}
                      onPress={(h) =>
                        router.push({
                          pathname: "/(modals)/habit-detail/[id]",
                          params: { id: h.id },
                        })
                      }
                    />
                  ))}
                </View>
              </>
            ) : null}
          </View>
        </View>
      </ScreenWrapper>

      <Pressable
        onPress={() => router.push("/(modals)/task-editor")}
        accessibilityRole="button"
        accessibilityLabel={t("tasks.addNewTask", "Add New Task")}
        style={[
          styles.fab,
          { bottom: Math.max(insets.bottom, 10) + 82 },
        ]}
      >
        <LinearGradient
          colors={theme.gradientPrimary}
          style={styles.fabGradient}
        >
          <AppIcon name="plus" size={24} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: { flex: 1 },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  greetingBlock: {
    gap: 2,
  },
  celebrationRow: {
    alignItems: "center",
    gap: 12,
  },
  stackCol: {
    gap: 14,
  },
  tabletGrid: {
    flexDirection: "row",
    gap: 18,
    alignItems: "flex-start",
  },
  tabletCol: {
    flex: 1,
    gap: 14,
  },
  progressRow: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressText: {
    gap: 2,
  },
  prayerRow: {
    alignItems: "center",
    gap: 12,
  },
  prayerIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  focusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  sectionHeader: {
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  taskList: {
    gap: 10,
  },
  fab: {
    position: "absolute",
    right: 20,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#5044E2",
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabGradient: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
});
