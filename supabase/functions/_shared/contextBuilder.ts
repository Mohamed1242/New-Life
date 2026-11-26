import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface StructuredUserContext {
  profile: {
    displayName: string;
    timezone: string;
    locale: string;
  };
  preferences: {
    coachingTone: string;
    bedtime: string;
    wakeTime: string;
    prayerMethod: string;
    prayerAutoMute: boolean;
    notificationsEnabled: boolean;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
    maxNotificationsPerDay: number;
    aiDailyLimit: number;
  };
  goals: { id: string; title: string; pillar: string; currentValue: number; targetValue: number }[];
  routineSummary: { title: string; blockType: string; startTime: string; endTime: string }[];
  positiveHabits: {
    id: string;
    title: string;
    streakDays: number;
    consistencyPct: number;
    recentCompleted: number;
    recentMissed: number;
    recentSkipped: number;
  }[];
  negativeHabits: {
    id: string;
    title: string;
    streakDays: number;
    occurrencesLast7Days: number;
    urgesResistedLast7Days: number;
  }[];
  tasksSummary: {
    todayTotal: number;
    todayCompleted: number;
    todaySkippedOrPostponed: number;
    todayUnrecorded: number;
    recentMissedCount: number;
    upcomingTasks: { id: string; title: string; dateIso: string; timeLabel: string; category: string }[];
  };
  previousFeedback: {
    content: string;
    actionStatus: string;
  }[];
}

function isoDaysAgo(days: number): string {
  const dt = new Date();
  dt.setUTCDate(dt.getUTCDate() - days);
  return dt.toISOString().slice(0, 10);
}

export async function buildStructuredUserContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<StructuredUserContext> {
  const todayIso = isoDaysAgo(0);
  const weekAgoIso = isoDaysAgo(7);

  const [
    { data: profile },
    { data: prefs },
    { data: goals },
    { data: routines },
    { data: habits },
    { data: habitLogs },
    { data: negLogs },
    { data: tasks },
    { data: prevInteractions },
  ] = await Promise.all([
    supabase.from("profiles").select("display_name, timezone, locale").eq("id", userId).maybeSingle(),
    supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("goals")
      .select("id, title, pillar, current_value, target_value")
      .eq("status", "active")
      .is("deleted_at", null)
      .limit(4),
    supabase
      .from("routines")
      .select("title, block_type, start_time, end_time")
      .eq("is_enabled", true)
      .is("deleted_at", null)
      .order("start_time", { ascending: true })
      .limit(6),
    supabase
      .from("habits")
      .select("id, title, polarity, streak_days, weekly_consistency_pct")
      .is("deleted_at", null)
      .limit(10),
    supabase
      .from("habit_logs")
      .select("habit_id, status")
      .gte("log_date", weekAgoIso)
      .is("deleted_at", null),
    supabase
      .from("negative_habit_logs")
      .select("habit_id, event_type")
      .gte("log_date", weekAgoIso)
      .is("deleted_at", null),
    supabase
      .from("tasks")
      .select("id, title, date_iso, time_label, category, status, completed")
      .gte("date_iso", weekAgoIso)
      .is("deleted_at", null)
      .limit(25),
    supabase
      .from("ai_interactions")
      .select("content, action_status")
      .eq("role", "assistant")
      .neq("action_status", "none")
      .order("created_at", { ascending: false })
      .limit(2),
  ]);

  const positiveHabits = (habits ?? [])
    .filter((h) => h.polarity === "positive")
    .map((h) => {
      const logs = (habitLogs ?? []).filter((l) => l.habit_id === h.id);
      return {
        id: h.id,
        title: h.title,
        streakDays: h.streak_days ?? 0,
        consistencyPct: h.weekly_consistency_pct ?? 0,
        recentCompleted: logs.filter((l) => l.status === "completed").length,
        recentMissed: logs.filter((l) => l.status === "missed").length,
        recentSkipped: logs.filter((l) => l.status === "skipped" || l.status === "postponed").length,
      };
    });

  const negativeHabits = (habits ?? [])
    .filter((h) => h.polarity === "negative")
    .map((h) => {
      const logs = (negLogs ?? []).filter((l) => l.habit_id === h.id);
      return {
        id: h.id,
        title: h.title,
        streakDays: h.streak_days ?? 0,
        occurrencesLast7Days: logs.filter((l) => l.event_type === "occurrence").length,
        urgesResistedLast7Days: logs.filter((l) => l.event_type === "urge_resisted").length,
      };
    });

  const todayTasks = (tasks ?? []).filter((t) => t.date_iso === todayIso);
  const recentMissedCount = (tasks ?? []).filter((t) => t.status === "missed").length;

  const context: StructuredUserContext = {
    profile: {
      displayName: profile?.display_name ?? "Friend",
      timezone: profile?.timezone ?? "UTC",
      locale: profile?.locale ?? "en",
    },
    preferences: {
      coachingTone: prefs?.coaching_tone ?? "gentle",
      bedtime: prefs?.bedtime ?? "22:45",
      wakeTime: prefs?.wake_time ?? "05:15",
      prayerMethod: prefs?.prayer_method ?? "MWL",
      prayerAutoMute: prefs?.prayer_auto_mute ?? true,
      notificationsEnabled: prefs?.notifications_enabled ?? true,
      quietHoursStart: prefs?.quiet_hours_start ?? null,
      quietHoursEnd: prefs?.quiet_hours_end ?? null,
      maxNotificationsPerDay: prefs?.max_notifications_per_day ?? 6,
      aiDailyLimit: prefs?.ai_daily_limit ?? 25,
    },
    goals: (goals ?? []).map((g) => ({
      id: g.id,
      title: g.title,
      pillar: g.pillar,
      currentValue: Number(g.current_value ?? 0),
      targetValue: Number(g.target_value ?? 100),
    })),
    routineSummary: (routines ?? []).map((r) => ({
      title: r.title,
      blockType: r.block_type,
      startTime: r.start_time,
      endTime: r.end_time,
    })),
    positiveHabits,
    negativeHabits,
    tasksSummary: {
      todayTotal: todayTasks.length,
      todayCompleted: todayTasks.filter((t) => t.status === "completed").length,
      todaySkippedOrPostponed: todayTasks.filter(
        (t) => t.status === "skipped" || t.status === "postponed",
      ).length,
      todayUnrecorded: todayTasks.filter((t) => t.status === "not_recorded").length,
      recentMissedCount,
      upcomingTasks: todayTasks
        .filter((t) => t.status === "not_recorded")
        .slice(0, 4)
        .map((t) => ({
          id: t.id,
          title: t.title,
          dateIso: t.date_iso,
          timeLabel: t.time_label,
          category: t.category,
        })),
    },
    previousFeedback: (prevInteractions ?? []).map((i) => ({
      content: String(i.content).slice(0, 140),
      actionStatus: i.action_status,
    })),
  };

  // Persist summarized context snapshot for fast reads
  await supabase.from("ai_user_context").upsert(
    {
      user_id: userId,
      summary_json: context,
      last_computed_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  return context;
}
