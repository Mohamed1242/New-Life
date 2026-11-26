import * as SQLite from "expo-sqlite";
import { createLogger } from "@/shared/logger";
import { runMigrations } from "./migrations";

const dbLogger = createLogger("SQLite");

const DB_NAME = "newlife.db";

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    dbLogger.info("Opening SQLite database", { DB_NAME });
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync("PRAGMA journal_mode = WAL;");
    await db.execAsync("PRAGMA foreign_keys = ON;");
    await runMigrations(db);
    dbInstance = db;
    dbLogger.info("SQLite database ready");
    return db;
  })().catch((error) => {
    initPromise = null;
    dbLogger.error("Failed to initialize SQLite database", { error });
    throw error;
  });

  return initPromise;
}
