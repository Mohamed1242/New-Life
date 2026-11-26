import type { AlarmItem } from "../types/alarm.types";

/**
 * Computes the next trigger Date for an enabled alarm, prioritizing an active
 * future snooze timestamp before evaluating the repeating weekday schedule.
 */
export function computeNextAlarmFireDate(
  alarm: Pick<AlarmItem, "hour" | "minute" | "days" | "snoozedUntil">,
  now: Date = new Date(),
): Date {
  if (alarm.snoozedUntil) {
    const snoozed = new Date(alarm.snoozedUntil);
    if (snoozed.getTime() > now.getTime() + 5_000) {
      return snoozed;
    }
  }

  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const candidate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + dayOffset,
      alarm.hour,
      alarm.minute,
      0,
      0,
    );
    if (candidate.getTime() <= now.getTime() + 5_000) continue;

    if (alarm.days.length === 0 || alarm.days.includes(candidate.getDay())) {
      return candidate;
    }
  }

  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}
