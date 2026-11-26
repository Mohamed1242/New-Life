import { useState } from "react";
import { router } from "expo-router";
import { getSupabaseClient } from "@/core/supabase/client";
import { generateUuid } from "@/core/utils/date";
import { useAuthStore } from "@/modules/auth/store/useAuthStore";
import { notificationService } from "@/modules/notifications/services/notificationService";
import { useTasksQuery } from "@/modules/tasks/hooks/useTasksAndHabits";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/shared/toast/ToastContext";
import type { AssistantMessage, SuggestedAiAction } from "../types/assistant.types";

const INITIAL_MESSAGES: AssistantMessage[] = [
  {
    id: "m_welcome",
    role: "assistant",
    text: "Welcome back. Ask for a daily review, weekly behavioral pattern analysis, or help adjusting your schedule gently.",
    timestamp: "Now",
    actions: [
      { id: "act_prayer", type: "open_prayer_focus", label: "Prayer Focus Mode" },
    ],
  },
];

export function useAssistant() {
  const user = useAuthStore((s) => s.user);
  const tasksQuery = useTasksQuery();
  const [conversationId] = useState(() => generateUuid());
  const [messages, setMessages] = useState<AssistantMessage[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState("");
  const [isResponding, setIsResponding] = useState(false);
  const [remainingToday, setRemainingToday] = useState<number | null>(null);

  const invokeCoach = async (params: {
    mode: "chat" | "daily_review" | "weekly_review";
    message?: string;
    forceRefresh?: boolean;
  }) => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) {
      const tasks = tasksQuery.data ?? [];
      const done = tasks.filter((t) => t.completed).length;
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `local_${Date.now()}`,
            role: "assistant",
            text:
              params.mode === "weekly_review"
                ? `Local Summary: You currently have ${done}/${tasks.length} tasks done today. Sign in via Profile -> Cloud Backup & Sync to unlock OpenAI-powered weekly coaching.`
                : `Local Check-In: ${done} of ${tasks.length} tasks completed today. Sign in to connect your OpenAI coach with full context and smart reminders.`,
            timestamp: "Now",
            model: "local-offline",
          },
        ]);
        setIsResponding(false);
      }, 280);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("ai-coach", {
        body: {
          mode: params.mode,
          conversationId,
          message: params.message,
          forceRefresh: params.forceRefresh,
        },
      });

      if (error) throw new Error(error.message);

      if (typeof data?.usage?.remainingToday === "number") {
        setRemainingToday(data.usage.remainingToday);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: data?.interactionId ?? `ai_${Date.now()}`,
          interactionId: data?.interactionId ?? null,
          role: "assistant",
          text: data?.reply ?? "I'm here to help you stay balanced.",
          timestamp: "Now",
          model: data?.model,
          cached: Boolean(data?.cached),
          actions: Array.isArray(data?.suggestedActions) ? data.suggestedActions : [],
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not reach AI Coach";
      toast.error(msg);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          text: "I couldn't reach the cloud coach right now, but your local schedule is safe.",
          timestamp: "Now",
        },
      ]);
    } finally {
      setIsResponding(false);
    }
  };

  const sendMessage = (customText?: string) => {
    const clean = (customText ?? draft).trim();
    if (!clean || isResponding) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `u_${Date.now()}`,
        role: "user",
        text: clean,
        timestamp: "Now",
      },
    ]);
    if (!customText) setDraft("");
    setIsResponding(true);
    invokeCoach({ mode: "chat", message: clean });
  };

  const requestReview = (mode: "daily_review" | "weekly_review") => {
    if (isResponding) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `u_${Date.now()}`,
        role: "user",
        text: mode === "daily_review" ? "Generate my daily review" : "Generate my weekly behavioral report",
        timestamp: "Now",
      },
    ]);
    setIsResponding(true);
    invokeCoach({ mode });
  };

  const confirmAction = async (message: AssistantMessage, action: SuggestedAiAction) => {
    if (action.type === "open_prayer_focus") {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, actionResolved: "accepted" } : m)),
      );
      router.push("/(modals)/prayer-focus");
      return;
    }

    const supabase = getSupabaseClient();
    if (supabase && user) {
      try {
        const { error } = await supabase.functions.invoke("ai-action-confirm", {
          body: {
            interactionId: message.interactionId ?? undefined,
            action,
          },
        });
        if (error) throw new Error(error.message);

        if (action.type === "create_reminder" && action.title) {
          await notificationService.scheduleLocalReminder({
            identifier: `ai_rem_${action.id}`,
            title: action.title,
            body: `Reminder set by your assistant (${action.triggerTime ?? "Daily"})`,
            hour: 19,
            minute: 0,
            repeatsDaily: true,
          });
        }

        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["habits"] });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not apply action";
        toast.error(msg);
        return;
      }
    }

    setMessages((prev) => [
      ...prev.map((m) =>
        m.id === message.id ? { ...m, actionResolved: "accepted" as const } : m,
      ),
      {
        id: `ack_${Date.now()}`,
        role: "assistant" as const,
        text: `Applied "${action.label}" and saved your preference.`,
        timestamp: "Now",
      },
    ]);
    toast.success(`Confirmed: ${action.label}`);
  };

  const dismissAction = async (message: AssistantMessage) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === message.id
          ? { ...m, actionResolved: "dismissed" as const }
          : m,
      ),
    );

    const supabase = getSupabaseClient();
    if (supabase && user && message.interactionId) {
      supabase.functions
        .invoke("ai-coach", {
          body: {
            mode: "feedback",
            interactionId: message.interactionId,
            feedbackStatus: "dismissed",
          },
        })
        .catch(() => {});
    }
    toast.info("Noted — I'll adjust future suggestions.");
  };

  return {
    messages,
    draft,
    setDraft,
    isResponding,
    remainingToday,
    sendMessage,
    requestReview,
    confirmAction,
    dismissAction,
  };
}
