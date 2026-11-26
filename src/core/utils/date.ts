import type { DayPillItem } from "@/components/ui/WeeklyDateStrip";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayIso(): string {
  return toIsoDate(new Date());
}

export function buildWeekStrip(centerDateIso: string, activeDates: Set<string>): DayPillItem[] {
  const [y, m, d] = centerDateIso.split("-").map(Number);
  const center = new Date(y, (m || 1) - 1, d || 1);
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
