import type { HabitItem, TaskItem } from "@/modules/tasks/types/tasks.types";

export type InsightsTimeframe = "week" | "month" | "year";

export interface InsightsSummary {
  overallScore: number;
  deltaLabel: string;
  trendPoints: number[];
  pillarScores: {
    spirituality: number;
    health: number;
    productivity: number;
  };
  habitRings: {
    label: string;
    pct: number;
    pillar: "spirituality" | "health" | "productivity";
  }[];
  insightMessage: string;
}

export function computeInsightsSummary(
  timeframe: InsightsTimeframe,
  tasks: TaskItem[],
  habits: HabitItem[],
): InsightsSummary {
  const totalTasks = tasks.length || 1;
  const doneTasks = tasks.filter((t) => t.completed).length;
  const taskRatio = Math.round((doneTasks / totalTasks) * 100);

  const avgHabit =
    habits.length > 0
      ? Math.round(
          habits.reduce((sum, h) => sum + (h.weeklyConsistencyPct || (h.completedToday ? 85 : 55)), 0) /
            habits.length,
        )
      : 72;

  const baseOverall = Math.round(taskRatio * 0.45 + avgHabit * 0.55);

  const timeframeAdjust = timeframe === "week" ? 0 : timeframe === "month" ? -4 : 3;
  const overallScore = Math.min(100, Math.max(20, baseOverall + timeframeAdjust));

  const trendPoints =
    timeframe === "week"
      ? [56, 61, 60, 68, 72, 74, overallScore]
      : timeframe === "month"
        ? [52, 58, 64, 67, 70, overallScore]
        : [48, 55, 62, 69, 75, overallScore];

  return {
    overallScore,
    deltaLabel: timeframe === "year" ? "+18%" : timeframe === "month" ? "+9%" : "+12%",
    trendPoints,
    pillarScores: {
      spirituality: 92,
      health: 78,
      productivity: Math.max(60, Math.min(95, taskRatio)),
    },
    habitRings: [
      { label: "Prayer", pct: habits[0]?.weeklyConsistencyPct ?? 100, pillar: "spirituality" },
      { label: "Gym", pct: habits[1]?.weeklyConsistencyPct ?? 75, pillar: "health" },
      { label: "Reading", pct: habits[2]?.weeklyConsistencyPct ?? 60, pillar: "productivity" },
      { label: "Focus", pct: habits[3]?.weeklyConsistencyPct ?? 86, pillar: "spirituality" },
    ],
    insightMessage:
      "On days you complete Fajr on time, your morning task completion is 28% higher.",
  };
}
