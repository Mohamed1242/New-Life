export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          timezone: string;
          locale: "en" | "ar";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          display_name?: string;
          avatar_url?: string | null;
          timezone?: string;
          locale?: "en" | "ar";
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          onboarding_completed: boolean;
          coaching_tone: "gentle" | "direct";
          selected_goals: string[];
          theme_preference: "light" | "dark" | "system";
          language: "en" | "ar";
          prayer_auto_mute: boolean;
          prayer_method: string;
          asr_school: "shafi" | "hanafi";
          bedtime: string;
          wake_time: string;
          quiet_hours_start: string | null;
          quiet_hours_end: string | null;
          notifications_enabled: boolean;
          max_notifications_per_day: number;
          privacy_hide_preview: boolean;
          ai_enabled: boolean;
          ai_daily_limit: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          onboarding_completed?: boolean;
          coaching_tone?: "gentle" | "direct";
          selected_goals?: string[];
          theme_preference?: "light" | "dark" | "system";
          language?: "en" | "ar";
          prayer_auto_mute?: boolean;
          prayer_method?: string;
          asr_school?: "shafi" | "hanafi";
          bedtime?: string;
          wake_time?: string;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          notifications_enabled?: boolean;
          max_notifications_per_day?: number;
          privacy_hide_preview?: boolean;
          ai_enabled?: boolean;
          ai_daily_limit?: number;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["user_preferences"]["Insert"]>;
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          pillar: "spirituality" | "health" | "productivity";
          target_value: number;
          current_value: number;
          unit: string;
          target_date: string | null;
          status: "active" | "achieved" | "paused";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string;
          pillar?: "spirituality" | "health" | "productivity";
          target_value?: number;
          current_value?: number;
          unit?: string;
          target_date?: string | null;
          status?: "active" | "achieved" | "paused";
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["goals"]["Insert"]>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          goal_id: string | null;
          title: string;
          notes: string;
          category: "prayer" | "gym" | "health" | "work" | "study" | "custom";
          time_label: string;
          date_iso: string;
          priority: "low" | "medium" | "high";
          repeat_rule: "once" | "daily" | "weekdays" | "weekly" | "custom";
          custom_days: number[];
          reminder_enabled: boolean;
          status: "completed" | "skipped" | "missed" | "postponed" | "not_recorded";
          completed: boolean;
          postponed_to: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal_id?: string | null;
          title: string;
          notes?: string;
          category?: "prayer" | "gym" | "health" | "work" | "study" | "custom";
          time_label?: string;
          date_iso: string;
          priority?: "low" | "medium" | "high";
          repeat_rule?: "once" | "daily" | "weekdays" | "weekly" | "custom";
          custom_days?: number[];
          reminder_enabled?: boolean;
          status?: "completed" | "skipped" | "missed" | "postponed" | "not_recorded";
          completed?: boolean;
          postponed_to?: string | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
        Relationships: [];
      };
      task_logs: {
        Row: {
          id: string;
          user_id: string;
          task_id: string;
          log_date: string;
          status: "completed" | "skipped" | "missed" | "postponed" | "not_recorded";
          note: string | null;
          logged_at: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id: string;
          log_date: string;
          status?: "completed" | "skipped" | "missed" | "postponed" | "not_recorded";
          note?: string | null;
          logged_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["task_logs"]["Insert"]>;
        Relationships: [];
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          goal_id: string | null;
          title: string;
          polarity: "positive" | "negative";
          category: "prayer" | "gym" | "health" | "work" | "study" | "custom";
          target_label: string;
          frequency_type: "daily" | "weekly" | "custom";
          target_per_week: number;
          custom_days: number[];
          streak_days: number;
          best_streak: number;
          grace_used_this_week: boolean;
          last_recovery_date: string | null;
          weekly_consistency_pct: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal_id?: string | null;
          title: string;
          polarity?: "positive" | "negative";
          category?: "prayer" | "gym" | "health" | "work" | "study" | "custom";
          target_label?: string;
          frequency_type?: "daily" | "weekly" | "custom";
          target_per_week?: number;
          custom_days?: number[];
          streak_days?: number;
          best_streak?: number;
          grace_used_this_week?: boolean;
          last_recovery_date?: string | null;
          weekly_consistency_pct?: number;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["habits"]["Insert"]>;
        Relationships: [];
      };
      habit_logs: {
        Row: {
          id: string;
          user_id: string;
          habit_id: string;
          log_date: string;
          status: "completed" | "skipped" | "missed" | "postponed" | "not_recorded";
          value: number;
          note: string | null;
          logged_at: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          habit_id: string;
          log_date: string;
          status: "completed" | "skipped" | "missed" | "postponed" | "not_recorded";
          value?: number;
          note?: string | null;
          logged_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["habit_logs"]["Insert"]>;
        Relationships: [];
      };
      negative_habit_logs: {
        Row: {
          id: string;
          user_id: string;
          habit_id: string;
          log_date: string;
          event_type: "urge_resisted" | "occurrence";
          trigger_tag: string | null;
          mood_score: number | null;
          replacement_action: string | null;
          note: string | null;
          occurred_at: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          habit_id: string;
          log_date: string;
          event_type: "urge_resisted" | "occurrence";
          trigger_tag?: string | null;
          mood_score?: number | null;
          replacement_action?: string | null;
          note?: string | null;
          occurred_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["negative_habit_logs"]["Insert"]>;
        Relationships: [];
      };
      routines: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          block_type:
            | "wake_up"
            | "morning_routine"
            | "prayer"
            | "work_study"
            | "meals"
            | "gym"
            | "personal"
            | "evening_routine"
            | "sleep";
          pillar: "spirituality" | "health" | "productivity";
          start_time: string;
          end_time: string;
          days: number[];
          is_enabled: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          block_type: Database["public"]["Tables"]["routines"]["Row"]["block_type"];
          pillar?: "spirituality" | "health" | "productivity";
          start_time: string;
          end_time: string;
          days?: number[];
          is_enabled?: boolean;
          sort_order?: number;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["routines"]["Insert"]>;
        Relationships: [];
      };
      routine_logs: {
        Row: {
          id: string;
          user_id: string;
          routine_id: string;
          log_date: string;
          status: "completed" | "skipped" | "missed" | "postponed" | "not_recorded";
          logged_at: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          routine_id: string;
          log_date: string;
          status?: "completed" | "skipped" | "missed" | "postponed" | "not_recorded";
          logged_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["routine_logs"]["Insert"]>;
        Relationships: [];
      };
      workouts: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          workout_type: "strength" | "cardio" | "mobility" | "sports";
          started_at: string;
          duration_min: number;
          perceived_effort: number | null;
          calories_est: number | null;
          notes: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          workout_type?: "strength" | "cardio" | "mobility" | "sports";
          started_at?: string;
          duration_min?: number;
          perceived_effort?: number | null;
          calories_est?: number | null;
          notes?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["workouts"]["Insert"]>;
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          user_id: string;
          workout_id: string;
          exercise_name: string;
          set_order: number;
          reps: number | null;
          weight_kg: number | null;
          duration_sec: number | null;
          distance_m: number | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          workout_id: string;
          exercise_name: string;
          set_order?: number;
          reps?: number | null;
          weight_kg?: number | null;
          duration_sec?: number | null;
          distance_m?: number | null;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["exercises"]["Insert"]>;
        Relationships: [];
      };
      prayer_logs: {
        Row: {
          id: string;
          user_id: string;
          prayer_date: string;
          prayer_name: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
          status: "on_time" | "delayed" | "missed" | "qada" | "not_recorded";
          auto_muted_triggered: boolean;
          logged_at: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          prayer_date: string;
          prayer_name: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
          status?: "on_time" | "delayed" | "missed" | "qada" | "not_recorded";
          auto_muted_triggered?: boolean;
          logged_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["prayer_logs"]["Insert"]>;
        Relationships: [];
      };
      reminders: {
        Row: {
          id: string;
          user_id: string;
          entity_type: "task" | "habit" | "routine" | "prayer" | "custom_alarm";
          entity_id: string | null;
          title: string;
          trigger_time: string;
          repeat_rule: string;
          is_alarm: boolean;
          sound_key: string;
          is_enabled: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          entity_type: "task" | "habit" | "routine" | "prayer" | "custom_alarm";
          entity_id?: string | null;
          title: string;
          trigger_time: string;
          repeat_rule?: string;
          is_alarm?: boolean;
          sound_key?: string;
          is_enabled?: boolean;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["reminders"]["Insert"]>;
        Relationships: [];
      };
      device_tokens: {
        Row: {
          id: string;
          user_id: string;
          expo_push_token: string;
          platform: "ios" | "android" | "web";
          device_name: string | null;
          is_active: boolean;
          last_seen_at: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          expo_push_token: string;
          platform: "ios" | "android" | "web";
          device_name?: string | null;
          is_active?: boolean;
          last_seen_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["device_tokens"]["Insert"]>;
        Relationships: [];
      };
      ai_user_context: {
        Row: {
          id: string;
          user_id: string;
          summary_json: Json;
          pillar_snapshot: Json;
          active_focus_notes: string;
          last_computed_at: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          summary_json?: Json;
          pillar_snapshot?: Json;
          active_focus_notes?: string;
          last_computed_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["ai_user_context"]["Insert"]>;
        Relationships: [];
      };
      ai_interactions: {
        Row: {
          id: string;
          user_id: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          suggested_actions: Json;
          action_status: "none" | "pending" | "accepted" | "dismissed";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          suggested_actions?: Json;
          action_status?: "none" | "pending" | "accepted" | "dismissed";
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["ai_interactions"]["Insert"]>;
        Relationships: [];
      };
      notification_logs: {
        Row: {
          id: string;
          user_id: string;
          reminder_id: string | null;
          channel: "local" | "push";
          title: string;
          delivery_status: "scheduled" | "sent" | "opened" | "dismissed" | "failed";
          sent_at: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          reminder_id?: string | null;
          channel?: "local" | "push";
          title: string;
          delivery_status?: "scheduled" | "sent" | "opened" | "dismissed" | "failed";
          sent_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["notification_logs"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
