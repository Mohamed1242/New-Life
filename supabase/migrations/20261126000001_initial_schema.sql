-- ============================================================================
-- Phase 4 Migration 001: Core Relational Schema (Local-First Parity)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Shared trigger function to automatically maintain updated_at on row writes
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 1. profiles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Friend' CHECK (char_length(trim(display_name)) BETWEEN 1 AND 80),
  avatar_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'ar')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 2. user_preferences
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  coaching_tone TEXT NOT NULL DEFAULT 'gentle' CHECK (coaching_tone IN ('gentle', 'direct')),
  selected_goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  theme_preference TEXT NOT NULL DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark', 'system')),
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ar')),
  prayer_auto_mute BOOLEAN NOT NULL DEFAULT true,
  prayer_method TEXT NOT NULL DEFAULT 'MWL',
  asr_school TEXT NOT NULL DEFAULT 'shafi' CHECK (asr_school IN ('shafi', 'hanafi')),
  bedtime TEXT NOT NULL DEFAULT '22:45',
  wake_time TEXT NOT NULL DEFAULT '05:15',
  quiet_hours_start TEXT,
  quiet_hours_end TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 3. goals
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  description TEXT NOT NULL DEFAULT '',
  pillar TEXT NOT NULL DEFAULT 'productivity' CHECK (pillar IN ('spirituality', 'health', 'productivity')),
  target_value NUMERIC NOT NULL DEFAULT 100 CHECK (target_value > 0),
  current_value NUMERIC NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  unit TEXT NOT NULL DEFAULT '%',
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 4. tasks & 5. task_logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  notes TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'custom' CHECK (category IN ('prayer', 'gym', 'health', 'work', 'study', 'custom')),
  time_label TEXT NOT NULL DEFAULT '09:00 AM',
  date_iso DATE NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  repeat_rule TEXT NOT NULL DEFAULT 'once' CHECK (repeat_rule IN ('once', 'daily', 'weekdays', 'weekly', 'custom')),
  custom_days JSONB NOT NULL DEFAULT '[]'::jsonb,
  reminder_enabled BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'not_recorded' CHECK (status IN ('completed', 'skipped', 'missed', 'postponed', 'not_recorded')),
  completed BOOLEAN NOT NULL DEFAULT false,
  postponed_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.task_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_recorded' CHECK (status IN ('completed', 'skipped', 'missed', 'postponed', 'not_recorded')),
  note TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  UNIQUE (task_id, log_date)
);

-- ----------------------------------------------------------------------------
-- 6. habits, 7. habit_logs & 8. negative_habit_logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  polarity TEXT NOT NULL DEFAULT 'positive' CHECK (polarity IN ('positive', 'negative')),
  category TEXT NOT NULL DEFAULT 'health' CHECK (category IN ('prayer', 'gym', 'health', 'work', 'study', 'custom')),
  target_label TEXT NOT NULL DEFAULT 'Daily',
  frequency_type TEXT NOT NULL DEFAULT 'daily' CHECK (frequency_type IN ('daily', 'weekly', 'custom')),
  target_per_week INTEGER NOT NULL DEFAULT 7 CHECK (target_per_week BETWEEN 1 AND 7),
  custom_days JSONB NOT NULL DEFAULT '[0,1,2,3,4,5,6]'::jsonb,
  streak_days INTEGER NOT NULL DEFAULT 0 CHECK (streak_days >= 0),
  best_streak INTEGER NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
  grace_used_this_week BOOLEAN NOT NULL DEFAULT false,
  last_recovery_date DATE,
  weekly_consistency_pct INTEGER NOT NULL DEFAULT 0 CHECK (weekly_consistency_pct BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'skipped', 'missed', 'postponed', 'not_recorded')),
  value NUMERIC NOT NULL DEFAULT 1,
  note TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.negative_habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('urge_resisted', 'occurrence')),
  trigger_tag TEXT,
  mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 5),
  replacement_action TEXT,
  note TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 9. routines (and routine_logs for daily history parity)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 100),
  block_type TEXT NOT NULL CHECK (block_type IN (
    'wake_up', 'morning_routine', 'prayer', 'work_study',
    'meals', 'gym', 'personal', 'evening_routine', 'sleep'
  )),
  pillar TEXT NOT NULL DEFAULT 'productivity' CHECK (pillar IN ('spirituality', 'health', 'productivity')),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  days JSONB NOT NULL DEFAULT '[0,1,2,3,4,5,6]'::jsonb,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.routine_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_recorded' CHECK (status IN ('completed', 'skipped', 'missed', 'postponed', 'not_recorded')),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  UNIQUE (routine_id, log_date)
);

-- ----------------------------------------------------------------------------
-- 10. workouts & 11. exercises
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  workout_type TEXT NOT NULL DEFAULT 'strength' CHECK (workout_type IN ('strength', 'cardio', 'mobility', 'sports')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  duration_min INTEGER NOT NULL DEFAULT 30 CHECK (duration_min >= 0),
  perceived_effort INTEGER CHECK (perceived_effort BETWEEN 1 AND 10),
  calories_est INTEGER CHECK (calories_est >= 0),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL CHECK (char_length(trim(exercise_name)) BETWEEN 1 AND 120),
  set_order INTEGER NOT NULL DEFAULT 1 CHECK (set_order >= 1),
  reps INTEGER CHECK (reps >= 0),
  weight_kg NUMERIC CHECK (weight_kg >= 0),
  duration_sec INTEGER CHECK (duration_sec >= 0),
  distance_m NUMERIC CHECK (distance_m >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 12. prayer_logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prayer_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prayer_date DATE NOT NULL,
  prayer_name TEXT NOT NULL CHECK (prayer_name IN ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha')),
  status TEXT NOT NULL DEFAULT 'not_recorded' CHECK (status IN ('on_time', 'delayed', 'missed', 'qada', 'not_recorded')),
  auto_muted_triggered BOOLEAN NOT NULL DEFAULT false,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  UNIQUE (user_id, prayer_date, prayer_name)
);

-- ----------------------------------------------------------------------------
-- 13. reminders, 14. device_tokens, 17. notification_logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'habit', 'routine', 'prayer', 'custom_alarm')),
  entity_id UUID,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  trigger_time TEXT NOT NULL,
  repeat_rule TEXT NOT NULL DEFAULT 'daily',
  is_alarm BOOLEAN NOT NULL DEFAULT false,
  sound_key TEXT NOT NULL DEFAULT 'gentle_chime',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ,
  UNIQUE (user_id, expo_push_token)
);

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_id UUID REFERENCES public.reminders(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'local' CHECK (channel IN ('local', 'push')),
  title TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'scheduled' CHECK (delivery_status IN ('scheduled', 'sent', 'opened', 'dismissed', 'failed')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 15. ai_user_context & 16. ai_interactions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_user_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  pillar_snapshot JSONB NOT NULL DEFAULT '{"spirituality":0,"health":0,"productivity":0}'::jsonb,
  active_focus_notes TEXT NOT NULL DEFAULT '',
  last_computed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  suggested_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_status TEXT NOT NULL DEFAULT 'none' CHECK (action_status IN ('none', 'pending', 'accepted', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  deleted_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- Indexes for fast delta sync & user-scoped queries
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_goals_user_updated ON public.goals(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON public.tasks(user_id, date_iso);
CREATE INDEX IF NOT EXISTS idx_tasks_user_updated ON public.tasks(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_task_logs_user_date ON public.task_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_habits_user_updated ON public.habits(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_neg_habit_logs_user_date ON public.negative_habit_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_routines_user_updated ON public.routines(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_routine_logs_user_date ON public.routine_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_workouts_user_started ON public.workouts(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercises_workout ON public.exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_prayer_logs_user_date ON public.prayer_logs(user_id, prayer_date);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_conv ON public.ai_interactions(user_id, conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON public.notification_logs(user_id, sent_at DESC);

-- ----------------------------------------------------------------------------
-- updated_at Triggers across all tables
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles', 'user_preferences', 'goals', 'tasks', 'task_logs',
    'habits', 'habit_logs', 'negative_habit_logs', 'routines', 'routine_logs',
    'workouts', 'exercises', 'prayer_logs', 'reminders', 'device_tokens',
    'ai_user_context', 'ai_interactions', 'notification_logs'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- Auto-bootstrap profile, preferences, and AI context on new auth.users signup
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), ''), 'Friend')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.ai_user_context (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
