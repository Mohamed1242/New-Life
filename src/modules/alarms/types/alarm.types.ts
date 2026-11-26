export type AlarmSoundKey =
  | "gentle_dawn"
  | "chime_soft"
  | "amber_bell"
  | "adhan_chime";

export type AlarmPlatformMode = "system_alarm" | "scheduled_notification";

export interface AlarmSoundOption {
  key: AlarmSoundKey;
  label: string;
  description: string;
}

export const ALARM_SOUNDS: AlarmSoundOption[] = [
  {
    key: "gentle_dawn",
    label: "Gentle Dawn",
    description: "Warm ascending A-major chime",
  },
  {
    key: "chime_soft",
    label: "Soft Breeze",
    description: "Light crystal bell triad",
  },
  {
    key: "amber_bell",
    label: "Amber Bell",
    description: "Calm low-tone wake chime",
  },
  {
    key: "adhan_chime",
    label: "Fajr Reflection",
    description: "Peaceful reflective dawn notes",
  },
];

export interface AlarmItem {
  id: string;
  label: string;
  hour: number;
  minute: number;
  /** 0 = Sun ... 6 = Sat. Empty array = one-time next occurrence. */
  days: number[];
  soundKey: AlarmSoundKey;
  snoozeMinutes: number;
  isEnabled: boolean;
  vibrate: boolean;
  nextFireAt: string | null;
  snoozedUntil: string | null;
  platformMode: AlarmPlatformMode;
}

export interface UpsertAlarmInput {
  id?: string;
  label: string;
  hour: number;
  minute: number;
  days: number[];
  soundKey: AlarmSoundKey;
  snoozeMinutes: number;
  isEnabled: boolean;
  vibrate: boolean;
}

export function formatAlarmClock(hour: number, minute: number): {
  time: string;
  meridiem: "AM" | "PM";
  twentyFourHour: string;
} {
  const meridiem: "AM" | "PM" = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return {
    time: `${String(displayHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    meridiem,
    twentyFourHour: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatAlarmDays(days: number[]): string {
  if (days.length === 0) return "Once (next match)";
  if (days.length === 7) return "Every day";
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.join(",") === "1,2,3,4,5") return "Weekdays";
  if (sorted.join(",") === "0,6") return "Weekends";
  return sorted.map((d) => SHORT_DAYS[d] ?? "").filter(Boolean).join(", ");
}

export function getSoundMeta(key: AlarmSoundKey): AlarmSoundOption {
  return ALARM_SOUNDS.find((s) => s.key === key) ?? ALARM_SOUNDS[0];
}
