import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireAuthenticatedClient } from "../_shared/auth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { supabase, user } = await requireAuthenticatedClient(req);

    const [{ data: tasks }, { data: habits }, { data: habitLogs }] =
      await Promise.all([
        supabase.from("tasks").select("category, status, completed").is("deleted_at", null),
        supabase.from("habits").select("id, title, polarity, streak_days").is("deleted_at", null),
        supabase
          .from("habit_logs")
          .select("habit_id, status, log_date")
          .is("deleted_at", null)
          .order("log_date", { ascending: false })
          .limit(100),
      ]);

    const completedTasks = (tasks ?? []).filter((t) => t.completed).length;
    const totalTasks = (tasks ?? []).length;
    const topStreak = (habits ?? []).reduce(
      (max, h) => Math.max(max, h.streak_days ?? 0),
      0,
    );

    const summary = {
      totalTasks,
      completedTasks,
      activeHabits: (habits ?? []).length,
      recentLogCount: (habitLogs ?? []).length,
      topStreak,
    };

    const { error } = await supabase.from("ai_user_context").upsert(
      {
        user_id: user.id,
        summary_json: summary,
        last_computed_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ ok: true, summary });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonResponse({ error: "Unexpected context refresh failure" }, 500);
  }
});
