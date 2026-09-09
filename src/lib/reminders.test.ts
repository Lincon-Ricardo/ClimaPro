import { describe, expect, it } from 'vitest';
import { isReminderDue, reminderDueDate } from './reminders';

describe('reminders', () => {
  it('calcula vencimento e detecta devido', () => {
    expect(reminderDueDate({ date: '2026-01-10', reminderMonths: 3 })).toBe('2026-04-10');
    expect(isReminderDue({ status: 'concluido', date: '2026-01-10', reminderMonths: 1 }, '2026-02-11')).toBe(true);
    expect(isReminderDue({ status: 'concluido', date: '2026-01-10', reminderMonths: 1 }, '2026-02-10')).toBe(true);
    expect(isReminderDue({ status: 'concluido', date: '2026-01-10', reminderMonths: 1 }, '2026-02-09')).toBe(false);
  });
  it('nao devido se nao concluido', () => {
    expect(isReminderDue({ status: 'agendado', date: '2026-01-10', reminderMonths: 1 }, '2026-06-01')).toBe(false);
  });
});
