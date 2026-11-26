import type { LifePillar } from "@/constants/categories";
import { getDatabase } from "@/core/db";
import { syncQueueDb } from "@/core/sync/syncQueue";
import { generateUuid, getRecentDateRange, getTodayIso } from "@/core/utils/date";
import type { ActivityStatus } from "@/modules/tasks/types/tasks.types";
import { safeParseDays } from "@/modules/tasks/utils/schedule";
import type {
  ChallengeItem,
  RoutineBlock,
  RoutineBlockType,
  SaveRoutineBlockInput,
} from "../types/routine.types";

interface RoutineRow {
  id: string;
  title: string;
  block_type: string;
  pillar: string;
  start_time: string;
  end_time: string;
  days_json: string | null;
  is_enabled: number;
  sort_order: number;
}

interface RoutineLogRow {
  routine_id: string;
  log_date: string;
  status: string;
}

interface ChallengeRow {
  id: string;
  title: string;
  description: string;
  pillar: string;
  target_days: number;
  progress_days: number;
  joined: number;
  completed: number;
}

export const routineDb = {
  async listRoutineBlocks(dateIso = getTodayIso()): Promise<RoutineBlock[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<RoutineRow>(
      "SELECT * FROM routine_blocks WHERE deleted_at IS NULL ORDER BY start_time ASC, sort_order ASC",
    );
    const logs = await db.getAllAsync<RoutineLogRow>(
      "SELECT routine_id, log_date, status FROM routine_logs WHERE log_date = ? AND deleted_at IS NULL",
      [dateIso],
    );
    const statusMap = new Map(logs.map((l) => [l.routine_id, l.status as ActivityStatus]));

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      blockType: r.block_type as RoutineBlockType,
      pillar: r.pillar as LifePillar,
      startTime: r.start_time,
      endTime: r.end_time,
      days: safeParseDays(r.days_json ?? undefined),
      isEnabled: r.is_enabled === 1,
      sortOrder: r.sort_order,
      todayStatus: statusMap.get(r.id) ?? "not_recorded",
    }));
  },

  async saveRoutineBlock(input: SaveRoutineBlockInput): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    if (input.id) {
      await db.runAsync(
        `UPDATE routine_blocks
         SET title = ?, block_type = ?, pillar = ?, start_time = ?, end_time = ?, days_json = ?, is_enabled = ?, updated_at = ?, sync_status = 'pending'
         WHERE id = ?`,
        [
          input.title,
          input.blockType,
          input.pillar,
          input.startTime,
          input.endTime,
          JSON.stringify(input.days),
          input.isEnabled ? 1 : 0,
          now,
          input.id,
        ],
      );
      await syncQueueDb.enqueue({
        tableName: "routines",
        recordId: input.id,
        operation: "upsert",
        clientUpdatedAt: now,
        payload: {
          title: input.title,
          block_type: input.blockType,
          pillar: input.pillar,
          start_time: input.startTime,
          end_time: input.endTime,
          days: input.days,
          is_enabled: input.isEnabled,
        },
      });
      return;
    }

    const id = generateUuid();
    await db.runAsync(
      `INSERT INTO routine_blocks (id, title, block_type, pillar, start_time, end_time, days_json, is_enabled, sort_order, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 99, ?, ?, 'pending')`,
      [
        id,
        input.title,
        input.blockType,
        input.pillar,
        input.startTime,
        input.endTime,
        JSON.stringify(input.days),
        input.isEnabled ? 1 : 0,
        now,
        now,
      ],
    );
    await syncQueueDb.enqueue({
      tableName: "routines",
      recordId: id,
      operation: "upsert",
      clientUpdatedAt: now,
      payload: {
        title: input.title,
        block_type: input.blockType,
        pillar: input.pillar,
        start_time: input.startTime,
        end_time: input.endTime,
        days: input.days,
        is_enabled: input.isEnabled,
      },
    });
  },

  async deleteRoutineBlock(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      "UPDATE routine_blocks SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?",
      [now, now, id],
    );
    await syncQueueDb.enqueue({
      tableName: "routines",
      recordId: id,
      operation: "delete",
      clientUpdatedAt: now,
      payload: { deleted_at: now },
    });
  },

  async setRoutineStatus(
    routineId: string,
    dateIso: string,
    status: ActivityStatus,
  ): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO routine_logs (id, routine_id, log_date, status, logged_at, sync_status)
       VALUES (?, ?, ?, ?, ?, 'pending')
       ON CONFLICT(routine_id, log_date) DO UPDATE SET status = excluded.status, logged_at = excluded.logged_at, sync_status = 'pending'`,
      [generateUuid(), routineId, dateIso, status, now],
    );
  },

  async listRoutineLogsRange(days = 14): Promise<{ logDate: string; status: ActivityStatus; pillar: LifePillar }[]> {
    const db = await getDatabase();
    const start = getRecentDateRange(getTodayIso(), days)[0];
    const rows = await db.getAllAsync<{ log_date: string; status: string; pillar: string }>(
      `SELECT rl.log_date, rl.status, rb.pillar
       FROM routine_logs rl
       INNER JOIN routine_blocks rb ON rb.id = rl.routine_id
       WHERE rl.log_date >= ? AND rl.deleted_at IS NULL AND rb.deleted_at IS NULL`,
      [start],
    );
    return rows.map((r) => ({
      logDate: r.log_date,
      status: r.status as ActivityStatus,
      pillar: r.pillar as LifePillar,
    }));
  },

  async listChallenges(): Promise<ChallengeItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ChallengeRow>(
      "SELECT * FROM challenges WHERE deleted_at IS NULL ORDER BY joined DESC, created_at ASC",
    );
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      pillar: r.pillar as LifePillar,
      targetDays: r.target_days,
      progressDays: r.progress_days,
      joined: r.joined === 1,
      completed: r.completed === 1,
    }));
  },

  async toggleChallengeJoin(id: string): Promise<void> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ChallengeRow>(
      "SELECT * FROM challenges WHERE id = ?",
      [id],
    );
    if (!row) return;
    await db.runAsync(
      "UPDATE challenges SET joined = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?",
      [row.joined === 1 ? 0 : 1, new Date().toISOString(), id],
    );
  },

  async logChallengeDay(id: string): Promise<void> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ChallengeRow>(
      "SELECT * FROM challenges WHERE id = ?",
      [id],
    );
    if (!row) return;
    const nextProgress = Math.min(row.target_days, row.progress_days + 1);
    const completed = nextProgress >= row.target_days ? 1 : 0;
    await db.runAsync(
      "UPDATE challenges SET progress_days = ?, completed = ?, joined = 1, updated_at = ?, sync_status = 'pending' WHERE id = ?",
      [nextProgress, completed, new Date().toISOString(), id],
    );
  },
};
