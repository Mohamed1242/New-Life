import { z } from "zod";

export const routineBlockSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Please enter a routine block title")
    .max(60, "Keep title under 60 characters"),
  blockType: z.enum([
    "wake_up",
    "morning_routine",
    "prayer",
    "work_study",
    "meals",
    "gym",
    "personal",
    "evening_routine",
    "sleep",
  ]),
  pillar: z.enum(["spirituality", "health", "productivity"]),
  startTime: z.string().trim().min(1, "Start time required"),
  endTime: z.string().trim().min(1, "End time required"),
  days: z.array(z.number().int().min(0).max(6)).min(1, "Select at least 1 day"),
  isEnabled: z.boolean(),
});

export type RoutineBlockFormValues = z.infer<typeof routineBlockSchema>;
