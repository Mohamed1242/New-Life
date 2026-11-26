export interface AssistantActionChip {
  id: string;
  label: string;
  kind: "primary" | "outline";
}

export interface AssistantMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  timestamp: string;
  actions?: AssistantActionChip[];
  actionResolved?: string;
}
