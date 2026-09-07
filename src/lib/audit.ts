import { log } from './logger';

export interface AuditEntry {
  ts: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  detail?: string;
}

const KEY = 'climapro_audit';
const MAX = 100;

function read(): AuditEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function audit(entry: Omit<AuditEntry, 'ts'>): void {
  const full: AuditEntry = { ...entry, ts: new Date().toISOString() };
  log.info('audit', `${entry.actor} ${entry.action} ${entry.entity}:${entry.entityId}`, { detail: entry.detail });
  try {
    const buf = read();
    buf.push(full);
    while (buf.length > MAX) buf.shift();
    localStorage.setItem(KEY, JSON.stringify(buf));
  } catch { /* noop */ }
}

export function getAudit(): AuditEntry[] {
  return read().slice(-30).reverse();
}

export function clearAudit(): void {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
