import { z } from "zod";

export const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Please enter a task title")
    .max(80, "Task title must be 80 characters or fewer"),
  notes: z.string().max(300, "Keep notes under 300 characters").optional(),
  category: z.enum(["prayer", "gym", "health", "work", "study", "custom"]),
  dateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
  timeLabel: z.string().trim().min(1, "Set a time"),
  reminderEnabled: z.boolean(),
  repeat: z.enum(["once", "daily", "weekdays", "weekly", "custom"]),
  customDays: z.array(z.number().int().min(0).max(6)),
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
  frequencyType: z.enum(["daily", "weekly", "custom"]),
  targetPerWeek: z.number().int().min(1).max(7),
  customDays: z.array(z.number().int().min(0).max(6)),
});

export type HabitFormValues = z.infer<typeof habitFormSchema>;
