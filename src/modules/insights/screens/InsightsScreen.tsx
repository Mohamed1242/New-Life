import React from "react";
import { StyleSheet, View } from "react-native";
import { ScreenWrapper } from "@/components/common/ScreenWrapper";
import { StatePlaceholder } from "@/components/common/StatePlaceholder";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedText } from "@/components/themed/ThemedText";
import { GlassCard } from "@/components/ui/GlassCard";
import { LifeBalanceBar } from "@/components/ui/LifeBalanceBar";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TrendLineChart } from "@/components/ui/TrendLineChart";
import { useTranslation } from "@/i18n";
import { useTheme } from "@/theme/tokens";
import { useInsights } from "../hooks/useInsights";

export const InsightsScreen: React.FC = () => {
  const theme = useTheme();
  const { t, isRTL } = useTranslation();
  const { range, setRange, summary, isLoading, isError, refetch } = useInsights();

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

  return (
    <ScreenWrapper>
      <View
        style={[
          styles.headerRow,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <ThemedText variant="h1">{t("insights.title", "Insights")}</ThemedText>
        <View
          style={[
            styles.calendarBadge,
            {
              backgroundColor: theme.glassSurface,
              borderColor: theme.glassBorder,
            },
          ]}
        >
          <AppIcon name="calendar" size={18} color={theme.text} />
        </View>
      </View>

      <SegmentedControl
        value={range}
        onChange={setRange}
        options={[
          { value: "week", label: t("insights.week", "This Week") },
          { value: "month", label: t("insights.month", "This Month") },
          { value: "year", label: t("insights.year", "This Year") },
        ]}
      />

      {isLoading ? (
        <StatePlaceholder variant="loading" title="Calculating lifestyle trends..." />
      ) : isError ? (
        <StatePlaceholder
          variant="error"
          actionLabel={t("common.retry", "Retry")}
          onAction={refetch}
        />
      ) : (
        <>
          <GlassCard elevated padding={18} style={styles.cardGap}>
            <ThemedText variant="bodyMedium" color="secondary">
              {t("insights.overallProgress", "Overall Progress")}
            </ThemedText>
            <View
              style={[
                styles.kpiRow,
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
            >
              <ThemedText variant="display">{summary.overallScore}%</ThemedText>
              <ThemedText variant="bodyMedium" color="success" weight="semiBold">
                ↑ {summary.deltaLabel}
              </ThemedText>
            </View>
            <TrendLineChart values={summary.trendPoints} />
          </GlassCard>

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
                <View key={item.label} style={styles.ringCell}>
                  <ProgressRing
                    size={62}
                    strokeWidth={6}
                    progress={item.pct / 100}
                    color={colorForPillar(item.pillar)}
                    centerLabel={`${item.pct}%`}
                  />
                  <ThemedText variant="caption" weight="medium" center>
                    {item.label}
                  </ThemedText>
                </View>
              ))}
            </View>
          </GlassCard>

          <GlassCard padding={16}>
            <View
              style={[
                styles.bannerRow,
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
            >
              <View style={[styles.starBox, { backgroundColor: theme.warningMuted }]}>
                <AppIcon name="star" size={18} color={theme.warning} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText variant="cardTitle">Great momentum!</ThemedText>
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
        </>
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    alignItems: "center",
    justifyContent: "space-between",
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
  ringsRow: {
    justifyContent: "space-between",
    gap: 6,
  },
  ringCell: {
    alignItems: "center",
    gap: 6,
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
});
