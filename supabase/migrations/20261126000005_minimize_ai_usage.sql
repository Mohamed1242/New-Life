-- ============================================================================
-- Phase 5 Migration 005: Tighten Default AI Daily Quota for Minimal Usage
-- ============================================================================

ALTER TABLE public.user_preferences
  ALTER COLUMN ai_daily_limit SET DEFAULT 8;

UPDATE public.user_preferences
SET ai_daily_limit = 8
WHERE ai_daily_limit = 25;
