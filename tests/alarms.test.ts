import test from "node:test";
import assert from "node:assert/strict";
import { formatAlarmClock, formatAlarmDays, getSoundMeta } from "../src/modules/alarms/types/alarm.types.ts";
import { computeNextAlarmFireDate } from "../src/modules/alarms/utils/alarmMath.ts";

test("computeNextAlarmFireDate picks same-day upcoming slot and advances across matching weekdays", () => {
  // 2026-11-26 is Thursday (day index 4) at 04:00 AM local
  const morningNow = new Date(2026, 10, 26, 4, 0, 0);
  const sameDay = computeNextAlarmFireDate(
    { hour: 5, minute: 15, days: [4], snoozedUntil: null },
    morningNow,
  );
  assert.equal(sameDay.getDate(), 26);
  assert.equal(sameDay.getHours(), 5);
  assert.equal(sameDay.getMinutes(), 15);

  // If 06:00 AM already passed and repeats only on Sunday (0), pick 2026-11-29
  const passedNow = new Date(2026, 10, 26, 6, 0, 0);
  const nextSunday = computeNextAlarmFireDate(
    { hour: 5, minute: 15, days: [0], snoozedUntil: null },
    passedNow,
  );
  assert.equal(nextSunday.getDay(), 0);
  assert.equal(nextSunday.getDate(), 29);
});

test("computeNextAlarmFireDate prioritizes active snooze timestamp", () => {
  const now = new Date(2026, 10, 26, 5, 16, 0);
  const snoozeTarget = new Date(2026, 10, 26, 5, 26, 0).toISOString();
  const next = computeNextAlarmFireDate(
    { hour: 5, minute: 15, days: [0, 1, 2, 3, 4, 5, 6], snoozedUntil: snoozeTarget },
    now,
  );
  assert.equal(next.toISOString(), snoozeTarget);
});

test("formats alarm clock, repeat rules, and resolves bundled sound assets", () => {
  assert.deepEqual(formatAlarmClock(0, 5), {
    time: "12:05",
    meridiem: "AM",
    twentyFourHour: "00:05",
  });
  assert.equal(formatAlarmDays([1, 2, 3, 4, 5]), "Weekdays");
  assert.equal(formatAlarmDays([]), "Once (next match)");
  assert.equal(getSoundMeta("amber_bell").label, "Amber Bell");
});
