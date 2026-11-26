import { z } from "https://esm.sh/zod@3.24.2";

export const suggestedActionSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1).max(64),
    type: z.literal("create_reminder"),
    label: z.string().min(1).max(40),
    title: z.string().min(1).max(100),
    triggerTime: z.string().min(1).max(20),
    entityType: z.enum(["task", "habit", "routine", "prayer", "custom_alarm"]),
  }),
  z.object({
    id: z.string().min(1).max(64),
    type: z.literal("reschedule_task"),
    label: z.string().min(1).max(40),
    taskId: z.string().uuid(),
    newTimeLabel: z.string().min(1).max(20),
    newDateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  z.object({
    id: z.string().min(1).max(64),
    type: z.literal("adjust_habit_target"),
    label: z.string().min(1).max(40),
    habitId: z.string().uuid(),
    newTargetPerWeek: z.number().int().min(1).max(7),
    newTargetLabel: z.string().min(1).max(60),
  }),
  z.object({
    id: z.string().min(1).max(64),
    type: z.literal("open_prayer_focus"),
    label: z.string().min(1).max(40),
  }),
]);

export type ValidatedSuggestedAction = z.infer<typeof suggestedActionSchema>;

export function sanitizeSuggestedActions(raw: unknown): ValidatedSuggestedAction[] {
  if (!Array.isArray(raw)) return [];
  const valid: ValidatedSuggestedAction[] = [];
  for (const candidate of raw.slice(0, 3)) {
    const parsed = suggestedActionSchema.safeParse(candidate);
    if (parsed.success) {
      valid.push(parsed.data);
    }
  }
  return valid;
}
