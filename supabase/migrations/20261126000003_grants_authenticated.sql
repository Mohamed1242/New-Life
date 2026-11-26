-- ============================================================================
-- Phase 4 Migration 003: Grant Table Privileges to Authenticated Role
-- RLS policies enforce row-level ownership; Postgres still requires explicit
-- schema + table GRANTs for the `authenticated` role on CLI-pushed tables.
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles,
  public.user_preferences,
  public.goals,
  public.tasks,
  public.task_logs,
  public.habits,
  public.habit_logs,
  public.negative_habit_logs,
  public.routines,
  public.routine_logs,
  public.workouts,
  public.exercises,
  public.prayer_logs,
  public.reminders,
  public.device_tokens,
  public.ai_user_context,
  public.ai_interactions,
  public.notification_logs
TO authenticated;
