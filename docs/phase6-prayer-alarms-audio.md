# Phase 6: Prayer System, Alarms & Audio Focus Architecture

## 1. Prayer Times Calculation & Timezone Resilience

- **Offline Engine (`adhan`)**: Computes daily Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha, and Qibla bearing 100% locally without network calls (`src/modules/prayer/services/prayerCalculator.ts`).
- **Egyptian General Authority of Survey (`Egyptian`)**: Default calculation method (`19.5°` Fajr / `17.5°` Isha), alongside `MuslimWorldLeague`, `UmmAlQura`, `NorthAmerica`, `Karachi`, `Dubai`, `MoonsightingCommittee`, `Kuwait`, `Qatar`, `Turkey`, `Tehran`, and `Singapore`.
- **Location Handling (`src/modules/prayer/services/locationService.ts`)**:
  - GPS coordinate detection via `expo-location` with offline coordinate fallback if reverse geocoding is offline.
  - Curated manual offline city presets (Cairo, Alexandria, Giza, Makkah, Madinah, Riyadh, Dubai, Doha, Amman, Istanbul, London, New York).
- **Prayer Tracking (`src/modules/prayer/db/prayerRepository.ts`)**:
  - Logs `on_time`, `delayed`, `qada`, `missed`, or `not_recorded` locally in SQLite (with `.web.ts` localStorage parity) and queues updates to Supabase `prayer_logs`.
  - **Non-Punitive Rule**: Unrecorded prayer slots remain `not_recorded` and are never automatically marked `missed`.

## 2. Prayer Notifications & Rolling Horizon

- `src/modules/prayer/services/prayerScheduler.ts` clears previous `prayer_*` triggers and schedules Adhan + optional advance reminders (`5`, `10`, or `15` min prior) across a **3-day rolling horizon** (at most 30 notifications total).
- Keeping the rolling window at 3 days preserves headroom under **iOS's strict 64-notification pending cap**.
- On app foreground resume (`NotificationProvider.tsx`), timezone shifts automatically update stored prayer timezone and trigger rescheduling.

## 3. Prayer Focus Mode & Audio Focus (Platform Limits)

- **Android (`modules/prayer-audio-focus/android/.../PrayerAudioFocusModule.kt`)**:
  - Uses `AudioManager` (`AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)` on Android 8.0+ with `USAGE_ASSISTANCE_ACCESSIBILITY` / `CONTENT_TYPE_SPEECH`) during active Prayer Focus Mode and calls `abandonAudioFocusRequest` on exit.
  - Compliant third-party media apps (e.g., music/podcast players respecting Android Audio Focus) lower volume gently ("ducking") while focus mode is active; apps that ignore `AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK` cannot be forced without system DND/notification policy access.
- **iOS (`modules/prayer-audio-focus/ios/PrayerAudioFocusModule.swift`)**:
  - **Unsupported capability clearly documented**: Apple iOS does not permit third-party apps to duck or mute audio belonging to external apps. `PrayerFocusScreen` transparently runs silent Focus guidance without claiming global audio muting.
- **Expo Go / Web**: Gracefully falls back via `requireOptionalNativeModule("PrayerAudioFocus")` without crashing.

## 4. Wake-Up Alarms vs Scheduled Notifications

| Behavior | Android Dev/Prod Build (`SCHEDULE_EXACT_ALARM` granted) | iOS / Expo Go / Denied Exact Alarm / Web |
|---|---|---|
| Scheduling Mechanism | `AlarmManager.setAlarmClock` (`modules/wake-alarm`) | `expo-notifications` (`UNCalendarNotificationTrigger` / `DATE`) |
| UI Mode Badge | `System AlarmManager` (`system_alarm`) | `Scheduled Notification` (`scheduled_notification`) |
| Device Restart Behavior | Persisted in native `SharedPreferences`; `BootReceiver` handles `BOOT_COMPLETED`, `TIME_SET`, `TIMEZONE_CHANGED` to re-arm | Pending OS notifications survive reboot on iOS/Android notifications queue; recurring alarms re-verify next occurrence on app foreground |
| Snooze & Dismiss | Full-screen modal `AlarmRingScreen` with `expo-audio` offline WAV chimes, vibration, configurable Snooze (`5/10/15m`), and Dismiss | Same `AlarmRingScreen` UI triggered on notification tap; cannot bypass iOS silent switch unless Critical Alerts entitlement is approved by Apple |

## 5. Offline / Edge Scenario Behavior

- **Timezone changes / Travel**: `useDailyPrayerSchedule` checks `Intl.DateTimeFormat().resolvedOptions().timeZone` every foreground activation; `NotificationProvider` detects timezone drift and re-schedules both rolling prayer notifications and enabled wake-up alarms.
- **Notifications disabled**: `prayerScheduler` and `alarmScheduler` safely record status without crashing and allow manual logging/UI alarms.
- **Web Build (`npx expo export --platform web`)**: Supported through `.web.ts` repository adapters (`prayerRepository.web.ts`, `alarmRepository.web.ts`, `syncQueue.web.ts`) and optional native-module guards.
