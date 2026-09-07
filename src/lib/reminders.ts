import type { ServiceOrder } from '../types';
import { addMonths, toISODate } from './utils';

export function reminderDueDate(order: Pick<ServiceOrder, 'date' | 'reminderMonths'>): string | null {
  if (!order.date || !order.reminderMonths) return null;
  return addMonths(order.date, order.reminderMonths);
}

export function isReminderDue(
  order: Pick<ServiceOrder, 'status' | 'date' | 'reminderMonths'>,
  today: string = toISODate(new Date()),
): boolean {
  if (order.status !== 'concluido') return false;
  const due = reminderDueDate(order);
  if (!due) return false;
  return due <= today;
}

export function isReminderUpcoming(
  order: Pick<ServiceOrder, 'status' | 'date' | 'reminderMonths'>,
  days = 7,
  today: string = toISODate(new Date()),
): boolean {
  if (order.status !== 'concluido') return false;
  const due = reminderDueDate(order);
  if (!due || due <= today) return false;
  const limit = toISODate(new Date(Date.now() + days * 86400000));
  return due <= limit;
}

export function daysOverdue(due: string, today: string = toISODate(new Date())): number {
  const ms = new Date(today + 'T00:00:00').getTime() - new Date(due + 'T00:00:00').getTime();
  return Math.max(0, Math.round(ms / 86400000));
}
