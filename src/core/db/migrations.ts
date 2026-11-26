import type { SQLiteDatabase } from "expo-sqlite";
import { createLogger } from "@/shared/logger";
import { getTodayIso } from "@/core/utils/date";

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
