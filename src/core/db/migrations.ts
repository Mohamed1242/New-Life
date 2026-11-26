import type { SQLiteDatabase } from "expo-sqlite";
import { addDaysIso, getTodayIso } from "@/core/utils/date";
import { createLogger } from "@/shared/logger";

const migrationLogger = createLogger("Migrations");

interface Migration {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "initial_schema_and_seed",
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          display_name TEXT NOT NULL DEFAULT 'Ahmed',
          onboarding_completed INTEGER NOT NULL DEFAULT 0,
          coaching_tone TEXT NOT NULL DEFAULT 'gentle',
          selected_goals_json TEXT NOT NULL DEFAULT '[]',
          theme_preference TEXT NOT NULL DEFAULT 'light',
          language TEXT NOT NULL DEFAULT 'en',
          prayer_auto_mute INTEGER NOT NULL DEFAULT 1,
          bedtime TEXT NOT NULL DEFAULT '22:45',
          wake_time TEXT NOT NULL DEFAULT '05:15',
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          pillar TEXT NOT NULL,
          icon_name TEXT NOT NULL,
          accent_hex TEXT NOT NULL,
          is_system INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          category TEXT NOT NULL,
          time_label TEXT NOT NULL,
          date_iso TEXT NOT NULL,
          priority TEXT NOT NULL DEFAULT 'medium',
          repeat_rule TEXT NOT NULL DEFAULT 'daily',
          reminder_enabled INTEGER NOT NULL DEFAULT 0,
          completed INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS habits (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          polarity TEXT NOT NULL DEFAULT 'positive',
          category TEXT NOT NULL,
          target_label TEXT NOT NULL,
          streak_days INTEGER NOT NULL DEFAULT 0,
          grace_used_this_week INTEGER NOT NULL DEFAULT 0,
          completed_today INTEGER NOT NULL DEFAULT 0,
          urge_count_today INTEGER NOT NULL DEFAULT 0,
          weekly_consistency_pct INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS habit_logs (
          id TEXT PRIMARY KEY,
          habit_id TEXT NOT NULL,
          log_date TEXT NOT NULL,
          status TEXT NOT NULL,
          note TEXT,
          logged_at TEXT NOT NULL,
          FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS daily_lifestyle_scores (
          date_iso TEXT PRIMARY KEY,
          overall_score INTEGER NOT NULL DEFAULT 0,
          spirituality_score INTEGER NOT NULL DEFAULT 0,
          health_score INTEGER NOT NULL DEFAULT 0,
          productivity_score INTEGER NOT NULL DEFAULT 0,
          computed_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date_iso);
        CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date ON habit_logs(habit_id, log_date);
      `);

      const now = new Date().toISOString();
      const today = getTodayIso();

      await db.runAsync(
        `INSERT OR IGNORE INTO user_preferences (
          id, display_name, onboarding_completed, coaching_tone,
          selected_goals_json, theme_preference, language,
          prayer_auto_mute, bedtime, wake_time, updated_at
        ) VALUES (1, 'Ahmed', 0, 'gentle', '["Build consistent daily prayers","Exercise & eat mindfully"]', 'light', 'en', 1, '22:45', '05:15', ?)`,
        [now],
      );

      const defaultCategories = [
        ["prayer", "Prayer", "spirituality", "moon", "#2AB88D", 1],
        ["gym", "Gym", "health", "activity", "#5B4FE9", 1],
        ["health", "Health", "health", "heart", "#E56B6F", 1],
        ["work", "Work", "productivity", "briefcase", "#E8912D", 1],
        ["study", "Study", "productivity", "book-open", "#3B82F6", 1],
        ["custom", "Custom", "productivity", "plus", "#7C72FF", 1],
      ] as const;

      for (const cat of defaultCategories) {
        await db.runAsync(
          `INSERT OR IGNORE INTO categories (id, name, pillar, icon_name, accent_hex, is_system) VALUES (?, ?, ?, ?, ?, ?)`,
          [...cat],
        );
      }

      const existingTasks = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM tasks",
      );
      if ((existingTasks?.count ?? 0) === 0) {
        const seedTasks = [
          ["t1", "Fajr Prayer", "prayer", "05:18 AM", today, "high", "daily", 1, 1],
          ["t2", "Deep Work Sprint", "work", "10:00 AM", today, "high", "weekdays", 1, 1],
          ["t3", "Eat Healthy Meal", "health", "01:30 PM", today, "low", "daily", 0, 1],
          ["t4", "Gym Workout", "gym", "06:00 PM", today, "medium", "weekdays", 1, 0],
          ["t5", "Read 10 Pages", "study", "08:30 PM", today, "medium", "daily", 0, 0],
        ] as const;

        for (const t of seedTasks) {
          await db.runAsync(
            `INSERT INTO tasks (id, title, category, time_label, date_iso, priority, repeat_rule, reminder_enabled, completed, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [...t, now, now],
          );
        }
      }

      const existingHabits = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM habits",
      );
      if ((existingHabits?.count ?? 0) === 0) {
        const seedHabits = [
          ["h1", "Morning Prayers On Time", "positive", "prayer", "Daily • Dawn", 14, 0, 1, 0, 100],
          ["h2", "Strength & Mobility", "positive", "gym", "4x / week", 6, 1, 0, 0, 75],
          ["h3", "Reading 10 Pages", "positive", "study", "Daily • Evening", 4, 0, 0, 0, 60],
          ["h4", "Late-Night Doomscrolling", "negative", "health", "After 10:30 PM", 9, 0, 1, 1, 86],
        ] as const;

        for (const h of seedHabits) {
          await db.runAsync(
            `INSERT INTO habits (id, title, polarity, category, target_label, streak_days, grace_used_this_week, completed_today, urge_count_today, weekly_consistency_pct, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [...h, now, now],
          );
        }
      }
    },
  },
  {
    version: 2,
    name: "phase3_tasks_habits_routines_history_sync",
    up: async (db) => {
      // Extend tasks for full Phase 3 editing, recurring days, statuses, and Supabase sync readiness
      await db.execAsync(`
        ALTER TABLE tasks ADD COLUMN notes TEXT DEFAULT '';
        ALTER TABLE tasks ADD COLUMN status TEXT NOT NULL DEFAULT 'not_recorded';
        ALTER TABLE tasks ADD COLUMN custom_days_json TEXT NOT NULL DEFAULT '[]';
        ALTER TABLE tasks ADD COLUMN postponed_to TEXT;
        ALTER TABLE tasks ADD COLUMN deleted_at TEXT;
        ALTER TABLE tasks ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending';

        UPDATE tasks SET status = CASE WHEN completed = 1 THEN 'completed' ELSE 'not_recorded' END;

        CREATE TABLE IF NOT EXISTS task_logs (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL,
          log_date TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'not_recorded',
          note TEXT,
          logged_at TEXT NOT NULL,
          deleted_at TEXT,
          sync_status TEXT NOT NULL DEFAULT 'pending',
          UNIQUE(task_id, log_date),
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
        );

        ALTER TABLE habits ADD COLUMN frequency_type TEXT NOT NULL DEFAULT 'daily';
        ALTER TABLE habits ADD COLUMN target_per_week INTEGER NOT NULL DEFAULT 7;
        ALTER TABLE habits ADD COLUMN custom_days_json TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]';
        ALTER TABLE habits ADD COLUMN best_streak INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE habits ADD COLUMN last_recovery_date TEXT;
        ALTER TABLE habits ADD COLUMN deleted_at TEXT;
        ALTER TABLE habits ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending';

        UPDATE habits SET best_streak = streak_days WHERE best_streak < streak_days;

        ALTER TABLE habit_logs ADD COLUMN value REAL DEFAULT 1;
        ALTER TABLE habit_logs ADD COLUMN trigger_tag TEXT;
        ALTER TABLE habit_logs ADD COLUMN deleted_at TEXT;
        ALTER TABLE habit_logs ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending';

        CREATE TABLE IF NOT EXISTS routine_blocks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          block_type TEXT NOT NULL,
          pillar TEXT NOT NULL DEFAULT 'productivity',
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          days_json TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
          is_enabled INTEGER NOT NULL DEFAULT 1,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          sync_status TEXT NOT NULL DEFAULT 'pending'
        );

        CREATE TABLE IF NOT EXISTS routine_logs (
          id TEXT PRIMARY KEY,
          routine_id TEXT NOT NULL,
          log_date TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'not_recorded',
          logged_at TEXT NOT NULL,
          deleted_at TEXT,
          sync_status TEXT NOT NULL DEFAULT 'pending',
          UNIQUE(routine_id, log_date),
          FOREIGN KEY (routine_id) REFERENCES routine_blocks(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS challenges (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          pillar TEXT NOT NULL,
          target_days INTEGER NOT NULL DEFAULT 7,
          progress_days INTEGER NOT NULL DEFAULT 0,
          joined INTEGER NOT NULL DEFAULT 0,
          completed INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          sync_status TEXT NOT NULL DEFAULT 'pending'
        );

        CREATE INDEX IF NOT EXISTS idx_task_logs_date ON task_logs(log_date);
        CREATE INDEX IF NOT EXISTS idx_routine_logs_date ON routine_logs(log_date);
      `);

      const now = new Date().toISOString();
      const today = getTodayIso();
      const yesterday = addDaysIso(today, -1);
      const twoDaysAgo = addDaysIso(today, -2);

      // Seed task_logs for pre-existing completed seed tasks
      await db.runAsync(
        `INSERT OR IGNORE INTO task_logs (id, task_id, log_date, status, logged_at)
         SELECT 'tl_' || id || '_' || ?, id, ?, status, ? FROM tasks WHERE status = 'completed'`,
        [today, today, now],
      );

      // Seed realistic recent habit logs so weekly analytics show real recorded history
      const existingLogs = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM habit_logs",
      );
      if ((existingLogs?.count ?? 0) === 0) {
        const seedLogs: [string, string, string, string, number, string | null][] = [
          ["hl_seed_1", "h1", twoDaysAgo, "completed", 1, null],
          ["hl_seed_2", "h1", yesterday, "completed", 1, null],
          ["hl_seed_3", "h1", today, "completed", 1, null],
          ["hl_seed_4", "h2", twoDaysAgo, "completed", 1, null],
          ["hl_seed_5", "h2", yesterday, "skipped", 0, null],
          ["hl_seed_6", "h3", twoDaysAgo, "completed", 1, null],
          ["hl_seed_7", "h3", yesterday, "completed", 1, null],
          ["hl_seed_8", "h4", twoDaysAgo, "completed", 0, null],
          ["hl_seed_9", "h4", yesterday, "urge_resisted", 0, "boredom"],
          ["hl_seed_10", "h4", today, "completed", 0, null],
        ];
        for (const [id, habitId, logDate, status, val, trigger] of seedLogs) {
          await db.runAsync(
            `INSERT OR IGNORE INTO habit_logs (id, habit_id, log_date, status, value, trigger_tag, logged_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, habitId, logDate, status, val, trigger, now],
          );
        }
      }

      // Seed customizable daily routine blocks
      const existingRoutines = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM routine_blocks",
      );
      if ((existingRoutines?.count ?? 0) === 0) {
        const blocks: [string, string, string, string, string, string, number][] = [
          ["rb_wake", "Wake Up & Hydration", "wake_up", "health", "05:10", "05:25", 1],
          ["rb_prayer_fajr", "Fajr & Dawn Dhikr", "prayer", "spirituality", "05:25", "05:50", 2],
          ["rb_morning", "Morning Stretch & Plan", "morning_routine", "productivity", "06:00", "06:30", 3],
          ["rb_work", "Deep Work / Study Block", "work_study", "productivity", "09:00", "12:30", 4],
          ["rb_meal", "Nourishing Lunch", "meals", "health", "13:00", "13:45", 5],
          ["rb_gym", "Workout & Movement", "gym", "health", "18:00", "19:00", 6],
          ["rb_personal", "Personal & Family Time", "personal", "spirituality", "19:30", "21:00", 7],
          ["rb_evening", "Evening Wind-Down & Reading", "evening_routine", "productivity", "21:30", "22:30", 8],
          ["rb_sleep", "Restful Sleep", "sleep", "health", "22:45", "05:10", 9],
        ];
        for (const [id, title, blockType, pillar, start, end, order] of blocks) {
          await db.runAsync(
            `INSERT INTO routine_blocks (id, title, block_type, pillar, start_time, end_time, is_enabled, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
            [id, title, blockType, pillar, start, end, order, now, now],
          );
        }
      }

      // Seed optional gentle challenges
      const existingChallenges = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM challenges",
      );
      if ((existingChallenges?.count ?? 0) === 0) {
        const challenges: [string, string, string, string, number, number, number][] = [
          [
            "ch_dawn",
            "Dawn Anchor (7 Days)",
            "Start 7 days gently with morning prayer and hydration before checking feeds.",
            "spirituality",
            7,
            3,
            1,
          ],
          [
            "ch_screen",
            "Screen-Free Wind-Down",
            "Step away from screens 30 minutes before bedtime for 5 evenings.",
            "health",
            5,
            2,
            0,
          ],
          [
            "ch_deep",
            "Focused Mornings",
            "Complete 1 distraction-free work or study sprint across 5 weekdays.",
            "productivity",
            5,
            1,
            0,
          ],
        ];
        for (const [id, title, desc, pillar, target, progress, joined] of challenges) {
          await db.runAsync(
            `INSERT INTO challenges (id, title, description, pillar, target_days, progress_days, joined, completed, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
            [id, title, desc, pillar, target, progress, joined, now, now],
          );
        }
      }
    },
  },
  {
    version: 3,
    name: "phase4_sync_queue_and_metadata",
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_queue (
          id TEXT PRIMARY KEY,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          operation TEXT NOT NULL CHECK (operation IN ('upsert', 'delete')),
          payload_json TEXT NOT NULL,
          client_updated_at TEXT NOT NULL,
          retry_count INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sync_metadata (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          last_pulled_at TEXT,
          last_pushed_at TEXT,
          last_sync_status TEXT NOT NULL DEFAULT 'idle',
          last_sync_error TEXT,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at ASC);
      `);

      await db.runAsync(
        `INSERT OR IGNORE INTO sync_metadata (id, last_sync_status, updated_at) VALUES (1, 'idle', ?)`,
        [new Date().toISOString()],
      );
    },
  },
  {
    version: 4,
    name: "phase6_prayer_and_alarms",
    up: async (db) => {
      const now = new Date().toISOString();
      const tz =
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Cairo"
          : "Africa/Cairo";

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS prayer_settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          location_mode TEXT NOT NULL DEFAULT 'manual',
          city_name TEXT NOT NULL DEFAULT 'Cairo, Egypt',
          latitude REAL NOT NULL DEFAULT 30.0444,
          longitude REAL NOT NULL DEFAULT 31.2357,
          timezone TEXT NOT NULL DEFAULT 'Africa/Cairo',
          calculation_method TEXT NOT NULL DEFAULT 'Egyptian',
          asr_school TEXT NOT NULL DEFAULT 'shafi',
          notifications_enabled INTEGER NOT NULL DEFAULT 1,
          advance_minutes INTEGER NOT NULL DEFAULT 10,
          focus_duration_minutes INTEGER NOT NULL DEFAULT 10,
          audio_focus_enabled INTEGER NOT NULL DEFAULT 1,
          per_prayer_enabled_json TEXT NOT NULL DEFAULT '{"fajr":true,"dhuhr":true,"asr":true,"maghrib":true,"isha":true}',
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS prayer_logs (
          id TEXT PRIMARY KEY,
          prayer_date TEXT NOT NULL,
          prayer_name TEXT NOT NULL CHECK (prayer_name IN ('fajr','dhuhr','asr','maghrib','isha')),
          status TEXT NOT NULL DEFAULT 'not_recorded' CHECK (status IN ('on_time','delayed','qada','missed','not_recorded')),
          auto_muted_triggered INTEGER NOT NULL DEFAULT 0,
          logged_at TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          sync_status TEXT NOT NULL DEFAULT 'pending',
          UNIQUE(prayer_date, prayer_name)
        );

        CREATE TABLE IF NOT EXISTS alarms (
          id TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          hour INTEGER NOT NULL,
          minute INTEGER NOT NULL,
          days_json TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
          sound_key TEXT NOT NULL DEFAULT 'gentle_dawn',
          snooze_minutes INTEGER NOT NULL DEFAULT 5,
          is_enabled INTEGER NOT NULL DEFAULT 1,
          vibrate INTEGER NOT NULL DEFAULT 1,
          next_fire_at TEXT,
          snoozed_until TEXT,
          platform_mode TEXT NOT NULL DEFAULT 'scheduled_notification',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          sync_status TEXT NOT NULL DEFAULT 'pending'
        );

        CREATE INDEX IF NOT EXISTS idx_prayer_logs_date ON prayer_logs(prayer_date DESC);
        CREATE INDEX IF NOT EXISTS idx_alarms_enabled ON alarms(is_enabled, hour, minute);
      `);

      await db.runAsync(
        `INSERT OR IGNORE INTO prayer_settings (id, timezone, updated_at) VALUES (1, ?, ?)`,
        [tz, now],
      );

      // Seed one gentle disabled wake-up alarm preset so users see how alarms work immediately
      const existingAlarms = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM alarms",
      );
      if ((existingAlarms?.count ?? 0) === 0) {
        await db.runAsync(
          `INSERT INTO alarms (id, label, hour, minute, days_json, sound_key, snooze_minutes, is_enabled, vibrate, created_at, updated_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
          [
            "alarm_dawn_seed",
            "Fajr & Dawn Wake-Up",
            5,
            0,
            "[0,1,2,3,4,5,6]",
            "gentle_dawn",
            5,
            0,
            1,
            now,
            now,
          ],
        );
      }
    },
  },
  {
    version: 5,
    name: "phase7_performance_indexes_and_reflections",
    up: async (db) => {
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_task_logs_date_task
          ON task_logs(log_date DESC, task_id);

        CREATE INDEX IF NOT EXISTS idx_habit_logs_date_habit
          ON habit_logs(log_date DESC, habit_id);

        CREATE INDEX IF NOT EXISTS idx_routine_logs_date_routine
          ON routine_logs(log_date DESC, routine_id);

        CREATE INDEX IF NOT EXISTS idx_prayer_logs_status_date
          ON prayer_logs(prayer_date DESC, status);

        CREATE TABLE IF NOT EXISTS weekly_reflections (
          id TEXT PRIMARY KEY,
          week_start_iso TEXT NOT NULL UNIQUE,
          energy_mood TEXT NOT NULL CHECK (energy_mood IN ('calm', 'balanced', 'stretched')),
          highlight TEXT NOT NULL DEFAULT '',
          adjustment TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 6,
    name: "phase7_workouts_and_exercises",
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS workouts (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          workout_type TEXT NOT NULL DEFAULT 'strength' CHECK (workout_type IN ('strength', 'cardio', 'mobility', 'sports')),
          started_at TEXT NOT NULL,
          duration_min INTEGER NOT NULL DEFAULT 30,
          perceived_effort INTEGER,
          calories_est INTEGER,
          notes TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          sync_status TEXT NOT NULL DEFAULT 'pending'
        );

        CREATE TABLE IF NOT EXISTS exercises (
          id TEXT PRIMARY KEY,
          workout_id TEXT NOT NULL,
          exercise_name TEXT NOT NULL,
          set_order INTEGER NOT NULL DEFAULT 1,
          reps INTEGER,
          weight_kg REAL,
          duration_sec INTEGER,
          distance_m INTEGER,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          sync_status TEXT NOT NULL DEFAULT 'pending',
          FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_workouts_started ON workouts(started_at DESC);
        CREATE INDEX IF NOT EXISTS idx_exercises_workout ON exercises(workout_id, set_order);
      `);
    },
  },
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  let currentVersion = row?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      migrationLogger.info("Applying migration", {
        version: migration.version,
        name: migration.name,
      });
      await db.withTransactionAsync(async () => {
        await migration.up(db);
        await db.execAsync(`PRAGMA user_version = ${migration.version};`);
      });
      currentVersion = migration.version;
    }
  }
}
