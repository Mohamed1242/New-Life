# New Life — Phase 7 Final Architecture & Production Handover

## 1. Final Architecture Documentation

New Life is an Expo SDK 57 (`expo-router`, React Native `0.86`, TypeScript, React Compiler) local-first lifestyle, habit, prayer, and AI coaching mobile/web application backed by Supabase PostgreSQL + Edge Functions.

### Layered Module Structure
- **Routing (`src/app/`)**: Thin Expo Router route wrappers (`index.tsx`, `onboarding.tsx`, `(tabs)/`, `(modals)/`). Wrapped in `AppErrorBoundary` (`src/components/common/AppErrorBoundary.tsx`).
- **Local Storage & Performance (`src/core/db/`)**:
  - Native (`iOS`/`Android`): `expo-sqlite` with versioned transactional migrations (`v1`–`v5` in `migrations.ts`), including Phase 7 composite indexes (`idx_task_logs_date_task`, `idx_habit_logs_date_habit`, `idx_routine_logs_date_routine`, `idx_prayer_logs_status_date`) and `weekly_reflections`.
  - Web: Modular `.web.ts` repository adapters backed by `localStorage` so web builds run identically without WASM setup overhead.
- **Offline Sync Engine (`src/core/sync/`)**:
  - Offline mutation queue (`sync_queue`) with single-flight locking, 60-second cooldown, exponential backoff, JWT user ownership enforcement (`sync-push`), delta cursor pulls (`sync-pull`), and Last-Write-Wins (`updated_at`) server conflict resolution.
- **Core Product Modules (`src/modules/`)**:
  - `onboarding` & `profile`: Calm setup flow, Appearance/RTL Arabic+English localization, Goal weights, Notification caps & quiet hours, Privacy Policy & On-Device Error Diagnostics (`errorMonitor.ts`).
  - `tasks` & `routine`: Tasks, Positive/Negative Habits (streaks, weekly recovery grace pass, urge-resisted logging), Routine timeline, and Weekly Challenges.
  - `insights`: Recorded-only analytics across `week` (7d), `month` (30d), and `year` (90d/12-week buckets), positive/negative behavior deltas, Life Balance pillars, Weekly Report, Transparent Metric Formulas toggle, Personalized Milestones, and Weekly Reflection (`reflectionRepository`).
  - `assistant` & `notifications`: Event-driven Gemini Coach (`gemini-flash-lite-latest` via Supabase `ai-coach`), daily response cache (`ai_response_cache`), token/cost budget tracking (`ai_usage_logs`), server-validated suggested actions (`actionValidator.ts`), Expo Push registration (`device_tokens`), and Smart Notifications rules (`smart-notifications-cron`).
  - `prayer` & `alarms`: Offline `adhan` prayer schedule (`Egyptian` Survey default + 11 methods), Qibla, `expo-location` + 12 offline city presets, non-punitive consistency stats (`not_recorded` never treated as `missed`), 3-day rolling local alerts, Android `AudioManager` transient ducking (`modules/prayer-audio-focus`), and Wake-Up Alarms (`modules/wake-alarm` `AlarmManager.setAlarmClock` + `BOOT_COMPLETED` on Android dev builds; `expo-notifications` elsewhere).

---

## 2. Feature Completion Report

- **Phase 0–3 (Foundation, Tasks, Habits, Routines, Offline SQLite + Web):** Complete and active across Home, Tasks, Insights, and Profile tabs.
- **Phase 4 (Auth, Supabase PostgreSQL, RLS, Offline Sync & Conflict Resolution):** Complete; 5 migrations pushed (`20261126000001`–`20261126000005`), RLS verified on every user table, `sync-push` and `sync-pull` deployed.
- **Phase 5 (AI Coach & Smart Notifications):** Complete; deployed Edge Functions `ai-coach`, `ai-context-refresh`, `ai-action-confirm`, `smart-notifications-cron` using server-side Gemini integration with prompt caching, usage/cost quotas, and deterministic fallback.
- **Phase 6 (Prayer System, Alarms & Audio Focus):** Complete; offline prayer times, location presets/GPS, 3-day rolling notifications, full wake-up alarm CRUD + Snooze/Dismiss modal with 4 offline WAV chimes (`assets/sounds/`), and native Android/iOS capability bridges.
- **Phase 7 (Analytics, Retention, Error Monitoring, Production Readiness & Tests):** Complete; 30/90-day trend calculations, transparent methodology toggle, Weekly Reflection, SQLite composite indexes, `AppErrorBoundary` + `errorMonitor`, generated app icon/adaptive icon/splash/favicon PNGs (`assets/images/`), `eas.json`, `docs/privacy-policy.md`, and Node automated test suite (`tests/*.test.ts`).

---

## 3. Known Limitations & Platform Differences

1. **iOS External Media Audio Focus**: Apple iOS does not allow third-party apps to duck or mute audio playing in external apps (e.g., Spotify/YouTube). `PrayerFocusScreen` uses peaceful timer guidance without falsely claiming external muting on iOS.
2. **Android Audio Focus Compatibility**: Android `AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK` only triggers inside a native EAS/prebuild Android build (not Expo Go) and relies on third-party media apps obeying system audio-focus signals.
3. **iOS vs Android Wake-Up Alarms**: Android native builds with `SCHEDULE_EXACT_ALARM` granted use `AlarmManager.setAlarmClock` (with `BOOT_COMPLETED` re-arming after reboot). iOS third-party apps (and Expo Go) use scheduled `UNUserNotificationCenter` time-sensitive notifications capped at **64 pending notifications app-wide** (handled by capping prayer alerts at a 3-day rolling horizon).
4. **Native Module Binary Compilation**: Kotlin (`modules/prayer-audio-focus`, `modules/wake-alarm`) is type-checked via its TypeScript bridge and ready for `npx expo prebuild` / EAS Build; it is not executed inside Expo Go or the Node test runtime.

---

## 4. Deployment Instructions

### Supabase Backend
1. Ensure linked project has migrations applied:
   ```bash
   npx supabase db push
   ```
2. Verify server-only secrets (never put these in client `.env` with `EXPO_PUBLIC_`):
   ```bash
   npx supabase secrets set GEMINI_API_KEY="YOUR_KEY"
   ```
3. Deploy Edge Functions:
   ```bash
   npx supabase functions deploy sync-push sync-pull ai-context-refresh ai-coach ai-action-confirm smart-notifications-cron
   ```
4. Configure Supabase Scheduled Cron (`pg_cron` or Dashboard Cron) to invoke `smart-notifications-cron` hourly if automated background smart push notifications are desired.

### Mobile App Release (EAS Build)
1. Copy `.env.example` to `.env` with production `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (and optional `EXPO_PUBLIC_ERROR_REPORTING_URL`).
2. Authenticate & initialize EAS project:
   ```bash
   npx eas login
   npx eas build:configure
   ```
3. Build internal preview APK / simulator or Store production binaries using [eas.json](file:///d:/New%20Life/eas.json):
   ```bash
   npx eas build --platform android --profile preview
   npx eas build --platform android --profile production
   npx eas build --platform ios --profile production
   ```

---

## 5. Production Readiness Checklist

- [x] Versioned SQLite migrations (`v1`–`v5`) with composite query indexes
- [x] Web platform repository parity (`.web.ts`) for offline & browser preview
- [x] Strict Supabase RLS (`auth.uid() = user_id`) and zero client-bundled AI/service keys
- [x] App icon (`1024x1024`), adaptive icon foreground, splash screen icon, and web favicon generated
- [x] Android & iOS permissions declared cleanly in `app.json`
- [x] On-device crash boundary (`AppErrorBoundary`) + sanitized `errorMonitor` diagnostics
- [x] Privacy Policy summary documented (`docs/privacy-policy.md`) and surfaced in Settings
- [x] `eas.json` configured (`development`, `preview`, `production`)
- [ ] Run EAS native builds (`android` + `ios`) to verify signed Kotlin/Swift compilation on physical devices before App Store / Play Store submission

---

## 6. Remaining Technical Risks

1. **Physical Device Native Build Verification**: Local Expo modules under `modules/` have not yet been compiled through Gradle/Xcode (`eas build`), so physical-device Gradle/Pod verification should be the first QA gate during release staging.
2. **Android Exact Alarm Permission UX (Android 14+)**: On newer Android OS releases, users must manually allow *Alarms & Reminders* (`SCHEDULE_EXACT_ALARM`) in system settings; if denied, alarms automatically fall back to notification scheduling (explicitly indicated in `AlarmsScreen`).
3. **Free-Tier Gemini Rate Limits**: Under heavy concurrent test traffic, Gemini free-tier RPM/RPD caps fall back seamlessly to deterministic local coaching replies (`local-coach-fallback`); monitor `ai_usage_logs` before scaling public traffic.
