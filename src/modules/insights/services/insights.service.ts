import { SYSTEM_CATEGORIES, type LifePillar } from "@/constants/categories";
import { getRecentDateRange, getTodayIso } from "@/core/utils/date";
import type { PrayerConsistencyStats } from "@/modules/prayer/types/prayer.types";
import type { ChallengeItem } from "@/modules/routine/types/routine.types";
import type {
  ActivityStatus,
  HabitItem,
  HabitLogEntry,
  TaskItem,
} from "@/modules/tasks/types/tasks.types";

export type InsightsTimeframe = "week" | "month" | "year";

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
}

export interface NegativeHabitTrend {
  occurrencesThisWeek: number;
  occurrencesLastWeek: number;
  urgesResistedThisWeek: number;
  reductionPct: number | null;
  improvementLabel: string;
}

export interface GoalCompletionMetrics {
  selectedGoalsCount: number;
  challengesJoinedCount: number;
  challengesCompletedCount: number;
  totalChallengesCount: number;
  goalCompletionPct: number;
}

export interface LifestyleIndicators {
  prayerConsistencyPct: number;
  prayerOnTimePct: number;
  recoveryPassesActive: number;
  weeklyDeltaPct: number | null;
  monthlyConsistencyPct: number;
  overallDirection: "improving" | "steady" | "needs_rest";
}

export interface WeeklyReportSummary {
  headline: string;
  highlights: string[];
  focusSuggestion: string;
}

export interface InsightsSummary {
  hasEnoughData: boolean;
  overallScore: number;
  dailyCompletionRate: number;
  weeklyConsistencyPct: number;
  monthlyConsistencyPct: number;
  positiveHabitConsistencyPct: number;
  deltaLabel: string;
  trendPoints: number[];
  pillarScores: Record<LifePillar, number>;
  habitRings: {
    id: string;
    label: string;
    pct: number;
    streakDays: number;
    pillar: LifePillar;
  }[];
  positiveTrendLabel: string;
  negativeTrend: NegativeHabitTrend;
  goalMetrics: GoalCompletionMetrics;
  lifestyleIndicators: LifestyleIndicators;
  weeklyReport: WeeklyReportSummary;
  calculationNotes: string[];
  statusBreakdown: Record<ActivityStatus, number>;
  achievements: AchievementBadge[];
  insightMessage: string;
}

function pillarForCategory(category: string): LifePillar {
  return SYSTEM_CATEGORIES.find((c) => c.id === category)?.pillar ?? "productivity";
}

function scoreDate(
  dateIso: string,
  taskLogs: { logDate: string; status: ActivityStatus; category: string }[],
  habitLogs: HabitLogEntry[],
  routineLogs: { logDate: string; status: ActivityStatus; pillar: LifePillar }[],
): number | null {
  const dayTaskLogs = taskLogs.filter(
    (l) =>
      l.logDate === dateIso &&
      l.status !== "not_recorded" &&
      l.status !== "skipped" &&
      l.status !== "postponed",
  );
  const dayHabitLogs = habitLogs.filter(
    (l) =>
      l.logDate === dateIso &&
      l.status !== "not_recorded" &&
      l.status !== "skipped" &&
      l.status !== "postponed",
  );
  const dayRoutineLogs = routineLogs.filter(
    (l) =>
      l.logDate === dateIso &&
      l.status !== "not_recorded" &&
      l.status !== "skipped" &&
      l.status !== "postponed",
  );

  const total = dayTaskLogs.length + dayHabitLogs.length + dayRoutineLogs.length;
  if (total === 0) return null;

  const successes =
    dayTaskLogs.filter((l) => l.status === "completed").length +
    dayHabitLogs.filter(
      (l) => l.status === "completed" || l.status === "urge_resisted",
    ).length +
    dayRoutineLogs.filter((l) => l.status === "completed").length;

  return Math.round((successes / total) * 100);
}

export function computeRealLifestyleAnalytics(params: {
  timeframe: InsightsTimeframe;
  todayIso?: string;
  todayTasks: TaskItem[];
  taskLogs: { logDate: string; status: ActivityStatus; category: string }[];
  habits: HabitItem[];
  habitLogs: HabitLogEntry[];
  routineLogs: { logDate: string; status: ActivityStatus; pillar: LifePillar }[];
  prayerStats?: PrayerConsistencyStats;
  challenges?: ChallengeItem[];
  selectedGoalsCount?: number;
}): InsightsSummary {
  const {
    timeframe,
    todayTasks,
    taskLogs,
    habits,
    habitLogs,
    routineLogs,
    prayerStats,
    challenges = [],
    selectedGoalsCount = 0,
  } = params;
  const today = params.todayIso ?? getTodayIso();

  // 1. Daily completion rate & explicit status breakdown (never treating not_recorded as missed)
  const statusBreakdown: Record<ActivityStatus, number> = {
    completed: 0,
    skipped: 0,
    missed: 0,
    postponed: 0,
    not_recorded: 0,
  };
  for (const t of todayTasks) {
    statusBreakdown[t.status] = (statusBreakdown[t.status] ?? 0) + 1;
  }

  const dailyRecordedCount =
    statusBreakdown.completed + statusBreakdown.missed;
  const dailyCompletionRate =
    dailyRecordedCount > 0
      ? Math.round((statusBreakdown.completed / dailyRecordedCount) * 100)
      : todayTasks.length > 0 && statusBreakdown.completed > 0
        ? Math.round((statusBreakdown.completed / todayTasks.length) * 100)
        : 0;

  // 2. Date windows: week (7d), month (30d), year (90d aggregated into 12 weekly buckets)
  const last7 = getRecentDateRange(today, 7);
  const last14 = getRecentDateRange(today, 14);
  const prev7 = last14.slice(0, 7);
  const last30 = getRecentDateRange(today, 30);
  const last7Set = new Set(last7);
  const prev7Set = new Set(prev7);

  const mapSeries = (dates: string[]) =>
    dates.map((d) => scoreDate(d, taskLogs, habitLogs, routineLogs));

  const last30Raw = mapSeries(last30);
  const last7Raw = last30Raw.slice(-7);
  const prev7Raw = last30Raw.slice(-14, -7);

  let trendPoints: number[];
  if (timeframe === "week") {
    trendPoints = last7Raw.map((v) => v ?? 0);
  } else if (timeframe === "month") {
    trendPoints = last30Raw.map((v) => v ?? 0);
  } else {
    // 90-day trajectory grouped cleanly in 12 ~weekly points
    const last84 = getRecentDateRange(today, 84);
    const raw84 = mapSeries(last84);
    trendPoints = [];
    for (let i = 0; i < 84; i += 7) {
      const bucket = raw84.slice(i, i + 7).filter((v): v is number => v !== null);
      trendPoints.push(
        bucket.length > 0
          ? Math.round(bucket.reduce((a, b) => a + b, 0) / bucket.length)
          : 0,
      );
    }
  }

  const avgRecorded = (vals: (number | null)[]): number | null => {
    const valid = vals.filter((v): v is number => v !== null);
    if (valid.length === 0) return null;
    return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
  };

  const weeklyAvg = avgRecorded(last7Raw);
  const prevWeeklyAvg = avgRecorded(prev7Raw);
  const monthlyAvg = avgRecorded(last30Raw);
  const weeklyDeltaPct =
    weeklyAvg !== null && prevWeeklyAvg !== null ? weeklyAvg - prevWeeklyAvg : null;

  const weeklyConsistencyPct = weeklyAvg ?? dailyCompletionRate;
  const monthlyConsistencyPct = monthlyAvg ?? weeklyConsistencyPct;

  const activeWindowRecorded = trendPoints.filter((v) => v > 0);
  const hasEnoughData = activeWindowRecorded.length > 0 || habits.length > 0;

  const overallScore =
    timeframe === "month"
      ? monthlyConsistencyPct
      : activeWindowRecorded.length > 0
        ? Math.round(
            activeWindowRecorded.reduce((a, b) => a + b, 0) /
              activeWindowRecorded.length,
          )
        : weeklyConsistencyPct;

  // 3. Positive habit trends & average consistency
  const positiveHabits = habits.filter((h) => h.polarity === "positive");
  const positiveHabitConsistencyPct =
    positiveHabits.length > 0
      ? Math.round(
          positiveHabits.reduce((sum, h) => sum + h.weeklyConsistencyPct, 0) /
            positiveHabits.length,
        )
      : 0;

  const positiveHabitIds = new Set(positiveHabits.map((h) => h.id));
  const posThisWeek = habitLogs.filter(
    (l) =>
      positiveHabitIds.has(l.habitId) &&
      last7Set.has(l.logDate) &&
      l.status === "completed",
  ).length;
  const posPrevWeek = habitLogs.filter(
    (l) =>
      positiveHabitIds.has(l.habitId) &&
      prev7Set.has(l.logDate) &&
      l.status === "completed",
  ).length;

  let positiveTrendLabel = "Record daily check-ins to track habit momentum";
  let deltaLabel = "Steady";
  if (weeklyDeltaPct !== null) {
    deltaLabel =
      weeklyDeltaPct >= 0 ? `+${weeklyDeltaPct}% vs last wk` : `${weeklyDeltaPct}% vs last wk`;
  } else if (posThisWeek > 0) {
    deltaLabel = `+${posThisWeek} logs`;
  }

  if (posPrevWeek === 0 && posThisWeek > 0) {
    positiveTrendLabel = `${posThisWeek} positive check-ins recorded this week (${positiveHabitConsistencyPct}% avg consistency)`;
  } else if (posPrevWeek > 0) {
    const pctDiff = Math.round(((posThisWeek - posPrevWeek) / posPrevWeek) * 100);
    positiveTrendLabel =
      pctDiff >= 0
        ? `Positive habits up ${pctDiff}% vs prior 7 days (${positiveHabitConsistencyPct}% avg)`
        : `${posThisWeek} completions recorded this week (${positiveHabitConsistencyPct}% avg)`;
  }

  // 4. Negative habit reduction trends (occurrences & urges resisted)
  const negativeHabitIds = new Set(
    habits.filter((h) => h.polarity === "negative").map((h) => h.id),
  );
  const occurrencesThisWeek = habitLogs.filter(
    (l) =>
      negativeHabitIds.has(l.habitId) &&
      last7Set.has(l.logDate) &&
      l.status === "occurrence",
  ).length;
  const occurrencesLastWeek = habitLogs.filter(
    (l) =>
      negativeHabitIds.has(l.habitId) &&
      prev7Set.has(l.logDate) &&
      l.status === "occurrence",
  ).length;
  const urgesResistedThisWeek = habitLogs.filter(
    (l) =>
      negativeHabitIds.has(l.habitId) &&
      last7Set.has(l.logDate) &&
      l.status === "urge_resisted",
  ).length;

  const reductionPct =
    occurrencesLastWeek > 0
      ? Math.round(
          ((occurrencesLastWeek - occurrencesThisWeek) / occurrencesLastWeek) * 100,
        )
      : null;

  let improvementLabel = "Stay mindful — every resisted urge counts";
  if (occurrencesThisWeek < occurrencesLastWeek) {
    improvementLabel = `${occurrencesLastWeek - occurrencesThisWeek} fewer occurrences vs prior week${reductionPct !== null ? ` (${reductionPct}% reduction)` : ""}`;
  } else if (urgesResistedThisWeek > 0) {
    improvementLabel = `${urgesResistedThisWeek} urge${urgesResistedThisWeek === 1 ? "" : "s"} navigated calmly this week`;
  }

  // 5. Pillar Balance across recorded entries
  const pillarBuckets: Record<LifePillar, { done: number; total: number }> = {
    spirituality: { done: 0, total: 0 },
    health: { done: 0, total: 0 },
    productivity: { done: 0, total: 0 },
  };

  for (const t of todayTasks) {
    if (
      t.status === "not_recorded" ||
      t.status === "skipped" ||
      t.status === "postponed"
    ) {
      continue;
    }
    const p = pillarForCategory(t.category);
    pillarBuckets[p].total += 1;
    if (t.status === "completed") pillarBuckets[p].done += 1;
  }

  for (const h of habits) {
    if (
      h.todayStatus === "not_recorded" ||
      h.todayStatus === "skipped" ||
      h.todayStatus === "postponed"
    ) {
      continue;
    }
    const p = pillarForCategory(h.category);
    pillarBuckets[p].total += 1;
    if (h.completedToday) pillarBuckets[p].done += 1;
  }

  for (const rl of routineLogs.filter((r) => last7Set.has(r.logDate))) {
    if (
      rl.status === "not_recorded" ||
      rl.status === "skipped" ||
      rl.status === "postponed"
    ) {
      continue;
    }
    pillarBuckets[rl.pillar].total += 1;
    if (rl.status === "completed") pillarBuckets[rl.pillar].done += 1;
  }

  const pillarScores: Record<LifePillar, number> = {
    spirituality:
      pillarBuckets.spirituality.total > 0
        ? Math.round(
            (pillarBuckets.spirituality.done / pillarBuckets.spirituality.total) * 100,
          )
        : 0,
    health:
      pillarBuckets.health.total > 0
        ? Math.round((pillarBuckets.health.done / pillarBuckets.health.total) * 100)
        : 0,
    productivity:
      pillarBuckets.productivity.total > 0
        ? Math.round(
            (pillarBuckets.productivity.done / pillarBuckets.productivity.total) * 100,
          )
        : 0,
  };

  // 6. Goal & Challenge Completion
  const joinedChallenges = challenges.filter((c) => c.joined);
  const completedChallenges = challenges.filter((c) => c.completed);
  const challengeUnits = joinedChallenges.map((c) =>
    c.targetDays > 0 ? Math.min(1, c.progressDays / c.targetDays) : 0,
  );
  const goalCompletionPct =
    challengeUnits.length > 0
      ? Math.round(
          (challengeUnits.reduce((a, b) => a + b, 0) / challengeUnits.length) *
            100,
        )
      : positiveHabitConsistencyPct;

  const goalMetrics: GoalCompletionMetrics = {
    selectedGoalsCount,
    challengesJoinedCount: joinedChallenges.length,
    challengesCompletedCount: completedChallenges.length,
    totalChallengesCount: challenges.length,
    goalCompletionPct,
  };

  // 7. Lifestyle Improvement Indicators
  const prayerConsistencyPct = prayerStats?.recordedConsistencyPct ?? 0;
  const prayerOnTimePct = prayerStats?.onTimePct ?? 0;
  const recoveryPassesActive = habits.filter((h) => h.graceUsedThisWeek).length;
  const overallDirection: LifestyleIndicators["overallDirection"] =
    weeklyDeltaPct !== null && weeklyDeltaPct >= 5
      ? "improving"
      : weeklyDeltaPct !== null && weeklyDeltaPct <= -10
        ? "needs_rest"
        : "steady";

  const lifestyleIndicators: LifestyleIndicators = {
    prayerConsistencyPct,
    prayerOnTimePct,
    recoveryPassesActive,
    weeklyDeltaPct,
    monthlyConsistencyPct,
    overallDirection,
  };

  // 8. Habit rings
  const habitRings = habits.slice(0, 4).map((h) => ({
    id: h.id,
    label: h.title.split(" ").slice(0, 2).join(" "),
    pct: h.weeklyConsistencyPct,
    streakDays: h.streakDays,
    pillar: pillarForCategory(h.category),
  }));

  // 9. Milestones
  const maxStreak = habits.reduce(
    (m, h) => Math.max(m, h.streakDays, h.bestStreak),
    0,
  );
  const achievements: AchievementBadge[] = [
    {
      id: "first_step",
      title: "First Intentional Step",
      description: "Complete at least 1 task or habit.",
      icon: "star",
      earned: statusBreakdown.completed > 0 || posThisWeek > 0,
    },
    {
      id: "momentum_3",
      title: "3-Day Momentum",
      description: "Build a 3-day streak on any habit.",
      icon: "flame",
      earned: maxStreak >= 3,
    },
    {
      id: "urge_awareness",
      title: "Mindful Pause",
      description: "Record an urge resisted without judgment.",
      icon: "shield",
      earned: urgesResistedThisWeek > 0,
    },
    {
      id: "prayer_anchor",
      title: "Prayer Rhythm",
      description: "Achieve 80%+ recorded prayer consistency over 7 days.",
      icon: "compass",
      earned: (prayerStats?.recordedCount ?? 0) >= 5 && prayerConsistencyPct >= 80,
    },
    {
      id: "balanced_day",
      title: "Balanced Rhythm",
      description: "Log activity across all 3 life pillars.",
      icon: "award",
      earned:
        pillarScores.spirituality > 0 &&
        pillarScores.health > 0 &&
        pillarScores.productivity > 0,
    },
    {
      id: "recovery_wise",
      title: "Sustainable Grace",
      description: "Recover after a busy day using a gentle grace pass.",
      icon: "heart",
      earned: recoveryPassesActive > 0,
    },
  ];

  // 10. Weekly Report & Methodology Explanations
  const weeklyHighlights: string[] = [
    `7-day recorded rhythm: ${weeklyConsistencyPct}% · 30-day average: ${monthlyConsistencyPct}%`,
    `Positive habits: ${positiveHabitConsistencyPct}% avg weekly consistency (${posThisWeek} completions)`,
    `Negative habit reduction: ${occurrencesThisWeek} occurrences vs ${occurrencesLastWeek} prior week (${urgesResistedThisWeek} urges paused)`,
    `Prayer tracking: ${prayerStats?.recordedCount ?? 0} slots recorded (${prayerOnTimePct}% on-time among recorded)`,
  ];

  const weeklyReport: WeeklyReportSummary = {
    headline:
      overallDirection === "improving"
        ? "Momentum is gently climbing this week"
        : overallDirection === "needs_rest"
          ? "Lighter pacing this week — protect rest and small wins"
          : "Steady weekly lifestyle balance",
    highlights: weeklyHighlights,
    focusSuggestion:
      statusBreakdown.missed >= 2
        ? "Consider lightening overloaded time blocks or using Postpone instead of forcing extra tasks."
        : urgesResistedThisWeek > 0
          ? "Keep celebrating urges resisted — awareness breaks automatic triggers over time."
          : "Use one Weekly Reflection below to pick a single realistic adjustment for next week.",
  };

  const calculationNotes: string[] = [
    "Daily & Trend Scores divide completed recorded items (tasks, positive habits, urges resisted, routine blocks) by total recorded items on each day. Unrecorded, skipped, and postponed items never penalize your score as missed.",
    "Weekly vs Monthly Trends average only days where you recorded activity across 7-day, 30-day, and 12-week (90-day) buckets.",
    "Prayer Consistency measures on_time, delayed, and qada logs against recorded prayer logs only; unrecorded slots remain neutral.",
    "Pillar Balance reflects Spirituality, Health, and Productivity completions across your recorded tasks, habits, and routine logs.",
  ];

  let insightMessage =
    "Record your first few tasks, prayers, or habits to unlock personalized trend patterns.";
  if (dailyCompletionRate >= 80 && dailyRecordedCount > 0) {
    insightMessage = `You've completed ${dailyCompletionRate}% of today's recorded plan — calm consistency compounds over time.`;
  } else if (urgesResistedThisWeek > 0) {
    insightMessage = `You navigated ${urgesResistedThisWeek} urge${urgesResistedThisWeek === 1 ? "" : "s"} mindfully this week. Awareness weakens unwanted habits.`;
  } else if (maxStreak >= 3) {
    insightMessage = `Your longest active rhythm is ${maxStreak} days. Use a weekly recovery pass anytime life gets busy.`;
  }

  return {
    hasEnoughData,
    overallScore,
    dailyCompletionRate,
    weeklyConsistencyPct,
    monthlyConsistencyPct,
    positiveHabitConsistencyPct,
    deltaLabel,
    trendPoints,
    pillarScores,
    habitRings,
    positiveTrendLabel,
    negativeTrend: {
      occurrencesThisWeek,
      occurrencesLastWeek,
      urgesResistedThisWeek,
      reductionPct,
      improvementLabel,
    },
    goalMetrics,
    lifestyleIndicators,
    weeklyReport,
    calculationNotes,
    statusBreakdown,
    achievements,
    insightMessage,
  };
}
