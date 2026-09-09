type Level = 'info' | 'warn' | 'error';

export type LogExtra = Record<string, string | number | boolean | null | undefined>;

interface LogEntry {
  ts: string;
  level: Level;
  scope: string;
  message: string;
  extra?: LogExtra;
}

const BUFFER_KEY = 'climapro_logs';
const MAX_BUFFER = 50;

let memBuffer: LogEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
  if (flushTimer || typeof window === 'undefined') return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    try {
      localStorage.setItem(BUFFER_KEY, JSON.stringify(memBuffer.slice(-MAX_BUFFER)));
    } catch { /* storage cheio: ignora */ }
  }, 1500);
}

function readBuffer(): LogEntry[] {
  if (memBuffer.length) return memBuffer;
  try {
    const raw = localStorage.getItem(BUFFER_KEY) || '[]';
    memBuffer = JSON.parse(raw) as LogEntry[];
    return memBuffer;
  } catch {
    return [];
  }
}

function write(entry: LogEntry) {
  const tag = `[${entry.scope}] ${entry.message}`;
  if (entry.level === 'error') console.error(tag, entry.extra || '');
  else if (entry.level === 'warn') console.warn(tag, entry.extra || '');
  memBuffer.push(entry);
  while (memBuffer.length > MAX_BUFFER) memBuffer.shift();
  scheduleFlush();
}

function base(level: Level, scope: string, message: string, extra?: LogExtra) {
  write({ ts: new Date().toISOString(), level, scope, message, extra });
}

export const log = {
  info: (scope: string, message: string, extra?: LogExtra) => base('info', scope, message, extra),
  warn: (scope: string, message: string, extra?: LogExtra) => base('warn', scope, message, extra),
  error: (scope: string, message: string, extra?: LogExtra) => base('error', scope, message, extra),
};

export function getRecentLogs(): LogEntry[] {
  return readBuffer().slice(-50).reverse();
}

export function clearLogs() {
  try { localStorage.removeItem(BUFFER_KEY); } catch { /* noop */ }
}
