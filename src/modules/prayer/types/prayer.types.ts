export type PrayerName = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export type PrayerSlotKey = PrayerName | "sunrise";

export type PrayerLogStatus =
  | "on_time"
  | "delayed"
  | "qada"
  | "missed"
  | "not_recorded";

export type PrayerCalculationMethodKey =
  | "Egyptian"
  | "MuslimWorldLeague"
  | "UmmAlQura"
  | "NorthAmerica"
  | "Karachi"
  | "Dubai"
  | "MoonsightingCommittee"
  | "Kuwait"
  | "Qatar"
  | "Turkey"
  | "Tehran"
  | "Singapore";

export type AsrSchool = "shafi" | "hanafi";
export type PrayerLocationMode = "gps" | "manual";

export interface PerPrayerEnabledMap {
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
}

export interface PrayerSettings {
  locationMode: PrayerLocationMode;
  cityName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  calculationMethod: PrayerCalculationMethodKey;
  asrSchool: AsrSchool;
  notificationsEnabled: boolean;
  advanceMinutes: number;
  focusDurationMinutes: number;
  audioFocusEnabled: boolean;
  perPrayerEnabled: PerPrayerEnabledMap;
  updatedAt: string;
}

export interface ComputedPrayerEntry {
  key: PrayerSlotKey;
  label: string;
  arabicLabel: string;
  date: Date;
  formattedTime: string;
  isObligatory: boolean;
}

export interface NextPrayerInfo {
  prayer: PrayerName;
  label: string;
  time: Date;
  formattedTime: string;
  minutesUntil: number;
  isTomorrow: boolean;
}

export interface DailyPrayerSchedule {
  dateIso: string;
  timezone: string;
  cityName: string;
  method: PrayerCalculationMethodKey;
  qiblaDegrees: number;
  entries: ComputedPrayerEntry[];
  nextPrayer: NextPrayerInfo;
  currentPrayer: PrayerName | "sunrise" | "none";
}

export interface PrayerLogEntry {
  id: string;
  prayerDate: string;
  prayerName: PrayerName;
  status: PrayerLogStatus;
  autoMutedTriggered: boolean;
  loggedAt: string;
}

export interface PrayerConsistencyStats {
  days: number;
  totalObligatorySlots: number;
  recordedCount: number;
  onTimeCount: number;
  delayedCount: number;
  qadaCount: number;
  missedCount: number;
  notRecordedCount: number;
  /** Percentage of *recorded* prayers completed (on_time + delayed + qada). Unrecorded prayers are never assumed missed. */
  recordedConsistencyPct: number;
  /** On-time ratio across recorded prayers */
  onTimePct: number;
}

export interface CityPreset {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  recommendedMethod: PrayerCalculationMethodKey;
}

export const PRAYER_ORDER: PrayerName[] = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

export const PRAYER_LABELS: Record<
  PrayerSlotKey,
  { en: string; ar: string }
> = {
  fajr: { en: "Fajr", ar: "الفجر" },
  sunrise: { en: "Sunrise", ar: "الشروق" },
  dhuhr: { en: "Dhuhr", ar: "الظهر" },
  asr: { en: "Asr", ar: "العصر" },
  maghrib: { en: "Maghrib", ar: "المغرب" },
  isha: { en: "Isha", ar: "العشاء" },
};

export const CALCULATION_METHOD_META: Record<
  PrayerCalculationMethodKey,
  { label: string; shortLabel: string; description: string }
> = {
  Egyptian: {
    label: "Egyptian General Authority of Survey",
    shortLabel: "Egyptian Survey",
    description: "19.5° Fajr / 17.5° Isha — Official Egypt & North Africa standard",
  },
  MuslimWorldLeague: {
    label: "Muslim World League (MWL)",
    shortLabel: "MWL",
    description: "18° Fajr / 17° Isha — Global & European default",
  },
  UmmAlQura: {
    label: "Umm Al-Qura University (Makkah)",
    shortLabel: "Umm Al-Qura",
    description: "18.5° Fajr / 90 min Isha — Saudi Arabia standard",
  },
  NorthAmerica: {
    label: "ISNA (North America)",
    shortLabel: "ISNA",
    description: "15° Fajr / 15° Isha — United States & Canada",
  },
  Karachi: {
    label: "University of Islamic Sciences, Karachi",
    shortLabel: "Karachi",
    description: "18° Fajr / 18° Isha — South Asia",
  },
  Dubai: {
    label: "Dubai (UAE)",
    shortLabel: "Dubai",
    description: "18.2° Fajr / 18.2° Isha — United Arab Emirates",
  },
  MoonsightingCommittee: {
    label: "Moonsighting Committee Worldwide",
    shortLabel: "Moonsighting",
    description: "18° Fajr / Shafaq-adjusted Isha — High latitudes",
  },
  Kuwait: {
    label: "Kuwait",
    shortLabel: "Kuwait",
    description: "18° Fajr / 17.5° Isha",
  },
  Qatar: {
    label: "Qatar",
    shortLabel: "Qatar",
    description: "18° Fajr / 90 min Isha",
  },
  Turkey: {
    label: "Diyanet (Turkey)",
    shortLabel: "Turkey",
    description: "18° Fajr / 17° Isha",
  },
  Tehran: {
    label: "Institute of Geophysics, Tehran",
    shortLabel: "Tehran",
    description: "17.7° Fajr / 14° Isha",
  },
  Singapore: {
    label: "MUIS (Singapore)",
    shortLabel: "Singapore",
    description: "20° Fajr / 18° Isha — Southeast Asia",
  },
};
