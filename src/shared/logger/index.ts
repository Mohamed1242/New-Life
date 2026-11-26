type LogLevel = "debug" | "info" | "warn" | "error";

const PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface DomainLogger {
  debug: (msg: string, ctx?: Record<string, unknown>) => void;
  info: (msg: string, ctx?: Record<string, unknown>) => void;
  warn: (msg: string, ctx?: Record<string, unknown>) => void;
  error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export function createLogger(domain: string, minLevel: LogLevel = __DEV__ ? "debug" : "warn"): DomainLogger {
  const emit = (level: LogLevel, msg: string, ctx?: Record<string, unknown>) => {
    if (PRIORITY[level] < PRIORITY[minLevel]) return;
    const prefix = `[${domain}]`;
    if (level === "error") console.error(prefix, msg, ctx ?? "");
    else if (level === "warn") console.warn(prefix, msg, ctx ?? "");
    else console.log(prefix, msg, ctx ?? "");
  };

  return {
    debug: (m, c) => emit("debug", m, c),
    info: (m, c) => emit("info", m, c),
    warn: (m, c) => emit("warn", m, c),
    error: (m, c) => emit("error", m, c),
  };
}

export const appLogger = createLogger("App");
export const uiLogger = createLogger("UI");
export const tasksLogger = createLogger("Tasks");
export const habitsLogger = createLogger("Habits");
export const prayerLogger = createLogger("Prayer");
export const aiLogger = createLogger("Assistant");
