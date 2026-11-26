import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.24.2";
import { requireAuthenticatedClient } from "../_shared/auth.ts";
import { buildStructuredUserContext } from "../_shared/contextBuilder.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { generateCoachedResponse } from "../_shared/openai.ts";

const coachRequestSchema = z.object({
  mode: z.enum(["chat", "daily_review", "weekly_review", "feedback"]).default("chat"),
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().max(1000).optional(),
  interactionId: z.string().uuid().optional(),
  feedbackStatus: z.enum(["accepted", "dismissed"]).optional(),
  forceRefresh: z.boolean().optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { supabase, user } = await requireAuthenticatedClient(req);
    const body = await req.json().catch(() => ({}));
    const parsed = coachRequestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonResponse(
        { error: "Invalid AI coach payload", details: parsed.error.flatten() },
        400,
      );
    }

    const { mode, conversationId, message, interactionId, feedbackStatus, forceRefresh } =
      parsed.data;

    if (mode === "feedback") {
      if (!interactionId || !feedbackStatus) {
        return jsonResponse({ error: "interactionId and feedbackStatus required" }, 400);
      }
      const { error } = await supabase
        .from("ai_interactions")
        .update({ action_status: feedbackStatus })
        .eq("id", interactionId)
        .eq("user_id", user.id);

      if (error) return jsonResponse({ error: error.message }, 500);
      await buildStructuredUserContext(supabase, user.id);
      return jsonResponse({ ok: true, interactionId, actionStatus: feedbackStatus });
    }

    const convId = conversationId ?? crypto.randomUUID();
    const context = await buildStructuredUserContext(supabase, user.id);

    if (mode === "chat" && message) {
      await supabase.from("ai_interactions").insert({
        user_id: user.id,
        conversation_id: convId,
        role: "user",
        content: message,
        action_status: "none",
      });
    }

    const todayKey = new Date().toISOString().slice(0, 10);
    const normalizedMsgKey = message
      ? message.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40)
      : "";
    const cacheKey =
      mode === "daily_review"
        ? `v3_daily_review_${todayKey}`
        : mode === "weekly_review"
          ? `v3_weekly_review_${todayKey}`
          : normalizedMsgKey
            ? `v3_chat_${todayKey}_${normalizedMsgKey}`
            : undefined;

    const result = await generateCoachedResponse({
      supabase,
      userId: user.id,
      feature: mode,
      context,
      userMessage: message,
      cacheKey,
      forceRefresh,
    });

    const { data: savedRow } = await supabase
      .from("ai_interactions")
      .insert({
        user_id: user.id,
        conversation_id: convId,
        role: "assistant",
        content: result.reply,
        suggested_actions: result.suggestedActions,
        action_status: result.suggestedActions.length > 0 ? "pending" : "none",
      })
      .select("id")
      .single();

    return jsonResponse({
      conversationId: convId,
      interactionId: savedRow?.id ?? null,
      reply: result.reply,
      suggestedActions: result.suggestedActions,
      model: result.model,
      cached: result.cached,
      usage: result.usage,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonResponse({ error: "Unexpected ai-coach error" }, 500);
  }
});
