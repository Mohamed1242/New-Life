import { CategorySlug } from "@/constants/categories";

export type TaskPriority = "low" | "medium" | "high";
export type RepeatRule = "once" | "daily" | "weekdays" | "weekly" | "custom";

/**
 * Explicit activity status preventing unrecorded items from being treated as failed.
 */
export type ActivityStatus =
  | "completed"
  | "skipped"
  | "missed"
  | "postponed"
  | "not_recorded";

export type HabitLogStatus = ActivityStatus | "occurrence" | "urge_resisted";

export type HabitFrequencyType = "daily" | "weekly" | "custom";

export interface TaskItem {
  id: string;
  title: string;
  notes: string;
  category: CategorySlug;
  timeLabel: string;
  dateIso: string;
  priority: TaskPriority;
  repeat: RepeatRule;
  customDays: number[]; // 0 (Sun) - 6 (Sat)
  reminderEnabled: boolean;
  status: ActivityStatus;
  completed: boolean;
  postponedTo?: string | null;
}

export interface CreateTaskInput {
  title: string;
  notes?: string;
  category: CategorySlug;
  timeLabel: string;
  dateIso: string;
  priority: TaskPriority;
  repeat: RepeatRule;
  customDays?: number[];
  reminderEnabled: boolean;
}

export interface UpdateTaskInput extends CreateTaskInput {
  id: string;
}

export interface HabitItem {
  id: string;
  title: string;
  polarity: "positive" | "negative";
  category: CategorySlug;
  targetLabel: string;
  frequencyType: HabitFrequencyType;
  targetPerWeek: number;
  customDays: number[];
  streakDays: number;
  bestStreak: number;
  graceUsedThisWeek: boolean;
  lastRecoveryDate?: string | null;
  completedToday: boolean;
  todayStatus: HabitLogStatus;
  urgeCountToday: number;
  occurrencesToday: number;
  weeklyConsistencyPct: number;
}

export interface CreateHabitInput {
  title: string;
  polarity: "positive" | "negative";
  category: CategorySlug;
  targetLabel: string;
  frequencyType: HabitFrequencyType;
  targetPerWeek: number;
  customDays: number[];
}

export interface UpdateHabitInput extends CreateHabitInput {
  id: string;
}

export interface HabitLogEntry {
  id: string;
  habitId: string;
  logDate: string;
  status: HabitLogStatus;
  value: number;
  triggerTag?: string | null;
  note?: string | null;
  loggedAt: string;
}
