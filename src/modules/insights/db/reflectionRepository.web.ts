import { generateUuid, parseIsoDate, toIsoDate } from "@/core/utils/date";
import type { ReflectionMood, WeeklyReflection } from "./reflectionRepository";

const KEY = "newlife_web_weekly_reflections_v1";

function readAll(): WeeklyReflection[] {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) as WeeklyReflection[];
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

function writeAll(list: WeeklyReflection[]): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(KEY, JSON.stringify(list));
    }
  } catch {
    // ignore
  }
}

export function getCurrentWeekStartIso(todayIso: string): string {
  const dt = parseIsoDate(todayIso);
  dt.setDate(dt.getDate() - dt.getDay());
  return toIsoDate(dt);
}

export const reflectionDb = {
  async getLatest(limit = 4): Promise<WeeklyReflection[]> {
    return readAll()
      .sort((a, b) => b.weekStartIso.localeCompare(a.weekStartIso))
      .slice(0, limit);
  },

  async saveReflection(input: {
    weekStartIso: string;
    energyMood: ReflectionMood;
    highlight: string;
    adjustment: string;
  }): Promise<WeeklyReflection> {
    const now = new Date().toISOString();
    const list = readAll();
    const existing = list.find((r) => r.weekStartIso === input.weekStartIso);
    const saved: WeeklyReflection = {
      id: existing?.id ?? generateUuid(),
      weekStartIso: input.weekStartIso,
      energyMood: input.energyMood,
      highlight: input.highlight.trim(),
      adjustment: input.adjustment.trim(),
      updatedAt: now,
    };
    const next = list.filter((r) => r.weekStartIso !== input.weekStartIso);
    next.push(saved);
    writeAll(next);
    return saved;
  },
};
