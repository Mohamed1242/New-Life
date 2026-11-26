# Phase 5 — AI Coach & Smart Notifications Setup

## 1. Backend-Only Secrets (Never put in `.env` for Expo)
Set your OpenAI API key and Cron secret securely in Supabase Edge Function Secrets:

```bash
npx supabase secrets set OPENAI_API_KEY="sk-..."
npx supabase secrets set OPENAI_MODEL="gpt-4o-mini"
npx supabase secrets set OPENAI_WEEKLY_MODEL="gpt-4o"
npx supabase secrets set CRON_SECRET="your-random-32-char-secret"
```

## 2. Supabase Cron Schedule (Every 15 Minutes)
In **Supabase Dashboard → Database → Extensions**, enable `pg_cron` and `pg_net`, then run in **SQL Editor**:

```sql
SELECT cron.schedule(
  'new-life-smart-notifications',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://brmqdylzvloifjomkmcp.supabase.co/functions/v1/smart-notifications-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'your-random-32-char-secret'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## 3. Cost & Safety Controls Included
- `ai_usage_logs` tracks model, token counts, and estimated USD cost per request.
- `ai_response_cache` caches daily and weekly reviews for 6 hours (`TTL`).
- `user_preferences.ai_daily_limit` (default `25/day`) and `max_notifications_per_day` (default `6/day`) enforce strict caps.
- `notification_logs.dedupe_key` prevents duplicate alerts across retries.
- `ai-action-confirm` validates every AI proposal via Zod and verifies `auth.uid()` ownership before updating tasks, habits, or reminders.
