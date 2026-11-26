import NetInfo from "@react-native-community/netinfo";
import { getSupabaseClient } from "@/core/supabase/client";
import { queryClient } from "@/lib/queryClient";
import { createLogger } from "@/shared/logger";
import { errorMonitor } from "@/shared/monitoring/errorMonitor";
import { syncQueueDb } from "./syncQueue";

const syncLogger = createLogger("Sync");

export interface SyncRunResult {
  status:
    | "skipped_offline"
    | "skipped_unconfigured"
    | "skipped_unauthenticated"
    | "skipped_cooldown"
    | "success"
    | "error";
  pushedCount: number;
  conflictsResolved: number;
  error?: string;
}

const MAX_RETRIES = 3;
const AUTO_SYNC_COOLDOWN_MS = 60_000;

let activeSyncPromise: Promise<SyncRunResult> | null = null;
let lastSyncCompletedAt = 0;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeSync(force: boolean): Promise<SyncRunResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      status: "skipped_unconfigured",
      pushedCount: 0,
      conflictsResolved: 0,
    };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return {
      status: "skipped_unauthenticated",
      pushedCount: 0,
      conflictsResolved: 0,
    };
  }

  const pendingCount = await syncQueueDb.countPending();
  const elapsed = Date.now() - lastSyncCompletedAt;
  if (!force && pendingCount === 0 && elapsed < AUTO_SYNC_COOLDOWN_MS) {
    return {
      status: "skipped_cooldown",
      pushedCount: 0,
      conflictsResolved: 0,
    };
  }

  const net = await NetInfo.fetch();
  if (net.isConnected === false) {
    return {
      status: "skipped_offline",
      pushedCount: 0,
      conflictsResolved: 0,
    };
  }

  await syncQueueDb.updateMetadata({
    lastSyncStatus: "syncing",
    lastSyncError: null,
  });

  let pushedCount = 0;
  let conflictsResolved = 0;

  try {
    // 1. Push pending offline queue with exponential backoff retry
    const pending = await syncQueueDb.listPending(100);
    const retryable = pending.filter((p) => p.retryCount < MAX_RETRIES);

    if (retryable.length > 0) {
      let attempt = 0;
      let lastErr: Error | null = null;
      let pushResult: {
        syncedAt: string;
        acceptedIds: string[];
        conflicts: { id: string; table: string; serverRow: Record<string, unknown> }[];
      } | null = null;

      while (attempt < MAX_RETRIES && !pushResult) {
        try {
          const { data, error } = await supabase.functions.invoke("sync-push", {
            body: {
              mutations: retryable.map((m) => ({
                id: m.recordId,
                table: m.tableName,
                operation: m.operation,
                clientUpdatedAt: m.clientUpdatedAt,
                payload: m.payload,
              })),
            },
          });

          if (error) throw new Error(error.message);
          pushResult = data;
        } catch (err) {
          lastErr = err instanceof Error ? err : new Error(String(err));
          attempt += 1;
          if (attempt < MAX_RETRIES) {
            await sleep(600 * 2 ** attempt);
          }
        }
      }

      if (!pushResult) {
        for (const item of retryable) {
          await syncQueueDb.markFailed(item.recordId, lastErr?.message ?? "Sync failed");
        }
        throw lastErr ?? new Error("Sync push failed after retries");
      }

      const accepted = pushResult.acceptedIds ?? [];
      const conflicts = pushResult.conflicts ?? [];
      pushedCount = accepted.length;
      conflictsResolved = conflicts.length;

      if (conflicts.length > 0) {
        const grouped: Record<string, Record<string, unknown>[]> = {};
        for (const c of conflicts) {
          if (!grouped[c.table]) grouped[c.table] = [];
          grouped[c.table].push(c.serverRow);
        }
        await syncQueueDb.mergePulledChanges(grouped);
      }

      await syncQueueDb.removeByRecordIds([
        ...accepted,
        ...conflicts.map((c) => c.id),
      ]);

      await syncQueueDb.updateMetadata({
        lastPushedAt: pushResult.syncedAt ?? new Date().toISOString(),
      });
    }

    // 2. Pull delta updates since last_pulled_at (only if forced or cooldown elapsed)
    const meta = await syncQueueDb.getMetadata();
    const shouldPull =
      force ||
      !meta.lastPulledAt ||
      Date.now() - new Date(meta.lastPulledAt).getTime() >= AUTO_SYNC_COOLDOWN_MS;

    let pulledRowsCount = 0;
    if (shouldPull) {
      const { data: pullData, error: pullError } = await supabase.functions.invoke(
        "sync-pull",
        {
          body: meta.lastPulledAt ? { since: meta.lastPulledAt } : {},
        },
      );

      if (pullError) {
        throw new Error(pullError.message);
      }

      if (pullData?.changes) {
        const changeValues = Object.values(pullData.changes) as unknown[][];
        pulledRowsCount = changeValues.reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
        if (pulledRowsCount > 0) {
          await syncQueueDb.mergePulledChanges(pullData.changes);
        }
      }

      await syncQueueDb.updateMetadata({
        lastPulledAt: pullData?.serverTime ?? new Date().toISOString(),
      });
    }

    await syncQueueDb.updateMetadata({
      lastSyncStatus: "success",
      lastSyncError: null,
    });

    lastSyncCompletedAt = Date.now();

    if (pushedCount > 0 || pulledRowsCount > 0) {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["routine"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    }

    syncLogger.info("Cloud sync completed", { pushedCount, conflictsResolved });
    return { status: "success", pushedCount, conflictsResolved };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown sync error";
    syncLogger.warn("Cloud sync error", { msg });
    void errorMonitor.recordApiFailure("sync-engine", 500, msg);
    lastSyncCompletedAt = Date.now();
    await syncQueueDb.updateMetadata({
      lastSyncStatus: "error",
      lastSyncError: msg,
    });
    return {
      status: "error",
      pushedCount,
      conflictsResolved,
      error: msg,
    };
  }
}

export const syncEngine = {
  async runSync(options?: { force?: boolean }): Promise<SyncRunResult> {
    if (activeSyncPromise) {
      return activeSyncPromise;
    }

    activeSyncPromise = executeSync(Boolean(options?.force)).finally(() => {
      activeSyncPromise = null;
    });
    return activeSyncPromise;
  },
};
