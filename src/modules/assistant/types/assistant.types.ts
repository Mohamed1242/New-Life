export type AiActionType =
  | "create_reminder"
  | "reschedule_task"
  | "adjust_habit_target"
  | "open_prayer_focus";

export interface SuggestedAiAction {
  id: string;
  type: AiActionType;
  label: string;
  title?: string;
  triggerTime?: string;
  entityType?: "task" | "habit" | "routine" | "prayer" | "custom_alarm";
  taskId?: string;
  newTimeLabel?: string;
  newDateIso?: string;
  habitId?: string;
  newTargetPerWeek?: number;
  newTargetLabel?: string;
}

export interface AssistantMessage {
  id: string;
  interactionId?: string | null;
  role: "assistant" | "user";
  text: string;
  timestamp: string;
  model?: string;
  cached?: boolean;
  actions?: SuggestedAiAction[];
  actionResolved?: "accepted" | "dismissed";
}
