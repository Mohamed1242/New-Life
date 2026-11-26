import type { LifePillar } from "@/constants/categories";
import type { ActivityStatus } from "@/modules/tasks/types/tasks.types";

export type RoutineBlockType =
  | "wake_up"
  | "morning_routine"
  | "prayer"
  | "work_study"
  | "meals"
  | "gym"
  | "personal"
  | "evening_routine"
  | "sleep";

export interface RoutineBlock {
  id: string;
  title: string;
  blockType: RoutineBlockType;
  pillar: LifePillar;
  startTime: string;
  endTime: string;
  days: number[];
  isEnabled: boolean;
  sortOrder: number;
  todayStatus: ActivityStatus;
}

export interface SaveRoutineBlockInput {
  id?: string;
  title: string;
  blockType: RoutineBlockType;
  pillar: LifePillar;
  startTime: string;
  endTime: string;
  days: number[];
  isEnabled: boolean;
}

export interface ChallengeItem {
  id: string;
  title: string;
  description: string;
  pillar: LifePillar;
  targetDays: number;
  progressDays: number;
  joined: boolean;
  completed: boolean;
}
