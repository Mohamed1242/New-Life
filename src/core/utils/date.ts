import type { DayPillItem } from "@/components/ui/WeeklyDateStrip";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDaysIso(iso: string, deltaDays: number): string {
  const dt = parseIsoDate(iso);
  dt.setDate(dt.getDate() + deltaDays);
  return toIsoDate(dt);
}

export function getTodayIso(): string {
  return toIsoDate(new Date());
}

export function getWeekdayIndex(iso: string): number {
  return parseIsoDate(iso).getDay(); // 0 = Sun ... 6 = Sat
}

export function getRecentDateRange(endIso: string, days: number): string[] {
  const list: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    list.push(addDaysIso(endIso, -i));
  }
  return list;
}

export function generateUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function buildWeekStrip(centerDateIso: string, activeDates: Set<string>): DayPillItem[] {
  const center = parseIsoDate(centerDateIso);
  const items: DayPillItem[] = [];

  for (let offset = -2; offset <= 2; offset++) {
    const dt = new Date(center);
    dt.setDate(center.getDate() + offset);
    const iso = toIsoDate(dt);
    items.push({
      isoDate: iso,
      dayShort: DAY_NAMES[dt.getDay()],
      dayNumber: String(dt.getDate()),
      hasActivity: activeDates.has(iso),
    });
  }

  return items;
}
