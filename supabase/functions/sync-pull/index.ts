import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.24.2";
import { requireAuthenticatedClient } from "../_shared/auth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const querySchema = z.object({
  since: z.string().datetime().optional(),
});

const SYNC_TABLES = [
  "profiles",
  "user_preferences",
  "goals",
  "tasks",
  "task_logs",
  "habits",
  "habit_logs",
  "negative_habit_logs",
  "routines",
  "routine_logs",
  "prayer_logs",
  "reminders",
] as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { supabase } = await requireAuthenticatedClient(req);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const parsed = querySchema.safeParse(body);

    if (!parsed.success) {
      return jsonResponse({ error: "Invalid since timestamp" }, 400);
    }

    const since = parsed.data.since;
    const changes: Record<string, unknown[]> = {};

    for (const table of SYNC_TABLES) {
      let query = supabase.from(table).select("*").order("updated_at", { ascending: true });
      if (since) {
        query = query.gt("updated_at", since);
      }
      const { data, error } = await query;
      if (error) {
        return jsonResponse({ error: `Pull failed on ${table}: ${error.message}` }, 500);
      }
      changes[table] = data ?? [];
    }

    return jsonResponse({
      serverTime: new Date().toISOString(),
      changes,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonResponse({ error: "Unexpected sync-pull failure" }, 500);
  }
});
