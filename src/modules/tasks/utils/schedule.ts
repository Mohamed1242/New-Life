import { addDaysIso, getRecentDateRange, getTodayIso, getWeekdayIndex } from "@/core/utils/date";
import type {
  ActivityStatus,
  HabitItem,
  HabitLogEntry,
  HabitLogStatus,
  RepeatRule,
  TaskItem,
} from "../types/tasks.types";

export function safeParseDays(raw: string | number[] | undefined, fallback: number[] = [0, 1, 2, 3, 4, 5, 6]): number[] {
  if (Array.isArray(raw)) return raw;
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function doesTaskMatchDate(task: Pick<TaskItem, "dateIso" | "repeat" | "customDays" | "postponedTo">, targetIso: string): boolean {
  if (task.postponedTo && task.postponedTo === targetIso) return true;
  if (task.repeat === "once") {
    return task.dateIso === targetIso;
  }
  if (targetIso < task.dateIso) return false;

  const weekday = getWeekdayIndex(targetIso);
  switch (task.repeat as RepeatRule) {
    case "daily":
      return true;
    case "weekdays":
      return weekday >= 1 && weekday <= 5;
    case "weekly":
      return weekday === getWeekdayIndex(task.dateIso);
    case "custom":
      return task.customDays.includes(weekday);
    default:
      return task.dateIso === targetIso;
  }
}

/**
 * Computes current & best streak from recorded habit_logs without punishing
 * `not_recorded` today. Supports flexible grace/recovery dates.
 */
export function computeHabitMetrics(
  habit: Pick<HabitItem, "id" | "polarity" | "frequencyType" | "targetPerWeek" | "lastRecoveryDate">,
  logs: HabitLogEntry[],
  todayIso = getTodayIso(),
): {
  streakDays: number;
  weeklyConsistencyPct: number;
  todayStatus: HabitLogStatus;
  completedToday: boolean;
  urgeCountToday: number;
  occurrencesToday: number;
} {
  const habitLogs = logs.filter((l) => l.habitId === habit.id);
  const logsByDate = new Map<string, HabitLogEntry[]>();
  for (const log of habitLogs) {
    const list = logsByDate.get(log.logDate) ?? [];
    list.push(log);
    logsByDate.set(log.logDate, list);
  }

  const todayLogs = logsByDate.get(todayIso) ?? [];
  const urgeCountToday = todayLogs.filter((l) => l.status === "urge_resisted").length;
  const occurrencesToday = todayLogs.filter((l) => l.status === "occurrence").length;

  const latestToday = todayLogs[todayLogs.length - 1];
  const todayStatus: HabitLogStatus = latestToday?.status ?? "not_recorded";

  const isDateSuccessful = (iso: string): boolean => {
    const entries = logsByDate.get(iso) ?? [];
    if (habit.polarity === "positive") {
      return (
        entries.some((e) => e.status === "completed") ||
        habit.lastRecoveryDate === iso
      );
    }
    // Negative habit is considered clear if logged completed/urge_resisted and no occurrence logged
    const hasOccurrence = entries.some((e) => e.status === "occurrence");
    const hasPositiveClear = entries.some(
      (e) => e.status === "completed" || e.status === "urge_resisted",
    );
    return !hasOccurrence && (hasPositiveClear || habit.lastRecoveryDate === iso);
  };

  const completedToday = isDateSuccessful(todayIso);

  // Streak calculation starting from today (if completed today) or yesterday (grace while today is open)
  let streakDays = 0;
  let cursor = completedToday ? todayIso : addDaysIso(todayIso, -1);
  for (let i = 0; i < 90; i++) {
    const entries = logsByDate.get(cursor) ?? [];
    const status = entries[entries.length - 1]?.status;
    if (isDateSuccessful(cursor)) {
      streakDays += 1;
      cursor = addDaysIso(cursor, -1);
    } else if (status === "skipped" || status === "postponed") {
      // Skipped/postponed days pause without breaking or inflating streak
      cursor = addDaysIso(cursor, -1);
    } else {
      break;
    }
  }

  // Weekly consistency computed strictly over recorded days (not punishing unrecorded days as failed)
  const last7 = getRecentDateRange(todayIso, 7);
  let recordedDays = 0;
  let successDays = 0;
  for (const day of last7) {
    const entries = logsByDate.get(day) ?? [];
    if (entries.length === 0) continue;
    const latest = entries[entries.length - 1];
    if (latest.status === "not_recorded" || latest.status === "skipped" || latest.status === "postponed") {
      continue;
    }
    recordedDays += 1;
    if (isDateSuccessful(day)) successDays += 1;
  }

  const weeklyConsistencyPct =
    recordedDays === 0
      ? 0
      : Math.min(100, Math.round((successDays / recordedDays) * 100));

  return {
    streakDays,
    weeklyConsistencyPct,
    todayStatus,
    completedToday,
    urgeCountToday,
    occurrencesToday,
  };
}

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  completed: "Completed",
  skipped: "Skipped",
  missed: "Missed",
  postponed: "Postponed",
  not_recorded: "Not Recorded",
};
