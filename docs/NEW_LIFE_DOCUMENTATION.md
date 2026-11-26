# New Life — Complete Project Documentation

**Project:** New Life (Personal Life Improvement Assistant)  
**Version:** 1.0.0 (`Expo SDK 57`, React Native `0.86.3`, TypeScript)  
**Last Updated:** 2026-11-26  

---

## Table of Contents

1. [Features & User Guide](#1-features--user-guide)
2. [Technical Architecture](#2-technical-architecture)
3. [Supabase Backend, AI Coach & Notifications Setup](#3-supabase-backend-ai-coach--notifications-setup)
4. [Prayer System, Alarms & Audio Focus](#4-prayer-system-alarms--audio-focus)
5. [Project Audit Summary](#5-project-audit-summary)
6. [Testing Report & Verification Results](#6-testing-report--verification-results)
7. [Manual Setup, Deployment & APK Build Guide](#7-manual-setup-deployment--apk-build-guide)
8. [Release Checklist & Remaining Risks](#8-release-checklist--remaining-risks)
9. [Known Limitations & Platform Restrictions](#9-known-limitations--platform-restrictions)
10. [Privacy Policy Summary](#10-privacy-policy-summary)

---

## 1. Features & User Guide

Welcome to **New Life**, an offline-first personal companion for daily tasks, positive/negative habits, routines, workouts, prayer tracking, wake-up alarms, insights, and optional AI coaching.

### 1.1 Getting Started & Onboarding
- Launches automatically on first open (replay anytime via **Profile → Privacy & Data → Replay Onboarding**).
- Configure your display name, focus goals, and coaching tone (`Gentle` or `Direct`).
- Works 100% offline with zero account required.

### 1.2 Home Dashboard (`Home` Tab)
- Displays your daily task completion progress ring, 5-day date strip, live **Next Prayer** banner (`Prayers` & `Focus` shortcut), upcoming daily routine block, quick actions strip (**Prayers**, **Workout**, **Alarms**), and today's top tasks & habits.
- Unrecorded tasks remain neutral and never penalize your score as missed.

### 1.3 Lifestyle Hub (`Tasks` Tab)
Switch between four focused segments:
- **Tasks:** Create one-time or repeating tasks (`Once`, `Daily`, `Weekdays`, `Weekly`, `Custom Days`) with priority, category filter chips, reminders, and non-punitive statuses (`Completed`, `Postpone`, `Skip`, `Missed`, `Clear`).
- **Habits:**
  - **Positive Habits:** Daily or weekly targets (`target_per_week`), streak tracking, and a **Weekly Recovery Pass** in Habit Detail so one busy day does not erase progress.
  - **Habits to Reduce:** Tap **Log Urge** when pausing an urge, log trigger tags (`Stress`, `Boredom`, `Fatigue`, `Social`, `Late Night`), or record occurrences honestly without shame.
- **Routine:** Customize time blocks from morning wake-up (`05:10`) to restful sleep (`22:45`) and mark blocks complete.
- **Workouts:** Log **Strength**, **Cardio**, **Mobility**, or **Sports** sessions with duration (`20m`–`60m`), perceived effort (`RPE 4–9`), estimated calories, and individual exercise rows (name, reps, weight kg).

### 1.4 Prayer Times, Tracking & Focus Mode
- **Access:** Home **Next Prayer** card or **Profile → Prayer Times & Tracker** / **Prayer Settings**.
- **Offline Calculation:** Computes Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha, and Qibla bearing completely offline via `adhan`. Defaults to **Egyptian General Authority of Survey** (`19.5° / 17.5°`) plus 11 other methods and Shafi/Hanafi Asr schools.
- **Location:** Supports device GPS (`expo-location`) or 12 curated offline city presets (Cairo, Alexandria, Giza, Makkah, Madinah, Riyadh, Dubai, Doha, Amman, Istanbul, London, New York).
- **Tracking:** Record prayers as `On Time`, `Delayed`, `Qada`, `Missed`, or `Clear`. Unrecorded prayer slots remain `not_recorded` and are never assumed missed.
- **Prayer Focus Mode:** Full-screen distraction-free timer with platform-appropriate audio behavior (see Section 4).

### 1.5 Wake-Up Alarms
- **Access:** Home quick chip / clock icon or **Profile → Wake-Up Alarms**.
- Schedule one-time or repeating weekday alarms with 4 bundled offline sounds (`Gentle Dawn`, `Soft Breeze`, `Amber Bell`, `Fajr Reflection`), vibration, and `5`, `10`, or `15` min snooze.
- Full-screen ringing modal (**Snooze** & **Dismiss**) displays whether the alarm ran via **`System AlarmManager`** or **`Scheduled Notification`**.

### 1.6 Insights, Analytics & Weekly Reflection (`Insights` Tab)
- Switch across **This Week (7d)**, **30 Days**, and **90 Days (12 weekly buckets)**.
- Tap **How calculated?** to inspect the exact transparent formulas used for daily scores, weekly/monthly averages, Prayer 7d %, Positive vs Negative habit deltas, and Life Balance pillars.
- Includes **Weekly Report**, **Personalized Milestones**, **Weekly Reflection** (`Calm`, `Balanced`, `Stretched` mood + win & adjustment), and optional **Weekly Challenges**.

### 1.7 AI Lifestyle Coach (`Assistant` Tab) & Notification Controls
- Works offline with local schedule check-ins; signing in via **Profile → Cloud Backup & Sync** unlocks cloud AI reviews (`Daily Review`, `Weekly Report`, and Q&A) with daily limits (`25/day`) and user-confirmed suggested actions.
- Configure quiet hours (`22:30 – 05:30`), daily notification cap (`3`, `6`, or `10`), and lock-screen preview hiding in **Profile → Notifications & Alarms**.

---

## 2. Technical Architecture

### 2.1 Technology Stack
- **Mobile & Web Framework:** Expo SDK 57 (`~57.0.25`), React `19.2.3`, React Native `0.86.3`, `expo-router` (`typedRoutes: true`, `reactCompiler: true`).
- **Language:** Strict TypeScript (`tsconfig.json` `strict: true`).
- **State & Caching:** Zustand (`useCompanionStore`, `useAuthStore`) + TanStack React Query (`@tanstack/react-query`, 5-minute `staleTime`).
- **Local Persistence:** `expo-sqlite` (native iOS/Android) with transactional versioned migrations (`v1`–`v6`) + `.web.ts` `localStorage` adapters for browser/web parity.
- **Cloud Backend:** Supabase (`brmqdylzvloifjomkmcp`) — Auth, PostgreSQL with Row Level Security (`auth.uid() = user_id`), and Deno Edge Functions.
- **AI Integration:** Google Gemini (`gemini-flash-lite-latest` via `GEMINI_API_KEY` server secret) with OpenAI fallback (`OPENAI_API_KEY`), `ai_response_cache`, `ai_usage_logs`, and Zod action validation (`actionValidator.ts`).
- **Native Bridges:** Local Expo modules `modules/prayer-audio-focus` and `modules/wake-alarm`.

### 2.2 Folder Structure
- `src/app/` — Thin Expo Router routes (`index.tsx`, `onboarding.tsx`, `(tabs)/*`, `(modals)/*`), wrapped in `AppErrorBoundary`.
- `src/components/` — Reusable UI & error boundary components (`GlassCard`, `Button`, `SegmentedControl`, `FloatingTabBar`, `StatePlaceholder`, `AppErrorBoundary`).
- `src/core/` — SQLite client & migrations (`src/core/db/`), Supabase client (`src/core/supabase/`), offline sync queue & engine (`src/core/sync/`), date utilities (`src/core/utils/`).
- `src/modules/` — Feature modules (`alarms`, `assistant`, `auth`, `home`, `insights`, `notifications`, `onboarding`, `prayer`, `profile`, `routine`, `tasks`, `workouts`).
- `src/shared/` — Domain logger, `errorMonitor` diagnostics, Toast & Dialog providers.
- `modules/` — Local Kotlin/Swift Expo modules (`prayer-audio-focus`, `wake-alarm`).
- `supabase/` — SQL migrations (`20261126000001`–`005`) and 6 Edge Functions (`sync-push`, `sync-pull`, `ai-context-refresh`, `ai-coach`, `ai-action-confirm`, `smart-notifications-cron`) + `_shared/`.
- `tests/` — Automated Node v24 test suite (`*.test.ts` + ESM alias loader).

### 2.3 SQLite Schema Versions (`src/core/db/migrations.ts`)
- **v1:** `user_preferences`, `categories`, `tasks`, `habits`, `habit_logs`, `daily_lifestyle_scores`.
- **v2:** Task/habit status & recovery columns + `task_logs`, `routine_blocks`, `routine_logs`, `challenges`.
- **v3:** `sync_queue`, `sync_metadata`.
- **v4:** `prayer_settings`, `prayer_logs`, `alarms`.
- **v5:** Composite query indexes (`idx_task_logs_date_task`, `idx_habit_logs_date_habit`, `idx_routine_logs_date_routine`, `idx_prayer_logs_status_date`) + `weekly_reflections`.
- **v6:** `workouts`, `exercises` + indexes.

### 2.4 Offline-First Sync & Conflict Resolution
1. Reads/writes run instantaneously against local SQLite (native) or `localStorage` (web).
2. Mutations enqueue into `sync_queue` (`upsert` / `delete`) with `client_updated_at`.
3. `syncEngine.runSync()` uses a single-flight mutex + 60-second cooldown on sign-in, `NetInfo` reconnect, foreground resume, and manual **Sync Now**.
4. `sync-push` enforces JWT ownership (`user_id: user.id`) and applies **Last-Write-Wins** (`updated_at` timestamp comparison). Newer server rows are returned as conflicts and merged locally without deleting soft-delete tombstones (`deleted_at`).

---

## 3. Supabase Backend, AI Coach & Notifications Setup

### 3.1 Applied Database Migrations
- `20261126000001_initial_schema.sql`: Core relational schema (`profiles`, `user_preferences`, `goals`, `tasks`, `task_logs`, `habits`, `habit_logs`, `negative_habit_logs`, `routines`, `routine_logs`, `workouts`, `exercises`, `prayer_logs`, `reminders`, `device_tokens`, `ai_user_context`, `ai_interactions`, `notification_logs`), triggers, and new-user bootstrap trigger.
- `20261126000002_rls_policies.sql`: Strict RLS (`auth.uid() = user_id`) + parent ownership validation on child log tables.
- `20261126000003_grants_authenticated.sql`: Table grants for authenticated users.
- `20261126000004_phase5_ai_notifications_cron.sql`: AI usage tracking (`ai_usage_logs`) and prompt response cache (`ai_response_cache`).
- `20261126000005_minimize_ai_usage.sql`: Tuned rate limits (`ai_daily_limit = 25` default).

### 3.2 Server-Side AI Cost & Safety Controls
- **Provider Keys Strictly Server-Side:** `GEMINI_API_KEY` (and optional `OPENAI_API_KEY`) live only in Supabase Edge Function Secrets—never in `.env` (`EXPO_PUBLIC_*`) or client code.
- **Token & Budget Controls:** Deterministic zero-token rules answer simple prayer/empty-day intents; `ai_response_cache` caches responses (daily/weekly reviews up to 24h); `ai_usage_logs` enforces daily limits (`ai_daily_limit`).
- **Action Safety:** `actionValidator.ts` validates every AI proposal via Zod (`create_reminder`, `reschedule_task`, `adjust_habit_target`, `open_prayer_focus`), and `ai-action-confirm` enforces `auth.uid() = user_id` before any mutation.
- **Notifications Engine:** `smart-notifications-cron` checks user timezone quiet hours, daily notification cap (`max_notifications_per_day`), lock-screen preview privacy (`privacy_hide_preview`), and `dedupe_key` before posting to `https://exp.host/--/api/v2/push/send`.

### 3.3 Cron Automation Setup (Optional Background Smart Push)
Enable `pg_cron` and `pg_net` in **Supabase Dashboard → Database → Extensions**, set `CRON_SECRET`, and run in SQL Editor:
```sql
SELECT cron.schedule(
  'new-life-smart-notifications',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://brmqdylzvloifjomkmcp.supabase.co/functions/v1/smart-notifications-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_CRON_SECRET'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

## 4. Prayer System, Alarms & Audio Focus

- **Rolling Prayer Notification Horizon:** `prayerScheduler.ts` schedules Adhan + advance alerts (`0`, `5`, `10`, `15` min prior) over a **3-day rolling horizon** (at most 30 notifications) to stay safely under iOS's **64 pending notification limit**. Foreground resume detects timezone shifts and refreshes schedules automatically.
- **Audio Focus (`modules/prayer-audio-focus`):**
  - **Android Native Build:** Requests `AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK` on active Prayer Focus (`USAGE_ASSISTANCE_ACCESSIBILITY`) and calls `abandonAudioFocusRequest` on exit. Compliant media players lower volume gently while focus runs.
  - **iOS / Expo Go / Web:** Explicitly reports `{ supported: false }` because Apple restricts third-party apps from altering external apps' audio.
- **Wake-Up Alarms (`modules/wake-alarm`):**

| Mode | Android Native Build (`SCHEDULE_EXACT_ALARM` granted) | iOS / Expo Go / Web / Permission Denied |
|---|---|---|
| Engine | `AlarmManager.setAlarmClock` | `expo-notifications` scheduled notification |
| UI Badge | `System AlarmManager` (`system_alarm`) | `Scheduled Notification` (`scheduled_notification`) |
| Reboot Recovery | Persisted in `SharedPreferences`; `BootReceiver` handles `BOOT_COMPLETED`, `TIME_SET`, `TIMEZONE_CHANGED` | Pending OS notifications survive reboot; recurring alarms refresh next match on foreground open |
| Audio & Actions | Bundled offline `.wav` chimes (`expo-audio`), vibration, Snooze (`5/10/15m`), Dismiss | Same `AlarmRingScreen` modal; respects iOS silent switch unless Critical Alerts entitlement is granted |

---

## 5. Project Audit Summary

Key findings uncovered and resolved during final project review:
1. **Fixed Broken Horizontal Category Strip (`TasksAndHabitsScreen.tsx`):** `<ScrollView horizontal>` inside a `flexGrow: 1` parent expanded ~400px vertically when filtered lists were short; resolved with `style={{ flexGrow: 0, flexShrink: 0 }}` and fixed `34px` pill heights.
2. **Fixed Broken Push URL (`smart-notifications-cron/index.ts`):** Corrected `https://exp.push.notification/api/v2/push/send` to `https://exp.host/--/api/v2/push/send`.
3. **Fixed Truncated AI JSON Bubbles (`openai.ts`, `useAssistant.ts`):** Increased `maxOutputTokens` from `280` to `650` and added nested-JSON cleanup client & server-side.
4. **Built Missing Client Workouts Module (`src/modules/workouts/`):** Closed the gap where `workouts` / `exercises` existed in Supabase schema without local SQLite or mobile UI.
5. **Fixed Home Layout & Card Density (`HomeScreen.tsx`, `GlassCard.tsx`):** Eliminated FAB overlap over Routine cards, fixed prayer AM/PM line wraps, capitalized greetings, and separated crisp solid surfaces from selective glass hero cards.

---

## 6. Testing Report & Verification Results

Latest full run (`cmd /c "npm test && npm run typecheck && npm run lint && npx expo export --platform web"`): **Exit Code `0`**.

### 6.1 Automated Test Suite (`npm test` — 16 / 16 Passing, 0 Failures)
- **`tests/prayer.test.ts` (4 tests):** Cairo Egyptian General Authority of Survey schedule & Qibla (`~136°`), Egyptian vs MWL Fajr difference, Shafi vs Hanafi Asr delta, post-Isha next-day Fajr rollover, travel timezones (`Europe/London`), and non-punitive `not_recorded` consistency math.
- **`tests/analytics.test.ts` (3 tests):** Task recurrence matching (`weekdays`, `once`, `postponedTo`), habit streak + weekly recovery grace pass math, and 30-day analytics + negative habit reduction % + goal completion.
- **`tests/alarms.test.ts` (3 tests):** Upcoming same-day trigger, weekday rollover, active snooze precedence, clock & day formatting, and sound resolution.
- **`tests/securitySyncAi.test.ts` (3 tests):** Verifies RLS SQL coverage across user tables, scans `src/**/*.ts(x)` for zero secret/API key leaks, validates AI suggested-action Zod bounds, and asserts LWW `updated_at` conflict check & `user_id` ownership in `sync-push`.
- **`tests/workoutsAndAssistant.test.ts` (3 tests):** Verifies workout calorie rates, AI reply JSON sanitizer on fenced/truncated strings, valid `exp.host/--/api/v2/push/send` endpoint, and Gemini `maxOutputTokens >= 650`.

### 6.2 Typecheck, Lint & Bundle Verification
- `npm run typecheck` (`tsc --noEmit`): **0 errors**.
- `npm run lint` (`expo lint` with React Compiler rules): **0 errors, 0 warnings**.
- `npx expo export --platform web`: Bundled **3,776 modules**, fonts, 4 `.wav` sounds, icons, and web entrypoint cleanly.

### 6.3 Journeys Requiring Manual Physical-Device Verification
Cannot be executed headlessly and **must be tested once an APK/IPA is installed**:
1. Account sign-up, verification email, login, and multi-device token registration.
2. Offline SQLite creation (task, workout, habit, prayer) -> Wi-Fi restore -> Supabase sync verification.
3. Two-device LWW conflict resolution test.
4. Background / killed-app local Adhan notifications & remote Expo Push notifications.
5. Android `SCHEDULE_EXACT_ALARM` permission grant, system alarm trigger, and phone reboot persistence (`BootReceiver`).
6. Android native `AudioManager` media ducking during Prayer Focus Mode (e.g., with Spotify/YouTube playing).
7. Location permission denial recovery back to manual city presets.

---

## 7. Manual Setup, Deployment & APK Build Guide

### Already Completed
- Supabase schema migrations (`000001`–`000005`) pushed to linked project `brmqdylzvloifjomkmcp`.
- Edge Function secrets (`GEMINI_API_KEY`, `GEMINI_MODEL`, `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc.) configured on Supabase.
- Initial Edge Functions deployed; `.env`, icons, splash assets, and `eas.json` configured; EAS CLI authenticated (`mohamed.gostack`).

### Pending Manual Actions (When You Are Ready)
1. **Redeploy the 2 Updated Edge Functions:**
   ```bash
   npx supabase functions deploy ai-coach
   npx supabase functions deploy smart-notifications-cron --no-verify-jwt
   ```
2. **Optional Hourly Push Cron:** Set `CRON_SECRET` in Supabase Dashboard → Edge Functions → Secrets and run the `pg_cron` SQL snippet from Section 3.3.
3. **Android Push Credentials (FCM v1):** Upload your Firebase service account JSON in **Expo Dashboard (`expo.dev`) → Credentials → Android → Push Notifications (FCM V1)** for standalone APK remote push delivery.
4. **Link EAS Project & Build Directly Installable Android APK:**
   ```bash
   npx eas init
   npx eas build --platform android --profile preview
   ```
   - `preview` in `eas.json` produces an internally distributable **`.apk`** (for direct Android phone install).
   - Once finished, Expo outputs a direct `.apk` download link / QR code to open on Android (enable *Install unknown apps* if prompted).
   - For Google Play / App Store store releases, run `npx eas build --platform android --profile production` (generates `.aab`) or `--platform ios --profile production`.

---

## 8. Release Checklist & Remaining Risks

### Checklist
- [x] SQLite migrations `v1`–`v6` with composite history indexes + `.web.ts` parity
- [x] `AppErrorBoundary` + sanitized `errorMonitor` diagnostics
- [x] Strict Supabase RLS (`auth.uid() = user_id`) & zero client-bundled secrets
- [x] App icon, adaptive icon, splash icon, favicon generated in `assets/images/`
- [x] Android & iOS permissions declared in `app.json`; `eas.json` configured
- [x] `npm test` (16/16), `tsc --noEmit` (0), `expo lint` (0), and web export passing
- [ ] Deploy updated `ai-coach` & `smart-notifications-cron` functions
- [ ] Run `eas init` + `eas build --platform android --profile preview` and test on physical device

### Remaining Technical Risks
1. **Native Module Binary Compilation:** `modules/prayer-audio-focus` and `modules/wake-alarm` Kotlin/Swift files have been validated at the JS/TS bridge level, not yet compiled through Gradle/Xcode via `eas build`.
2. **Android 14+ Exact Alarm UX:** Users must explicitly grant *Alarms & Reminders* for `AlarmManager` mode; otherwise the app safely falls back to notification scheduling.
3. **Gemini Free-Tier Quotas:** Under heavy concurrent spikes, free-tier rate limits fall back cleanly to deterministic local coaching (`local-coach-fallback`).

---

## 9. Known Limitations & Platform Restrictions

1. **iOS External Audio Control:** iOS forbids third-party apps from muting or ducking audio from external apps. Prayer Focus Mode runs silent countdown guidance on iOS without claiming external audio muting.
2. **Android Audio Focus Scope:** Transient audio ducking applies only in native Android builds (`eas build`) and depends on third-party media apps respecting `AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK`.
3. **iOS 64 Pending Local Notification Limit:** Prayer notifications stay within a 3-day rolling horizon (`≤ 30` items) so tasks and alarms are never evicted; opening the app refreshes the rolling window.
4. **Web Persistence & Background Alarms:** Web mode uses `localStorage` and cannot fire OS background alarms when browser tabs are closed.

---

## 10. Privacy Policy Summary

Effective Date: 2026-11-26

- **Local-First Storage:** Tasks, habits, routines, workouts, prayer logs, weekly reflections, and wake-up alarms remain stored locally on-device. Core features work offline without an account.
- **Encrypted Cloud Sync (Optional):** When signed in, records sync over HTTPS/TLS to your private Supabase PostgreSQL partition isolated by `auth.uid() = user_id`.
- **Location Usage:** Optional When-In-Use location permissions compute offline prayer times and Qibla direction locally without sharing continuous location history.
- **AI Privacy:** Only compact summarized progress statistics and your prompt are sent on-demand to the backend `ai-coach` function; AI proposals require your explicit confirmation before changing schedules.
- **On-Device Diagnostics:** Error & API logs automatically strip email addresses and bearer tokens (`[REDACTED]`).
