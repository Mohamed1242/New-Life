import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeSuggestedActions, type ValidatedSuggestedAction } from "./actionValidator.ts";
import type { StructuredUserContext } from "./contextBuilder.ts";

export type AiFeature = "chat" | "daily_review" | "weekly_review" | "event_coach";

export interface AiCoachResponse {
  reply: string;
  suggestedActions: ValidatedSuggestedAction[];
  model: string;
  cached: boolean;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
    remainingToday: number;
  };
}

const MODEL_PRICING_PER_1M: Record<string, { in: number; out: number }> = {
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gpt-4o": { in: 2.5, out: 10.0 },
  "gemini-3-flash-preview": { in: 0, out: 0 },
  "gemini-flash-latest": { in: 0, out: 0 },
  "gemini-flash-lite-latest": { in: 0, out: 0 },
  "gemini-2.5-flash": { in: 0, out: 0 },
  "gemini-2.0-flash": { in: 0, out: 0 },
};

function estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const rates = MODEL_PRICING_PER_1M[model] ?? MODEL_PRICING_PER_1M["gpt-4o-mini"];
  return Number(
    ((promptTokens * rates.in + completionTokens * rates.out) / 1_000_000).toFixed(6),
  );
}

function buildFallbackReply(
  feature: AiFeature,
  ctx: StructuredUserContext,
  userMessage?: string,
): { reply: string; suggestedActions: ValidatedSuggestedAction[] } {
  const { tasksSummary, positiveHabits, negativeHabits, profile } = ctx;
  const topHabit = positiveHabits[0];
  const nextTask = tasksSummary.upcomingTasks[0];

  if (feature === "daily_review") {
    const reply = `Hi ${profile.displayName} — today you've completed ${tasksSummary.todayCompleted} of ${tasksSummary.todayTotal} scheduled tasks (${tasksSummary.todayUnrecorded} open, ${tasksSummary.todaySkippedOrPostponed} paused). ${
      nextTask
        ? `Focusing gently on "${nextTask.title}" at ${nextTask.timeLabel} will keep your momentum steady.`
        : "Your scheduled items are clear—take a calm breath."
    }`;
    const suggestedActions: ValidatedSuggestedAction[] = nextTask
      ? [
          {
            id: `rem_${Date.now()}`,
            type: "create_reminder",
            label: `Remind: ${nextTask.title.slice(0, 18)}`,
            title: nextTask.title,
            triggerTime: nextTask.timeLabel,
            entityType: "task",
          },
        ]
      : [];
    return { reply, suggestedActions };
  }

  if (feature === "weekly_review") {
    const negUrges = negativeHabits.reduce((s, h) => s + h.urgesResistedLast7Days, 0);
    const reply = `Weekly Review for ${profile.displayName}: ${
      topHabit
        ? `"${topHabit.title}" is at a ${topHabit.streakDays}-day rhythm (${topHabit.consistencyPct}% recorded consistency). `
        : ""
    }You navigated ${negUrges} urge${negUrges === 1 ? "" : "s"} calmly this week and kept missed tasks to ${tasksSummary.recentMissedCount}. Keep targets realistic and protect your sleep window (${ctx.preferences.bedtime} – ${ctx.preferences.wakeTime}).`;
    return { reply, suggestedActions: [] };
  }

  const lower = (userMessage ?? "").toLowerCase();
  if (lower.includes("prayer") || lower.includes("fajr")) {
    return {
      reply: `Prayer rhythm check-in: your prayer focus auto-mute is ${
        ctx.preferences.prayerAutoMute ? "enabled" : "off"
      }. Would you like to enter Prayer Focus Mode or set a gentle pre-prayer reminder?`,
      suggestedActions: [
        { id: `pf_${Date.now()}`, type: "open_prayer_focus", label: "Open Prayer Focus" },
        {
          id: `pr_${Date.now() + 1}`,
          type: "create_reminder",
          label: "Gentle Prayer Alert",
          title: "Prepare for Prayer",
          triggerTime: "10 min before",
          entityType: "prayer",
        },
      ],
    };
  }

  return {
    reply: `I'm reviewing your current schedule (${tasksSummary.todayCompleted}/${tasksSummary.todayTotal} tasks done today, ${positiveHabits.length} positive habits active). ${
      nextTask
        ? `Your next open item is "${nextTask.title}" at ${nextTask.timeLabel}.`
        : "Your day looks balanced."
    } Let me know if you want to adjust any routine block or create a gentle reminder.`,
    suggestedActions: nextTask
      ? [
          {
            id: `rem_${Date.now()}`,
            type: "create_reminder",
            label: "Remind Me",
            title: nextTask.title,
            triggerTime: nextTask.timeLabel,
            entityType: "task",
          },
        ]
      : [],
  };
}

export async function generateCoachedResponse(params: {
  supabase: SupabaseClient;
  userId: string;
  feature: AiFeature;
  context: StructuredUserContext;
  userMessage?: string;
  cacheKey?: string;
  forceRefresh?: boolean;
}): Promise<AiCoachResponse> {
  const { supabase, userId, feature, context, userMessage, cacheKey, forceRefresh } = params;

  // 1. Check daily AI rate limit
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count: usedTodayCount } = await supabase
    .from("ai_usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("cached", false)
    .gte("created_at", startOfDay.toISOString());

  const usedToday = usedTodayCount ?? 0;
  const limit = context.preferences.aiDailyLimit;
  const remainingToday = Math.max(0, limit - usedToday);

  // 2. Deterministic-first short-circuit (0 AI tokens for simple queries / empty day)
  const lowerMsg = (userMessage ?? "").toLowerCase();
  const isSimpleDeterministicQuery =
    (feature === "daily_review" &&
      context.tasksSummary.todayTotal === 0 &&
      context.positiveHabits.length === 0) ||
    (feature === "chat" &&
      (lowerMsg.includes("prayer focus") ||
        lowerMsg.includes("gentle prayer reminder") ||
        lowerMsg === "summarize my week"));

  if (isSimpleDeterministicQuery) {
    const quick = buildFallbackReply(feature, context, userMessage);
    return {
      ...quick,
      model: "deterministic-rules",
      cached: false,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        remainingToday,
      },
    };
  }

  // 3. Check response cache if cacheKey provided (cost management)
  if (cacheKey && !forceRefresh) {
    const { data: cachedRow } = await supabase
      .from("ai_response_cache")
      .select("response_json, expires_at")
      .eq("user_id", userId)
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cachedRow?.response_json) {
      const payload = cachedRow.response_json as {
        reply?: string;
        suggestedActions?: unknown;
        model?: string;
      };
      return {
        reply: payload.reply ?? "",
        suggestedActions: sanitizeSuggestedActions(payload.suggestedActions),
        model: payload.model ?? "cache",
        cached: true,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCostUsd: 0,
          remainingToday,
        },
      };
    }
  }

  const geminiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
  const openAiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  const useGemini = Boolean(geminiKey);
  const apiKey = geminiKey || openAiKey;

  let chosenModel = useGemini
    ? Deno.env.get("GEMINI_MODEL") ?? "gemini-flash-lite-latest"
    : feature === "weekly_review"
      ? Deno.env.get("OPENAI_WEEKLY_MODEL") ?? "gpt-4o-mini"
      : Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

  if (!apiKey || remainingToday <= 0) {
    const fallback = buildFallbackReply(feature, context, userMessage);
    return {
      ...fallback,
      model: !apiKey ? "local-coach-fallback" : "rate-limit-fallback",
      cached: false,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        remainingToday,
      },
    };
  }

  const systemPrompt = [
    "You are New Life, a calm, non-shaming lifestyle coach. Never treat unrecorded items as missed.",
    "Adapt to coachingTone and previousFeedback. Reply concisely (1-3 sentences) in strict JSON:",
    '{ "reply": string, "suggestedActions": Array }',
    "Allowed suggestedActions (use real UUIDs from context only, max 2):",
    '- create_reminder: {id,type:"create_reminder",label,title,triggerTime,entityType:"task"|"habit"|"routine"|"prayer"|"custom_alarm"}',
    '- reschedule_task: {id,type:"reschedule_task",label,taskId,newTimeLabel,newDateIso:"YYYY-MM-DD"}',
    '- adjust_habit_target: {id,type:"adjust_habit_target",label,habitId,newTargetPerWeek:1..7,newTargetLabel}',
    '- open_prayer_focus: {id,type:"open_prayer_focus",label}',
  ].join("\n");

  const promptBody =
    feature === "daily_review"
      ? "Generate a concise daily progress reflection and 0-2 helpful action suggestions."
      : feature === "weekly_review"
        ? "Analyze 7-day behavioral patterns, positive/negative habit trends, and recommend 1 realistic improvement."
        : userMessage ?? "How am I doing today?";

  const userPayload = JSON.stringify({
    feature,
    userRequest: promptBody,
    context,
  });

  let rawContent = "{}";
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;

  if (useGemini) {
    const candidateModels = Array.from(
      new Set([chosenModel, "gemini-flash-lite-latest", "gemini-flash-latest"]),
    );

    let geminiJson: any = null;
    for (const modelCandidate of candidateModels) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelCandidate)}:generateContent`;
      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPayload }],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 650,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });

      if (res.ok) {
        chosenModel = modelCandidate;
        geminiJson = await res.json();
        break;
      }
    }

    if (!geminiJson) {
      const fallback = buildFallbackReply(feature, context, userMessage);
      return {
        ...fallback,
        model: "ai-provider-error-fallback",
        cached: false,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCostUsd: 0,
          remainingToday,
        },
      };
    }

    rawContent =
      geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    promptTokens = Number(geminiJson?.usageMetadata?.promptTokenCount ?? 0);
    completionTokens = Number(
      geminiJson?.usageMetadata?.candidatesTokenCount ?? 0,
    );
    totalTokens = Number(
      geminiJson?.usageMetadata?.totalTokenCount ??
        promptTokens + completionTokens,
    );
  } else {
    const endpointUrl =
      Deno.env.get("AI_BASE_URL") ??
      "https://api.openai.com/v1/chat/completions";
    const res = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: chosenModel,
        temperature: 0.4,
        max_tokens: 450,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPayload },
        ],
      }),
    });

    if (!res.ok) {
      const fallback = buildFallbackReply(feature, context, userMessage);
      return {
        ...fallback,
        model: "ai-provider-error-fallback",
        cached: false,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCostUsd: 0,
          remainingToday,
        },
      };
    }

    const completion = await res.json();
    rawContent = completion?.choices?.[0]?.message?.content ?? "{}";
    promptTokens = Number(completion?.usage?.prompt_tokens ?? 0);
    completionTokens = Number(completion?.usage?.completion_tokens ?? 0);
    totalTokens = Number(
      completion?.usage?.total_tokens ?? promptTokens + completionTokens,
    );
  }

  let parsedJson: { reply?: string; suggestedActions?: unknown } = {};
  const cleaned = rawContent
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    parsedJson = JSON.parse(cleaned);
  } catch {
    const replyMatch = cleaned.match(/"reply"\s*:\s*"((?:\\.|[^"\\])*)"/);
    if (replyMatch?.[1]) {
      try {
        parsedJson = { reply: JSON.parse(`"${replyMatch[1]}"`) };
      } catch {
        parsedJson = { reply: replyMatch[1] };
      }
    } else {
      parsedJson = { reply: buildFallbackReply(feature, context, userMessage).reply };
    }
  }

  const estimatedCostUsd = estimateCostUsd(chosenModel, promptTokens, completionTokens);

  const validatedActions = sanitizeSuggestedActions(parsedJson.suggestedActions);
  let reply =
    typeof parsedJson.reply === "string" && parsedJson.reply.trim().length > 0
      ? parsedJson.reply.trim()
      : buildFallbackReply(feature, context, userMessage).reply;

  // Guard against double-encoded JSON inside reply string
  if (reply.startsWith("{")) {
    try {
      const inner = JSON.parse(reply) as { reply?: unknown };
      if (typeof inner.reply === "string" && inner.reply.trim()) {
        reply = inner.reply.trim();
      }
    } catch {
      // keep trimmed reply
    }
  }

  await supabase.from("ai_usage_logs").insert({
    user_id: userId,
    model: chosenModel,
    feature,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
    estimated_cost_usd: estimatedCostUsd,
    cached: false,
  });

  if (cacheKey) {
    const ttlHours =
      feature === "event_coach" ? 168 : feature === "chat" ? 0.5 : 24;
    const expiresAt = new Date(
      Date.now() + ttlHours * 60 * 60 * 1000,
    ).toISOString();
    await supabase.from("ai_response_cache").upsert(
      {
        user_id: userId,
        cache_key: cacheKey,
        response_json: { reply, suggestedActions: validatedActions, model: chosenModel },
        expires_at: expiresAt,
      },
      { onConflict: "user_id,cache_key" },
    );
  }

  return {
    reply,
    suggestedActions: validatedActions,
    model: chosenModel,
    cached: false,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUsd,
      remainingToday: Math.max(0, remainingToday - 1),
    },
  };
}
