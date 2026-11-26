import React, { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { ScreenWrapper } from "@/components/common/ScreenWrapper";
import { StatePlaceholder } from "@/components/common/StatePlaceholder";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedText } from "@/components/themed/ThemedText";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { LifeBalanceBar } from "@/components/ui/LifeBalanceBar";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TrendLineChart } from "@/components/ui/TrendLineChart";
import { useTranslation } from "@/i18n";
import {
  useChallengesQuery,
  useLogChallengeDayMutation,
  useToggleChallengeMutation,
} from "@/modules/routine/hooks/useRoutine";
import { toast } from "@/shared/toast/ToastContext";
import { useTheme } from "@/theme/tokens";
import type { ReflectionMood } from "../db/reflectionRepository";
import { useInsights } from "../hooks/useInsights";

export const InsightsScreen: React.FC = () => {
  const theme = useTheme();
  const { t, isRTL } = useTranslation();
  const {
    range,
    setRange,
    summary,
    reflections,
    currentWeekStartIso,
    saveReflectionMutation,
    isLoading,
    isError,
    refetch,
  } = useInsights();
  const challengesQuery = useChallengesQuery();
  const toggleChallengeMutation = useToggleChallengeMutation();
  const logChallengeMutation = useLogChallengeDayMutation();

  const [showFormula, setShowFormula] = useState(false);
  const currentReflection = reflections.find(
    (r) => r.weekStartIso === currentWeekStartIso,
  );
  const [mood, setMood] = useState<ReflectionMood>(
    currentReflection?.energyMood ?? "balanced",
  );
  const [highlight, setHighlight] = useState(currentReflection?.highlight ?? "");
  const [adjustment, setAdjustment] = useState(
    currentReflection?.adjustment ?? "",
  );

  const colorForPillar = (pillar: "spirituality" | "health" | "productivity") => {
    switch (pillar) {
      case "spirituality":
        return theme.pillarSpirituality;
      case "health":
        return theme.pillarHealth;
      default:
        return theme.pillarProductivity;
    }
  };

  const challenges = challengesQuery.data ?? [];

  const handleSaveReflection = async () => {
    await saveReflectionMutation.mutateAsync({
      energyMood: mood,
      highlight,
      adjustment,
    });
    toast.success("Weekly reflection saved");
  };

  return (
    <ScreenWrapper>
      <View
        style={[
          styles.headerRow,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <ThemedText variant="h1">{t("insights.title", "Insights")}</ThemedText>
        <Pressable
          onPress={() => setShowFormula((v) => !v)}
          style={[
            styles.calendarBadge,
            {
              backgroundColor: showFormula
                ? theme.primaryMuted
                : theme.glassSurface,
              borderColor: showFormula ? theme.primary : theme.glassBorder,
            },
          ]}
        >
          <AppIcon
            name="info"
            size={18}
            color={showFormula ? theme.primary : theme.text}
          />
        </Pressable>
      </View>

      <SegmentedControl
        value={range}
        onChange={setRange}
        options={[
          { value: "week", label: t("insights.week", "This Week") },
          { value: "month", label: t("insights.month", "30 Days") },
          { value: "year", label: t("insights.year", "90 Days") },
        ]}
      />

      {showFormula ? (
        <GlassCard elevated padding={16} style={styles.cardGap}>
          <ThemedText variant="cardTitle">
            How Every Metric Is Calculated
          </ThemedText>
          {summary.calculationNotes.map((note, idx) => (
            <ThemedText key={idx} variant="caption" color="secondary">
              • {note}
            </ThemedText>
          ))}
        </GlassCard>
      ) : null}

      {isLoading ? (
        <StatePlaceholder
          variant="loading"
          title="Calculating recorded progress..."
        />
      ) : isError ? (
        <StatePlaceholder
          variant="error"
          actionLabel={t("common.retry", "Retry")}
          onAction={refetch}
        />
      ) : (
        <>
          <GlassCard elevated padding={18} style={styles.cardGap}>
            <View style={styles.headerRow}>
              <ThemedText variant="bodyMedium" color="secondary">
                {t("insights.overallProgress", "Recorded Progress")}
              </ThemedText>
              <Pressable onPress={() => setShowFormula((v) => !v)}>
                <ThemedText variant="micro" color="primary" weight="semiBold">
                  {showFormula ? "Hide formulas" : "How calculated?"}
                </ThemedText>
              </Pressable>
            </View>
            <View
              style={[
                styles.kpiRow,
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
            >
              <ThemedText variant="display">{summary.overallScore}%</ThemedText>
              <ThemedText variant="bodyMedium" color="success" weight="semiBold">
                {summary.deltaLabel}
              </ThemedText>
            </View>
            <View style={styles.miniMetrics}>
              <ThemedText variant="caption" color="secondary">
                Today: {summary.dailyCompletionRate}% · 7d Avg:{" "}
                {summary.weeklyConsistencyPct}% · 30d Avg:{" "}
                {summary.monthlyConsistencyPct}%
              </ThemedText>
            </View>
            <TrendLineChart values={summary.trendPoints} />
          </GlassCard>

          {/* Weekly Report & Lifestyle Improvement Indicators */}
          <GlassCard padding={16} style={styles.cardGap}>
            <View style={styles.headerRow}>
              <ThemedText variant="h2">Weekly Report</ThemedText>
              <ThemedText variant="micro" color="primary" weight="semiBold">
                {summary.lifestyleIndicators.overallDirection === "improving"
                  ? "Trending Up"
                  : summary.lifestyleIndicators.overallDirection === "needs_rest"
                    ? "Lighter Pacing"
                    : "Steady"}
              </ThemedText>
            </View>
            <ThemedText variant="cardTitle">
              {summary.weeklyReport.headline}
            </ThemedText>
            {summary.weeklyReport.highlights.map((line, i) => (
              <ThemedText key={i} variant="caption" color="secondary">
                • {line}
              </ThemedText>
            ))}
            <ThemedText variant="caption" color="primary">
              {summary.weeklyReport.focusSuggestion}
            </ThemedText>

            <View style={styles.indicatorRow}>
              <View style={[styles.indBox, { backgroundColor: theme.element }]}>
                <ThemedText variant="h2" color="primary">
                  {summary.goalMetrics.goalCompletionPct}%
                </ThemedText>
                <ThemedText variant="micro" color="secondary">
                  Goal Progress
                </ThemedText>
              </View>
              <View style={[styles.indBox, { backgroundColor: theme.element }]}>
                <ThemedText variant="h2">
                  {summary.lifestyleIndicators.prayerConsistencyPct}%
                </ThemedText>
                <ThemedText variant="micro" color="secondary">
                  Prayer 7d
                </ThemedText>
              </View>
              <View style={[styles.indBox, { backgroundColor: theme.element }]}>
                <ThemedText variant="h2">
                  {summary.positiveHabitConsistencyPct}%
                </ThemedText>
                <ThemedText variant="micro" color="secondary">
                  Habits Avg
                </ThemedText>
              </View>
            </View>

            <Button
              title="Ask AI Coach for Deeper Weekly Review"
              variant="outline"
              size="sm"
              onPress={() => router.push("/(tabs)/assistant")}
            />
          </GlassCard>

          {/* Positive & Negative Behavior Trends */}
          <GlassCard padding={16} style={styles.cardGap}>
            <ThemedText variant="h2">Behavioral Trends</ThemedText>
            <View style={styles.trendRow}>
              <View
                style={[styles.trendIcon, { backgroundColor: theme.successMuted }]}
              >
                <AppIcon name="trending-up" size={16} color={theme.success} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="bodyMedium" weight="semiBold">
                  Positive Habit Consistency
                </ThemedText>
                <ThemedText variant="caption" color="secondary">
                  {summary.positiveTrendLabel}
                </ThemedText>
              </View>
            </View>
            <View style={styles.trendRow}>
              <View
                style={[styles.trendIcon, { backgroundColor: theme.primaryMuted }]}
              >
                <AppIcon name="shield" size={16} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="bodyMedium" weight="semiBold">
                  Negative Habit Reduction ({summary.negativeTrend.occurrencesThisWeek} this wk / {summary.negativeTrend.urgesResistedThisWeek} urges paused)
                </ThemedText>
                <ThemedText variant="caption" color="secondary">
                  {summary.negativeTrend.improvementLabel}
                </ThemedText>
              </View>
            </View>
          </GlassCard>

          {/* Honest Completion Status Breakdown */}
          <GlassCard padding={16} style={styles.cardGap}>
            <ThemedText variant="h2">Today&apos;s Status Breakdown</ThemedText>
            <View style={styles.statusGrid}>
              <ThemedText variant="caption" color="success">
                Completed: {summary.statusBreakdown.completed}
              </ThemedText>
              <ThemedText variant="caption" color="warning">
                Skipped: {summary.statusBreakdown.skipped}
              </ThemedText>
              <ThemedText variant="caption" color="warning">
                Postponed: {summary.statusBreakdown.postponed}
              </ThemedText>
              <ThemedText variant="caption" color="error">
                Missed: {summary.statusBreakdown.missed}
              </ThemedText>
              <ThemedText variant="caption" color="secondary">
                Not Recorded: {summary.statusBreakdown.not_recorded}
              </ThemedText>
            </View>
          </GlassCard>

          {/* Habits Overview Circles */}
          {summary.habitRings.length > 0 ? (
            <GlassCard padding={16} style={styles.cardGap}>
              <ThemedText variant="h2">
                {t("insights.habitsOverview", "Habits Overview")}
              </ThemedText>
              <View
                style={[
                  styles.ringsRow,
                  { flexDirection: isRTL ? "row-reverse" : "row" },
                ]}
              >
                {summary.habitRings.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() =>
                      router.push({
                        pathname: "/(modals)/habit-detail/[id]",
                        params: { id: item.id },
                      })
                    }
                    style={styles.ringCell}
                  >
                    <ProgressRing
                      size={60}
                      strokeWidth={6}
                      progress={item.pct / 100}
                      color={colorForPillar(item.pillar)}
                      centerLabel={`${item.pct}%`}
                    />
                    <ThemedText
                      variant="micro"
                      weight="medium"
                      center
                      numberOfLines={1}
                    >
                      {item.label}
                    </ThemedText>
                    <ThemedText variant="micro" color="muted" center>
                      {item.streakDays}d
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </GlassCard>
          ) : null}

          <GlassCard padding={16}>
            <View
              style={[
                styles.bannerRow,
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
            >
              <View
                style={[styles.starBox, { backgroundColor: theme.warningMuted }]}
              >
                <AppIcon name="star" size={18} color={theme.warning} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText variant="cardTitle">
                  Gentle Companion Note
                </ThemedText>
                <ThemedText variant="caption" color="secondary">
                  {summary.insightMessage}
                </ThemedText>
              </View>
            </View>
          </GlassCard>

          <GlassCard padding={18} style={styles.cardGap}>
            <ThemedText variant="h2">
              {t("insights.lifeBalance", "Life Balance")}
            </ThemedText>
            <LifeBalanceBar
              label={t("insights.spirituality", "Spirituality")}
              percentage={summary.pillarScores.spirituality}
              color={theme.pillarSpirituality}
            />
            <LifeBalanceBar
              label={t("insights.health", "Health")}
              percentage={summary.pillarScores.health}
              color={theme.pillarHealth}
            />
            <LifeBalanceBar
              label={t("insights.productivity", "Productivity")}
              percentage={summary.pillarScores.productivity}
              color={theme.pillarProductivity}
            />
          </GlassCard>

          {/* Milestones & Achievements */}
          <GlassCard padding={16} style={styles.cardGap}>
            <ThemedText variant="h2">Personalized Milestones</ThemedText>
            <View style={styles.badgesWrap}>
              {summary.achievements.map((badge) => (
                <View
                  key={badge.id}
                  style={[
                    styles.badgeCard,
                    {
                      backgroundColor: badge.earned
                        ? theme.primaryMuted
                        : theme.element,
                      borderColor: badge.earned ? theme.primary : theme.border,
                      opacity: badge.earned ? 1 : 0.6,
                    },
                  ]}
                >
                  <AppIcon
                    name={badge.icon}
                    size={16}
                    color={badge.earned ? theme.primary : theme.textMuted}
                  />
                  <ThemedText variant="caption" weight="semiBold">
                    {badge.title}
                  </ThemedText>
                  <ThemedText variant="micro" color="secondary">
                    {badge.description}
                  </ThemedText>
                </View>
              ))}
            </View>
          </GlassCard>

          {/* Weekly Reflection (Retention without guilt) */}
          <GlassCard padding={16} style={styles.cardGap}>
            <ThemedText variant="h2">Weekly Reflection</ThemedText>
            <ThemedText variant="caption" color="secondary">
              Pause once a week to notice what worked and tune next week gently.
            </ThemedText>
            <SegmentedControl<ReflectionMood>
              value={mood}
              onChange={setMood}
              options={[
                { value: "calm", label: "Calm" },
                { value: "balanced", label: "Balanced" },
                { value: "stretched", label: "Stretched" },
              ]}
            />
            <TextInput
              value={highlight}
              onChangeText={setHighlight}
              placeholder="One win you're grateful for this week..."
              placeholderTextColor={theme.textMuted}
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            />
            <TextInput
              value={adjustment}
              onChangeText={setAdjustment}
              placeholder="One realistic adjustment for next week..."
              placeholderTextColor={theme.textMuted}
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            />
            <Button
              title="Save Weekly Reflection"
              variant="gradient"
              loading={saveReflectionMutation.isPending}
              onPress={handleSaveReflection}
            />
          </GlassCard>

          {/* Optional Gentle Challenges */}
          {challenges.length > 0 ? (
            <GlassCard padding={16} style={styles.cardGap}>
              <ThemedText variant="h2">Optional Weekly Challenges</ThemedText>
              {challenges.map((ch) => (
                <View
                  key={ch.id}
                  style={[
                    styles.challengeItem,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.element,
                    },
                  ]}
                >
                  <View style={{ flex: 1, gap: 3 }}>
                    <ThemedText variant="cardTitle">{ch.title}</ThemedText>
                    <ThemedText variant="caption" color="secondary">
                      {ch.description}
                    </ThemedText>
                    <ThemedText
                      variant="micro"
                      color="primary"
                      weight="semiBold"
                    >
                      {ch.progressDays} / {ch.targetDays} days{" "}
                      {ch.completed ? "• Completed" : ""}
                    </ThemedText>
                  </View>
                  <View style={styles.challengeBtns}>
                    {ch.joined && !ch.completed ? (
                      <Button
                        title="+1 Day"
                        size="sm"
                        variant="primary"
                        onPress={() =>
                          logChallengeMutation.mutate(ch.id, {
                            onSuccess: () =>
                              toast.success("Challenge day logged!"),
                          })
                        }
                      />
                    ) : null}
                    <Button
                      title={ch.joined ? "Leave" : "Join"}
                      size="sm"
                      variant="outline"
                      onPress={() => toggleChallengeMutation.mutate(ch.id)}
                    />
                  </View>
                </View>
              ))}
            </GlassCard>
          ) : null}
        </>
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  calendarBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardGap: {
    gap: 12,
  },
  kpiRow: {
    alignItems: "baseline",
    gap: 10,
  },
  miniMetrics: {
    marginTop: -6,
  },
  indicatorRow: {
    flexDirection: "row",
    gap: 8,
  },
  indBox: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 2,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trendIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  ringsRow: {
    justifyContent: "space-between",
    gap: 6,
  },
  ringCell: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  bannerRow: {
    alignItems: "center",
    gap: 12,
  },
  starBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  badgesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badgeCard: {
    width: "48.5%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  challengeItem: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  challengeBtns: {
    flexDirection: "row",
    gap: 8,
  },
});
