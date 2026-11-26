import type { LifePillar } from "@/constants/categories";
import { generateUuid, getRecentDateRange, getTodayIso } from "@/core/utils/date";
import type { ActivityStatus } from "@/modules/tasks/types/tasks.types";
import type {
  ChallengeItem,
  RoutineBlock,
  SaveRoutineBlockInput,
} from "../types/routine.types";

const ROUTINES_KEY = "newlife_web_routines_v1";
const ROUTINE_LOGS_KEY = "newlife_web_routine_logs_v1";
const CHALLENGES_KEY = "newlife_web_challenges_v1";

interface WebRoutineLog {
  routineId: string;
  logDate: string;
  status: ActivityStatus;
}

function seedRoutines(): RoutineBlock[] {
  const allDays = [0, 1, 2, 3, 4, 5, 6];
  return [
    { id: "rb_wake", title: "Wake Up & Hydration", blockType: "wake_up", pillar: "health", startTime: "05:10", endTime: "05:25", days: allDays, isEnabled: true, sortOrder: 1, todayStatus: "not_recorded" },
    { id: "rb_prayer_fajr", title: "Fajr & Dawn Dhikr", blockType: "prayer", pillar: "spirituality", startTime: "05:25", endTime: "05:50", days: allDays, isEnabled: true, sortOrder: 2, todayStatus: "not_recorded" },
    { id: "rb_morning", title: "Morning Stretch & Plan", blockType: "morning_routine", pillar: "productivity", startTime: "06:00", endTime: "06:30", days: allDays, isEnabled: true, sortOrder: 3, todayStatus: "not_recorded" },
    { id: "rb_work", title: "Deep Work / Study Block", blockType: "work_study", pillar: "productivity", startTime: "09:00", endTime: "12:30", days: [1, 2, 3, 4, 5], isEnabled: true, sortOrder: 4, todayStatus: "not_recorded" },
    { id: "rb_meal", title: "Nourishing Lunch", blockType: "meals", pillar: "health", startTime: "13:00", endTime: "13:45", days: allDays, isEnabled: true, sortOrder: 5, todayStatus: "not_recorded" },
    { id: "rb_gym", title: "Workout & Movement", blockType: "gym", pillar: "health", startTime: "18:00", endTime: "19:00", days: allDays, isEnabled: true, sortOrder: 6, todayStatus: "not_recorded" },
    { id: "rb_personal", title: "Personal & Family Time", blockType: "personal", pillar: "spirituality", startTime: "19:30", endTime: "21:00", days: allDays, isEnabled: true, sortOrder: 7, todayStatus: "not_recorded" },
    { id: "rb_evening", title: "Evening Wind-Down & Reading", blockType: "evening_routine", pillar: "productivity", startTime: "21:30", endTime: "22:30", days: allDays, isEnabled: true, sortOrder: 8, todayStatus: "not_recorded" },
    { id: "rb_sleep", title: "Restful Sleep", blockType: "sleep", pillar: "health", startTime: "22:45", endTime: "05:10", days: allDays, isEnabled: true, sortOrder: 9, todayStatus: "not_recorded" },
  ];
}

function seedChallenges(): ChallengeItem[] {
  return [
    {
      id: "ch_dawn",
      title: "Dawn Anchor (7 Days)",
      description: "Start 7 days gently with morning prayer and hydration before checking feeds.",
      pillar: "spirituality",
      targetDays: 7,
      progressDays: 3,
      joined: true,
      completed: false,
    },
    {
      id: "ch_screen",
      title: "Screen-Free Wind-Down",
      description: "Step away from screens 30 minutes before bedtime for 5 evenings.",
      pillar: "health",
      targetDays: 5,
      progressDays: 2,
      joined: false,
      completed: false,
    },
    {
      id: "ch_deep",
      title: "Focused Mornings",
      description: "Complete 1 distraction-free work or study sprint across 5 weekdays.",
      pillar: "productivity",
      targetDays: 5,
      progressDays: 1,
      joined: false,
      completed: false,
    },
  ];
}

function readList<T>(key: string, fallback: () => T[]): T[] {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T[];
      const init = fallback();
      window.localStorage.setItem(key, JSON.stringify(init));
      return init;
    }
  } catch {
    // ignore storage errors
  }
  return fallback();
}

function writeList<T>(key: string, items: T[]): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(items));
    }
  } catch {
    // ignore storage errors
  }
}

export const routineDb = {
  async listRoutineBlocks(dateIso = getTodayIso()): Promise<RoutineBlock[]> {
    const blocks = readList<RoutineBlock>(ROUTINES_KEY, seedRoutines);
    const logs = readList<WebRoutineLog>(ROUTINE_LOGS_KEY, () => []);
    const statusMap = new Map(
      logs.filter((l) => l.logDate === dateIso).map((l) => [l.routineId, l.status]),
    );
    return blocks
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((b) => ({
        ...b,
        todayStatus: statusMap.get(b.id) ?? "not_recorded",
      }));
  },

  async saveRoutineBlock(input: SaveRoutineBlockInput): Promise<void> {
    const blocks = readList<RoutineBlock>(ROUTINES_KEY, seedRoutines);
    if (input.id) {
      writeList(
        ROUTINES_KEY,
        blocks.map((b) => (b.id === input.id ? { ...b, ...input } : b)),
      );
      return;
    }
    writeList(ROUTINES_KEY, [
      ...blocks,
      {
        ...input,
        id: generateUuid(),
        sortOrder: blocks.length + 1,
        todayStatus: "not_recorded",
      },
    ]);
  },

  async deleteRoutineBlock(id: string): Promise<void> {
    const blocks = readList<RoutineBlock>(ROUTINES_KEY, seedRoutines);
    writeList(ROUTINES_KEY, blocks.filter((b) => b.id !== id));
  },

  async setRoutineStatus(
    routineId: string,
    dateIso: string,
    status: ActivityStatus,
  ): Promise<void> {
    const logs = readList<WebRoutineLog>(ROUTINE_LOGS_KEY, () => []).filter(
      (l) => !(l.routineId === routineId && l.logDate === dateIso),
    );
    logs.push({ routineId, logDate: dateIso, status });
    writeList(ROUTINE_LOGS_KEY, logs);
  },

  async listRoutineLogsRange(days = 14): Promise<{ logDate: string; status: ActivityStatus; pillar: LifePillar }[]> {
    const start = getRecentDateRange(getTodayIso(), days)[0];
    const blocks = readList<RoutineBlock>(ROUTINES_KEY, seedRoutines);
    const logs = readList<WebRoutineLog>(ROUTINE_LOGS_KEY, () => []);
    const pillarById = new Map(blocks.map((b) => [b.id, b.pillar]));
    return logs
      .filter((l) => l.logDate >= start && pillarById.has(l.routineId))
      .map((l) => ({
        logDate: l.logDate,
        status: l.status,
        pillar: pillarById.get(l.routineId)!,
      }));
  },

  async listChallenges(): Promise<ChallengeItem[]> {
    return readList<ChallengeItem>(CHALLENGES_KEY, seedChallenges);
  },

  async toggleChallengeJoin(id: string): Promise<void> {
    const items = readList<ChallengeItem>(CHALLENGES_KEY, seedChallenges);
    writeList(
      CHALLENGES_KEY,
      items.map((c) => (c.id === id ? { ...c, joined: !c.joined } : c)),
    );
  },

  async logChallengeDay(id: string): Promise<void> {
    const items = readList<ChallengeItem>(CHALLENGES_KEY, seedChallenges);
    writeList(
      CHALLENGES_KEY,
      items.map((c) => {
        if (c.id !== id) return c;
        const next = Math.min(c.targetDays, c.progressDays + 1);
        return {
          ...c,
          joined: true,
          progressDays: next,
          completed: next >= c.targetDays,
        };
      }),
    );
  },
};
