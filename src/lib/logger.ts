type Level = 'info' | 'warn' | 'error';

interface LogEntry {
  ts: string;
  level: Level;
  scope: string;
  message: string;
  extra?: Record<string, any>;
}

const BUFFER_KEY = 'climapro_logs';
const MAX_BUFFER = 200;

function readBuffer(): LogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(BUFFER_KEY) || '[]');
  } catch {
    return [];
  }
}

function write(entry: LogEntry) {
  const tag = `[${entry.scope}] ${entry.message}`;
  if (entry.level === 'error') console.error(tag, entry.extra || '');
  else if (entry.level === 'warn') console.warn(tag, entry.extra || '');
  else console.log(tag, entry.extra || '');
  try {
    const buf = readBuffer();
    buf.push(entry);
    while (buf.length > MAX_BUFFER) buf.shift();
    localStorage.setItem(BUFFER_KEY, JSON.stringify(buf));
  } catch { /* storage cheio: ignora */ }
}

function base(level: Level, scope: string, message: string, extra?: Record<string, any>) {
  write({ ts: new Date().toISOString(), level, scope, message, extra });
}

export const log = {
  info: (scope: string, message: string, extra?: Record<string, any>) => base('info', scope, message, extra),
  warn: (scope: string, message: string, extra?: Record<string, any>) => base('warn', scope, message, extra),
  error: (scope: string, message: string, extra?: Record<string, any>) => base('error', scope, message, extra),
};

export function getRecentLogs(): LogEntry[] {
  return readBuffer().slice(-50).reverse();
}

export function clearLogs() {
  try { localStorage.removeItem(BUFFER_KEY); } catch { /* noop */ }
}
