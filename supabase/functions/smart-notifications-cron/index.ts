import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuthenticatedClient } from "../_shared/auth.ts";
import { buildStructuredUserContext } from "../_shared/contextBuilder.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { generateCoachedResponse } from "../_shared/openai.ts";

interface NotificationCandidate {
  dedupeKey: string;
  title: string;
  body: string;
  reason: string;
  route: string;
  sensitive: boolean;
}

function getLocalHHMM(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone || "UTC",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const h = parts.find((p) => p.type === "hour")?.value ?? "12";
    const m = parts.find((p) => p.type === "minute")?.value ?? "00";
    return `${h}:${m}`;
  } catch {
    return new Date().toISOString().slice(11, 16);
  }
}

function isInQuietHours(nowHHMM: string, start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  if (start <= end) {
    return nowHHMM >= start && nowHHMM <= end;
  }
  // Overnight quiet window (e.g. 22:30 -> 05:00)
  return nowHHMM >= start || nowHHMM <= end;
}

async function sendExpoPushBatch(
  tokens: string[],
  title: string,
  body: string,
  route: string,
): Promise<boolean> {
  if (tokens.length === 0) return false;
  const messages = tokens.map((to) => ({
    to,
    sound: "default",
    title,
    body,
    data: { route },
  }));

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });
  return res.ok;
}

async function evaluateUserNotifications(supabase: SupabaseClient, userId: string) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const weekAgoIso = new Date(Date.now() - 7 * 86400 * 1000).toISOString().slice(0, 10);

  const [{ data: profile }, { data: prefs }, { data: tokens }] = await Promise.all([
    supabase.from("profiles").select("timezone, display_name").eq("id", userId).maybeSingle(),
    supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("device_tokens")
      .select("expo_push_token")
      .eq("user_id", userId)
      .eq("is_active", true)
      .is("deleted_at", null),
  ]);

  if (prefs && prefs.notifications_enabled === false) {
    return { userId, skipped: "notifications_disabled", sent: 0 };
  }

  const tz = profile?.timezone ?? "UTC";
  const localHHMM = getLocalHHMM(tz);
  if (
    prefs &&
    isInQuietHours(localHHMM, prefs.quiet_hours_start ?? null, prefs.quiet_hours_end ?? null)
  ) {
    return { userId, skipped: "quiet_hours", sent: 0 };
  }

  // Enforce daily frequency cap
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count: sentToday } = await supabase
    .from("notification_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("sent_at", startOfDay.toISOString());

  const cap = prefs?.max_notifications_per_day ?? 6;
  if ((sentToday ?? 0) >= cap) {
    return { userId, skipped: "daily_cap_reached", sent: 0 };
  }

  // Gather deterministic signals (never treating `not_recorded` as missed)
  const [{ data: todayTasks }, { data: habitLogs }, { data: habits }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, category, status, reminder_enabled")
      .eq("user_id", userId)
      .eq("date_iso", todayIso)
      .is("deleted_at", null),
    supabase
      .from("habit_logs")
      .select("habit_id, status")
      .eq("user_id", userId)
      .gte("log_date", weekAgoIso)
      .is("deleted_at", null),
    supabase
      .from("habits")
      .select("id, title, streak_days, polarity")
      .eq("user_id", userId)
      .is("deleted_at", null),
  ]);

  const candidates: NotificationCandidate[] = [];
  const missedTasksToday = (todayTasks ?? []).filter((t) => t.status === "missed");

  // Scenario A: Multiple missed tasks -> suppress repeated alerts, suggest reorganizing
  if (missedTasksToday.length >= 3) {
    candidates.push({
      dedupeKey: `reorg_${todayIso}`,
      title: "Lighten Today's Schedule?",
      body: "Several tasks were missed today. Open your AI Coach to rebalance gently.",
      reason: "multiple_missed_tasks_reorg",
      route: "/(tabs)/assistant",
      sensitive: false,
    });
  } else {
    // Scenario B: Gentle workout reminder if open & reminder enabled
    const openWorkout = (todayTasks ?? []).find(
      (t) => t.category === "gym" && t.status === "not_recorded" && t.reminder_enabled,
    );
    if (openWorkout) {
      candidates.push({
        dedupeKey: `workout_${openWorkout.id}_${todayIso}`,
        title: "Movement Check-In",
        body: `Ready for "${openWorkout.title}"? Even a 15-minute session counts.`,
        reason: "scheduled_workout_gentle_reminder",
        route: "/(tabs)/tasks",
        sensitive: false,
      });
    }
  }

  // Scenario C: Repeatedly missed positive habit (>=3 missed in 7d) -> Event-driven AI coaching
  for (const h of habits ?? []) {
    const missedCount = (habitLogs ?? []).filter(
      (l) => l.habit_id === h.id && l.status === "missed",
    ).length;
    if (missedCount >= 3) {
      const ctx = await buildStructuredUserContext(supabase, userId);
      const aiCoach = await generateCoachedResponse({
        supabase,
        userId,
        feature: "event_coach",
        context: ctx,
        userMessage: `The user explicitly logged "${h.title}" as missed ${missedCount} times this week. Suggest one lighter, realistic adjustment.`,
        cacheKey: `event_habit_${h.id}_${todayIso.slice(0, 7)}`,
      });
      candidates.push({
        dedupeKey: `habit_adjust_${h.id}_${todayIso}`,
        title: "A Lighter Rhythm Idea",
        body: aiCoach.reply.slice(0, 140),
        reason: "repeatedly_missed_habit_ai_coach",
        route: "/(tabs)/assistant",
        sensitive: true,
      });
      break;
    }
  }

  // Scenario D: Positive reinforcement on >=5 day streak
  const milestoneHabit = (habits ?? []).find((h) => (h.streak_days ?? 0) >= 5);
  if (milestoneHabit) {
    candidates.push({
      dedupeKey: `milestone_${milestoneHabit.id}_${todayIso}`,
      title: "Steady Momentum",
      body: `${milestoneHabit.streak_days} days of consistent rhythm—small steps compound.`,
      reason: "positive_reinforcement_milestone",
      route: "/(tabs)/insights",
      sensitive: true,
    });
  }

  const hidePreview = prefs?.privacy_hide_preview ?? true;
  const activeTokens = (tokens ?? []).map((t) => t.expo_push_token);
  let sentCount = 0;

  for (const cand of candidates.slice(0, Math.max(0, cap - (sentToday ?? 0)))) {
    const { data: existing } = await supabase
      .from("notification_logs")
      .select("id")
      .eq("user_id", userId)
      .eq("dedupe_key", cand.dedupeKey)
      .maybeSingle();

    if (existing) continue; // Prevent duplicate notifications

    const safeTitle = hidePreview && cand.sensitive ? "New Life Check-In" : cand.title;
    const safeBody =
      hidePreview && cand.sensitive
        ? "Open New Life to view your private progress insight."
        : cand.body;

    const pushed = await sendExpoPushBatch(activeTokens, safeTitle, safeBody, cand.route);

    await supabase.from("notification_logs").insert({
      user_id: userId,
      channel: pushed ? "push" : "local",
      title: safeTitle,
      delivery_status: pushed ? "sent" : "scheduled",
      dedupe_key: cand.dedupeKey,
      decision_reason: cand.reason,
      sent_at: new Date().toISOString(),
    });
    sentCount += 1;
  }

  return { userId, evaluated: candidates.length, sent: sentCount };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    const headerSecret = req.headers.get("x-cron-secret");

    // Mode 1: Scheduled Supabase Cron run across active device users
    if (cronSecret && headerSecret === cronSecret) {
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      if (!serviceKey || !supabaseUrl) {
        return jsonResponse({ error: "Missing service role env for cron" }, 500);
      }

      const adminClient = createClient(supabaseUrl, serviceKey);
      const { data: activeTokenUsers } = await adminClient
        .from("device_tokens")
        .select("user_id")
        .eq("is_active", true)
        .is("deleted_at", null);

      const uniqueUsers = Array.from(
        new Set((activeTokenUsers ?? []).map((r) => r.user_id)),
      );
      const results = [];
      for (const uid of uniqueUsers) {
        results.push(await evaluateUserNotifications(adminClient, uid));
      }
      return jsonResponse({ ok: true, mode: "cron", results });
    }

    // Mode 2: Authenticated user evaluating their own smart check-ins
    const { supabase, user } = await requireAuthenticatedClient(req);
    const result = await evaluateUserNotifications(supabase, user.id);
    return jsonResponse({ ok: true, mode: "user", result });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonResponse({ error: "Unexpected smart-notifications-cron error" }, 500);
  }
});
