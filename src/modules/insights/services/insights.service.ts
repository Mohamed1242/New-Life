import { SYSTEM_CATEGORIES, type LifePillar } from "@/constants/categories";
import { getRecentDateRange, getTodayIso } from "@/core/utils/date";
import type { ActivityStatus, HabitItem, HabitLogEntry, TaskItem } from "@/modules/tasks/types/tasks.types";

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
  improvementLabel: string;
}

export interface InsightsSummary {
  hasEnoughData: boolean;
  overallScore: number;
  dailyCompletionRate: number;
  weeklyConsistencyPct: number;
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
  statusBreakdown: Record<ActivityStatus, number>;
  achievements: AchievementBadge[];
  insightMessage: string;
}

function pillarForCategory(category: string): LifePillar {
  return SYSTEM_CATEGORIES.find((c) => c.id === category)?.pillar ?? "productivity";
}

export function computeRealLifestyleAnalytics(params: {
  timeframe: InsightsTimeframe;
  todayTasks: TaskItem[];
  taskLogs: { logDate: string; status: ActivityStatus; category: string }[];
  habits: HabitItem[];
  habitLogs: HabitLogEntry[];
  routineLogs: { logDate: string; status: ActivityStatus; pillar: LifePillar }[];
}): InsightsSummary {
  const { timeframe, todayTasks, taskLogs, habits, habitLogs, routineLogs } = params;
  const today = getTodayIso();

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

  const dailyCompletionRate =
    todayTasks.length > 0
      ? Math.round((statusBreakdown.completed / todayTasks.length) * 100)
      : 0;

  // 2. Date windows for real trend comparison
  const windowDays = timeframe === "week" ? 7 : timeframe === "month" ? 14 : 30;
  const recentDates = getRecentDateRange(today, windowDays);
  const last7 = getRecentDateRange(today, 7);
  const last14 = getRecentDateRange(today, 14);
  const prev7 = last14.slice(0, 7);
  const last7Set = new Set(last7);
  const prev7Set = new Set(prev7);

  // 3. Daily scores per date from real recorded entries
  const trendPoints = recentDates.map((dateIso) => {
    const dayTaskLogs = taskLogs.filter(
      (l) => l.logDate === dateIso && l.status !== "not_recorded" && l.status !== "skipped" && l.status !== "postponed",
    );
    const dayHabitLogs = habitLogs.filter(
      (l) =>
        l.logDate === dateIso &&
        l.status !== "not_recorded" &&
        l.status !== "skipped" &&
        l.status !== "postponed",
    );
    const dayRoutineLogs = routineLogs.filter(
      (l) => l.logDate === dateIso && l.status !== "not_recorded" && l.status !== "skipped" && l.status !== "postponed",
    );

    const total = dayTaskLogs.length + dayHabitLogs.length + dayRoutineLogs.length;
    if (total === 0) return 0;

    const successes =
      dayTaskLogs.filter((l) => l.status === "completed").length +
      dayHabitLogs.filter((l) => l.status === "completed" || l.status === "urge_resisted").length +
      dayRoutineLogs.filter((l) => l.status === "completed").length;

    return Math.round((successes / total) * 100);
  });

  const nonZeroDays = trendPoints.filter((v) => v > 0);
  const hasEnoughData = nonZeroDays.length > 0 || habits.length > 0;

  const overallScore =
    nonZeroDays.length > 0
      ? Math.round(nonZeroDays.reduce((a, b) => a + b, 0) / nonZeroDays.length)
      : dailyCompletionRate;

  // 4. Weekly consistency across recorded logs in last 7 days
  const recent7Scores = trendPoints.slice(-7).filter((v) => v > 0);
  const weeklyConsistencyPct =
    recent7Scores.length > 0
      ? Math.round(recent7Scores.reduce((a, b) => a + b, 0) / recent7Scores.length)
      : dailyCompletionRate;

  // 5. Positive habit trends (this week vs prior week)
  const positiveHabitIds = new Set(
    habits.filter((h) => h.polarity === "positive").map((h) => h.id),
  );
  const posThisWeek = habitLogs.filter(
    (l) => positiveHabitIds.has(l.habitId) && last7Set.has(l.logDate) && l.status === "completed",
  ).length;
  const posPrevWeek = habitLogs.filter(
    (l) => positiveHabitIds.has(l.habitId) && prev7Set.has(l.logDate) && l.status === "completed",
  ).length;

  let positiveTrendLabel = "Steady positive rhythm";
  let deltaLabel = "Steady";
  if (posPrevWeek === 0 && posThisWeek > 0) {
    positiveTrendLabel = `${posThisWeek} positive check-ins recorded this week`;
    deltaLabel = `+${posThisWeek} logs`;
  } else if (posPrevWeek > 0) {
    const pctDiff = Math.round(((posThisWeek - posPrevWeek) / posPrevWeek) * 100);
    deltaLabel = pctDiff >= 0 ? `+${pctDiff}%` : `${pctDiff}%`;
    positiveTrendLabel =
      pctDiff >= 0
        ? `Positive completions up ${pctDiff}% vs prior 7 days`
        : `${posThisWeek} completions recorded this week — keep steps gentle`;
  }

  // 6. Negative habit trends (occurrences & urges resisted)
  const negativeHabitIds = new Set(
    habits.filter((h) => h.polarity === "negative").map((h) => h.id),
  );
  const occurrencesThisWeek = habitLogs.filter(
    (l) => negativeHabitIds.has(l.habitId) && last7Set.has(l.logDate) && l.status === "occurrence",
  ).length;
  const occurrencesLastWeek = habitLogs.filter(
    (l) => negativeHabitIds.has(l.habitId) && prev7Set.has(l.logDate) && l.status === "occurrence",
  ).length;
  const urgesResistedThisWeek = habitLogs.filter(
    (l) => negativeHabitIds.has(l.habitId) && last7Set.has(l.logDate) && l.status === "urge_resisted",
  ).length;

  let improvementLabel = "Stay mindful — every resisted urge counts";
  if (occurrencesThisWeek < occurrencesLastWeek) {
    improvementLabel = `${occurrencesLastWeek - occurrencesThisWeek} fewer occurrences than last week`;
  } else if (urgesResistedThisWeek > 0) {
    improvementLabel = `${urgesResistedThisWeek} urge${urgesResistedThisWeek === 1 ? "" : "s"} navigated calmly this week`;
  }

  // 7. Pillar Balance from real recorded data
  const pillarBuckets: Record<LifePillar, { done: number; total: number }> = {
    spirituality: { done: 0, total: 0 },
    health: { done: 0, total: 0 },
    productivity: { done: 0, total: 0 },
  };

  for (const t of todayTasks) {
    if (t.status === "not_recorded" || t.status === "skipped" || t.status === "postponed") continue;
    const p = pillarForCategory(t.category);
    pillarBuckets[p].total += 1;
    if (t.status === "completed") pillarBuckets[p].done += 1;
  }

  for (const h of habits) {
    if (h.todayStatus === "not_recorded" || h.todayStatus === "skipped" || h.todayStatus === "postponed") continue;
    const p = pillarForCategory(h.category);
    pillarBuckets[p].total += 1;
    if (h.completedToday) pillarBuckets[p].done += 1;
  }

  for (const rl of routineLogs.filter((r) => last7Set.has(r.logDate))) {
    if (rl.status === "not_recorded" || rl.status === "skipped" || rl.status === "postponed") continue;
    pillarBuckets[rl.pillar].total += 1;
    if (rl.status === "completed") pillarBuckets[rl.pillar].done += 1;
  }

  const pillarScores: Record<LifePillar, number> = {
    spirituality:
      pillarBuckets.spirituality.total > 0
        ? Math.round((pillarBuckets.spirituality.done / pillarBuckets.spirituality.total) * 100)
        : 0,
    health:
      pillarBuckets.health.total > 0
        ? Math.round((pillarBuckets.health.done / pillarBuckets.health.total) * 100)
        : 0,
    productivity:
      pillarBuckets.productivity.total > 0
        ? Math.round((pillarBuckets.productivity.done / pillarBuckets.productivity.total) * 100)
        : 0,
  };

  // 8. Habit rings from real habits
  const habitRings = habits.slice(0, 4).map((h) => ({
    id: h.id,
    label: h.title.split(" ").slice(0, 2).join(" "),
    pct: h.weeklyConsistencyPct,
    streakDays: h.streakDays,
    pillar: pillarForCategory(h.category),
  }));

  // 9. Gentle Achievement System evaluated from real data
  const maxStreak = habits.reduce((m, h) => Math.max(m, h.streakDays, h.bestStreak), 0);
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
      id: "balanced_day",
      title: "Balanced Rhythm",
      description: "Log activity across all 3 life pillars.",
      icon: "award",
      earned:
        pillarScores.spirituality > 0 &&
        pillarScores.health > 0 &&
        pillarScores.productivity > 0,
    },
  ];

  // 10. Dynamic calm insight message
  let insightMessage = "Record your first few tasks or habits to unlock personalized trend patterns.";
  if (dailyCompletionRate >= 80) {
    insightMessage = `You've completed ${dailyCompletionRate}% of today's plan — calm consistency compounds over time.`;
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
    deltaLabel,
    trendPoints,
    pillarScores,
    habitRings,
    positiveTrendLabel,
    negativeTrend: {
      occurrencesThisWeek,
      occurrencesLastWeek,
      urgesResistedThisWeek,
      improvementLabel,
    },
    statusBreakdown,
    achievements,
    insightMessage,
  };
}
