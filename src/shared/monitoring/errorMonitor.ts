import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export interface RecordedErrorEvent {
  id: string;
  timestamp: string;
  domain: string;
  message: string;
  severity: "error" | "api_failure";
  endpoint?: string;
  statusCode?: number;
  platform: string;
}

const STORAGE_KEY = "@newlife/error_diagnostics_v1";
const MAX_EVENTS = 40;
let memoryBuffer: RecordedErrorEvent[] = [];
let hydrated = false;

async function ensureHydrated(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryBuffer = parsed.slice(0, MAX_EVENTS);
      }
    }
  } catch {
    // Ignore storage failures in restricted contexts
  }
}

function sanitizeMessage(raw: unknown): string {
  const msg = raw instanceof Error ? raw.message : String(raw ?? "Unknown error");
  // Strip any accidental bearer tokens or email-like strings from diagnostics
  return msg
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL]")
    .slice(0, 260);
}

async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(memoryBuffer.slice(0, MAX_EVENTS)),
    );
  } catch {
    // Ignore storage persistence errors
  }
}

export const errorMonitor = {
  async recordError(
    domain: string,
    error: unknown,
    context?: Record<string, unknown>,
  ): Promise<void> {
    await ensureHydrated();
    const evt: RecordedErrorEvent = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      domain,
      message: sanitizeMessage(error),
      severity: "error",
      endpoint:
        typeof context?.endpoint === "string" ? context.endpoint : undefined,
      platform: Platform.OS,
    };
    memoryBuffer = [evt, ...memoryBuffer].slice(0, MAX_EVENTS);
    void persist();

    const remoteUrl = process.env.EXPO_PUBLIC_ERROR_REPORTING_URL;
    if (remoteUrl && !__DEV__) {
      fetch(remoteUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(evt),
      }).catch(() => {});
    }
  },

  async recordApiFailure(
    endpoint: string,
    statusCode: number,
    message: string,
  ): Promise<void> {
    await ensureHydrated();
    const evt: RecordedErrorEvent = {
      id: `api_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      domain: "API",
      message: sanitizeMessage(message),
      severity: "api_failure",
      endpoint,
      statusCode,
      platform: Platform.OS,
    };
    memoryBuffer = [evt, ...memoryBuffer].slice(0, MAX_EVENTS);
    void persist();
  },

  async listRecent(): Promise<RecordedErrorEvent[]> {
    await ensureHydrated();
    return [...memoryBuffer];
  },

  async clear(): Promise<void> {
    memoryBuffer = [];
    hydrated = true;
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};
