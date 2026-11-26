# Privacy Policy Summary — New Life

Effective Date: 2026-11-26

1. **Local-First Architecture**: Your daily tasks, habits, routines, prayer logs, weekly reflections, and wake-up alarms are stored locally on your device in SQLite (or local browser storage on Web). You can use the core app offline without creating an account.
2. **Optional Cloud Sync**: Signing in enables encrypted transport (HTTPS/TLS) to your private account in Supabase PostgreSQL. Every cloud table is protected by strict Row Level Security (`auth.uid() = user_id`), isolating your records from all other users.
3. **Location Usage**: When enabled, location permissions (`ACCESS_COARSE_LOCATION` / `ACCESS_FINE_LOCATION` on Android, `NSLocationWhenInUseUsageDescription` on iOS) are used strictly on-device to calculate offline prayer times and Qibla direction.
4. **AI Lifestyle Coach & Safety**: When you trigger AI reviews or chat, only compact summarized habit/task statistics and your current prompt are transmitted to the Supabase Edge Function (`ai-coach`)—raw database tables and API keys never leave the backend, and AI suggestions require explicit confirmation before changing schedules.
5. **Notifications & Lock-Screen Privacy**: Sensitive habit previews can be masked in **Settings → Notifications & Alarms → Hide Sensitive Previews**.
6. **Crash & API Diagnostics**: On-device error logs sanitize emails and bearer tokens automatically and remain local unless you configure a custom production error webhook.
