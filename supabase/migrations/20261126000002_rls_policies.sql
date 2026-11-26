-- ============================================================================
-- Phase 4 Migration 002: Strict Row Level Security (RLS) Policies
-- ============================================================================

-- 1. profiles (owner column is `id`, matching auth.uid())
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. All user_id-scoped tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'user_preferences', 'goals', 'tasks', 'task_logs',
    'habits', 'habit_logs', 'negative_habit_logs', 'routines', 'routine_logs',
    'workouts', 'exercises', 'prayer_logs', 'reminders', 'device_tokens',
    'ai_user_context', 'ai_interactions', 'notification_logs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

    EXECUTE format('DROP POLICY IF EXISTS "%I_select_own" ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "%I_select_own" ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id);',
      tbl, tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS "%I_insert_own" ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "%I_insert_own" ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);',
      tbl, tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS "%I_update_own" ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "%I_update_own" ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);',
      tbl, tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS "%I_delete_own" ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "%I_delete_own" ON public.%I FOR DELETE TO authenticated USING (auth.uid() = user_id);',
      tbl, tbl
    );
  END LOOP;
END $$;

-- 3. Additional relational integrity: ensure child rows only reference parent rows owned by auth.uid()
DROP POLICY IF EXISTS "task_logs_insert_own" ON public.task_logs;
CREATE POLICY "task_logs_insert_own"
  ON public.task_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "habit_logs_insert_own" ON public.habit_logs;
CREATE POLICY "habit_logs_insert_own"
  ON public.habit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.habits h
      WHERE h.id = habit_id AND h.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "negative_habit_logs_insert_own" ON public.negative_habit_logs;
CREATE POLICY "negative_habit_logs_insert_own"
  ON public.negative_habit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.habits h
      WHERE h.id = habit_id AND h.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "exercises_insert_own" ON public.exercises;
CREATE POLICY "exercises_insert_own"
  ON public.exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_id AND w.user_id = auth.uid()
    )
  );
