import { z } from "zod";

export const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Please enter a task title")
    .max(80, "Task title must be 80 characters or fewer"),
  category: z.enum(["prayer", "gym", "health", "work", "study", "custom"]),
  timeLabel: z.string().trim().min(1),
  reminderEnabled: z.boolean(),
  repeat: z.enum(["once", "daily", "weekdays", "weekly"]),
  priority: z.enum(["low", "medium", "high"]),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const habitFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Please enter a habit name")
    .max(80, "Habit name must be 80 characters or fewer"),
  polarity: z.enum(["positive", "negative"]),
  category: z.enum(["prayer", "gym", "health", "work", "study", "custom"]),
  targetLabel: z.string().trim().min(1, "Schedule or context is required"),
});

export type HabitFormValues = z.infer<typeof habitFormSchema>;
