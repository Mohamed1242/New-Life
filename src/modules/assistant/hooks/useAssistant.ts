import { useState } from "react";
import { toast } from "@/shared/toast/ToastContext";
import type { AssistantMessage } from "../types/assistant.types";

const INITIAL_MESSAGES: AssistantMessage[] = [
  {
    id: "m1",
    role: "assistant",
    text: "Asr prayer is in 25 minutes. Would you like me to send a gentle reminder or prepare Focus Mode to lower media audio?",
    timestamp: "03:15 PM",
    actions: [
      { id: "a1", label: "Remind Me", kind: "primary" },
      { id: "a2", label: "Turn Down Media", kind: "outline" },
    ],
  },
];

export function useAssistant() {
  const [messages, setMessages] = useState<AssistantMessage[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState("");
  const [isResponding, setIsResponding] = useState(false);

  const sendMessage = (customText?: string) => {
    const clean = (customText ?? draft).trim();
    if (!clean || isResponding) return;

    const userMsg: AssistantMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      text: clean,
      timestamp: "Now",
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setDraft("");
    setIsResponding(true);

    setTimeout(() => {
      const reply: AssistantMessage = {
        id: `a_${Date.now()}`,
        role: "assistant",
        text: "Got it. Your consistency is up 12% this week—protecting your 6:00 PM workout and evening reading will keep your balance above 80%.",
        timestamp: "Now",
      };
      setMessages((prev) => [...prev, reply]);
      setIsResponding(false);
    }, 380);
  };

  const resolveAction = (messageId: string, label: string) => {
    setMessages((prev) => [
      ...prev.map((m) =>
        m.id === messageId ? { ...m, actionResolved: label } : m,
      ),
      {
        id: `a_ack_${Date.now()}`,
        role: "assistant",
        text: `Done — "${label}" has been scheduled gently for you.`,
        timestamp: "Now",
      },
    ]);
    toast.success(`${label} scheduled`);
  };

  return {
    messages,
    draft,
    setDraft,
    isResponding,
    sendMessage,
    resolveAction,
  };
}
