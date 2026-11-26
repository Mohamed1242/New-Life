import test from "node:test";
import assert from "node:assert/strict";
import { computePrayerConsistency, DEFAULT_PRAYER_SETTINGS } from "../src/modules/prayer/db/prayerStats.ts";
import { computeDailyPrayerSchedule, formatMinutesCountdown } from "../src/modules/prayer/services/prayerCalculator.ts";
import type { PrayerLogEntry, PrayerSettings } from "../src/modules/prayer/types/prayer.types.ts";

const cairoSettings: PrayerSettings = {
  ...DEFAULT_PRAYER_SETTINGS,
  cityName: "Cairo, Egypt",
  latitude: 30.0444,
  longitude: 31.2357,
  timezone: "Africa/Cairo",
  calculationMethod: "Egyptian",
  asrSchool: "shafi",
};

test("computes Cairo daily prayer schedule with Egyptian Survey method and Qibla", () => {
  const anchor = new Date("2026-11-26T08:00:00Z"); // 10:00 AM Cairo
  const schedule = computeDailyPrayerSchedule(cairoSettings, "2026-11-26", anchor);

  assert.equal(schedule.entries.length, 6);
  assert.equal(schedule.method, "Egyptian");
  assert.ok(schedule.qiblaDegrees >= 130 && schedule.qiblaDegrees <= 145, `Expected Qibla ~136°, got ${schedule.qiblaDegrees}`);

  const times = schedule.entries.map((e) => e.date.getTime());
  for (let i = 1; i < times.length; i += 1) {
    assert.ok(times[i] > times[i - 1], "Prayers must advance chronologically");
  }
});

test("distinguishes Egyptian method vs MWL and Shafi vs Hanafi Asr", () => {
  const anchor = new Date("2026-11-26T08:00:00Z");
  const egy = computeDailyPrayerSchedule(cairoSettings, "2026-11-26", anchor);
  const mwl = computeDailyPrayerSchedule(
    { ...cairoSettings, calculationMethod: "MuslimWorldLeague" },
    "2026-11-26",
    anchor,
  );
  const hanafi = computeDailyPrayerSchedule(
    { ...cairoSettings, asrSchool: "hanafi" },
    "2026-11-26",
    anchor,
  );

  const egyFajr = egy.entries.find((e) => e.key === "fajr")!.date.getTime();
  const mwlFajr = mwl.entries.find((e) => e.key === "fajr")!.date.getTime();
  assert.notEqual(egyFajr, mwlFajr, "Egyptian 19.5° Fajr differs from MWL 18°");

  const shafiAsr = egy.entries.find((e) => e.key === "asr")!.date.getTime();
  const hanafiAsr = hanafi.entries.find((e) => e.key === "asr")!.date.getTime();
  assert.ok(hanafiAsr > shafiAsr, "Hanafi Asr is later than Shafi Asr");
});

test("rolls over to tomorrow's Fajr after Isha passes and adapts to travel timezone", () => {
  const lateNight = new Date("2026-11-26T21:30:00Z"); // 23:30 in Cairo, past Isha
  const afterIsha = computeDailyPrayerSchedule(cairoSettings, "2026-11-26", lateNight);
  assert.equal(afterIsha.nextPrayer.prayer, "fajr");
  assert.equal(afterIsha.nextPrayer.isTomorrow, true);

  const londonSchedule = computeDailyPrayerSchedule(
    {
      ...cairoSettings,
      cityName: "London, UK",
      latitude: 51.5072,
      longitude: -0.1276,
      timezone: "Europe/London",
      calculationMethod: "MuslimWorldLeague",
    },
    "2026-11-26",
    new Date("2026-11-26T10:00:00Z"),
  );
  assert.equal(londonSchedule.timezone, "Europe/London");
  assert.ok(londonSchedule.qiblaDegrees >= 110 && londonSchedule.qiblaDegrees <= 125);
  assert.equal(formatMinutesCountdown(75), "In 1h 15m");
});

test("never assumes unrecorded prayer slots are missed in consistency calculation", () => {
  const logs: PrayerLogEntry[] = [
    { id: "1", prayerDate: "2026-11-26", prayerName: "fajr", status: "on_time", autoMutedTriggered: true, loggedAt: "2026-11-26T05:10:00Z" },
    { id: "2", prayerDate: "2026-11-26", prayerName: "dhuhr", status: "delayed", autoMutedTriggered: false, loggedAt: "2026-11-26T13:00:00Z" },
  ];

  const stats = computePrayerConsistency(logs, "2026-11-26", 7);
  assert.equal(stats.totalObligatorySlots, 35);
  assert.equal(stats.recordedCount, 2);
  assert.equal(stats.missedCount, 0);
  assert.equal(stats.notRecordedCount, 33);
  assert.equal(stats.recordedConsistencyPct, 100);
  assert.equal(stats.onTimePct, 50);
});
