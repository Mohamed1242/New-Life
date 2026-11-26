import test from "node:test";
import assert from "node:assert/strict";
import { computeRealLifestyleAnalytics } from "../src/modules/insights/services/insights.service.ts";
import { computeHabitMetrics, doesTaskMatchDate } from "../src/modules/tasks/utils/schedule.ts";
import type { HabitItem, HabitLogEntry, TaskItem } from "../src/modules/tasks/types/tasks.types.ts";

test("doesTaskMatchDate respects daily, weekdays, weekly, custom, and postponedTo", () => {
  // 2026-11-26 is Thursday (weekday 4)
  assert.equal(
    doesTaskMatchDate({ dateIso: "2026-11-20", repeat: "weekdays", customDays: [], postponedTo: null }, "2026-11-26"),
    true,
  );
  // 2026-11-28 is Saturday (weekday 6)
  assert.equal(
    doesTaskMatchDate({ dateIso: "2026-11-20", repeat: "weekdays", customDays: [], postponedTo: null }, "2026-11-28"),
    false,
  );
  assert.equal(
    doesTaskMatchDate({ dateIso: "2026-11-26", repeat: "once", customDays: [], postponedTo: "2026-11-27" }, "2026-11-27"),
    true,
  );
});

test("computeHabitMetrics computes positive streaks, recovery dates, and negative urges without punishing open today", () => {
  const habit: Pick<HabitItem, "id" | "polarity" | "frequencyType" | "targetPerWeek" | "lastRecoveryDate"> = {
    id: "h1",
    polarity: "positive",
    frequencyType: "daily",
    targetPerWeek: 7,
    lastRecoveryDate: "2026-11-24",
  };
  const logs: HabitLogEntry[] = [
    { id: "l1", habitId: "h1", logDate: "2026-11-25", status: "completed", value: 1, triggerTag: null, loggedAt: "2026-11-25T08:00:00Z" },
    { id: "l2", habitId: "h1", logDate: "2026-11-23", status: "completed", value: 1, triggerTag: null, loggedAt: "2026-11-23T08:00:00Z" },
  ];

  const metrics = computeHabitMetrics(habit, logs, "2026-11-26");
  assert.equal(metrics.todayStatus, "not_recorded");
  assert.equal(metrics.streakDays, 3, "Streak bridges recovery day 11-24 cleanly while 11-26 is unrecorded");
});

test("computeRealLifestyleAnalytics computes honest trends, negative reduction, and goal completion", () => {
  const todayIso = "2026-11-26";
  const todayTasks: TaskItem[] = [
    { id: "t1", title: "Fajr Walk", notes: "", category: "health", timeLabel: "06:00 AM", dateIso: todayIso, priority: "medium", repeat: "daily", customDays: [], reminderEnabled: true, status: "completed", completed: true, postponedTo: null },
    { id: "t2", title: "Reading", notes: "", category: "study", timeLabel: "08:00 PM", dateIso: todayIso, priority: "medium", repeat: "daily", customDays: [], reminderEnabled: false, status: "not_recorded", completed: false, postponedTo: null },
  ];

  const habits: HabitItem[] = [
    { id: "h1", title: "Quran Reading", polarity: "positive", category: "prayer", targetLabel: "Daily", frequencyType: "daily", targetPerWeek: 7, customDays: [0,1,2,3,4,5,6], streakDays: 5, bestStreak: 7, graceUsedThisWeek: true, lastRecoveryDate: null, completedToday: true, todayStatus: "completed", urgeCountToday: 0, occurrencesToday: 0, weeklyConsistencyPct: 86 },
    { id: "h2", title: "Late Scrolling", polarity: "negative", category: "health", targetLabel: "Limit", frequencyType: "daily", targetPerWeek: 7, customDays: [0,1,2,3,4,5,6], streakDays: 4, bestStreak: 4, graceUsedThisWeek: false, lastRecoveryDate: null, completedToday: true, todayStatus: "urge_resisted", urgeCountToday: 1, occurrencesToday: 0, weeklyConsistencyPct: 80 },
  ];

  const habitLogs: HabitLogEntry[] = [
    { id: "a1", habitId: "h1", logDate: "2026-11-26", status: "completed", value: 1, triggerTag: null, loggedAt: "" },
    { id: "a2", habitId: "h2", logDate: "2026-11-26", status: "urge_resisted", value: 0, triggerTag: "stress", loggedAt: "" },
    { id: "a3", habitId: "h2", logDate: "2026-11-16", status: "occurrence", value: 1, triggerTag: "boredom", loggedAt: "" },
    { id: "a4", habitId: "h2", logDate: "2026-11-17", status: "occurrence", value: 1, triggerTag: "boredom", loggedAt: "" },
  ];

  const summary = computeRealLifestyleAnalytics({
    timeframe: "month",
    todayIso,
    todayTasks,
    taskLogs: [
      { logDate: "2026-11-26", status: "completed", category: "health" },
      { logDate: "2026-11-26", status: "not_recorded", category: "study" },
    ],
    habits,
    habitLogs,
    routineLogs: [],
    selectedGoalsCount: 3,
    challenges: [
      { id: "c1", title: "Dawn", description: "", pillar: "spirituality", targetDays: 7, progressDays: 7, joined: true, completed: true },
    ],
  });

  assert.equal(summary.trendPoints.length, 30);
  assert.equal(summary.dailyCompletionRate, 100, "Unrecorded t2 does not count as missed in daily recorded completion rate");
  assert.equal(summary.negativeTrend.occurrencesThisWeek, 0);
  assert.equal(summary.negativeTrend.occurrencesLastWeek, 2);
  assert.equal(summary.negativeTrend.reductionPct, 100);
  assert.equal(summary.goalMetrics.goalCompletionPct, 100);
  assert.equal(summary.achievements.find((b) => b.id === "recovery_wise")?.earned, true);
  assert.ok(summary.calculationNotes.length >= 3);
});
