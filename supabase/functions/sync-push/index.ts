import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.24.2";
import { requireAuthenticatedClient } from "../_shared/auth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const ALLOWED_TABLES = [
  "user_preferences",
  "goals",
  "tasks",
  "task_logs",
  "habits",
  "habit_logs",
  "negative_habit_logs",
  "routines",
  "routine_logs",
  "workouts",
  "exercises",
  "prayer_logs",
  "reminders",
] as const;

const mutationSchema = z.object({
  id: z.string().uuid(),
  table: z.enum(ALLOWED_TABLES),
  operation: z.enum(["upsert", "delete"]),
  clientUpdatedAt: z.string().datetime(),
  payload: z.record(z.unknown()),
});

const requestSchema = z.object({
  mutations: z.array(mutationSchema).max(200),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { supabase, user } = await requireAuthenticatedClient(req);
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonResponse(
        { error: "Invalid sync payload", details: parsed.error.flatten() },
        400,
      );
    }

    const acceptedIds: string[] = [];
    const conflicts: { id: string; table: string; serverRow: Record<string, unknown> }[] = [];
    const errors: { id: string; message: string }[] = [];

    for (const item of parsed.data.mutations) {
      // Check existing row for Last-Write-Wins conflict resolution
      const { data: existing, error: fetchErr } = await supabase
        .from(item.table)
        .select("*")
        .eq("id", item.id)
        .maybeSingle();

      if (fetchErr) {
        errors.push({ id: item.id, message: fetchErr.message });
        continue;
      }

      if (
        existing &&
        existing.updated_at &&
        new Date(existing.updated_at).getTime() >
          new Date(item.clientUpdatedAt).getTime()
      ) {
        conflicts.push({
          id: item.id,
          table: item.table,
          serverRow: existing,
        });
        continue;
      }

      // Enforce ownership strictly from verified JWT user.id
      const sanitizedPayload: Record<string, unknown> = {
        ...item.payload,
        id: item.id,
        user_id: user.id,
        updated_at: item.clientUpdatedAt,
      };

      if (item.operation === "delete") {
        sanitizedPayload.deleted_at = item.clientUpdatedAt;
      }

      const { error: upsertErr } = await supabase
        .from(item.table)
        .upsert(sanitizedPayload, { onConflict: "id" });

      if (upsertErr) {
        errors.push({ id: item.id, message: upsertErr.message });
      } else {
        acceptedIds.push(item.id);
      }
    }

    return jsonResponse({
      syncedAt: new Date().toISOString(),
      acceptedIds,
      conflicts,
      errors,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonResponse({ error: "Unexpected sync-push failure" }, 500);
  }
});
