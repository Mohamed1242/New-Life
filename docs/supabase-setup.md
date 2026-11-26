# Supabase Backend & Cloud Sync Setup Guide

This guide explains how to connect **New Life** to a production Supabase project after reviewing and approving the schema and RLS migrations.

---

## 1. Prerequisites
- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase` or run via `npx supabase`)
- An existing Supabase project (`https://supabase.com/dashboard`)

---

## 2. Environment Configuration
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in your project's public values (never put `SUPABASE_SERVICE_ROLE_KEY` in `.env` for Expo):
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
   ```

---

## 3. Link & Review Migrations (Before Applying to Production)
```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db diff --linked
```

Apply the versioned SQL migrations once reviewed and approved:
```bash
npx supabase db push --remote
```

Migration files included:
- `supabase/migrations/20261126000001_initial_schema.sql`: 18 relational tables (`profiles`, `user_preferences`, `goals`, `tasks`, `task_logs`, `habits`, `habit_logs`, `negative_habit_logs`, `routines`, `routine_logs`, `workouts`, `exercises`, `prayer_logs`, `reminders`, `device_tokens`, `ai_user_context`, `ai_interactions`, `notification_logs`), indexes, `updated_at` triggers, and new-user bootstrap trigger.
- `supabase/migrations/20261126000002_rls_policies.sql`: Strict Row Level Security policies enforcing `auth.uid() = user_id` (and parent ownership checks on child log tables).

---

## 4. Deploy Edge Functions
Deploy the three JWT-verified Edge Functions:
```bash
npx supabase functions deploy sync-push
npx supabase functions deploy sync-pull
npx supabase functions deploy ai-context-refresh
```

All three functions verify the caller's JWT via `supabase.auth.getUser()`, run under the user's RLS context (never bypassing RLS with service role credentials), and validate incoming JSON with Zod.

---

## 5. Offline-First Sync Flow
1. All local reads and writes execute immediately against SQLite (`expo-sqlite`) on iOS/Android or `localStorage` on Web.
2. Mutations are recorded in `sync_queue` with `client_updated_at`.
3. `syncEngine.runSync()` runs on sign-in, network reconnection (`NetInfo`), app foregrounding, or manual **Sync Now** in **Settings -> Cloud Backup & Sync**.
4. Conflicts use **Last-Write-Wins** (`updated_at` comparison) and preserve soft deletes (`deleted_at`).
