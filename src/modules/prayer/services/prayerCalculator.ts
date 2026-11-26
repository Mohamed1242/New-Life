import {
  CalculationMethod,
  CalculationParameters,
  Coordinates,
  Madhab,
  PrayerTimes,
  Qibla,
} from "adhan";
import { addDaysIso, parseIsoDate } from "@/core/utils/date";
import {
  PRAYER_LABELS,
  PRAYER_ORDER,
  type ComputedPrayerEntry,
  type DailyPrayerSchedule,
  type PrayerCalculationMethodKey,
  type PrayerName,
  type PrayerSettings,
} from "../types/prayer.types";

const METHOD_BUILDERS: Record<
  PrayerCalculationMethodKey,
  () => CalculationParameters
> = {
  Egyptian: () => CalculationMethod.Egyptian(),
  MuslimWorldLeague: () => CalculationMethod.MuslimWorldLeague(),
  UmmAlQura: () => CalculationMethod.UmmAlQura(),
  NorthAmerica: () => CalculationMethod.NorthAmerica(),
  Karachi: () => CalculationMethod.Karachi(),
  Dubai: () => CalculationMethod.Dubai(),
  MoonsightingCommittee: () => CalculationMethod.MoonsightingCommittee(),
  Kuwait: () => CalculationMethod.Kuwait(),
  Qatar: () => CalculationMethod.Qatar(),
  Turkey: () => CalculationMethod.Turkey(),
  Tehran: () => CalculationMethod.Tehran(),
  Singapore: () => CalculationMethod.Singapore(),
};

export function detectDeviceTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz && tz.length > 0 ? tz : "Africa/Cairo";
  } catch {
    return "Africa/Cairo";
  }
}

export function formatTimeInZone(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone || detectDeviceTimezone(),
    }).format(date);
  } catch {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }
}

export function getTimePartsInZone(
  date: Date,
  timezone: string,
): { hour: number; minute: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone || detectDeviceTimezone(),
    }).formatToParts(date);
    const hourPart = Number(parts.find((p) => p.type === "hour")?.value ?? date.getHours());
    const minPart = Number(parts.find((p) => p.type === "minute")?.value ?? date.getMinutes());
    return {
      hour: hourPart === 24 ? 0 : hourPart,
      minute: minPart,
    };
  } catch {
    return { hour: date.getHours(), minute: date.getMinutes() };
  }
}

function buildAdhanParams(settings: PrayerSettings): CalculationParameters {
  const builder = METHOD_BUILDERS[settings.calculationMethod] ?? METHOD_BUILDERS.Egyptian;
  const params = builder();
  params.madhab = settings.asrSchool === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  return params;
}

export function computeDailyPrayerSchedule(
  settings: PrayerSettings,
  dateIso: string,
  now: Date = new Date(),
): DailyPrayerSchedule {
  const coords = new Coordinates(settings.latitude, settings.longitude);
  const params = buildAdhanParams(settings);
  const targetDate = parseIsoDate(dateIso);
  // Midday anchor prevents DST boundary drift across the target civil date
  const dateAnchor = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    12,
    0,
    0,
  );
  const times = new PrayerTimes(coords, dateAnchor, params);
  const tz = settings.timezone || detectDeviceTimezone();

  const entries: ComputedPrayerEntry[] = [
    {
      key: "fajr",
      label: PRAYER_LABELS.fajr.en,
      arabicLabel: PRAYER_LABELS.fajr.ar,
      date: times.fajr,
      formattedTime: formatTimeInZone(times.fajr, tz),
      isObligatory: true,
    },
    {
      key: "sunrise",
      label: PRAYER_LABELS.sunrise.en,
      arabicLabel: PRAYER_LABELS.sunrise.ar,
      date: times.sunrise,
      formattedTime: formatTimeInZone(times.sunrise, tz),
      isObligatory: false,
    },
    {
      key: "dhuhr",
      label: PRAYER_LABELS.dhuhr.en,
      arabicLabel: PRAYER_LABELS.dhuhr.ar,
      date: times.dhuhr,
      formattedTime: formatTimeInZone(times.dhuhr, tz),
      isObligatory: true,
    },
    {
      key: "asr",
      label: PRAYER_LABELS.asr.en,
      arabicLabel: PRAYER_LABELS.asr.ar,
      date: times.asr,
      formattedTime: formatTimeInZone(times.asr, tz),
      isObligatory: true,
    },
    {
      key: "maghrib",
      label: PRAYER_LABELS.maghrib.en,
      arabicLabel: PRAYER_LABELS.maghrib.ar,
      date: times.maghrib,
      formattedTime: formatTimeInZone(times.maghrib, tz),
      isObligatory: true,
    },
    {
      key: "isha",
      label: PRAYER_LABELS.isha.en,
      arabicLabel: PRAYER_LABELS.isha.ar,
      date: times.isha,
      formattedTime: formatTimeInZone(times.isha, tz),
      isObligatory: true,
    },
  ];

  // Determine true next obligatory prayer (checking tomorrow's Fajr after Isha)
  const upcomingToday = PRAYER_ORDER.find(
    (name) => times[name].getTime() > now.getTime(),
  );

  let nextPrayerName: PrayerName;
  let nextPrayerTime: Date;
  let isTomorrow = false;

  if (upcomingToday) {
    nextPrayerName = upcomingToday;
    nextPrayerTime = times[upcomingToday];
  } else {
    const tomorrowDate = parseIsoDate(addDaysIso(dateIso, 1));
    const tomorrowAnchor = new Date(
      tomorrowDate.getFullYear(),
      tomorrowDate.getMonth(),
      tomorrowDate.getDate(),
      12,
      0,
      0,
    );
    const tomorrowTimes = new PrayerTimes(coords, tomorrowAnchor, params);
    nextPrayerName = "fajr";
    nextPrayerTime = tomorrowTimes.fajr;
    isTomorrow = true;
  }

  const minutesUntil = Math.max(
    0,
    Math.round((nextPrayerTime.getTime() - now.getTime()) / 60000),
  );

  return {
    dateIso,
    timezone: tz,
    cityName: settings.cityName,
    method: settings.calculationMethod,
    qiblaDegrees: Math.round(Qibla(coords)),
    entries,
    nextPrayer: {
      prayer: nextPrayerName,
      label: PRAYER_LABELS[nextPrayerName].en,
      time: nextPrayerTime,
      formattedTime: formatTimeInZone(nextPrayerTime, tz),
      minutesUntil,
      isTomorrow,
    },
    currentPrayer: times.currentPrayer(now),
  };
}

export function formatMinutesCountdown(minutesUntil: number): string {
  if (minutesUntil <= 1) return "In < 1 min";
  if (minutesUntil < 60) return `In ${minutesUntil} min`;
  const hrs = Math.floor(minutesUntil / 60);
  const mins = minutesUntil % 60;
  return mins === 0 ? `In ${hrs}h` : `In ${hrs}h ${mins}m`;
}
