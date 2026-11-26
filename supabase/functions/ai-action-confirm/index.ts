import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.24.2";
import { suggestedActionSchema } from "../_shared/actionValidator.ts";
import { requireAuthenticatedClient } from "../_shared/auth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const confirmSchema = z.object({
  interactionId: z.string().uuid().optional(),
  action: suggestedActionSchema,
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { supabase, user } = await requireAuthenticatedClient(req);
    const body = await req.json();
    const parsed = confirmSchema.safeParse(body);

    if (!parsed.success) {
      return jsonResponse(
        { error: "Invalid action confirmation", details: parsed.error.flatten() },
        400,
      );
    }

    const { interactionId, action } = parsed.data;
    let appliedEntity: Record<string, unknown> | null = null;

    if (action.type === "create_reminder") {
      const { data, error } = await supabase
        .from("reminders")
        .insert({
          user_id: user.id,
          entity_type: action.entityType,
          title: action.title,
          trigger_time: action.triggerTime,
          repeat_rule: "daily",
          is_enabled: true,
        })
        .select("*")
        .single();
      if (error) return jsonResponse({ error: error.message }, 500);
      appliedEntity = data;
    } else if (action.type === "reschedule_task") {
      // Strictly validate task ownership via user_id
      const { data, error } = await supabase
        .from("tasks")
        .update({
          time_label: action.newTimeLabel,
          date_iso: action.newDateIso,
          status: "postponed",
          postponed_to: action.newDateIso,
        })
        .eq("id", action.taskId)
        .eq("user_id", user.id)
        .select("*")
        .maybeSingle();

      if (error) return jsonResponse({ error: error.message }, 500);
      if (!data) return jsonResponse({ error: "Task not found or unauthorized" }, 404);
      appliedEntity = data;
    } else if (action.type === "adjust_habit_target") {
      const { data, error } = await supabase
        .from("habits")
        .update({
          target_per_week: action.newTargetPerWeek,
          target_label: action.newTargetLabel,
        })
        .eq("id", action.habitId)
        .eq("user_id", user.id)
        .select("*")
        .maybeSingle();

      if (error) return jsonResponse({ error: error.message }, 500);
      if (!data) return jsonResponse({ error: "Habit not found or unauthorized" }, 404);
      appliedEntity = data;
    }

    if (interactionId) {
      await supabase
        .from("ai_interactions")
        .update({ action_status: "accepted" })
        .eq("id", interactionId)
        .eq("user_id", user.id);
    }

    return jsonResponse({
      ok: true,
      appliedType: action.type,
      appliedEntity,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonResponse({ error: "Unexpected ai-action-confirm error" }, 500);
  }
});
