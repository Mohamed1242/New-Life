import { CategorySlug } from "@/constants/categories";

export type TaskPriority = "low" | "medium" | "high";
export type RepeatRule = "once" | "daily" | "weekdays" | "weekly";

export interface TaskItem {
  id: string;
  title: string;
  category: CategorySlug;
  timeLabel: string;
  dateIso: string;
  priority: TaskPriority;
  repeat: RepeatRule;
  reminderEnabled: boolean;
  completed: boolean;
}

export interface CreateTaskInput {
  title: string;
  category: CategorySlug;
  timeLabel: string;
  dateIso: string;
  priority: TaskPriority;
  repeat: RepeatRule;
  reminderEnabled: boolean;
}

export interface HabitItem {
  id: string;
  title: string;
  polarity: "positive" | "negative";
  category: CategorySlug;
  targetLabel: string;
  streakDays: number;
  graceUsedThisWeek: boolean;
  completedToday: boolean;
  urgeCountToday: number;
  weeklyConsistencyPct: number;
}

export interface CreateHabitInput {
  title: string;
  polarity: "positive" | "negative";
  category: CategorySlug;
  targetLabel: string;
}
