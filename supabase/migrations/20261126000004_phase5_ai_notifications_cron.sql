-- ============================================================================
-- Phase 5 Migration 004: AI Usage Tracking, Response Cache, Notification Caps
-- ============================================================================

-- 1. Extend user_preferences with notification caps, privacy previews, and AI limits
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_notifications_per_day INTEGER NOT NULL DEFAULT 6 CHECK (max_notifications_per_day BETWEEN 1 AND 20),
  ADD COLUMN IF NOT EXISTS privacy_hide_preview BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_daily_limit INTEGER NOT NULL DEFAULT 25 CHECK (ai_daily_limit BETWEEN 1 AND 200);

-- 2. Deduplication and decision audit fields on notification_logs
ALTER TABLE public.notification_logs
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT,
  ADD COLUMN IF NOT EXISTS decision_reason TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_logs_user_dedupe
  ON public.notification_logs(user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- 3. AI token & cost tracking
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  feature TEXT NOT NULL CHECK (feature IN ('chat', 'daily_review', 'weekly_review', 'event_coach')),
  prompt_tokens INTEGER NOT NULL DEFAULT 0 CHECK (prompt_tokens >= 0),
  completion_tokens INTEGER NOT NULL DEFAULT 0 CHECK (completion_tokens >= 0),
  total_tokens INTEGER NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  cached BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date
  ON public.ai_usage_logs(user_id, created_at DESC);

-- 4. AI response cache (reduces duplicate OpenAI calls for daily/weekly reviews)
CREATE TABLE IF NOT EXISTS public.ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  response_json JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (user_id, cache_key)
);

-- 5. RLS & Table Grants
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_usage_logs_select_own" ON public.ai_usage_logs;
CREATE POLICY "ai_usage_logs_select_own"
  ON public.ai_usage_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_usage_logs_insert_own" ON public.ai_usage_logs;
CREATE POLICY "ai_usage_logs_insert_own"
  ON public.ai_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_response_cache_all_own" ON public.ai_response_cache;
CREATE POLICY "ai_response_cache_all_own"
  ON public.ai_response_cache FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON TABLE public.ai_usage_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_response_cache TO authenticated;
